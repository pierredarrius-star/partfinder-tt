/**
 * Seed Earl's OEM parts data for the common T&T vehicles — runs from a home
 * connection (laptop), talking to the official PartSouq JSON API.
 *
 * Transport (all four pieces required to pass Cloudflare, verified 2026-07-06):
 *   - Git's curl.exe (Schannel TLS build passes CF fingerprinting; System32's curl and
 *     node fetch/undici get 403 — same request, different TLS handshake)
 *   - Chrome User-Agent
 *   - cookie jar: a GET /search/vehicle first earns the __cf_bm clearance cookie
 *   - Origin/Referer/X-Requested-With headers on POSTs
 *
 * Data model: seed cars are user_vehicles rows owned by a dedicated seed auth user
 * (vehicle_oem_* tables have an FK to user_vehicles, and Earl reads by vehicle_id
 * with the service client, so RLS never sees these). Donor frame numbers are found
 * by probing plausible serial ranges — any real vehicle of the chassis works as a
 * catalog donor.
 *
 * Run:  npx tsx seed-common-cars.mts            # all cars (resume-safe, skips seeded)
 *       npx tsx seed-common-cars.mts --car NZE144   # one car only
 */
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SEED_EMAIL = 'seed-vehicles@partfinder.tt';
const GROUND_TRUTH = { chassis: 'NZE144', part: '8954212100' }; // hand-verified front-RH ABS sensor

// ── target cars ───────────────────────────────────────────────────────────────
// Serial ladders: JDM frame serials are dense sequential ranges, so a spread of
// plausible serials nearly always lands on a real car. Toyota/Honda = 7 digits,
// Nissan = 6. Any real car of the chassis is a valid catalog donor.
const T7 = ['1000123', '2000123', '3000123', '4000123', '5000123', '6000123', '7000123'];
const H7 = ['1000123', '1100123', '1200123', '1300123', '1400123', '1500123', '1700123', '2000123', '2100123', '3000123'];
const N6 = ['000123', '010123', '050123', '100123', '200123', '300123', '400123', '500123', '600123', '700123', '800123', '900123'];

type Car = { chassis: string; brand: string; name: string; frames: string[] };
const CARS: Car[] = [
  { chassis: 'NZE144', brand: 'toyota', name: 'corolla axio', frames: ['NZE144-6008051'] },
  { chassis: 'NZE161', brand: 'toyota', name: 'corolla fielder', frames: T7.map((s) => `NZE161-${s}`) },
  { chassis: 'NHP10', brand: 'toyota', name: 'aqua', frames: T7.map((s) => `NHP10-${s}`) },
  { chassis: 'E12', brand: 'nissan', name: 'note', frames: N6.map((s) => `E12-${s}`) },
  { chassis: 'TB17', brand: 'nissan', name: 'sylphy', frames: N6.map((s) => `TB17-${s}`) },
  { chassis: 'RU1', brand: 'honda', name: 'vezel', frames: H7.map((s) => `RU1-${s}`) },
  { chassis: 'RU3', brand: 'honda', name: 'vezel', frames: H7.map((s) => `RU3-${s}`) },
  { chassis: 'NGX10', brand: 'toyota', name: 'c-hr', frames: T7.map((s) => `NGX10-${s}`) },
  { chassis: 'ZYX10', brand: 'toyota', name: 'c-hr', frames: T7.map((s) => `ZYX10-${s}`) },
  { chassis: 'T32', brand: 'nissan', name: 'x-trail', frames: N6.map((s) => `T32-${s}`) },
  { chassis: 'HT32', brand: 'nissan', name: 'x-trail', frames: N6.map((s) => `HT32-${s}`) },
  { chassis: 'MXPB10', brand: 'toyota', name: 'yaris cross', frames: T7.map((s) => `MXPB10-${s}`) },
  { chassis: 'MXPJ10', brand: 'toyota', name: 'yaris cross', frames: T7.map((s) => `MXPJ10-${s}`) },
  { chassis: 'P15', brand: 'nissan', name: 'kicks', frames: N6.map((s) => `P15-${s}`) },
  { chassis: 'HYRYDER', brand: 'toyota', name: 'hyryder urban cruiser', frames: ['MBJUYMM1SSE172702'] },
];

// What Earl actually gets asked — each term is one catalog/search POST per car.
const QUERIES = [
  'oil filter', 'air filter', 'cabin air filter', 'fuel filter', 'spark plug',
  'ignition coil', 'battery', 'brake pad', 'brake disc', 'brake shoe',
  'brake caliper', 'brake master cylinder', 'wheel cylinder', 'drive belt',
  'timing chain', 'water pump', 'thermostat', 'radiator', 'radiator hose',
  'alternator', 'starter', 'engine mount', 'shock absorber', 'coil spring',
  'stabilizer link', 'control arm', 'ball joint', 'tie rod end', 'steering rack',
  'wheel bearing', 'drive shaft', 'cv joint', 'wiper blade', 'headlamp',
  'tail lamp', 'front bumper', 'rear bumper', 'grille', 'fender', 'door mirror',
  'fuel pump', 'oxygen sensor', 'abs sensor', 'window regulator', 'clutch disc',
  'fuel tank',
];

