/**
 * Deep-scan all PartSouq OEM categories for a vehicle and save individual parts + numbers.
 * Resumes from where it left off — safe to restart if interrupted.
 *
 * Run with: npx tsx deep-scan-oem-parts.mts
 *
 * Runtime estimate: ~5–8s per category page. For 365 categories expect 30–50 min.
 */
import { launch } from 'cloakbrowser';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const VEHICLE_ID = '77d9b139-8d09-4522-8166-c661c754909f';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Part {
  part_number: string;
  part_name: string;
  remarks: string | null;
}

async function scrapePartsPage(page: any, url: string): Promise<Part[]> {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(
    () => !document.title.includes('Just a moment'),
    { timeout: 30000 }
  ).catch(() => null);

  const tables = await page.locator('table').all();
  const parts: Part[] = [];

  for (const table of tables) {
    const rows = await table.locator('tr').all();
    if (rows.length < 2) continue;

    // Only process parts tables (first header cell = "Number")
    const headerCells = await rows[0].locator('th, td').all();
    const firstHeader = (await headerCells[0]?.textContent())?.trim();
    if (firstHeader !== 'Number') continue;

    for (const row of rows.slice(1)) {
      const cells = await row.locator('td').all();
      if (cells.length < 2) continue;
      const part_number = (await cells[0].textContent())?.trim() ?? '';
      const part_name   = (await cells[1].textContent())?.trim() ?? '';
      const remarks     = (await cells[3]?.textContent())?.trim() || null;
      if (part_number && part_name) {
        parts.push({ part_number, part_name, remarks });
      }
    }
  }

  return parts;
}

async function run() {
  // 1. Load all categories for this vehicle
  const { data: categories, error: catErr } = await supabase
    .from('vehicle_oem_catalog')
    .select('category_name, category_url')
    .eq('vehicle_id', VEHICLE_ID)
    .order('id');

  if (catErr || !categories?.length) {
    console.error('Failed to load categories:', catErr?.message);
    process.exit(1);
  }
  console.log(`\nLoaded ${categories.length} categories for vehicle ${VEHICLE_ID}`);

  // 2. Find which categories already have parts scraped (resume support)
  const { data: done } = await supabase
    .from('vehicle_oem_parts')
    .select('category_name')
    .eq('vehicle_id', VEHICLE_ID);

  const doneSet = new Set((done ?? []).map((r: any) => r.category_name));
  const todo = categories.filter((c: any) => !doneSet.has(c.category_name));
  console.log(`Already scraped: ${doneSet.size}  |  Remaining: ${todo.length}\n`);

  if (todo.length === 0) {
    console.log('All categories already scraped. Done.');
    process.exit(0);
  }

  // 3. Launch browser once and reuse across all pages
  const browser = await launch({
    headless: true,
    humanize: true,
    humanPreset: 'default',
    locale: 'en-US',
    timezone: 'America/Port_of_Spain',
  });

  const page = await browser.newPage();
  let totalParts = 0;
  let i = 0;

  try {
    for (const cat of todo) {
      i++;
      process.stdout.write(`[${i}/${todo.length}] ${cat.category_name} ... `);

      try {
        const parts = await scrapePartsPage(page, cat.category_url);

        if (parts.length > 0) {
          const { error } = await supabase.from('vehicle_oem_parts').insert(
            parts.map((p) => ({
              vehicle_id: VEHICLE_ID,
              category_name: cat.category_name,
              part_number: p.part_number,
              part_name: p.part_name,
              remarks: p.remarks,
            }))
          );
          if (error) {
            console.log(`DB error: ${error.message}`);
          } else {
            totalParts += parts.length;
            console.log(`${parts.length} parts saved`);
          }
        } else {
          // Insert a placeholder so resume skips this category next time
          await supabase.from('vehicle_oem_parts').insert({
            vehicle_id: VEHICLE_ID,
            category_name: cat.category_name,
            part_number: '__empty__',
            part_name: '__empty__',
            remarks: null,
          });
          console.log(`0 parts (placeholder saved)`);
        }
      } catch (err: any) {
        console.log(`ERROR: ${err.message}`);
        // Don't insert placeholder — will retry on next run
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✓ Done. ${totalParts} parts saved across ${i} categories.`);
  console.log('\nFinal DB count:');
  const { count } = await supabase
    .from('vehicle_oem_parts')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', VEHICLE_ID)
    .neq('part_number', '__empty__');
  console.log(`  ${count} real parts in vehicle_oem_parts`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
