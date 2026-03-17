import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client using the new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Normalizes a user part query into a structured, clean OEM part description
 */
export async function normalizePartQuery(rawQuery: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
    console.warn("Using DEMO MODE for normalization.");
    return `Cleaned ${rawQuery} (Demo Mode)`;
  }

  const prompt = `
    You are an expert auto-parts locator acting directly for a user in Trinidad & Tobago.
    The user is looking for a car part.
    Raw input: "${rawQuery}"
    
    Your job is to clean this input into a highly specific, professional, and standard 
    part description that a local auto parts store clerk will instantly understand.
    
    CRITICAL: If a VIN (Vehicle Identification Number) is provided in the input, use it to lookup 
    exact sub-model, engine code, and part compatibility.
    
    Do not output any conversational text. ONLY output the corrected part name and 
    vehicle details in a single clean string. 
    Example: "Lower Control Arm - Front Left - 2012 Nissan Tiida HR15DE (VIN: MDA61C...)"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || rawQuery;
  } catch (error) {
    console.error("Gemini Error normalizing part:", error);
    return rawQuery;
  }
}

/**
 * Generates the WhatsApp text message to send to suppliers
 */
export async function generateSupplierMessage(cleanPartName: string): Promise<string> {
   if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
    return `Good day, checking to see if you have this in stock: ${cleanPartName}. What is the price and brand? (Demo Mode)`;
  }

  const prompt = `
    You are an AI assistant named 'Partfinder' working for a mechanic in Trinidad & Tobago.
    You need to ask an auto parts store (via WhatsApp) if they have a specific part in stock.
    
    Part needed: "${cleanPartName}"
    
    Draft a completely natural, polite, and very brief WhatsApp message asking if they have it, 
    the price, and if it is Original (OEM) or Aftermarket. 
    Use a polite local tone (e.g. "Good day!"). Keep it under 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || `Good day, checking to see if you have this in stock: ${cleanPartName}. What is the price and brand?`;
  } catch (error) {
    console.error("Gemini Error generating message:", error);
    return `Good day, checking to see if you have this in stock: ${cleanPartName}. What is the price and brand?`;
  }
}

/**
 * Categorizes a supplier text response using AI
 */
export async function analyzeSupplierResponse(text: string): Promise<{
  availability: 'yes' | 'no' | 'checking' | 'unknown',
  price?: number,
  notes?: string
}> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
     return { availability: 'yes', price: 450, notes: 'Demo Mode: Auto-matched!' };
  }

  const prompt = `
    Analyze this message from an auto parts store in T&T: "${text}"
    
    Determine if they:
    - Have the part (YES)
    - Do NOT have it (NO)
    - Are currently checking or will get back later (CHECKING)
    
    Return a JSON object: 
    { "availability": "yes" | "no" | "checking" | "unknown", "price": number | null, "notes": "brief summary" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    
    const raw = response.text?.trim() || "";
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error analyzing response:", error);
    return { availability: 'unknown' };
  }
}
