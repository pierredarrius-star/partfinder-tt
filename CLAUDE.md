# PartFinder TT - Project Context

## Stack
- Next.js, TypeScript, Supabase, WAHA NOWEB (Railway), Gemini 2.5 Flash-Lite, Vercel

## Key URLs
- Production: https://partfinder-tt.vercel.app
- WAHA: https://waha-production-76c1.up.railway.app
- Supabase project: gsfacqzdhwogegjomyrg
- GitHub: pierredarrius-star/partfinder-tt

## Architecture
- Customer searches for parts → WhatsApp blast to suppliers → suppliers reply → Gemini processes reply → results show in real time
- Webhook: /api/webhook/whatsapp (uses service role client to bypass RLS)
- Blast: /api/search/execute
- Vehicles API: /api/vehicles (uses service role client)

## Auth
- Use createBrowserSupabaseClient() in all client components — reads session from cookies after auth redirect
- Plain supabase client will fail to get session on page load after redirect
- Auth callback: src/app/auth/callback/route.ts

## Database Tables
- inquiries — part search requests
- supplier_responses — per-supplier reply tracking
- suppliers — supplier directory
- profiles — user profiles (id, full_name, phone_number, created_at)
- user_vehicles — saved vehicles per user (id, user_id, nickname, year, make, model, trim, engine, frame_number, color_code, color_name, trans_axle, is_primary, photo_url, manual_url, created_at)
- inventory — exists in DB but unused

## My Garage — Build Status
- user_vehicles table created with RLS enabled
- /onboarding page built and saving to Supabase correctly
- API route: src/app/api/vehicles/route.ts
- Profile page (src/app/profile/page.tsx) still shows hardcoded mock data — needs wiring to real Supabase data

## My Garage — Next Steps
1. Fix car SVG in compliance plate (i) popup
2. Wire auth callback to redirect new users → /onboarding
3. Build Compliance Plate Scanner (Gemini Vision reads photo → auto-fills form)
4. Update Profile page to show real vehicles from Supabase
5. Add Parts Catalog links (PartsSouq, Amayama, Megazip) per vehicle
6. Search history per vehicle

## Known Issues
- WAHA session drops on Railway restart — volume mounted at /app/.waha/sessions but QR scan still needed. Dashboard password regenerates on restart — find in Railway Deploy Logs: search WAHA_DASHBOARD_PASSWORD=
- Supplier reply matching bug — multiple simultaneous searches can mix up replies (REF# system needed)
- Supplier follow-up questions (e.g. "What color?") incorrectly treated as confirmed stock

## PowerShell Notes
- Use curl.exe not curl
- No && chaining
- Use file-based JSON for POST bodies

## Plugins
- Superpowers plugin installed in Claude Code
- claude-mem failed to install (Windows native dependency issue) — ignore any errors about it
