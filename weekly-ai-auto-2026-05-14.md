# Weekly AI × Auto Aftermarket — 2026-05-14

> Lens: *Would this help me build, ship, or differentiate PartFinder TT?*
> Coverage window: 2026-05-07 → 2026-05-14

---

## TL;DR

1. **Partium's image-to-part API** covers 350 M OEM-verified parts with visual search — the most direct drop-in for a "snap a photo, find the part" feature on PartFinder TT.
2. **Gemma 4 is now stable on Ollama** (v0.22.1) with native tool calling + vision at 85 tok/s on consumer hardware — your cheapest path to on-device parts matching.
3. **MECH AI's "diagnose → add to cart" pattern** (Amazon-linked) is the UX template PartFinder TT should steal for its own diagnosis → local supplier flow.
4. **AWS MCP Server went GA** this week; combined with the WhatsApp Business MCP already in market, your WAHA-based notification layer now has a cleaner integration path.
5. **Silicon Caribe flagged TT automotive parts as a disruption target** — no funded competitor exists in-market yet. The window is open.

---

## Track 1 — AI + Auto Parts

**AutoSonix — acoustic OBD-II diagnostics at dealerships and via consumer app**
OBD-II dongle + AI converts engine/transmission sounds into ranked fault diagnostics in real time; now on iOS and Android; adds predictive warranty analytics and inventory hooks for dealers.
[Automotive News](https://www.autonews.com/retail/an-autosonix-ai-diagnostics-tool-0407/) · [autosonix.ai](https://autosonix.ai/)
*So what for PartFinder TT:* The sound→fault→part chain is the diagnostic funnel you can shortcut; if users can identify the fault themselves, you get a higher-intent parts query.

---

**MECH AI app — symptom description → wiring diagram → Amazon parts cart**
Describe a symptom in plain language, get a structured diagnostic tree, AI-generated wiring diagrams, and a one-tap "add parts to cart" link via Amazon affiliate integration. AI wiring diagrams now included in base plan.
[mechai.app](https://www.mechai.app/) · [Google Play](https://play.google.com/store/apps/details?id=app.mechai.mobile)
*So what for PartFinder TT:* The diagnosis-to-purchase funnel they built on Amazon is exactly what PartFinder TT should build on top of local TT suppliers — same UX pattern, local inventory instead of Amazon.

---

**Partium Parts Intelligence — 350 M OEM parts, image + text search API**
Enterprise parts-finding platform with visual search, text query, and a catalog of 350 M+ OEM-verified parts; API available; targets after-sales and MRO workflows.
[partium.io](https://www.partium.io/) · [CDS Visual on image search for aftermarket](https://cdsvisual.com/blog/ai-powered-image-search-for-spare-parts/)
*So what for PartFinder TT:* Evaluate their API as a backend for the "photo of a broken part → find match" feature; could replace a custom-trained vision model entirely.

---

**Aisin doubles CVC fund to $100 M, targeting AI + mobility**
Japanese OEM parts maker Aisin (with Pegasus Tech Ventures) doubled their joint VC fund; focus areas include AI, mobility tech, and robotics. No direct auto-parts marketplace investments announced yet.
[Global Venturing](https://globalventuring.com/corporate/asia/aisin-doubles-cvc-fund-100m/)
*So what for PartFinder TT:* Corporate strategic money is chasing this exact layer — validation that the vertical is fundable, but no near-term Caribbean relevance.

---

**PredictaFix (Launch Tech USA / CarTechIQ) — DTC → ranked repair suggestions**
AI agents group raw diagnostic trouble codes into clustered issues and output ranked repair suggestions; debuted on Launch Tech scanners; improves first-fix rates and reduces diagnostic labor.
[AutoSuccess Online](https://www.autosuccessonline.com/smart-diagnostic-scan-tool-predictafix/)
*So what for PartFinder TT:* The DTC→ranked-parts-needed pattern is a future feature; CarTechIQ's underlying agent approach is worth watching if you build a diagnostics-led search path.

---

## Track 2 — AI Tooling

**AWS MCP Server — GA this week**
AWS's official Model Context Protocol server is now generally available, giving Claude (and any MCP-compatible agent) direct access to AWS service calls.
[AWS announcement](https://aws.amazon.com/about-aws/whats-new/2026/05/aws-mcp-server/)
*Stack note:* Mostly relevant if PartFinder TT moves any infra to AWS; for now, Supabase stays — but useful if you add S3-based image storage for parts photos.

---

**WhatsApp Business MCP + Zapier integration — live**
Two production WhatsApp MCP servers now in market: a direct personal-account integration via mcpmarket, and a Zapier-hosted WhatsApp Business variant. Both let Claude agents send/receive WhatsApp messages natively.
[mcpmarket.com/server/whatsapp-business](https://mcpmarket.com/server/whatsapp-business) · [Zapier MCP](https://zapier.com/mcp/whatsapp-business-messaging)
*Stack note:* ⚡ Direct upgrade path for your WAHA layer — these MCP servers could replace or augment WAHA for order notifications, supplier comms, and customer query triage without custom webhook wiring.

---

**Gemma 4 on Ollama v0.22.1 — tool calling + vision, stable**
Mixture-of-Experts model (26 B total, 4 B active per token), released April 2026, now stable in Ollama library. 85 tok/s on consumer hardware; native function calling and image understanding built in.
[Ollama library/gemma4](https://ollama.com/library/gemma4) · [PromptQuorum overview](https://www.promptquorum.com/local-llms/top-open-source-models-ollama)
*Stack note:* ⚡ Best local model to swap in for your Ollama/Gemma stack. Vision support means you can run image-to-part queries locally; tool calling lets it drive your Supabase lookups without an extra orchestration layer.

---

**Kimi K2.6 + Qwen 3.6 27B — new on Ollama, May 2026**
Kimi K2.6 tops coding benchmarks; Qwen 3.6 27B hits 77.2% on SWE-bench. Both available via `ollama pull`.
[Ollama releases](https://github.com/ollama/ollama/releases)
*Stack note:* Qwen 3.6 27B is worth a quick eval for structured data extraction (part numbers from OCR'd invoices) — strong at precise output formatting.

---

**Anthropic Opus 4.7 tokenizer change — silent cost creep**
Opus 4.7 (released April 16) uses a new tokenizer that consumes up to 35% more tokens for the same text versus 4.6, at the same listed price ($5/$25 per MTok). Claude Haiku 4.5 remains the budget option at $1/$5.
[Medium: The hidden price hike](https://medium.com/@dev_tips/the-ai-price-hike-that-never-showed-up-on-the-pricing-page-your-bill-went-up-27-anyway-48a61265f3f3) · [finout.io pricing guide](https://www.finout.io/blog/anthropic-api-pricing)
*Stack note:* If you're on Opus 4.7 for any PartFinder TT queries, re-benchmark actual token counts now. Sonnet 4.6 ($3/$15) is the current sweet spot for balanced cost/quality on search.

---

**mcp-ocr — production OCR MCP server on PyPI**
Simple MCP server wrapping OCR capabilities; installable via `pip install mcp-ocr`.
[PyPI](https://pypi.org/project/mcp-ocr/)
*Stack note:* Lightweight option for extracting part numbers from supplier invoices or photos of packaging — worth a 30-minute eval before building a custom pipeline.

---

## Track 3 — Community Signals

**Silicon Caribe (March 2026): TT automotive parts flagged as a ripe disruption target** — article identifies 8 Caribbean industries "one startup and one AI tool away from disruption"; automotive parts distribution named explicitly. No funded entrant identified. [siliconcaribe.com](https://www.siliconcaribe.com/2026/03/19/why-these-8-caribbean-industries-and-50-caribbean-companies-are-one-startup-and-one-ai-tool-away-from-disruption/)

**Automotive News: buyers arriving at dealerships with custom AI agents** — shoppers now show up having run AI agents to pre-screen inventory, cross-check pricing, and identify alternatives; dealers describe it as a new negotiation dynamic. [autonews.com](https://www.autonews.com/retail/an-ai-produces-new-kind-of-car-customer-0319/) The consumer-side AI agent is coming for parts buyers too.

**WickedFile / auto repair shop AI survey (2026)**: 60%+ of US repair shops expected to use some AI form by late 2026, up ~59% YoY. Top adopted tools: diagnostics (ALLDATA, MECH AI), customer comms (AutoLeap AIR), shop management (Tekmetric). [wickedfile.com](https://www.wickedfile.com/blogs/how-can-auto-repair-shops-use-ai-in-2026) TT mechanics are 2-3 years behind this curve — early mover advantage still intact.

---

## Action Items

1. **Evaluate Partium's API** — create a free trial account and test their image-to-part search against 5–10 photos of common TT vehicle parts (Toyota Hilux, Nissan Tiida, used JDM stock). If accuracy holds, this could replace a custom-trained vision model entirely and ship the photo-search feature in days, not months.

2. **Swap Ollama model to Gemma 4** (`ollama pull gemma4`) and run a side-by-side on your current parts-lookup prompts — specifically test tool calling for Supabase queries and a basic image-description task. The MoE efficiency may let you keep everything local while adding vision.

3. **Prototype the WhatsApp Business MCP** as a drop-in layer over WAHA — if it handles inbound part queries reliably, you reduce custom webhook maintenance and get Claude driving the conversation natively without a separate orchestration step.
