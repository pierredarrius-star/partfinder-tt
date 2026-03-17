import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize the client. In a real app, we would use SignalWire's SDK which is 
// drop-in compatible with Twilio but much cheaper for Caribbean numbers.
let client: any = null;
try {
  if (accountSid && authToken && accountSid.startsWith('AC')) {
    client = twilio(accountSid, authToken);
  } else if (accountSid && authToken) {
    console.warn("[VOICE] Twilio AccountSid must start with 'AC'. Skipping real initialization.");
  }
} catch (e) {
  console.error("[VOICE] Twilio initialization failed:", e);
}

/**
 * Initiates an outbound voice call to a supplier.
 * The Twilio application uses TwiML to respond. We route it to an endpoint that
 * generates dynamic ElevenLabs audio.
 */
export async function initiateVoiceCallFallback(
  toPhoneNumber: string,
  inquiryId: string,
  supplierId: string
): Promise<{ success: boolean; error?: string }> {
  if (!client || !twilioNumber || (accountSid && accountSid.includes('your_'))) {
    console.warn(`[VOICE DEMO] Simulating call to ${toPhoneNumber} for inquiry ${inquiryId}`);
    return { success: true }; // Simulate success for demo
  }

  try {
    // We tell Twilio: "Call this number. When they answer, fetch the instructions (TwiML) from this URL"
    // The URL points back to our own Next.js API where we use ElevenLabs.
    const call = await client.calls.create({
      to: toPhoneNumber,
      from: twilioNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-ngrok-url.com'}/api/webhook/voice?inquiryId=${inquiryId}&supplierId=${supplierId}`,
      record: true, // We record the call for transparency
    });

    console.log(`[VOICE] Call initiated successfully. Call SID: ${call.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[VOICE] Failed to initiate call to ${toPhoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
