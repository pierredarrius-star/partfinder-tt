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
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    const prompt = `You are reading a vehicle dashboard photo to extract the ODOMETER reading (total distance the vehicle has driven).

Rules:
- Return the TOTAL odometer, not a trip meter. Trip meters are labeled "TRIP", "TRIP A", "TRIP B", or show a decimal point with a small number (e.g. 234.5). The total odometer is the larger cumulative figure, often labeled "ODO" or unlabeled, usually 5-6 digits with no decimal.
- If both are visible, always pick the total.
- Note the unit if visible: "km" or "mi/miles". If miles, still return the number as shown and set unit to "mi".
- If the display is too blurry, dark, obstructed, or you cannot confidently distinguish odometer from trip meter, return {"odometer": null, "unit": null}. Never guess.

Return ONLY a valid JSON object: {"odometer": <integer or null>, "unit": "km" | "mi" | null}
Example: {"odometer": 87420, "unit": "km"}`

    const result = await model.generateContent([
      { inlineData: { mimeType, data: image } },
      prompt,
    ])

    const raw = result.response.text().trim()

    let parsed: { odometer?: number | null; unit?: string | null }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "Couldn't read the display. Try a clearer photo." },
        { status: 422 }
      )
    }

    const odometer = typeof parsed.odometer === 'number' && parsed.odometer > 0
      ? Math.round(parsed.odometer)
      : null

    if (odometer == null) {
      return NextResponse.json(
        { error: "Couldn't read the odometer confidently. Try a closer, clearer photo of the dashboard." },
        { status: 422 }
      )
    }

    // sanity ceiling — a real odometer won't exceed this
    if (odometer > 2_000_000) {
      return NextResponse.json(
        { error: 'That reading looks wrong. Try another photo.' },
        { status: 422 }
      )
    }

    const unit = parsed.unit === 'mi' ? 'mi' : 'km'
    // convert miles → km so everything downstream stays in km
    const km = unit === 'mi' ? Math.round(odometer * 1.60934) : odometer

    return NextResponse.json({ odometer_km: km, as_read: odometer, unit })
  } catch (err: unknown) {
    console.error('[scan-odometer]', err)
    return NextResponse.json({ error: 'Failed to analyze image. Please try again.' }, { status: 500 })
  }
}
