import { NextResponse } from 'next/server';
import https from 'node:https';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

// TEMP research route: two engines side by side against PartSouq's Cloudflare —
// global fetch (undici) vs Node's built-in https module — both with a plain
// (non-browser) User-Agent. Locally, https+botUA passes where fetch fails.
// This checks whether that holds from Vercel's IPs. Remove after the test.

const UA = 'PartFinderTT/1.0';

function viaHttps(url: string): Promise<{ status: number; snippet: string }> {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request(
      { host: u.host, path: u.pathname + u.search, method: 'GET', servername: u.host,
        headers: { 'User-Agent': UA, Accept: 'application/json' } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, snippet: b.slice(0, 160) }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, snippet: 'ERR ' + String(e).slice(0, 120) }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, snippet: 'TIMEOUT' }); });
    req.end();
  });
}

async function viaFetch(url: string): Promise<{ status: number; snippet: string }> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, cache: 'no-store' });
    return { status: r.status, snippet: (await r.text()).slice(0, 160) };
  } catch (e) {
    return { status: 0, snippet: 'ERR ' + String(e).slice(0, 120) };
  }
}

export async function GET() {
  const url = 'https://partsouq.com/api/search/vehicle?q=NZE144-6008051';
  const [httpsResult, fetchResult] = await Promise.all([viaHttps(url), viaFetch(url)]);
  return NextResponse.json({
    node_https_module: httpsResult,
    global_fetch_undici: fetchResult,
    verdict: httpsResult.snippet.includes('"catalog"')
      ? 'DIRECT WORKS via node:https'
      : 'still blocked',
  });
}
