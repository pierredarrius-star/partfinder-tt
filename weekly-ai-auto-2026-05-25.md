# Weekly AI × Auto Parts Intelligence — 2026-05-25

_Scope: May 18–25, 2026. Framed for PartFinder TT (Next.js · Supabase · WAHA · Ollama/Gemma 4)._

---

## TL;DR

1. **WAHA 2026.4 ships a native MCP server** — your WhatsApp layer can now talk directly to Claude agents without custom bridging. Highest-priority upgrade this week.
2. **Google I/O (May 19) dropped Gemini 3.5 Flash + Gemini Omni Flash** — 4× faster than frontier competitors; multimodal (text/image/video). Viable alternative to Ollama for photo-to-part lookups if latency or local GPU is a constraint.
3. **Anthropic acquires Stainless (May 18, ~$300M)** — the company that generated every official Anthropic SDK. Hosted SaaS winding down; MCP server generation moves in-house. Short-term: nothing breaks. Medium-term: better auto-generated MCP servers for Claude.
4. **OCR MCP servers are now available for Ollama** — `akirose/image-recognition-mcp` supports local Ollama vision models. Drop-in component for a "photo your part" feature.
5. **No Caribbean-specific AI auto parts product confirmed to exist** — Mercado Libre/TecAlliance are digitizing LATAM but haven't touched the Caribbean. The gap is real.

---

## Track 1 — AI + Auto Parts

**PartsNow.ai launch** (March 25 — included because it's the closest competitive proxy found)
Voice + chat + photo VIN search, 50K heavy-truck parts catalog, distributor network. US truck-only. PartFinder TT differentiates on T&T focus, WhatsApp channel, and passenger/light vehicle coverage.
_So what:_ Study their UX. They've already validated the "speak/snap/type to find a part" pattern in a market with money.

**Enlyte completes PartsTrader acquisition** (April 6)
Mitchell (collision estimating) now owns the world's leading collision-repair parts procurement marketplace + its Orderly AI platform. Vertical integration of damage appraisal → parts sourcing under one roof.
_So what:_ The collision-repair segment is consolidating fast. PartFinder TT should avoid competing there and stay focused on the independent-mechanic / consumer channel in T&T.

**BMW i Ventures Fund III — $300M for AI automotive startups** (April 29)
Targets physical AI, supply chain, agentic software. Seed through Series B, North America and Europe.
_So what:_ OEM-side capital is flowing toward AI supply-chain tooling. If PartFinder TT ever seeks external funding, this validates the category.

**TecAlliance + Mercado Libre — LATAM parts digitization** (ongoing, LATAM signal)
TecDoc integration cut listing time from 43 min → minutes; conversion +40%. Now expanding to Amazon Brazil. No Caribbean initiative mentioned.
_So what:_ Build TecDoc-compatible fitment data for the T&T market and you own a gap that Mercado Libre hasn't touched.

---

## Track 2 — AI Tooling

**WAHA 2026.4 — built-in MCP server** (Apr 30 / patch May 7)
One MCP app per WhatsApp session, scoped API keys (send-only / read-only / media-only). Claude can now send messages, read chats, and manage contacts via standard MCP calls.
_So what:_ This directly upgrades your architecture. Wire Claude → WAHA MCP instead of building a custom bridge.
`https://waha.devlike.pro/blog/waha-2026-4/`

**Anthropic acquires Stainless** (May 18)
Every official Anthropic SDK was built by Stainless (auto-generates SDKs + MCP servers from OpenAPI specs). Hosted SaaS shutting down; team shifting to Claude Platform agent connectivity.
_So what:_ No action needed now. Expect higher-quality auto-generated MCP servers for Claude in H2 2026. Watch for new MCP tooling from Anthropic directly.

**Google I/O 2026 — Gemini 3.5 Flash + Omni Flash** (May 19)
Flash: outperforms Gemini 3.1 Pro on benchmarks, 4× faster. Omni Flash: multimodal video/image input, coming to API in weeks. Managed Agents API: single-call reasoning agent with tools + sandboxed Linux.
_So what:_ If Gemma 4 local inference is too slow for real-time part lookups, Gemini Flash via API is now a credible cost-effective fallback. Omni Flash is worth testing for image-to-part identification.

**OCR + image-recognition MCP servers** (active, GitHub)
- `akirose/image-recognition-mcp` — OpenAI-compatible vision, **supports local Ollama models**
- `sandraschi/ocr-mcp` — FastMCP with DeepSeek-OCR, Florence-2, PP-OCRv5, WIA scanner
- `WindoC/gemini-ocr-mcp` — FastMCP powered by Gemini, handles image paths + base64
_So what:_ Ready-made MCP components for "photo your part" — no custom vision pipeline needed. The Ollama-native one keeps it local and free.

**Supabase May 2026 update** (May 22 breaking change)
OAuth 2.1: token endpoint now returns HTTP 200 (was 201). Also: `@supabase/server` package in public beta — unifies auth + client setup across Edge Functions, Vercel, Cloudflare, Hono, Bun.
_So what:_ Check your auth token handling for the 201→200 change. The `@supabase/server` package simplifies your Next.js server-side Supabase integration.

**Ollama v0.22.1 + v0.23.4** (May 3)
Full Gemma 4 support with tool calling and thinking mode. v0.23.4 adds vision model image input in ollama launch — local image paths work.
_So what:_ If you're not on v0.23.x, upgrade. Image input for parts photo ID is now native.

---

## Track 3 — Community Signals

**Shop-owner sentiment (practitioner surveys, May 2026):** 60%+ of repair shops now use some form of AI. Primary uses: diagnostic lookups, repair order writing, customer communication. Quote pattern: "AI frees techs from paperwork so they can turn more jobs." Resistance is low when AI is framed as admin automation, not tech replacement.

**No Caribbean auto parts AI threads found:** Reddit and forum searches returned nothing T&T-specific or Caribbean-specific in the 7-day window. This is consistent with the gap finding — no local competitor is building community around this problem yet.

**LATAM market context:** Latin America auto parts market is $35B (2025), projected $76B by 2033. Mercado Libre captures 85–90% of digital auto parts in LATAM. The Caribbean remains unserved by any digitized, AI-enhanced parts platform.

---

## Action Items

1. **Upgrade WAHA and wire it to Claude via MCP** — WAHA 2026.4's native MCP server eliminates the custom bridge you'd otherwise build. This is the most concrete architectural upgrade available this week. Start here.

2. **Test `akirose/image-recognition-mcp` with your local Ollama/Gemma 4 instance** — if it works, you have a "snap a photo of the part" feature with zero API cost. Validate before committing to the Gemini Omni Flash API path.

3. **Audit your Supabase auth code for the HTTP 201→200 breaking change** (live May 22). Low effort, avoids a silent production bug.
