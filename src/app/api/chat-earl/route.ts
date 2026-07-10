import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { scrapeCategoryParts } from '@/lib/partsouq-firecrawl'
import { getMaintenanceSpec, formatMaintenanceSpec } from '@/lib/maintenance-specs'
import { findSeedTwin } from '@/lib/seed-twin'

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
When OEM parts are listed in the context, they were pulled directly from PartSouq — genuine manufacturer part numbers. The parts header states whether they are VIN-specific or model-matched from a donor catalog of the same chassis; for model-matched data, remind the customer to confirm fitment against their VIN when quoting a number.
- Quote part numbers directly from the context. Always add: "double-check this with your supplier before ordering."
- When the context has multiple variants (front/rear, LH/RH, upper/lower), ask which one the customer needs before quoting a number — don't list all variants at once.
- Distinguish the core part from hardware and accessories. If someone asks for "brake pads", point to the PAD KIT, not the caliper bolts or dust covers. Use your mechanical knowledge to identify which item in the list is the actual part they want.
- Correct wrong terminology naturally, like a mechanic would. If someone says "brake rotor" say "you mean the brake disc — here's the number." If they say "fan belt" point them to the V-ribbed belt. Keep it friendly, not condescending.
- If the part they're asking about is NOT in the context, say it wasn't found in their OEM catalog and suggest they search PartSouq with their VIN or request from suppliers.
- Never invent part numbers — only quote what's in the provided context.

# Maintenance & fluid specs
When a vehicle's context includes a "Maintenance & fluid specs" block, those values were verified by hand from the manufacturer's manual or official data for that exact chassis code — they are trustworthy. Use them to answer oil grade/capacity, transmission fluid, coolant, brake fluid, and service-interval questions.
- The specs block is matched to the customer's exact car by its chassis code, so everything in it is true of THEIR vehicle — including drivetrain-specific items like a 4WD rear differential or transfer case. State those as facts about their car; never ask the customer to confirm the body style or drivetrain the block already reflects.
- "Service schedule" lines carry two figures: the maker's easy-conditions figure and the severe-conditions figure. Trinidad driving — heat, short trips, traffic, dust — IS what the makers define as severe conditions. Lead with the severe figure as the practical answer, and give the easy-conditions figure as context ("figure on 7,500 km or 6 months here; the manual's easy-driving number is 15,000 km, but that's not our roads").
- Respect each schedule line's provenance tag. "(... official)" = manufacturer-published, quote as fact. "(guidance)" = standard practice, not the maker's own number — present it as such. "(not published)" = the maker sets no figure; say that honestly (e.g. Nissan publishes no CVT-fluid interval — 40–60,000 km is local shop practice, not Nissan).
- Quote the values as given, and mention they're from the manufacturer (cite the "Source:" line) so the customer knows it's real data, not a guess.
- ALWAYS add: "confirm against your manual or dealer before a fluid change."
- If a value says "not published" or is flagged "NOT yet manual-verified", say so honestly — never replace it with a number you assume. An honest "Toyota doesn't publish that figure" beats a wrong one.
- Pass along any ⚠ warning in full. Using the wrong transmission fluid (e.g. anything other than Nissan NS-3 where specified) can destroy the gearbox — this is the most important thing to get right.
- If a maintenance or fluid question is about a car with NO "Maintenance & fluid specs" block — their saved car, a Hilux they're curious about, a friend's car, ANY car — say FIRST that you don't have manufacturer-verified specs for that car in the system yet. Only after that disclosure may you offer general guidance, clearly labelled ("as a rough guide, not from your manual") and ending with: confirm against the owner's manual or a dealer. Never promise to tell them "the right oil" for an uncovered car — asking for year and engine doesn't turn general knowledge into verified data — and never state an exact fluid grade, capacity or interval as fact without a specs block to back it.

