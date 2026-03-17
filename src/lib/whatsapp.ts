import axios from 'axios';

/**
 * Sends a WhatsApp message using Meta Cloud API
 * This requires a verified Facebook Business Manager and WhatsApp App setup
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  message: string
): Promise<boolean> {
  // Check for placeholder token first for demo purposes
  if (!process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN.includes('your_')) {
    console.warn(`[WHATSAPP DEMO] Simulating message to ${toPhoneNumber}: ${message}`);
    return true;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("WhatsApp API keys missing. SIMULATING message send to:", toPhoneNumber);
    console.log("MESSAGE CONTENT:", message);
    return true; // Simulate success for local testing MVP
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: toPhoneNumber.replace('+', ''), // Meta API usually expects number without +
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.status === 200;
  } catch (error: any) {
    console.error("WhatsApp Send Error:", error.response?.data || error.message);
    return false;
  }
}
