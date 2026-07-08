import { NextResponse } from 'next/server';
import { getServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';

// Service-role reads (supplier_responses has no client SELECT path for
// joins), but only for the signed-in user who owns the inquiry.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const supabase = getServiceClient();

  const [inquiryRes, repliesRes, countRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, part_query, vin, status, user_id, created_at')
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

  // Not-found and not-yours look identical from outside.
  if (!inquiryRes.data || inquiryRes.data.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (repliesRes.error) {
    console.error('[inquiry-status] responses query failed:', repliesRes.error);
  }

  const { user_id: _owner, ...inquiry } = inquiryRes.data;
  return NextResponse.json({
    inquiry,
    responses: repliesRes.data ?? [],
    totalContacted: countRes.count ?? 0,
  });
}
