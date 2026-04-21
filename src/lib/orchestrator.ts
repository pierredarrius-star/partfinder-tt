import { supabase } from './supabase';
import { normalizePartQuery, generateSupplierMessage } from './ai';
import { sendWhatsAppMessage } from './whatsapp';

/**
 * 1. Takes the raw query, cleans it with AI
 * 2. Gets all T&T suppliers
 * 3. Sends messages in parallel
 */
export async function executeParallelSearch(inquiryId: string, rawQuery: string) {
  try {
    // 1. Clean the Query with Gemini
    const cleanItemName = await normalizePartQuery(rawQuery);
    console.log(`[AI] Cleaned "${rawQuery}" -> "${cleanItemName}"`);
    
    // Update the inquiry with the clean name
    await supabase.from('inquiries')
      .update({ part_query: cleanItemName, status: 'contacting_suppliers' })
      .eq('id', inquiryId);

    // 2. Draft the AI Message once
    const exactMessage = await generateSupplierMessage(cleanItemName);
    console.log(`[AI] Generated Message: "${exactMessage}"`);

    // 3. Get all active suppliers that haven't opted out
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_opt_out', false);

    if (!suppliers || suppliers.length === 0) {
      console.warn("No valid suppliers found in T&T to contact.");
      return;
    }

    console.log(`[SYS] Starting parallel WhatsApp blast to ${suppliers.length} suppliers...`);

    // 4. BLAST IN PARALLEL! Send WhatsApp to all stores at the exact same time
    const broadcastPromises = suppliers.map(async (supplier: any) => {
      const success = await sendWhatsAppMessage(supplier.whatsapp_number, exactMessage);
      
      // Log the attempt into the DB so the user can see the system working
      return supabase.from('supplier_responses').insert([{
        inquiry_id: inquiryId,
        supplier_id: supplier.id,
        status: success ? 'contacted' : 'failed',
      }]);
    });

    // We await all of them finishing
    await Promise.all(broadcastPromises);

    console.log(`[SYS] Parallel blast complete.`);

  } catch (err) {
    console.error("Parallel Search Logic failed:", err);
  }
}
