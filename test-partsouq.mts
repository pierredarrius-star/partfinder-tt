import { launch } from 'cloakbrowser';

const VIN = 'MBJUYMM1SSE172702';
const MODEL_YEAR = '2025'; // VIN position 10: S = 2025

// PartSouq prod-period format is "MM.YYYY - ..." — we match on year
function vinYearToProdPeriod(year: string) {
  return year; // e.g. "2025" matches "04.2025 - ..."
}

async function run() {
  console.log(`\nSearching PartSouq for VIN: ${VIN} (${MODEL_YEAR} model)\n`);

  const browser = await launch({
    headless: false,
    humanize: true,
    humanPreset: 'default',
    locale: 'en-US',
    timezone: 'America/Port_of_Spain',
  });

  try {
    const page = await browser.newPage();

    // Step 1: VIN search
    const searchUrl = `https://partsouq.com/en/search/all?q=${encodeURIComponent(VIN)}`;
    console.log('Step 1 — search:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 });
    console.log('Cleared. Title:', await page.title());

    // Step 2: collect all vehicle links with their text
    const linkEls = await page.locator('a[href*="/catalog/genuine/vehicle"]').all();
    console.log(`Found ${linkEls.length} vehicle variant links`);

    type VehicleLink = { text: string; href: string };
    const links: VehicleLink[] = await Promise.all(
      linkEls.map(async (el) => ({
        text: (await el.textContent())?.trim() ?? '',
        href: await el.getAttribute('href') ?? '',
      }))
    );

    // Each table row has 5 links with the same href — deduplicate by href
    const seen = new Set<string>();
    const variants = links.filter(({ href }) => {
      if (seen.has(href)) return false;
      seen.add(href);
      return true;
    });
    console.log(`Unique variants: ${variants.length}`);

    // Step 3: pick the variant whose production period matches the VIN year
    const yearStr = vinYearToProdPeriod(MODEL_YEAR);
    // Find the prod-period link text (e.g. "04.2025 - ...")
    const periodLinks = links.filter(({ text }) => text.includes(yearStr));

    // Use the href from the first matching period link
    const bestHref = periodLinks.length > 0 ? periodLinks[0].href : variants[0].href;
    console.log(`\nBest variant href (${yearStr}):`, bestHref.slice(0, 80) + '...');

    // Step 4: navigate to vehicle page
    console.log('\nStep 4 — vehicle page...');
    await page.goto(`https://partsouq.com${bestHref}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 }).catch(() => null);
    console.log('Vehicle page title:', await page.title());

    // Step 5: find and navigate to the Groups page (full parts category tree)
    const groupsLink = page.locator('a[href*="/catalog/genuine/groups"]').first();
    const groupsHref = await groupsLink.getAttribute('href');
    if (!groupsHref) {
      console.log('No groups link found — check vehicle page manually');
      await page.waitForTimeout(30000);
      return;
    }
    console.log('\nStep 5 — groups page:', groupsHref.slice(0, 80) + '...');
    await page.goto(`https://partsouq.com${groupsHref}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 }).catch(() => null);
    console.log('Groups page title:', await page.title());

    // Wait extra time for JS-rendered group list to appear
    console.log('Waiting 5s for JS to render groups...');
    await page.waitForTimeout(5000);

    // Step 6: dump ALL links on the page to find the right selector
    const allLinks = await page.locator('a').all();
    console.log(`\nAll links on groups page (${allLinks.length} total):`);
    for (const a of allLinks) {
      const href = await a.getAttribute('href');
      const text = (await a.textContent())?.trim();
      if (text && text.length > 1) {
        console.log(`  [${text}]  →  ${href}`);
      }
    }

    console.log('\nBrowser stays open for 30s — inspect DevTools now...');
    await page.waitForTimeout(30000);

  } finally {
    await browser.close();
    console.log('\nDone.');
  }
}

run().catch(console.error);