# Owner's maintenance log
When a vehicle's context includes a "Maintenance log" block, those are records the owner logged in the app — each is just a task and a date. Done entries answer "when did I last…" questions; pending entries answer "what's due on my car". Quote the dates directly — they're the owner's own records.
- If the log doesn't contain what they ask about, say the log doesn't show it and suggest adding it on the Maintenance page (Garage → FULL HISTORY).
- If something is marked OVERDUE, mention it naturally when maintenance comes up — a friendly nudge, not a lecture.
- The log records WHEN work was done, not what fluids/parts were used — combine it with the "Maintenance & fluid specs" block (if present) for the what.

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
  frame_number: string | null
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

type MaintenanceRow = {
  vehicle_id: string
  task: string
  due_date: string | null
  done_at: string | null
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

// Customer vocabulary → EPC (catalog) vocabulary. The OEM catalog uses "RH/LH"
// (not "right/left") and "disc" (not "rotor"), so map the customer's word to the
// term that actually appears in part_name — otherwise the ilike search misses.
const PART_SYNONYM_MAP: Record<string, string> = {
  'right': 'rh',
  'left': 'lh',
  'rotor': 'disc',
  'rotors': 'disc',
}

// Positional words match too many catalog categories ("front" hits dozens), so
// they're useless for picking WHICH category to lazy-scrape. Good for part_name
// matching, excluded from category matching.
const POSITION_WORDS = new Set([
  'front', 'rear', 'rh', 'lh', 'left', 'right', 'upper', 'lower', 'inner', 'outer', 'side',
])

function extractSearchTerms(message: string): string[] {
  return message.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !PART_STOP_WORDS.has(w))
    .map(w => PART_TYPO_MAP[w] ?? PART_SYNONYM_MAP[w] ?? w)
}

function fmtLogDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildVehicleContext(
  vehicles: Vehicle[],
  catalog: OemCatalogRow[],
  matchingParts: OemPartRow[],
  twinModelByVehicle: Map<string, string>,
  maintenanceRows: MaintenanceRow[]
): string {
  if (!vehicles?.length) return ''
  const today = new Date().toISOString().slice(0, 10)
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
      const twinCode = twinModelByVehicle.get(v.id)
      const provenance = twinCode
        ? `model-matched from a donor ${twinCode.toUpperCase()} catalog — same model, not VIN-exact`
        : 'VIN-specific'
      partsSection = `\n  OEM parts matching query (${provenance}):\n${categoryLines.join('\n')}`
    } else {
      // No keyword match — show category list so Earl knows what's available
      const categories = catalog.filter(c => c.vehicle_id === v.id).map(c => c.category_name)
      if (categories.length > 0) partsSection = `\n  OEM parts catalog: ${categories.join(', ')}`
    }

    // Frame number first; fall back to the model code — some cars are saved with
    // only a model code (or a frame prefix that differs from the spec key).
    const spec = getMaintenanceSpec(v.frame_number, [v.brand, v.name].filter(Boolean).join(' '))
      ?? getMaintenanceSpec(v.model_code)
    const maintenanceSection = spec ? `\n${formatMaintenanceSpec(spec)}` : ''

    // Owner-entered maintenance log: done entries newest first, then pending.
    const logRows = maintenanceRows.filter(m => m.vehicle_id === v.id)
    let logSection = ''
    if (logRows.length > 0) {
      const done = logRows
        .filter(r => r.done_at)
        .sort((a, b) => (a.done_at! > b.done_at! ? -1 : 1))
        .map(r => `    - ${r.task} — done ${fmtLogDate(r.done_at!)}`)
      const pending = logRows
        .filter(r => !r.done_at)
        .sort((a, b) => ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1))
        .map(r => {
          if (!r.due_date) return `    - ${r.task} — planned, no date set`
          const overdue = r.due_date < today
          return `    - ${r.task} — due ${fmtLogDate(r.due_date)}${overdue ? ' (OVERDUE)' : ''}`
        })
      logSection = `\n  Maintenance log (owner-entered; today is ${fmtLogDate(today)}):\n${[...pending, ...done].join('\n')}`
    }

    return `- ${label}${details ? ` (${details})` : ''}${partsSection}${maintenanceSection}${logSection}`
  })
  return `\n\nUser's saved vehicles:\n${lines.join('\n')}`
}

