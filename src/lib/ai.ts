import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = 'gemini-3.1-flash-lite';

async function geminiGenerate(prompt: string, jsonMode = false): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
  });

  const attempt = () => model.generateContent(prompt);

  try {
    const result = await attempt();
    return result.response.text().trim();
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 503) {
      await new Promise(res => setTimeout(res, 1000));
      const result = await attempt();
      return result.response.text().trim();
    }
    throw err;
  }
}

export async function normalizePartQuery(rawQuery: string): Promise<string> {
  const prompt = `You are an expert auto-parts locator for Trinidad & Tobago.
The user is looking for a car part. Raw input: "${rawQuery}"

Clean this into a specific, professional part description a local auto parts store clerk will instantly understand.
If a VIN is in the input, use it to include exact sub-model, engine code, and part compatibility.
Output ONLY the corrected part name and vehicle details as a single clean string. No extra text.
Example: "Lower Control Arm - Front Left - 2012 Nissan Tiida HR15DE"`;

  try {
    return (await geminiGenerate(prompt)) || rawQuery;
  } catch (error) {
    console.error('[Gemini] Error normalizing part:', error);
    return rawQuery;
  }
}

export async function generateSupplierMessage(partName: string, vehicleInfo = ''): Promise<string> {
  const partDetail = vehicleInfo ? `${partName} (${vehicleInfo})` : partName;
  const prompt = `You are an AI assistant named Partfinder working for a mechanic in Trinidad & Tobago.
You need to ask an auto parts store via WhatsApp if they have a specific part in stock.
Part needed: "${partDetail}"

Write a natural, polite, brief WhatsApp message asking if they have it, the price, and if it is OEM or aftermarket.
Use a polite local tone (e.g. "Good day!"). Keep it under 2 sentences. Output ONLY the message text.`;

  const fallback = `Good day! Checking to see if you have this in stock: ${partDetail}. What is the price and brand?`;
  try {
    return (await geminiGenerate(prompt)) || fallback;
  } catch (error) {
    console.error('[Gemini] Error generating supplier message:', error);
    return fallback;
  }
}

export async function analyzeSupplierResponse(text: string): Promise<{
  availability: 'yes' | 'no' | 'checking' | 'unknown';
  price?: number;
  notes?: string;
}> {
  const prompt = `Analyze this message from an auto parts store in Trinidad & Tobago: "${text}"

Determine if they have the part (yes), do NOT have it (no), are checking (checking), or it is unclear (unknown).
Return ONLY a JSON object:
{"availability":"yes"|"no"|"checking"|"unknown","price":number|null,"notes":"brief summary"}`;

  try {
    const raw = await geminiGenerate(prompt, true);
    return JSON.parse(raw);
  } catch (error) {
    console.error('[Gemini] Error analyzing supplier response:', error);
    return { availability: 'unknown' };
  }
}
