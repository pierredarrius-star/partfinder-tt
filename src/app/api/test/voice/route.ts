import { NextResponse } from 'next/server';
import { initiateVoiceCallFallback } from '@/lib/twilio';

/**
 * API Route to trigger a test voice call.
 * POST /api/test/voice
 * Body: { phoneNumber: string }
 */
export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Trigger a call using the existing orchestrator logic
    // We use dummy IDs for testing
    const result = await initiateVoiceCallFallback(
      phoneNumber,
      'test-inquiry-id',
      'test-supplier-id'
    );

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Call initiated to ${phoneNumber}` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Failed to initiate call: ${result.error || 'Unknown error'}` 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Test Voice API Error:", error.message || error);
    return NextResponse.json({ 
      success: false, 
      message: `Server Error: ${error.message || 'Unknown error'}`,
      details: error
    }, { status: 500 });
  }
}
