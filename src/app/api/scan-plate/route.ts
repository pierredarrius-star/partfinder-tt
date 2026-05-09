import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { lookupColorName } from '@/lib/color-codes'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const body = await request.json()
  const { image, mimeType } = body

  if (!image || !mimeType) {
    return NextResponse.json({ error: 'image and mimeType are required' }, { status: 400 })
  }

  // base64 length * 0.75 ≈ byte size
  if (image.length * 0.75 > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image is too large. Please use an image under 4MB.' }, { status: 400 })
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    const prompt = `You are analyzing a vehicle compliance plate, certification sticker, or VIN plate.
Extract vehicle information visible in the image and return it as JSON.
Return null for any field you cannot confidently read.
Use the brand context to look up color codes — different manufacturers use different code systems.

Fields to extract:
- vin: Vehicle Identification Number (17 alphanumeric characters)
- year: Model year as a 4-digit integer
- brand: Manufacturer name in lowercase (e.g. "toyota", "nissan", "honda")
- name: Model name in lowercase (e.g. "corolla", "tiida", "civic")
- model_code: Full model/grade code if visible (e.g. "DBA-NZE141", "B15")
- body: Body style in lowercase (e.g. "sedan", "hatchback", "suv", "wagon", "pickup")
- engine: The engine number/string exactly as printed on the plate (after "ENGINE NO." or equivalent), preserving original spacing and punctuation. If the printed string contains BOTH the engine family code AND additional serial characters, append the family code in parentheses. If the printed string IS only the family code with no extra serial, return it as-is with no parentheses. Examples: plate shows "M15DNE09468" → return "M15DNE09468 (M15D)"; plate shows "1NZ-FE 1234567" → return "1NZ-FE 1234567 (1NZ-FE)"; plate shows "1NZ-FE" → return "1NZ-FE"; plate shows "K20A" → return "K20A". Use your knowledge of JDM engine family codes to identify which portion is the family.
- color_code: Paint color code if visible (e.g. "040", "1F7", "ZHJ")
- color_name: The manufacturer's marketing name for the color code if you recognize it. Only return null if you don't know — we have a fallback database.

Return ONLY a valid JSON object with exactly these keys. Do not include any other text.
Example: {"vin":"JT2AE09W9J0123456","year":2012,"brand":"toyota","name":"corolla axio","model_code":"DBA-NZE144","body":"sedan","engine":"1NZ-FE 1234567 (1NZ-FE)","color_code":"040","color_name":"Super White"}`

    const result = await model.generateContent([
      { inlineData: { mimeType, data: image } },
      prompt,
    ])

    const raw = result.response.text().trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Could not read the plate. Please try a clearer photo.' },
        { status: 422 }
      )
    }

    // DB wins: if we have a curated entry for this brand+code, use it
    // and override whatever Gemini guessed. Only trust Gemini's
    // color_name when the code isn't in our database.
    if (parsed.brand && parsed.color_code) {
      const lookedUp = lookupColorName(parsed.brand as string, parsed.color_code as string)
      if (lookedUp) {
        parsed.color_name = lookedUp  // DB wins
      }
      // else: leave parsed.color_name as whatever Gemini returned (could be a real guess or null)
    }

    const hasAnyValue = Object.values(parsed).some(v => v !== null && v !== undefined && v !== '')
    if (!hasAnyValue) {
      return NextResponse.json(
        { error: 'No vehicle information could be read from this image. Try a closer, clearer photo.' },
        { status: 422 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    console.error('[scan-plate]', err)
    return NextResponse.json({ error: 'Failed to analyze image. Please try again.' }, { status: 500 })
  }
}