// ── PartSouq transport ────────────────────────────────────────────────────────
const CURL = 'C:\\Program Files\\Git\\mingw64\\bin\\curl.exe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const JAR = join(tmpdir(), 'psq-seed-cookies.jar');
const BROWSERY = ['-H', 'Origin: https://partsouq.com', '-H', 'Referer: https://partsouq.com/en/catalog/genuine/vehicle', '-H', 'X-Requested-With: XMLHttpRequest'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pace = () => sleep(1200 + Math.random() * 400); // be gentle: unannounced public API

function rawCall(method: string, path: string, body?: unknown) {
  const args = ['-s', '--max-time', '45', '-A', UA, '-H', 'Accept: application/json', '-b', JAR, '-c', JAR, '-w', '\n__HTTP:%{http_code}__'];
  if (method === 'POST') {
    args.push(...BROWSERY, '-X', 'POST', '-H', 'Content-Type: application/json', '--data-binary', JSON.stringify(body));
  }
  args.push('https://partsouq.com/api' + path);
  const out = execFileSync(CURL, args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const m = out.match(/__HTTP:(\d+)__\s*$/);
  let json: any = null;
  try { json = JSON.parse(out.replace(/\n__HTTP:\d+__\s*$/, '')); } catch { /* challenge HTML */ }
  return { status: m ? +m[1] : 0, json };
}

let consecutiveBlocks = 0;
async function api(method: string, path: string, body?: unknown) {
  let res = rawCall(method, path, body);
  if (res.status === 403) {
    // re-earn clearance with a GET, wait, retry once
    await sleep(6000);
    rawCall('GET', '/search/vehicle?q=NZE144-6008051');
    await sleep(1500);
    res = rawCall(method, path, body);
  }
  if (res.status === 403) {
    consecutiveBlocks++;
    if (consecutiveBlocks >= 3) {
      console.error('\n✗ 3 consecutive Cloudflare blocks — stopping so the IP cools down. Re-run later; the script resumes where it left off.');
      process.exit(2);
    }
  } else {
    consecutiveBlocks = 0;
  }
  return res;
}

// ── seed user ─────────────────────────────────────────────────────────────────
async function getSeedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('listUsers: ' + error.message);
  const existing = data.users.find((u) => u.email === SEED_EMAIL);
  if (existing) return existing.id;
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    email_confirm: true,
    user_metadata: { purpose: 'oem-seed-garage — donor cars for shared parts catalogs, not a real user' },
  });
  if (cErr || !created.user) throw new Error('createUser: ' + cErr?.message);
  console.log('Created seed user', created.user.id);
  return created.user.id;
}

// ── per-car steps ─────────────────────────────────────────────────────────────
type Veh = { catalog: string; vehicleId: string | number; ssd: string; brand?: string; name?: string; attributes?: any };

async function resolveDonor(car: Car): Promise<{ frame: string; veh: Veh } | null> {
  for (const frame of car.frames) {
    const r = await api('GET', '/search/vehicle?q=' + encodeURIComponent(frame));
    // A frame prefix can collide across brands (RU1-… matched a 1980s Nissan
    // Bluebird, not the Honda Vezel) — only accept a donor of the right brand.
    const candidates: any[] = r.json?.response?.data ?? [];
    const veh = candidates.find((v) =>
      v?.catalog && v?.ssd &&
      (String(v.brand ?? '').toLowerCase().includes(car.brand) || String(v.catalog ?? '').toLowerCase().includes(car.brand))
    );
    if (r.status === 200 && veh) return { frame, veh };
    await pace();
  }
  return null;
}

async function ensureVehicleRow(userId: string, car: Car, frame: string, veh: Veh): Promise<string> {
  const { data: existing } = await supabase
    .from('user_vehicles')
    .select('id')
    .eq('user_id', userId)
    .eq('model_code', car.chassis.toLowerCase())
    .limit(1);
  if (existing?.length) return existing[0].id;

  const isVin = /^[A-Z0-9]{17}$/i.test(frame);
  const yearMatch = String(veh.attributes?.date?.value ?? '').match(/(\d{4})/);
  const { data, error } = await supabase
    .from('user_vehicles')
    .insert({
      user_id: userId,
      nickname: `[seed] ${car.chassis}`,
      brand: car.brand,
      name: car.name,
      model_code: car.chassis.toLowerCase(),
      frame_number: isVin ? null : frame,
      vin: isVin ? frame.toUpperCase() : null,
      year: yearMatch ? +yearMatch[1] : null,
      is_primary: false,
    })
    .select('id')
    .single();
  if (error) throw new Error('user_vehicles insert: ' + error.message);
  return data.id;
}

