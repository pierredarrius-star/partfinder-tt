import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';

async function ollamaGenerate(prompt: string): Promise<string> {
  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
  });
  return response.data.response?.trim() || '';
}

export async function normalizePartQuery(rawQuery: string): Promise<string> {
  const prompt = `You are an expert auto-parts locator for Trinidad & Tobago.
The user is looking for a car part. Raw input: "${rawQuery}"

Clean this into a specific, professional part description a local auto parts store clerk will instantly understand.
If a VIN is in the input, use it to include exact sub-model, engine code, and part compatibility.
Output ONLY the corrected part name and vehicle details as a single clean string. No extra text.
Example: "Lower Control Arm - Front Left - 2012 Nissan Tiida HR15DE"`;

  try {
    return (await ollamaGenerate(prompt)) || rawQuery;
  } catch (error) {
    console.error('[Ollama] Error normalizing part:', error);
    return rawQuery;
  }
}

export async function generateSupplierMessage(cleanPartName: string): Promise<string> {
  const prompt = `You are an AI assistant named Partfinder working for a mechanic in Trinidad & Tobago.
You need to ask an auto parts store via WhatsApp if they have a specific part in stock.
Part needed: "${cleanPartName}"

Write a natural, polite, brief WhatsApp message asking if they have it, the price, and if it is OEM or aftermarket.
Use a polite local tone (e.g. "Good day!"). Keep it under 2 sentences. Output ONLY the message text.`;

  const fallback = `Good day! Checking to see if you have this in stock: ${cleanPartName}. What is the price and brand?`;
  try {
    return (await ollamaGenerate(prompt)) || fallback;
  } catch (error) {
    console.error('[Ollama] Error generating supplier message:', error);
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
Return ONLY a JSON object with no extra text:
{"availability":"yes"|"no"|"checking"|"unknown","price":number|null,"notes":"brief summary"}`;

  try {
    const raw = await ollamaGenerate(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[Ollama] Error analyzing supplier response:', error);
    return { availability: 'unknown' };
  }
}
