import { NextResponse } from 'next/server';

/**
 * Endpoint called by Twilio/SignalWire when the supplier answers the phone.
 * This generates the TwiML instructions for the call.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const inquiryId = searchParams.get('inquiryId') || 'general-test';
  const supplierId = searchParams.get('supplierId') || 'test-user';

  // 1. Determine the part name (use a default if it's a general test call)
  const partName = inquiryId === 'general-test' 
    ? "Front Brake Pads for a Mitsubishi Lancer" 
    : "Lower Control Arm for Nissan Tiida"; 

  // 2. We generate the TwiML (XML) that tells the phone what to say.
  // We use <Say> for standard text-to-speech, but for the "WOW" factor, 
  // you would use <Play> with an ElevenLabs audio URL.
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-ngrok-url.com';
  const actionUrl = `${appUrl}/api/webhook/voice/gather?inquiryId=${inquiryId}&supplierId=${supplierId}`;
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${actionUrl}" method="POST" timeout="3" speechTimeout="auto">
    <Say voice="alice" language="en-US">
      Good day! This is an automated query from Partfinder T and T. 
      We are checking to see if you have a ${partName} in stock.
      Do you have this part available?
    </Say>
  </Gather>
</Response>`.trim();

  return new Response(twiml, {
    headers: { 
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(twiml).toString()
    },
  });
}
