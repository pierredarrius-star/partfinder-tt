import axios from 'axios';

const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3001';

export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  message: string
): Promise<boolean> {
  // Convert +18683248608 -> 18683248608@c.us
  const chatId = toPhoneNumber.replace('+', '') + '@c.us';

  try {
    const response = await axios.post(
      `${WAHA_URL}/api/sendText`,
      {
        chatId,
        text: message,
        session: process.env.WAHA_SESSION || 'default',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.WAHA_API_KEY ? { 'X-Api-Key': process.env.WAHA_API_KEY } : {}),
        },
      }
    );

    return response.status === 200 || response.status === 201;
  } catch (error: any) {
    console.error(`[WAHA] Failed to send to ${chatId}`);
    console.error(`[WAHA] Status:`, error.response?.status);
    console.error(`[WAHA] Body:`, JSON.stringify(error.response?.data, null, 2));
    console.error(`[WAHA] Message:`, error.message);
    return false;
  }
}
