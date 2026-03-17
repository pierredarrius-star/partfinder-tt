import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { executeParallelSearch } from '@/lib/orchestrator';

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

    // --- Demo Mode Check (Moved Up) ---
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
      console.warn("[SEARCH DEMO] Skipping DB and returning fake inquiry ID.");
      return NextResponse.json({ 
        success: true, 
        inquiryId: "demo-inquiry-123",
        message: 'Search started successfully (demo mode)'
      });
    }

    const fullQuery = `${partName} - ${vehicleDetails || 'Unknown Vehicle'} ${vin ? `(VIN: ${vin})` : ''}`;

    // 1. Create a new Anonymous User Profile if one doesn't exist for this session
    let userId = '00000000-0000-0000-0000-000000000000'; 
    try {
      const { data: userCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!userCheck) {
         await supabase.from('profiles').insert([
           { id: userId, full_name: 'Guest User', phone_number: '+18685550000' }
         ]);
      }
    } catch (e) {
      console.warn("Could not handle user profile, continuing with inquiry insert.");
    }

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
    executeParallelSearch(inquiry.id, fullQuery).catch(console.error);

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
