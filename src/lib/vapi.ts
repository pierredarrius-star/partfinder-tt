/**
 * Vapi.ai Integration for Partfinder T&T
 * 
 * This module handles outbound voice calls to suppliers using Vapi's
 * AI-native voice agent platform. Much simpler than Twilio!
 */

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

/**
 * Creates an outbound call to a supplier via Vapi.
 * The AI agent will handle the entire conversation.
 */
export async function initiateVapiCall(
  toPhoneNumber: string,
  partName: string,
  inquiryId: string,
  supplierId: string
): Promise<{ success: boolean; callId?: string; error?: string }> {

  if (!VAPI_PRIVATE_KEY || VAPI_PRIVATE_KEY.includes('your_')) {
    console.warn(`[VAPI DEMO] Simulating call to ${toPhoneNumber} for "${partName}"`);
    return { success: true, callId: 'demo-call-id' };
  }

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        assistantOverrides: {
          firstMessage: `Good day! This is Partfinder T and T calling. We are checking to see if you have ${partName} in stock. Do you have this part available, and if so, what is the price?`,
          model: {
            provider: "google",
            model: "gemini-2.0-flash",
            messages: [
              {
                role: "system",
                content: `You are a professional auto parts procurement agent for Partfinder T&T. 
You are calling a supplier to ask about: "${partName}" (Inquiry: ${inquiryId}).
Be polite, ask about availability and price, keep it under 2 minutes.
Use a Caribbean-friendly tone.`
              }
            ]
          }
        },
        customer: {
          number: toPhoneNumber
        }
      })
    });

    const data = await response.json();

    if (data.id) {
      console.log(`[VAPI] Call initiated successfully. Call ID: ${data.id}`);
      return { success: true, callId: data.id };
    } else {
      console.error(`[VAPI] Failed to initiate call:`, data.message || data);
      return { success: false, error: data.message || 'Unknown Vapi error' };
    }
  } catch (error: any) {
    console.error(`[VAPI] Error initiating call to ${toPhoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
