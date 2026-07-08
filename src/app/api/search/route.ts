import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { executeParallelSearch } from '@/lib/orchestrator';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partName, vehicleDetails, vin } = body;

    if (!partName) {
      return NextResponse.json(
        { error: 'Part name is required' },
        { status: 400 }
      );
    }

    // --- Demo Mode Check ---
    // Only fall back to demo if Supabase is not configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_')) {
      console.warn("[SEARCH DEMO] Supabase not configured, returning fake inquiry ID.");
      return NextResponse.json({
        success: true,
        inquiryId: "demo-inquiry-123",
        message: 'Search started successfully (demo mode)'
      });
    }

    // Full sign-up model: the search must belong to the logged-in user.
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to search' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const fullQuery = `${partName} - ${vehicleDetails || 'Unknown Vehicle'} ${vin ? `(VIN: ${vin})` : ''}`;

    // inquiries.user_id references profiles(id) — make sure this user has a row.
    const userId = user.id;
    await supabase
      .from('profiles')
      .upsert([{ id: userId, full_name: user.email ?? 'PartFinder User' }], { onConflict: 'id', ignoreDuplicates: true });

    // 3. Insert the inquiry into the database
    const { data: inquiry, error: insertError } = await supabase
      .from('inquiries')
      .insert([
        {
          user_id: userId,
          part_query: fullQuery,
          vin: vin || null,
          status: 'pending_search'
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Trigger the AI Workflow in the background
    // We execute this without awaiting so the user isn't stuck waiting for the UI to load
    // In production, this would be pushed to a queue (like Inngest, Upstash, or Supabase Edge Functions)
    waitUntil(executeParallelSearch(inquiry.id, fullQuery).catch(console.error));

    return NextResponse.json({
      success: true,
      inquiryId: inquiry.id,
      message: 'Search started successfully'
    });

  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
