import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeSupplierResponse } from '@/lib/ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Webhook that receives incoming messages from WAHA (WhatsApp Web gateway).
 *
 * WAHA payload shape:
 *   { event: "message", session: "default", payload: { from: "18684744475@c.us", fromMe: false, body: "...", type: "chat" } }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Only process inbound messages — ignore outgoing acks and session status events
    if (body.event === 'message' && body.payload?.fromMe === false) {
      const textMessage: string = body.payload.body;

      console.log(`[WHATSAPP] Inbound message: "${textMessage}"`);

      // Find the most-recently contacted supplier_response row.
      // TODO: match by supplier phone number once WAHA LID→E.164 resolution is available.
      const { data: activeResponse, error: responseError } = await supabase
        .from('supplier_responses')
        .select('*')
        .eq('status', 'contacted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[DEBUG] Active response lookup:', JSON.stringify({ activeResponse, responseError }));

      if (activeResponse) {
        // Analyse the reply with AI
        const analysis = await analyzeSupplierResponse(textMessage);
        console.log(`[AI] Response analysis:`, analysis);

        const { data: updatedRow, error: updateError } = await supabase
          .from('supplier_responses')
          .update({
            status: 'replied',
            price: analysis.price,
            response_text: textMessage,
            responded_at: new Date().toISOString(),
          })
          .eq('id', activeResponse.id)
          .select()
          .single();

        if (updateError) {
          console.error(`[SYS] Update failed for response ${activeResponse.id}:`, updateError);
        } else {
          console.log(`[SYS] Row updated OK — id: ${updatedRow.id} | status: ${updatedRow.status} | inquiry: ${updatedRow.inquiry_id} | price: ${updatedRow.price}`);
        }
      } else {
        console.warn(`[SYS] No active contacted row found — responseError: ${JSON.stringify(responseError)}`);
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
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? ''

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
