import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeSupplierResponse } from '@/lib/ai';

/**
 * Endpoint called by Twilio when the supplier presses a key.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inquiryId = searchParams.get('inquiryId');
    const supplierId = searchParams.get('supplierId');
    
    // Twilio sends speech result as SpeechResult
    const formData = await request.formData();
    const speechResult = formData.get('SpeechResult') as string || '';

    console.log(`[VOICE] Received speech input: "${speechResult}" for inquiry ${inquiryId}`);

    // AI Analysis of the speech (handles "Yeah", "Nah", "Check back soon", etc.)
    const analysis = await analyzeSupplierResponse(speechResult);
    const isTest = inquiryId === 'general-test';

    if (analysis.availability === 'yes') {
      if (!isTest) {
        await supabase.from('supplier_responses').upsert({
          inquiry_id: inquiryId,
          supplier_id: supplierId,
          status: 'replied',
          raw_response: `Confirmed via Voice Speech: ${speechResult}`,
          responded_at: new Date().toISOString()
        });
      }
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Excellent. We have updated the customer. Thank you for the help.</Say>
  <Hangup/>
</Response>`.trim();
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(twiml).toString() } });
    } 

    if (analysis.availability === 'no') {
      if (!isTest) {
        await supabase.from('supplier_responses').upsert({
          inquiry_id: inquiryId,
          supplier_id: supplierId,
          status: 'replied',
          raw_response: `Confirmed via Voice Speech (Out of Stock): ${speechResult}`,
          responded_at: new Date().toISOString()
        });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Understood. We'll check other stores. Goodbye.</Say>
  <Hangup/>
</Response>`.trim();
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(twiml).toString() } });
    }

    if (analysis.availability === 'checking') {
      if (!isTest) {
        await supabase.from('supplier_responses').upsert({
          inquiry_id: inquiryId,
          supplier_id: supplierId,
          status: 'replied', 
          raw_response: `Supplier is checking: "${speechResult}"`,
          responded_at: new Date().toISOString()
        });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No problem. Please update me as soon as you can. Goodbye.</Say>
  <Hangup/>
</Response>`.trim();
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(twiml).toString() } });
    }

    // If they pressed something else, try again
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-ngrok-url.com';
    const redirectUrl = `${appUrl}/api/webhook/voice?inquiryId=${inquiryId}&supplierId=${supplierId}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, I didn't get that.</Say>
  <Redirect method="POST">${redirectUrl}</Redirect>
</Response>`.trim();
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(twiml).toString() } });

  } catch (error) {
    console.error("Voice Gather error:", error);
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(twiml).toString() } });
  }
}
