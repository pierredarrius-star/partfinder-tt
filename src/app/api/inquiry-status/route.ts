import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

// Guest searches own no auth session, so the results page cannot read
// inquiries/supplier_responses through RLS. The inquiry UUID acts as the
// access token: only the searcher who received it can poll this route.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const [inquiryRes, repliesRes, countRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, part_query, vin, status')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('supplier_responses')
      .select(
        'id, price, response_text, status, responded_at, suppliers(name, store_location, phone_number)'
      )
      .eq('inquiry_id', id)
      .eq('status', 'replied')
      .order('responded_at', { ascending: true }),
    supabase
      .from('supplier_responses')
      .select('*', { count: 'exact', head: true })
      .eq('inquiry_id', id),
  ]);

  if (inquiryRes.error) {
    console.error('[inquiry-status] inquiry query failed:', inquiryRes.error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }

  if (!inquiryRes.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (repliesRes.error) {
    console.error('[inquiry-status] responses query failed:', repliesRes.error);
  }

  return NextResponse.json({
    inquiry: inquiryRes.data,
    responses: repliesRes.data ?? [],
    totalContacted: countRes.count ?? 0,
  });
}
