import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    const prompt = `You are analyzing a vehicle compliance plate, certification sticker, or VIN plate.
Extract vehicle information visible in the image and return it as JSON.
Return null for any field you cannot confidently read.

Fields to extract:
- vin: Vehicle Identification Number (17 alphanumeric characters)
- year: Model year as a 4-digit integer
- brand: Manufacturer name in lowercase (e.g. "toyota", "nissan", "honda")
- name: Model name in lowercase (e.g. "corolla", "tiida", "civic")
- model_code: Full model/grade code if visible (e.g. "DBA-NZE141", "B15")
- body: Body style in lowercase (e.g. "sedan", "hatchback", "suv", "wagon", "pickup")
- engine: Engine displacement code (e.g. "1NZ-FE", "HR15DE", "K20A")
- color_code: Paint color code if visible (e.g. "040", "1F7", "ZHJ")
- color_name: Color description in lowercase (e.g. "super white", "silver metallic")

Return ONLY a valid JSON object with exactly these keys. Do not include any other text.
Example: {"vin":"JT2AE09W9J0123456","year":2012,"brand":"toyota","name":"corolla axio","model_code":"DBA-NZE144","body":"sedan","engine":"1NZ-FE","color_code":"040","color_name":"super white"}`

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
