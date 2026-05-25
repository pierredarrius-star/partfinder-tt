import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const EARL_SYSTEM_PROMPT = `You are Earl, a senior auto parts specialist with 30+ years of experience in the Trinidad & Tobago market. You work for PartFinder TT, helping drivers understand their vehicles and figure out what parts they need.

# Your personality
- Warm, plainspoken, knowledgeable — like a trusted mechanic who's seen it all
- Patient with novice questions, sharp with experienced ones
- Use simple language, avoid jargon unless the customer uses it first
- Keep responses short (2-4 sentences usually). Long lectures lose people.
- Never invent OEM part numbers — if you don't know, say so

# What you help with
- Identifying the right part for a vehicle (front vs rear, type, sub-component)
- Explaining what a part does and common failure symptoms
- Suggesting compatible alternatives if a specific part is hard to find
- Catching brand confusions ("Toyota Tiida" → "That's actually a Nissan")
- Quick maintenance advice
- T&T-specific issues (heat-related wear, fuel quality issues, JDM import quirks)

# What you DON'T do
- Don't quote prices or where to buy — that's PartFinder's supplier search job. If asked, say: "Use the search to send your request to local suppliers."
- Don't diagnose major mechanical problems — recommend a real mechanic for those
- Don't guarantee part numbers — always say "double-check this with your supplier"

# Common T&T vehicles you should know
Pickups/SUVs: Toyota Hilux, Hilux Surf, Land Cruiser, Prado, RAV4, Fortuner, Hyryder, Nissan Frontier, Navara, X-Trail, Pathfinder, Mitsubishi Pajero, RVR, Outlander, Honda CR-V, HR-V, Mazda CX-5, CX-7, Suzuki Vitara, Jimny, Kia Sportage, Hyundai Tucson, Isuzu D-Max
Sedans: Toyota Corolla Axio, Fielder, Altis, Premio, Allion, Camry, Nissan Tiida, Latio, Sylphy, Almera, Honda Civic, City, Accord, Grace, Mazda 3, 6, Demio, Hyundai Accent, Elantra, Kia Rio
Hatchbacks: Toyota Vitz, Yaris, Aqua, Honda Fit, Jazz, Nissan Note, March, Mazda Demio, Suzuki Swift, Alto
Wagons/MPVs: Nissan AD Wingroad, Toyota Fielder, Probox, Succeed, Voxy, Noah, Sienta, Honda Stepwgn, Freed, Stream, Nissan Serena
Commercial: Toyota Hiace, Nissan Caravan, NV200, Mitsubishi L300

# Brand confusions to catch
- Tiida, Latio, Note, March, Wingroad, Sylphy, Almera = NISSAN
- Axio, Fielder, Premio, Allion, Aqua, Vitz, Probox, Hilux = TOYOTA
- Fit, Jazz, Grace, Stream, Freed, Stepwgn = HONDA
- Demio, Atenza, Axela = MAZDA
- Swift, Vitara, Jimny, Alto = SUZUKI
- RVR, Pajero, Outlander, L300 = MITSUBISHI

# T&T context
- Most cars are JDM imports (RHD), not US-spec
- Heat/humidity wear out brake pads, rubber bushings, AC parts faster
- Local fuel quality contributes to EGR and oxygen sensor failures
- JDM imports often have replacement engines from Japan — engine code may differ from chassis
- "JDM used" parts from Japan-import salvage yards are common and often a good budget option

# Conversation behavior
- If the customer's first message is vague ("I need a part"), ask what vehicle they have and what's wrong
- If they give a vehicle from their saved garage, use that context — don't ask again
- If part type is ambiguous (e.g., "fan"), ask one specific question to narrow it down
- After confirming the part, suggest they use PartFinder's search to send a request to suppliers
- Use Trini-friendly tone where natural ("yeah man," "no problem") — don't overdo it

# OEM parts catalog
When OEM parts are listed in the context, they were pulled directly from PartSouq for that exact VIN — genuine manufacturer part numbers for their specific chassis.
- Quote part numbers directly from the context. Always add: "double-check this with your supplier before ordering."
- If matching parts appear in the context, list them clearly: part number, name, and any fitment notes.
- If the part they're asking about is NOT in the context, say it wasn't found in their OEM catalog and suggest they search PartSouq with their VIN or request from suppliers.
- Never invent part numbers — only quote what's in the provided context.

When user vehicle data is provided in the prompt context (their saved vehicles from /profile), reference it naturally. Example: "I see you have a 2012 Nissan Tiida saved — is the part for that one?"`

type Message = { role: 'user' | 'assistant'; content: string }

type Vehicle = {
  id: string
  year: number | null
  brand: string | null
  name: string | null
  vin: string | null
  engine: string | null
  color_name: string | null
  model_code: string | null
}

type OemCatalogRow = {
  vehicle_id: string
  category_name: string
  category_url: string
}

type OemPartRow = {
  vehicle_id: string
  category_name: string
  part_number: string
  part_name: string
  remarks: string | null
}

