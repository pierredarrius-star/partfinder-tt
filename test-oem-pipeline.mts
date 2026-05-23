/**
 * End-to-end test: scrape PartSouq → save to vehicle_oem_catalog → verify Earl context
 * Run with: npx tsx test-oem-pipeline.mts
 */
import { launch } from 'cloakbrowser';
import { createClient } from '@supabase/supabase-js';

const VIN        = 'MBJUYMM1SSE172702';
const VEHICLE_ID = '77d9b139-8d09-4522-8166-c661c754909f';
const YEAR       = 2025;

const supabase = createClient(
  'https://gsfacqzdhwogegjomyrg.supabase.co',
  'sb_secret_crG1pe4CK-hKUcJyJVmguw_6dWmVsdY'
);

async function scrapeAndStore() {
  console.log('\n=== Step 1: Scrape PartSouq ===');
  console.log(`VIN: ${VIN}  |  vehicle_id: ${VEHICLE_ID}  |  year: ${YEAR}\n`);

  const browser = await launch({
    headless: true,
    humanize: true,
    humanPreset: 'default',
    locale: 'en-US',
    timezone: 'America/Port_of_Spain',
  });

  let categories: { name: string; url: string }[] = [];

  try {
    const page = await browser.newPage();

    // 1. VIN search
    await page.goto(
      `https://partsouq.com/en/search/all?q=${encodeURIComponent(VIN)}`,
      { waitUntil: 'load', timeout: 30000 }
    );
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 });
    console.log('CF cleared. Title:', await page.title());

    // 2. Collect links, deduplicate, pick year-matching variant
    const linkEls = await page.locator('a[href*="/catalog/genuine/vehicle"]').all();
    const allLinks = await Promise.all(
      linkEls.map(async (el) => ({
        text: (await el.textContent())?.trim() ?? '',
        href: await el.getAttribute('href') ?? '',
      }))
    );
    const periodMatches = allLinks.filter(({ text }) => text.includes(String(YEAR)));
    const bestHref = periodMatches.length > 0 ? periodMatches[0].href : allLinks[0].href;
    console.log(`Variants found: ${linkEls.length} links  |  Best href (${YEAR}): ...${bestHref.slice(-40)}`);

    // 3. Vehicle page
    await page.goto(`https://partsouq.com${bestHref}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 }).catch(() => null);
    console.log('Vehicle page:', await page.title());

    // 4. Groups page
    const groupsHref = await page
      .locator('a[href*="/catalog/genuine/groups"]').first()
      .getAttribute('href').catch(() => null);
    if (groupsHref) {
      await page.goto(`https://partsouq.com${groupsHref}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 }).catch(() => null);
      await page.waitForTimeout(5000);
    }

    // 5. Scrape categories
    const partLinks = await page.locator('a[href*="/catalog/genuine/parts"]').all();
    categories = (
      await Promise.all(
        partLinks.map(async (el) => ({
          name: (await el.textContent())?.trim() ?? '',
          url: `https://partsouq.com${await el.getAttribute('href')}`,
        }))
      )
    ).filter((c) => c.name);

    console.log(`\nScraped ${categories.length} OEM categories:`);
    categories.forEach((c) => console.log(`  • ${c.name}`));

  } finally {
    await browser.close();
  }

  if (categories.length === 0) {
    console.error('\nNo categories scraped — aborting DB save.');
    process.exit(1);
  }

  // 6. Save to Supabase
  console.log('\n=== Step 2: Save to vehicle_oem_catalog ===');
  const { error: delErr } = await supabase
    .from('vehicle_oem_catalog')
    .delete()
    .eq('vehicle_id', VEHICLE_ID);
  if (delErr) console.warn('Delete warning:', delErr.message);

  const { error: insErr } = await supabase
    .from('vehicle_oem_catalog')
    .insert(categories.map((c) => ({
      vehicle_id: VEHICLE_ID,
      category_name: c.name,
      category_url: c.url,
    })));

  if (insErr) {
    console.error('Insert failed:', insErr.message);
    process.exit(1);
  }
  console.log(`Saved ${categories.length} rows to vehicle_oem_catalog ✓`);

  // 7. Verify: read back from DB and show what Earl would see
  console.log('\n=== Step 3: Verify — what Earl now sees ===');
  const { data, error: readErr } = await supabase
    .from('vehicle_oem_catalog')
    .select('category_name, scraped_at')
    .eq('vehicle_id', VEHICLE_ID)
    .order('id');

  if (readErr) {
    console.error('Read failed:', readErr.message);
    process.exit(1);
  }

  const names = (data ?? []).map((r) => r.category_name);
  console.log(`\nDB contains ${names.length} categories for this vehicle.`);
  console.log('\nEarl system prompt injection would look like:');
  console.log('─'.repeat(60));
  console.log(`- 2025 Toyota Hyryder Urban Cruiser (VIN: ${VIN})`);
  console.log(`  OEM parts catalog: ${names.join(', ')}`);
  console.log('─'.repeat(60));
  console.log('\nDone. ✓');
}

scrapeAndStore().catch((err) => {
  console.error(err);
  process.exit(1);
});
