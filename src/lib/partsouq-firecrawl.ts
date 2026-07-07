/**
 * Firecrawl-based PartSouq OEM-catalog scraper.
 *
 * Replaces the cloakbrowser/Playwright approach, which cannot launch a browser in
 * Vercel serverless (it fails at launch — HTTP 500 in <1s). Firecrawl runs the
 * browser on its own infrastructure and returns structured data, so this works
 * from a normal serverless function. Validated against partsouq.com on the
 * Firecrawl v2 API.
 *
 * Primitives:
 *  - scrapeCatalog(vinOrFrame)     search -> vehicle -> groups -> category links
 *  - scrapeCategoryParts(catUrl)   one category page -> [{ part_number, part_name, remarks }]
 *
 * Server-only: reads FIRECRAWL_API_KEY. Never import from a client component.
 */

const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v2/scrape'
const PARTSOUQ = 'https://partsouq.com'

export type OemCategory = { name: string; url: string }
export type OemPart = { part_number: string; part_name: string; remarks: string | null }

type FirecrawlData = {
  links?: unknown[]
  markdown?: string
  json?: unknown
  metadata?: Record<string, unknown>
}

/**
 * Low-level Firecrawl v2 scrape. `formats` uses the v2 shape: simple formats are
 * strings (e.g. 'links', 'markdown'); structured extraction is an object
 * ({ type: 'json', prompt, schema }).
 */
async function firecrawlScrape(
  url: string,
  formats: unknown[],
  waitFor = 5000,
): Promise<FirecrawlData> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY is not set')

  const res = await fetch(FIRECRAWL_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats, waitFor }),
  })

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new Error(`Firecrawl ${res.status} for ${url}: ${detail}`)
  }

  const body = await res.json()
  if (!body?.success) throw new Error(`Firecrawl success=false for ${url}`)
  return (body.data ?? {}) as FirecrawlData
}

/**
 * Resolve a VIN or frame/chassis number to its PartSouq catalog and return the
 * part-group categories. Returns [] if the vehicle can't be resolved.
 */
export async function scrapeCatalog(vinOrFrame: string): Promise<OemCategory[]> {
  // 1. Search by VIN/frame.
  const searchUrl = `${PARTSOUQ}/en/search/all?q=${encodeURIComponent(vinOrFrame.trim())}`
  const search = await firecrawlScrape(searchUrl, ['links'], 6000)
  const searchLinks = linksFrom(search)

  // 2. Find the groups (catalog tree) page — directly, or via the vehicle page.
  let groupsUrl = searchLinks.find((l) => l.includes('/catalog/genuine/groups')) ?? null
  if (!groupsUrl) {
    const vehicleUrl = searchLinks.find((l) => l.includes('/catalog/genuine/vehicle'))
    if (!vehicleUrl) return []
    const vehicle = await firecrawlScrape(vehicleUrl, ['links'], 6000)
    groupsUrl = linksFrom(vehicle).find((l) => l.includes('/catalog/genuine/groups')) ?? null
    if (!groupsUrl) return []
  }

  // 3. Groups page -> category (parts) links + their names (from the markdown).
  const groups = await firecrawlScrape(groupsUrl, ['links', 'markdown'], 6000)
  const categoryUrls = unique(
    linksFrom(groups).filter((l) => l.includes('/catalog/genuine/parts')),
  )
  const nameByUrl = markdownLinkNames(groups.markdown ?? '')

  return categoryUrls.map((url) => ({
    name: nameByUrl.get(stripHash(url)) ?? slugName(url),
    url,
  }))
}

/**
 * Scrape one category page and return its parts via Firecrawl JSON extraction.
 * Empty/nameless hardware rows are dropped (matches the prior scraper).
 */
export async function scrapeCategoryParts(categoryUrl: string): Promise<OemPart[]> {
  const data = await firecrawlScrape(
    categoryUrl,
    [
      {
        type: 'json',
        prompt:
          'Extract every spare part row from the parts table(s) on this page. For each, give the OEM part number, the part name/description, and any remarks or notes.',
        schema: {
          type: 'object',
          properties: {
            parts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  part_number: { type: 'string' },
                  part_name: { type: 'string' },
                  remarks: { type: 'string' },
                },
                required: ['part_number'],
              },
            },
          },
        },
      },
    ],
    4000,
  )

  const parts = ((data.json as { parts?: unknown[] } | undefined)?.parts ?? []) as Array<{
    part_number?: string
    part_name?: string
    remarks?: string
  }>

  return parts
    .filter((p) => p.part_number && p.part_name)
    .map((p) => ({
      part_number: String(p.part_number).replace(/\s+/g, ''),
      part_name: String(p.part_name).trim(),
      remarks: p.remarks ? String(p.remarks).trim() : null,
    }))
}

