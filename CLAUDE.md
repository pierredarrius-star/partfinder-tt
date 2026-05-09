# PartFinder TT - Project Context

## Stack
- Next.js (App Router), TypeScript, Supabase, WAHA NOWEB (Railway), Gemini 3.1 Flash-Lite, Vercel

## Key URLs
- Production: https://partfinder-tt.vercel.app
- WAHA: https://waha-production-76c1.up.railway.app
- Supabase project: gsfacqzdhwogegjomyrg
- GitHub: pierredarrius-star/partfinder-tt

## Architecture
- Customer searches for parts → WhatsApp blast to suppliers → suppliers reply → Gemini processes reply → results show in real time
- Webhook: /api/webhook/whatsapp (uses service role client to bypass RLS)
- Blast orchestration: src/lib/orchestrator.ts → /api/search/route.ts
- Vehicles API: /api/vehicles (uses service role client)

## Auth
- Use createBrowserSupabaseClient() in all client components — reads session from cookies after auth redirect
- Plain supabase client will fail to get session on page load after redirect
- Auth callback: src/app/auth/callback/route.ts
- New users redirect to /onboarding after first login

## API Routes
- `src/app/api/search/route.ts` — initiates part search, normalizes query via Gemini, blasts suppliers via WAHA
- `src/app/api/webhook/whatsapp/route.ts` — receives WAHA callbacks, uses Gemini to parse supplier replies, updates supplier_responses; uses service role client
- `src/app/api/vehicles/route.ts` — POST to save vehicle; uses service role client; sets is_primary server-side (first vehicle = primary)
- `src/app/api/scan-plate/route.ts` — accepts base64 image, calls Gemini Vision to extract vehicle data from compliance plate, falls back to color-codes.ts for color name lookup
- `src/app/api/chat-earl/route.ts` — Earl AI chat; Gemini multi-turn conversation with T&T auto-parts persona and saved vehicle context injected into system prompt
- `src/app/api/seed/route.ts` — dev-only supplier seeding

## Library Files
- `src/lib/ai.ts` — Gemini wrapper; exports normalizePartQuery, generateSupplierMessage, analyzeSupplierResponse; model constant is `gemini-3.1-flash-lite`
- `src/lib/color-codes.ts` — hardcoded color code → name lookup for Toyota/Nissan/Honda/Suzuki/Mazda (~100 codes); imported by scan-plate route only (server-side, never client bundle)
- `src/lib/orchestrator.ts` — part search orchestration (coordinates Gemini normalization → supplier message generation → WAHA blast)
- `src/lib/supabase.ts` — exports createBrowserSupabaseClient() for client components; also exports bare `supabase` singleton (used by results page realtime subscription)
- `src/lib/supabase-server.ts` — server-side Supabase client using @supabase/ssr + cookies for RSC/API route use
- `src/lib/whatsapp.ts` — WAHA API wrapper; exports sendWhatsAppMessage

## Database Tables

### user_profiles
(user_id, full_name, whatsapp_number, created_at, updated_at)
- Keyed on user_id (not id) — use upsert with onConflict: 'user_id'
- RLS: ALL ops restricted to auth.uid() = user_id

### user_vehicles
(id, user_id, nickname, year, brand, name, model_code, body, engine, vin, frame_number, color_code, color_name, is_primary, photo_url, manual_url, created_at)
- brand/name/engine stored lowercase; vin/engine uppercased on save
- is_primary set server-side: first vehicle for user = true, subsequent = false
- Partial unique index: one_primary_per_user ON user_vehicles(user_id) WHERE is_primary = true
- RLS: ALL ops restricted to auth.uid() = user_id

### inquiries
(id, user_id, part_query, status, vin, best_price, winning_supplier_id, created_at, updated_at)
- status values: pending_search, contacting_suppliers, completed
- RLS: INSERT authenticated WITH CHECK auth.uid() = user_id; SELECT auth.uid() = user_id

