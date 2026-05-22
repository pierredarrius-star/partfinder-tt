import { NextRequest, NextResponse } from 'next/server';
import { searchWebInventory, liveScrapeFallback } from '@/lib/web-inventory';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'Missing query param ?q=' }, { status: 400 });
  }

  let results = await searchWebInventory(q);

  if (results.length === 0) {
    results = await liveScrapeFallback(q);
  }

  return NextResponse.json({ results });
}