export type DecodedVehicle = {
  brand: string | null
  name: string | null
  modelCode: string | null // e.g. "NZE144-AEXNK" (Toyota) or "NT30" (Nissan frames)
  chassis: string | null // chassis prefix, lowercase, e.g. "nze144" / "nt30"
  year: number | null
  colorCode: string | null // factory paint code, e.g. "040"
  trimColor: string | null // interior color code
  engine: string | null // e.g. "QR20DE"
  body: string | null // e.g. "wagon"
}

/**
 * Decode a VIN or frame number via PartSouq's official JSON API, fetched through
 * Firecrawl (1 credit; the API's GET endpoints pass Cloudflare on the basic
 * proxy — POST endpoints don't, so parts listing stays with the laptop seeder).
 * Returns null on any failure so callers can fall back to the page scrape.
 */
export async function decodeVehicle(vinOrFrame: string): Promise<DecodedVehicle | null> {
  try {
    const q = vinOrFrame.trim()
    const data = await firecrawlScrape(
      `${PARTSOUQ}/api/search/vehicle?q=${encodeURIComponent(q)}`,
      ['markdown'],
      1000,
    )
    // The JSON body comes back wrapped in markdown — cut from first { to last }.
    const text = data.markdown ?? ''
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    const veh = JSON.parse(text.slice(start, end + 1))?.response?.data?.[0]
    if (!veh) return null

    const attr = (k: string) => veh.attributes?.[k]?.value ?? null
    const yearMatch = String(attr('date') ?? '').match(/(\d{4})/)
    const isVin = /^[A-Z0-9]{17}$/i.test(q)
    // Chassis code: Nissan/Honda put it in a `frames` attribute (e.g. "NT30");
    // Toyota embeds it as the prefix of `model` (e.g. "NZE144-AEXNK"). Nissan's
    // `model` is a long Laximo code that is NOT a chassis, so prefer `frames`,
    // then the input frame (if not a VIN), then the model prefix.
    const framesAttr = attr('frames')
    const modelAttr = attr('model')
    const chassisSource = framesAttr || (isVin ? '' : q) || modelAttr || ''
    const chassis = String(chassisSource).split('-')[0].trim().toLowerCase() || null
    return {
      brand: veh.brand ? String(veh.brand).toLowerCase() : null,
      name: veh.name ? String(veh.name).toLowerCase() : null,
      modelCode: framesAttr || modelAttr,
      chassis,
      year: yearMatch ? +yearMatch[1] : null,
      colorCode: attr('framecolor'),
      trimColor: attr('trimcolor'),
      engine: attr('engine') ? String(attr('engine')).toUpperCase() : null,
      body: attr('bodyStyle') ? String(attr('bodyStyle')).toLowerCase() : null,
    }
  } catch {
    return null
  }
}

// --- helpers ---

/** Firecrawl `links` items may be strings or objects; normalize to absolute URLs. */
function linksFrom(data: FirecrawlData): string[] {
  return (data.links ?? [])
    .map((l) => (typeof l === 'string' ? l : ((l as { url?: string; href?: string })?.url ?? (l as { href?: string })?.href ?? '')))
    .filter((l): l is string => Boolean(l))
    .map(absolute)
}

function absolute(href: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  return `${PARTSOUQ}${href.startsWith('/') ? '' : '/'}${href}`
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr))
}

function stripHash(url: string): string {
  const i = url.indexOf('#')
  return i === -1 ? url : url.slice(0, i)
}

/** Build a url -> link-text map from markdown `[text](url)` links (parts pages only). */
function markdownLinkNames(markdown: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    const text = m[1].trim()
    const url = stripHash(m[2].trim())
    if (text && url.includes('/catalog/genuine/parts') && !map.has(url)) {
      map.set(url, text)
    }
  }
  return map
}

/** Fallback category name when the markdown link text isn't found. */
function slugName(url: string): string {
  try {
    const gid = new URL(url).searchParams.get('gid')
    return gid ? `Group ${gid}` : 'Parts'
  } catch {
    return 'Parts'
  }
}