### supplier_responses
(id, inquiry_id, supplier_id, status, response_text, availability, price, notes, is_available, quoted_price, transcript, needs_human_handoff, responded_at, created_at)
- status values: contacted, replied
- RLS: SELECT for authenticated users where inquiry_id belongs to their own inquiries (subquery)
- No INSERT/UPDATE policy for authenticated users — webhook uses service role

### suppliers
(id, name, whatsapp_number, phone_number, store_location, whatsapp_lid, google_sheet_url, is_vip, is_opt_out, created_at)
- RLS: public SELECT (two overlapping policies — redundant but harmless)

### profiles (legacy)
(id, full_name, phone_number, created_at)
- Original profile table, public SELECT. Not used by app code — user_profiles is the active one.

### inventory
Exists in DB but unused by app code.

## Database Indexes
All added via schema audit (May 2026):
- `inquiries_user_id_idx` — supports RLS policy + user query filtering
- `inquiries_winning_supplier_id_idx` — FK index
- `supplier_responses_inquiry_id_idx` — FK index, supports join in RLS subquery
- `supplier_responses_supplier_id_idx` — FK index
- `user_vehicles_user_id_idx` — supports RLS policy + profile page query
- `one_primary_per_user` — partial unique, enforces one primary vehicle per user at DB level

## Features

### My Garage
- /onboarding — form to save user profile + first vehicle; Scan Plate button calls /api/scan-plate
- /profile — shows real vehicles from Supabase; edit/delete per vehicle; Parts Catalog links (PartSouq + Amayama) when VIN or model_code present; copies VIN to clipboard on open
- Vehicles require at minimum a VIN OR brand + name (all other fields optional)

### Compliance Plate Scanner
- Camera or upload modal on /onboarding
- Sends base64 image to /api/scan-plate → Gemini Vision extracts VIN, year, brand, name, model_code, body, engine, color_code, color_name
- Falls back to color-codes.ts lookup if Gemini returns color_code but no color_name
- Auto-filled fields highlighted green; cleared on manual edit

### Earl AI Chat
- Floating chat bubble on /profile (fixed bottom-right)
- Gemini 3.1 Flash-Lite multi-turn chat; T&T auto-parts specialist persona
- User's saved vehicles injected into system prompt via buildVehicleContext()
- Starter chips on empty state; last chip is vehicle-contextual using primary vehicle
- Realtime loading dots; functional setState used to prevent stale closure on rapid sends

### Part Search
- Home page (/) → /api/search → Gemini normalizes query → WAHA blasts all non-opted-out suppliers
- /results?id= polls Supabase realtime for supplier_responses; polling fallback at 8s (cancelled on first realtime event)

## Known Issues
- WAHA session drops on Railway restart — volume mounted at /app/.waha/sessions but QR scan still needed. Dashboard password regenerates on restart — find in Railway Deploy Logs: search WAHA_DASHBOARD_PASSWORD=
- Supplier reply matching bug — multiple simultaneous searches can mix up replies (REF# system needed)
- Supplier follow-up questions (e.g. "What color?") incorrectly treated as confirmed stock
- suppliers table has two duplicate open SELECT policies — redundant but harmless, cleanup deferred

## PowerShell Notes
- Use curl.exe not curl
- No && chaining
- Use file-based JSON for POST bodies

## Agent Skills Installed
Located in .agents/skills/ (committed to repo); .claude/skills/ symlinks are gitignored.

- `supabase-postgres-best-practices` — Supabase + Postgres rules: RLS patterns, indexes, connection pooling, query optimization (34 reference files)
- `vercel-react-best-practices` — React/Next.js performance rules: waterfall elimination, bundle size, re-render optimization, server-side patterns (70 rule files)
- `shadcn` — shadcn/ui component patterns and CLI workflow. NOTE: project does not currently use shadcn/ui — no components.json, no @radix-ui deps. Skill is installed for future use if UI library is adopted.

## Plugins
- Superpowers plugin installed in Claude Code
- claude-mem failed to install (Windows native dependency issue) — ignore any errors about it
