import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// TEMP research route: does PartSouq's API accept Vercel's server-side fetch
// (undici TLS fingerprint), or does Cloudflare 403 it like it does locally?
// Read-only, anonymous, two light GETs. Remove after the test.
export async function GET() {
  const results: Record<string, unknown> = {};
  const targets: [string, string][] = [
    ['mainInfo', 'https://partsouq.com/api/main/info'],
    ['vehicleSearch', 'https://partsouq.com/api/search/vehicle?q=NZE144-6008051'],
  ];

  for (const [name, url] of targets) {
    try {
      const r = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'PartFinderTT/1.0' },
        cache: 'no-store',
      });
      const text = await r.text();
      results[name] = { status: r.status, snippet: text.slice(0, 180) };
    } catch (e) {
      results[name] = { error: String(e) };
    }
  }

  return NextResponse.json(results);
}