async function seedCatalogTree(vehicleId: string, veh: Veh): Promise<number> {
  const { count } = await supabase
    .from('vehicle_oem_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId);
  if ((count ?? 0) > 0) return count!;

  const r = await api('POST', '/catalog/vehicle', { c: veh.catalog, ssd: veh.ssd, vid: veh.vehicleId, vin: '', cid: '' });
  const names: { name: string; cid: string }[] = [];
  const walk = (nodes: any[]) => (nodes ?? []).forEach((n) => { if (n?.name) names.push({ name: String(n.name), cid: String(n.cid ?? '') }); walk(n.children); });
  walk(r.json?.response?.categories ?? []);
  if (names.length === 0) return 0;

  const seen = new Set<string>();
  const rows = names.filter((n) => !seen.has(n.name) && seen.add(n.name)).map((n) => ({
    vehicle_id: vehicleId,
    category_name: n.name,
    category_url: `api://catalog/${n.cid}`, // provenance marker; API-seeded rows have no scrapeable web URL
  }));
  const { error } = await supabase.from('vehicle_oem_catalog').insert(rows);
  if (error) console.error('  catalog insert error:', error.message);
  return rows.length;
}

async function seedParts(vehicleId: string, veh: Veh): Promise<number> {
  type Row = { vehicle_id: string; category_name: string; part_number: string; part_name: string; remarks: string | null };
  const rows: Row[] = [];
  const seen = new Set<string>();

  for (const term of QUERIES) {
    await pace();
    const r = await api('POST', '/catalog/search', { c: veh.catalog, ssd: veh.ssd, vid: veh.vehicleId, s: term, vin: '', cid: '' });
    const units: any[] = r.json?.response?.search?.units ?? [];
    let added = 0;
    for (const unit of units.slice(0, 8)) { // top units only; deep tails are fuzzy-match noise
      const category = String(unit?.diagram?.name ?? 'Parts').trim() || 'Parts';
      for (const p of unit?.parts ?? []) {
        const number = String(p?.number ?? '').replace(/\s+/g, '');
        const name = String(p?.name ?? '').trim();
        if (!number || !name) continue;
        const key = `${number}|${name}|${category}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ vehicle_id: vehicleId, category_name: category, part_number: number, part_name: name, remarks: null });
        added++;
      }
    }
    process.stdout.write(`    ${term}: ${r.status === 200 ? added + ' parts' : 'HTTP ' + r.status}\n`);
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('vehicle_oem_parts').insert(rows.slice(i, i + 500));
    if (error) console.error('  parts insert error:', error.message);
  }
  return rows.length;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  if (!existsSync(CURL)) { console.error('Git curl not found at ' + CURL); process.exit(1); }
  const only = process.argv.includes('--car') ? process.argv[process.argv.indexOf('--car') + 1]?.toUpperCase() : null;
  const targets = only ? CARS.filter((c) => c.chassis === only) : CARS;
  if (targets.length === 0) { console.error('Unknown --car. Chassis codes: ' + CARS.map((c) => c.chassis).join(', ')); process.exit(1); }

  const userId = await getSeedUserId();
  console.log(`Seed user: ${userId} | cars: ${targets.length}\n`);
  const summary: string[] = [];

  for (const car of targets) {
    console.log(`── ${car.chassis} (${car.brand} ${car.name}) ──`);

    // resume: skip cars that already have parts
    const { data: existingVeh } = await supabase
      .from('user_vehicles').select('id').eq('user_id', userId).eq('model_code', car.chassis.toLowerCase()).limit(1);
    if (existingVeh?.length) {
      const { count } = await supabase
        .from('vehicle_oem_parts').select('*', { count: 'exact', head: true }).eq('vehicle_id', existingVeh[0].id);
      if ((count ?? 0) > 0) { console.log(`  already seeded (${count} parts) — skipping\n`); summary.push(`${car.chassis}: already seeded (${count})`); continue; }
    }

    const donor = await resolveDonor(car);
    if (!donor) { console.log('  ✗ no donor frame resolved — skipping\n'); summary.push(`${car.chassis}: NO DONOR FRAME`); continue; }
    console.log(`  donor ${donor.frame} → ${donor.veh.name ?? ''} [${donor.veh.catalog}]`);

    const vehicleId = await ensureVehicleRow(userId, car, donor.frame, donor.veh);
    await pace();
    const cats = await seedCatalogTree(vehicleId, donor.veh);
    const parts = await seedParts(vehicleId, donor.veh);
    console.log(`  ✓ ${cats} catalog nodes, ${parts} parts\n`);
    summary.push(`${car.chassis}: ${parts} parts (${cats} catalog nodes)`);

    if (car.chassis === GROUND_TRUTH.chassis) {
      const { count } = await supabase
        .from('vehicle_oem_parts').select('*', { count: 'exact', head: true })
        .eq('vehicle_id', vehicleId).eq('part_number', GROUND_TRUTH.part);
      console.log(`  GROUND TRUTH ${GROUND_TRUTH.part}: ${count ? 'PRESENT ✓' : 'MISSING ✗'}\n`);
    }
  }

  console.log('══ SUMMARY ══');
  summary.forEach((s) => console.log('  ' + s));
}

run().catch((err) => { console.error(err); process.exit(1); });