// Guardrail: Earl may only quote part numbers that were actually retrieved from
// the OEM catalog for this vehicle. Any 5-5 digit number in the reply that isn't
// in the retrieved set is treated as unverified (possible hallucination) and
// redacted. Compared digits-only so 89542-12100 == 8954212100. Only runs when we
// had catalog rows to check against; currently covers numeric (Toyota/most JDM)
// part numbers, not Nissan/Honda alphanumeric formats.
function verifyPartNumbers(
  reply: string,
  matchingParts: OemPartRow[]
): { reply: string; redactedCount: number } {
  const allowed = new Set(
    matchingParts.map(p => p.part_number.replace(/\D/g, '')).filter(Boolean)
  )
  if (allowed.size === 0) return { reply, redactedCount: 0 }

  let redactedCount = 0
  const cleaned = reply.replace(/\b\d{5}-?\d{5}\b/g, (match) => {
    if (allowed.has(match.replace(/\D/g, ''))) return match
    redactedCount++
    return '[unverified — check your VIN on PartSouq]'
  })
  return { reply: cleaned, redactedCount }
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

  // Seed-twin matching: seeded OEM parts live under donor cars in the seed
  // garage. Match each customer car to its donor (model code → frame-number
  // prefix → brand+name) so seeded data answers for everyone's car.
  const twinByVehicle = new Map<string, string>()      // customer vehicle id → donor vehicle id
  const twinModelByVehicle = new Map<string, string>() // customer vehicle id → donor model_code
  if (vehicleIds.length > 0) {
    for (const v of vehicles ?? []) {
      if (!v.id) continue
      const twin = await findSeedTwin(serviceClient, v)
      if (twin) {
        twinByVehicle.set(v.id, twin.id)
        twinModelByVehicle.set(v.id, twin.model_code ?? '')
      }
    }
  }
  const donorToCustomer = new Map([...twinByVehicle].map(([cust, donor]) => [donor, cust]))
  const queryIds = [...vehicleIds, ...new Set(twinByVehicle.values())]
  // Donor rows come back credited to the customer's car so the context builder
  // and part-number guardrail treat them like the car's own data.
  const reattribute = <T extends { vehicle_id: string }>(rows: T[]): T[] =>
    rows.map(r => (donorToCustomer.has(r.vehicle_id) ? { ...r, vehicle_id: donorToCustomer.get(r.vehicle_id)! } : r))

  if (vehicleIds.length > 0) {
    const terms = [...new Set(extractSearchTerms(lastMessage.content))].slice(0, 5)

    // Keyword-search parts by part_name. Individual .ilike() calls (not .or())
    // avoid PostgREST wildcard encoding issues. Reused after a lazy scrape.
    const searchParts = async (): Promise<OemPartRow[]> => {
      if (terms.length === 0) return []
      const results = await Promise.all(
        terms.map(t =>
          serviceClient
            .from('vehicle_oem_parts')
            .select('vehicle_id, category_name, part_number, part_name, remarks')
            .in('vehicle_id', queryIds)
            .ilike('part_name', `%${t}%`)
            .neq('part_number', '__empty__')
            .limit(60)
        )
      )
      const seen = new Set<string>()
      return reattribute(
        results
          .flatMap(r => (r.data ?? []) as OemPartRow[])
          .filter(p => !seen.has(p.part_number) && seen.add(p.part_number))
          .slice(0, 150)
      )
    }

    const catalogPromise = serviceClient
      .from('vehicle_oem_catalog')
      .select('vehicle_id, category_name, category_url')
      .in('vehicle_id', queryIds)

    const [catalogRes, firstParts] = await Promise.all([catalogPromise, searchParts()])
    oemCatalog = reattribute(catalogRes.data ?? [])
    matchingParts = firstParts

    // Step 3 — lazy scrape-on-miss. Nothing matched in the parts table, but the
    // catalog lists a category that fits the query → scrape those categories live
    // (once), persist them, then re-search so Earl can answer this turn.
    if (matchingParts.length === 0 && terms.length > 0) {
      const nounTerms = terms.filter(t => !POSITION_WORDS.has(t))
      const posTerms = terms.filter(t => POSITION_WORDS.has(t))
      const inName = (c: OemCatalogRow, t: string) => c.category_name.toLowerCase().includes(t)

      // Rank categories: must match a query noun (positional words alone match too
      // many) → then also match the position (front/rh) → then shortest name (the
      // core group, e.g. "Radiator" over "Radiator Mounting Parts").
      const ranked = oemCatalog
        .filter(c => c.category_url.startsWith('http')) // api-seeded donor rows have no scrapeable page
        .map(c => ({
          c,
          noun: nounTerms.filter(t => inName(c, t)).length,
          pos: posTerms.filter(t => inName(c, t)).length,
        }))
        .filter(x => x.noun > 0)
        .sort((a, b) =>
          b.noun - a.noun ||
          b.pos - a.pos ||
          a.c.category_name.length - b.c.category_name.length
        )
        .map(x => x.c)

      // Dedup by name (same group appears under multiple parents; our parts storage
      // keys on the name, so one scrape per name — and avoids racing parallel writes).
      const seenCat = new Set<string>()
      const rankedUnique = ranked.filter(c => seenCat.has(c.category_name) ? false : seenCat.add(c.category_name))

      if (rankedUnique.length > 0) {
        // Don't re-pay Firecrawl for categories already scraped.
        const names = rankedUnique.map(c => c.category_name)
        const { data: existing } = await serviceClient
          .from('vehicle_oem_parts')
          .select('category_name')
          .in('vehicle_id', vehicleIds)
          .in('category_name', names)
        const alreadyScraped = new Set((existing ?? []).map(e => e.category_name))
        // ponytail: cap 3 categories/turn — covers normal queries, bounds latency+cost. Raise if misses show up.
        const toScrape = rankedUnique.filter(c => !alreadyScraped.has(c.category_name)).slice(0, 3)

        if (toScrape.length > 0) {
          await Promise.all(toScrape.map(async (c) => {
            try {
              const parts = await scrapeCategoryParts(c.category_url)
              await serviceClient
                .from('vehicle_oem_parts')
                .delete()
                .eq('vehicle_id', c.vehicle_id)
                .eq('category_name', c.category_name)
              if (parts.length > 0) {
                await serviceClient.from('vehicle_oem_parts').insert(
                  parts.map(p => ({
                    vehicle_id: c.vehicle_id,
                    category_name: c.category_name,
                    part_number: p.part_number,
                    part_name: p.part_name,
                    remarks: p.remarks,
                  }))
                )
              }
            } catch (err) {
              console.error('[chat-earl] lazy scrape failed', c.category_name, err)
            }
          }))
          matchingParts = await searchParts()
        }
      }
    }
  }

  // Owner's maintenance log — task + date records entered in the app.
  let maintenanceRows: MaintenanceRow[] = []
  if (vehicleIds.length > 0) {
    const { data: logData } = await serviceClient
      .from('maintenance_tasks')
      .select('vehicle_id, task, due_date, done_at')
      .eq('user_id', user.id)
      .in('vehicle_id', vehicleIds)
      .limit(100)
    maintenanceRows = logData ?? []
  }

  const systemInstruction = EARL_SYSTEM_PROMPT + buildVehicleContext(vehicles ?? [], oemCatalog, matchingParts, twinModelByVehicle, maintenanceRows)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
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
    const { reply, redactedCount } = verifyPartNumbers(result.response.text().trim(), matchingParts)
    if (redactedCount > 0) {
      console.warn(`[chat-earl] redacted ${redactedCount} unverified part number(s)`)
    }
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    console.error('[chat-earl]', err)
    return NextResponse.json({ error: 'Failed to get a response. Please try again.' }, { status: 500 })
  }
}
