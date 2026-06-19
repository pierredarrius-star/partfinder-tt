import { launch } from 'cloakbrowser';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { vin, frame, vehicle_id, year } = await req.json();

  // Search by VIN when present, otherwise by frame/chassis number (JDM imports).
  const query = (vin || frame || '').trim();
  if (!query) {
    return NextResponse.json({ error: 'vin or frame required' }, { status: 400 });
  }

  const browser = await launch({
    headless: process.env.PARTSOUQ_DEBUG !== 'true', // set PARTSOUQ_DEBUG=true in .env.local to open a visible window
    humanize: true,
    humanPreset: 'default',
    locale: 'en-US',
    timezone: 'America/Port_of_Spain',
  });

  try {
    const page = await browser.newPage();

    // Step 1: search by VIN or frame number
    const searchUrl = `https://partsouq.com/en/search/all?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(
      () => !document.title.includes('Just a moment'),
      { timeout: 30000 }
    );

    // Step 2: collect all vehicle variant links and deduplicate by href
    const linkEls = await page.locator('a[href*="/catalog/genuine/vehicle"]').all();
    if (linkEls.length === 0) {
      return NextResponse.json({ error: 'no vehicle found for this VIN', vin });
    }

    const allLinks = await Promise.all(
      linkEls.map(async (el) => ({
        text: (await el.textContent())?.trim() ?? '',
        href: await el.getAttribute('href') ?? '',
      }))
    );

    // Pick the variant whose production period matches the vehicle year
    // Production period text looks like "04.2025 - ..." — match on year string
    const yearStr = year ? String(year) : null;
    const periodMatches = yearStr
      ? allLinks.filter(({ text }) => text.includes(yearStr))
      : [];
    const bestHref = periodMatches.length > 0 ? periodMatches[0].href : allLinks[0].href;
    const bestLabel = allLinks[0].text; // "URBANCRUISER HYRYDER" etc.

    // Step 3: vehicle page
    await page.goto(`https://partsouq.com${bestHref}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(
      () => !document.title.includes('Just a moment'),
      { timeout: 30000 }
    ).catch(() => null);

    // Step 4: groups page (full category tree)
    const groupsHref = await page
      .locator('a[href*="/catalog/genuine/groups"]')
      .first()
      .getAttribute('href')
      .catch(() => null);

    if (groupsHref) {
      await page.goto(`https://partsouq.com${groupsHref}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(
        () => !document.title.includes('Just a moment'),
        { timeout: 30000 }
      ).catch(() => null);
      await page.waitForTimeout(5000); // JS-rendered group list
    }

    // Step 5: scrape part categories — selector confirmed via live test
    const partLinks = await page.locator('a[href*="/catalog/genuine/parts"]').all();
    const categories = (
      await Promise.all(
        partLinks.map(async (el) => ({
          name: (await el.textContent())?.trim() ?? '',
          url: `https://partsouq.com${await el.getAttribute('href')}`,
        }))
      )
    ).filter((c) => c.name);

    // Step 6: persist to DB if vehicle_id provided
    if (vehicle_id && categories.length > 0) {
      // Clear stale catalog first, then insert fresh rows
      await serviceClient.from('vehicle_oem_catalog').delete().eq('vehicle_id', vehicle_id);
      await serviceClient.from('vehicle_oem_catalog').insert(
        categories.map((c) => ({
          vehicle_id,
          category_name: c.name,
          category_url: c.url,
        }))
      );
    }

    return NextResponse.json({
      vin,
      vehicle: bestLabel,
      vehiclePageUrl: `https://partsouq.com${bestHref}`,
      partGroups: categories,
    });

  } finally {
    await browser.close();
  }
}
