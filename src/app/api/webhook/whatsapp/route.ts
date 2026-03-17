import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeSupplierResponse } from '@/lib/ai';

/**
 * Webhook that receives incoming messages from Meta/WhatsApp Cloud API
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify it's a WhatsApp message event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];
      
      if (message && message.type === 'text') {
        const fromNumber = `+${message.from}`; // e.g. +18685551001
        const textMessage = message.text.body;
        
        console.log(`[WHATSAPP] Received reply from ${fromNumber}: "${textMessage}"`);

        // 1. Look up which supplier this is
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('whatsapp_number', fromNumber)
          .single();

        if (supplier) {
           // 2. Find their active "contacted" inquiry
           const { data: activeResponse } = await supabase
            .from('supplier_responses')
            .select('*')
            .eq('supplier_id', supplier.id)
            .eq('status', 'contacted')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

           if (activeResponse) {
             // 3. Analyze the message with AI to see if it's Yes/No/Checking
             const analysis = await analyzeSupplierResponse(textMessage);
             console.log(`[AI] Response analysis:`, analysis);

             // 4. Mark it as replied and save the results
             await supabase.from('supplier_responses')
              .update({ 
                status: 'replied',
                price_quoted: analysis.price, 
                raw_response: textMessage,
                responded_at: new Date().toISOString(),
                // availability_flag: analysis.availability // In V2 we'd add this column
              })
              .eq('id', activeResponse.id);
             
             console.log(`[SYS] Logged AI-parsed response for inquiry ${activeResponse.inquiry_id}`);
           }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Meta WhatsApp Cloud API requires a GET endpoint to verify the webhook URL
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Any random string you define in your Meta App Dashboard
  const VERIFY_TOKEN = "pathfinder_secret_webhook_token_2026"; 

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}
