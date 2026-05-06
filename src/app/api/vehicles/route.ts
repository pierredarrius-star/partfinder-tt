import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  console.log('[vehicles] received body:', body)
  const { year, vin, brand, name, model_code, body: bodyStyle, engine, color_code, color_name, nickname, frame_number } = body

  if (!vin && !brand && !name) {
    return NextResponse.json({ error: 'At least one of VIN, brand, or name is required' }, { status: 400 })
  }

  const { count } = await serviceClient
    .from('user_vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { data, error } = await serviceClient
    .from('user_vehicles')
    .insert({
      user_id: user.id,
      year: year ? parseInt(year, 10) : null,
      vin: vin || null,
      brand: brand || null,
      name: name || null,
      model_code: model_code || null,
      body: bodyStyle || null,
      engine: engine || null,
      color_code: color_code || null,
      color_name: color_name || null,
      nickname: nickname || null,
      frame_number: frame_number || null,
      is_primary: (count ?? 0) === 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vehicle: data }, { status: 201 })
}
