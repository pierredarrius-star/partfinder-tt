/**
 * Probe a single PartSouq parts page to discover the HTML structure.
 * Run with: npx tsx test-parts-page.mts
 */
import { launch } from 'cloakbrowser';

const BRAKE_PAD_URL =
  'https://partsouq.com/en/catalog/genuine/parts?c=Toyota&ssd=%24%2AKwHE8OHPtJWmmKTHsr7s1pyIqK-xwM_Cw9H-zYWDsKezv7mx4-T0srK-paWjorvh5sOph4OHtrqyuPr48LvGo6KzxsfAmJGPiIGZlbaM0pvbg4fUp7Gjt7rS3o3C3tTN0sDFw8PGn4OR1JqT08zVtrXtlYzPst3GwsfAwp-Rn9rVlpiS1crAnY2fgJTSy9TPyMbng8AAAAAAmEUbVA%3D%3D%24&vid=0&gid=15&q=MBJUYMM1SSE172702';

async function run() {
  const browser = await launch({
    headless: true,
    humanize: true,
    humanPreset: 'default',
    locale: 'en-US',
    timezone: 'America/Port_of_Spain',
  });

  try {
    const page = await browser.newPage();
    await page.goto(BRAKE_PAD_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 30000 });
    console.log('Title:', await page.title());

    // Wait for JS to render
    await page.waitForTimeout(5000);

    // Dump ALL table rows to find the right structure
    const tables = await page.locator('table').all();
    console.log(`\nFound ${tables.length} tables on the page`);

    for (let i = 0; i < tables.length; i++) {
      const rows = await tables[i].locator('tr').all();
      console.log(`\n--- Table ${i + 1} (${rows.length} rows) ---`);
      for (const row of rows.slice(0, 5)) {
        const cells = await row.locator('td, th').all();
        const texts = await Promise.all(cells.map(c => c.textContent().then(t => t?.trim() ?? '')));
        console.log('  ROW:', texts);
      }
      if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more rows`);
    }

    // Also try common part-number selectors
    console.log('\n--- Probing common selectors ---');
    const selectors = [
      '[class*="part"]',
      '[class*="Part"]',
      '[data-part]',
      'td[class*="number"]',
      'td[class*="code"]',
    ];
    for (const sel of selectors) {
      const els = await page.locator(sel).all();
      if (els.length > 0) {
        console.log(`${sel}: ${els.length} elements`);
        const sample = await els[0].textContent();
        console.log(`  Sample: ${sample?.trim().slice(0, 80)}`);
      }
    }

    // Dump page HTML snippet around the first table
    const html = await page.content();
    const tableStart = html.indexOf('<table');
    if (tableStart !== -1) {
      console.log('\n--- First <table> HTML (first 2000 chars) ---');
      console.log(html.slice(tableStart, tableStart + 2000));
    }

  } finally {
    await browser.close();
  }
}

run().catch(console.error);