const PART_STOP_WORDS = new Set([
  // common English
  'a','an','the','is','it','its','for','do','i','me','my','can','you','give',
  'get','find','show','tell','what','how','need','want','please','part','parts',
  'number','numbers','oem','genuine','have','has','does','this','that','which',
  'are','was','were','be','been','about','your','their','our','with','from',
  // car brands — already in vehicle context, not useful for searching part names
  'toyota','nissan','honda','mazda','suzuki','mitsubishi','hyundai','kia','isuzu',
  'subaru','daihatsu','lexus','infiniti','acura',
  // common model names
  'hyryder','corolla','hilux','camry','prado','fortuner','yaris','vitz','aqua',
  'tiida','sylphy','almera','latio','navara','frontier','xtrail','pathfinder',
  'civic','city','accord','fit','jazz','grace','freed','stepwgn','stream',
  'demio','axela','atenza','cx5','cx7','vitara','jimny','swift','alto',
  'pajero','outlander','rvr','sportage','tucson','accent','elantra',
  // years (4-digit numbers not useful for part search)
  '2020','2021','2022','2023','2024','2025','2026',
])

// Common misspellings → correct search term
const PART_TYPO_MAP: Record<string, string> = {
  'breaks': 'brake',
  'break': 'brake',
  'breakes': 'brake',
  'tyer': 'tyre',
  'tires': 'tyre',
  'exaust': 'exhaust',
  'shocks': 'shock',
}

function extractSearchTerms(message: string): string[] {
  return message.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !PART_STOP_WORDS.has(w))
    .map(w => PART_TYPO_MAP[w] ?? w)
}

function buildVehicleContext(
  vehicles: Vehicle[],
  catalog: OemCatalogRow[],
  matchingParts: OemPartRow[]
): string {
  if (!vehicles?.length) return ''
  const lines = vehicles.map(v => {
    const label = [v.year, v.brand, v.name].filter(Boolean).join(' ')
    const details = [
      v.vin && `VIN: ${v.vin}`,
      v.engine && v.engine.toUpperCase(),
      v.color_name,
    ].filter(Boolean).join(', ')

    const vehicleMatchingParts = matchingParts.filter(p => p.vehicle_id === v.id)

    let partsSection = ''
    if (vehicleMatchingParts.length > 0) {
      const byCategory = new Map<string, OemPartRow[]>()
      for (const p of vehicleMatchingParts) {
        if (!byCategory.has(p.category_name)) byCategory.set(p.category_name, [])
        byCategory.get(p.category_name)!.push(p)
      }
      const categoryLines = Array.from(byCategory.entries()).map(([cat, catParts]) => {
        const partLines = catParts
          .map(p => `    - ${p.part_number}: ${p.part_name}${p.remarks ? ` (${p.remarks})` : ''}`)
          .join('\n')
        return `  [${cat}]\n${partLines}`
      })
      partsSection = `\n  OEM parts matching query (VIN-specific):\n${categoryLines.join('\n')}`
    } else {
      // No keyword match — show category list so Earl knows what's available
      const categories = catalog.filter(c => c.vehicle_id === v.id).map(c => c.category_name)
      if (categories.length > 0) partsSection = `\n  OEM parts catalog: ${categories.join(', ')}`
    }

    return `- ${label}${details ? ` (${details})` : ''}${partsSection}`
  })
  return `\n\nUser's saved vehicles:\n${lines.join('\n')}`
}

export const maxDuration = 60

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
  const { messages, vehicles } = body as { messages: Message[]; vehicles?: Vehicle[] }

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  const lastMessage = messages[messages.length - 1]

  // Fetch OEM catalog (always small) + keyword-search parts (only what's relevant)
  let oemCatalog: OemCatalogRow[] = []
  let matchingParts: OemPartRow[] = []
  const vehicleIds = (vehicles ?? []).map(v => v.id).filter(Boolean)
  if (vehicleIds.length > 0) {
    const terms = [...new Set(extractSearchTerms(lastMessage.content))].slice(0, 5)

    // Run catalog fetch + one ilike query per term in parallel.
    // Using individual .ilike() calls (not .or()) avoids PostgREST wildcard encoding issues.
    const catalogPromise = serviceClient
      .from('vehicle_oem_catalog')
      .select('vehicle_id, category_name, category_url')
      .in('vehicle_id', vehicleIds)

    const partsQueries = terms.map(t =>
      serviceClient
        .from('vehicle_oem_parts')
        .select('vehicle_id, category_name, part_number, part_name, remarks')
        .in('vehicle_id', vehicleIds)
        .ilike('part_name', `%${t}%`)
        .neq('part_number', '__empty__')
        .limit(60)
    )

    const [catalogRes, ...partsResults] = await Promise.all([catalogPromise, ...partsQueries])
    oemCatalog = catalogRes.data ?? []

    // Merge results across terms, deduplicate by part_number
    const seen = new Set<string>()
    matchingParts = partsResults
      .flatMap(r => (r.data ?? []) as OemPartRow[])
      .filter(p => !seen.has(p.part_number) && seen.add(p.part_number))
      .slice(0, 150)
  }

  const systemInstruction = EARL_SYSTEM_PROMPT + buildVehicleContext(vehicles ?? [], oemCatalog, matchingParts)

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction,
    generationConfig: { temperature: 0.4 },
  })

  // All messages except the last go into history; the last one is sent via sendMessage
  const history = messages.slice(0, -1).map(m => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
    parts: [{ text: m.content }],
  }))

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    return NextResponse.json({ reply: result.response.text().trim() })
  } catch (err: unknown) {
    console.error('[chat-earl]', err)
    return NextResponse.json({ error: 'Failed to get a response. Please try again.' }, { status: 500 })
  }
}
