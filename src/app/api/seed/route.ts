import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Dev-only seeding — builds its own client so page bundles don't carry one.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1. Array of Mock Suppliers for Trinidad & Tobago
    const suppliers = [
      {
        name: "Mathura's Auto Supplies",
        whatsapp_number: "+18685551001",
        phone_number: "+18685551001",
        store_location: "San Juan, Trinidad",
        is_vip: true,
        is_opt_out: false,
      },
      {
        name: "D&D Auto Spares",
        whatsapp_number: "+18685551002",
        phone_number: "+18685551002",
        store_location: "Chaguanas, Trinidad",
        is_vip: false,
        is_opt_out: false,
      },
      {
        name: "Laughlin & De Gannes",
        whatsapp_number: "+18685551003",
        phone_number: "+18685551003",
        store_location: "Port of Spain, Trinidad",
        is_vip: true,
        is_opt_out: false,
      },
      {
        name: "Trinpart Ltd",
        whatsapp_number: "+18685551004",
        phone_number: "+18685551004",
        store_location: "San Fernando, Trinidad",
        is_vip: false,
        is_opt_out: true, // Example of a store that doesn't want AI calls
      }
    ];

    // 2. Demo Mode Check
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
      console.warn("[SEED DEMO] Skipping DB seed and returning success.");
      return NextResponse.json({
        success: true,
        message: 'Successfully (Simulated) seeded database for Demo Mode',
        count: suppliers.length
      });
    }

    // Insert suppliers ignoring duplicates if we run this multiple times
    const { data, error } = await supabase
      .from('suppliers')
      .upsert(suppliers, { onConflict: 'whatsapp_number' })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded database with T&T suppliers',
      count: data?.length || 0
    });

  } catch (error: any) {
    console.error('Seeder Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while seeding' },
      { status: 500 }
    );
  }
}
