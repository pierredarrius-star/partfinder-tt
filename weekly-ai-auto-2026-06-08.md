# Weekly AI × Auto Report — 2026-06-08
_For PartFinder TT · Period: June 2–8, 2026_

---

## TL;DR

- **AutoParts.com launched** a nationwide US parts marketplace (June 4) with real-time inventory aggregation + same-day DoorDash delivery. It's the clearest blueprint for what PartFinder TT is building — read their press release.
- **BCG survey**: 93% of US dealers now use AI; **85% report measurable revenue loss from parts unavailability**. That last stat is your demand proof point for every pitch deck.
- **MinerU-Skill** landed on GitHub: a zero-dependency Claude Code–compatible OCR/document parser (PDF, Office, images → Markdown/JSON). Direct unlock for ingesting supplier catalogs without manual data entry.
- **Claude had a 2-hour outage** on June 5 with a data leak probe open. If your parts-search core path runs through the Anthropic API with no fallback, you have a gap.
- **r/CarsAustralia**: A user publicly asked someone to build "an AI that scans a mechanic's PDF quote and instantly breaks down regional pricing." Nobody's built it. PartFinder TT is positioned to.

---

## Track 1 — AI + Auto Parts

**AutoParts.com nationwide platform launch** · [autoparts.com/media-kit](https://autoparts.com/media-kit/press-releases/6a2286b59975a346e9eaba79) · June 4
> Technology-enabled marketplace connecting distributors, independent suppliers, and retail into one commerce network; real-time inventory aggregation, fitment verification, same-day delivery via DoorDash; claims 94% US population reach and 42M+ DoorDash users in funnel. $405B addressable market cited.

_So what for PartFinder TT_: Their architecture (inventory aggregation → fitment check → delivery dispatch) is the full stack you're building. Same-day delivery via a ride-hailing layer is worth exploring with ttConnect or a local courier API.

---

**BCG: "How US Auto Dealers Can Stay Ahead as Margins Tighten"** · [bcg.com](https://www.bcg.com/publications/2026/how-us-auto-dealers-can-stay-ahead-as-margins-tighten) · June 4
> Survey of 200+ US dealers: 93% use AI in some form (up from 77% in 2025); **85% report measurable revenue loss from parts availability constraints**; independent shops beat dealer service bays on speed because they tap multi-distributor networks for next-hour availability; dealers optimising for AI search visibility capture ~3× traffic of peers.

_So what for PartFinder TT_: The 85% stat validates your thesis cold. The "next-hour availability via multi-supplier network" model is what PartFinder TT must replicate locally. Also: optimising for AI-search visibility (answer engine optimisation, not just SEO) is now a real competitive lever.

---

**Diagolia — AI diagnostics mandatory in OEM warranty workflows** · [reddit.com/r/CarHacking](https://www.reddit.com/r/CarHacking/comments/1tvzhi5/diagolia_automotive_diagnostics_with_ai/) · This week
> r/CarHacking thread: mechanic writes "In our workshops the tool is called 'Diagnostic Assistant'. We have to use it for every single warranty claim or we get 0. It's filled by OEM engineers." AI diagnostic tools are now enforced at the OEM level in some markets.

_So what for PartFinder TT_: Long-term signal — when diagnostics produce a DTC code, that code should surface compatible parts instantly. A diagnostic code → parts lookup pipeline is a defensible moat.

---

## Track 2 — AI Tooling

**`Nebutra/MinerU-Skill`** · [github.com/Nebutra/MinerU-Skill](https://github.com/Nebutra/MinerU-Skill) · New this week
> AI-native document parser: PDF, Office docs, and images → clean Markdown with tables and OCR. Zero-dependency CLI packaged as a skill for Claude Code, Cursor, and other AI agents.

_So what for PartFinder TT_: **Stack upgrade candidate.** Supplier catalogs, OEM parts manuals, and invoice PDFs can be ingested automatically rather than keyed in. Drop this into your Claude Code setup and point it at a folder of supplier PDFs to test.

---

**`PaddlePaddle/PaddleOCR`** · [github.com](https://github.com/PaddlePaddle/PaddleOCR) · Updated this week
> "Turn any PDF or image into structured data for your AI." Lightweight OCR toolkit bridging images/PDFs and LLMs, with active maintenance.

_So what for PartFinder TT_: Backup to MinerU-Skill for image-to-part matching (e.g. a user photos a part number sticker). Can run locally via Ollama-adjacent stack with no API costs.

---

**Anthropic: 80% of production code now written by Claude** · [anthropic.com](https://www.anthropic.com/institute/recursive-self-improvement) · June 4
> As of May 2026, 80%+ of code merged into Anthropic's own codebase is Claude-authored; Claude shipped 800+ autonomous fixes that resolved a class of API errors.

_So what for PartFinder TT_: If you're not using Claude Code heavily for feature velocity, you're competing with one hand tied. This is a signal, not a brag — it means the tooling is actually production-grade.

---

**Claude API outage + data leak probe** · [cybernews.com](https://cybernews.com/ai-news/claude-outage-resolved-anthropic-opus-model-errors/) · June 5
> 2-hour outage; Anthropic investigating unconfirmed customer data leak. Resolved.

_So what for PartFinder TT_: **Flag for your stack.** If parts-search or WhatsApp bot responses depend on the Anthropic API with no fallback, users get errors during outages. Local Ollama/Gemma 4 should be the fallback for latency-tolerant queries.

---

**Meta Enterprise AI agent** · [reuters.com](https://www.reuters.com/business/meta-launches-enterprise-focused-ai-business-agent-automate-daily-operations-2026-06-03/) · June 3
> Meta launched an enterprise AI agent for business workflow automation. Separately, Meta's "Muse Spark" developer API continues to be delayed with no scheduled launch date (WSJ, June 4).

_So what for PartFinder TT_: Meta owns WhatsApp. An enterprise-facing AI agent from Meta could eventually expose WhatsApp automation hooks beyond what WAHA provides today. Watch but don't act yet — Muse Spark delay shows their developer story isn't ready.

---

## Track 3 — Community Signals

**r/CarsAustralia — mechanic quote scanner** · [thread](https://www.reddit.com/r/CarsAustralia/comments/1tvzpz0/anyone_else_noticed_mechanic_quotes_are_getting/) · This week
> User: "If someone built a free tool where you could literally just scan your physical PDF or photo of a mechanic's quote, and an AI instantly broke down the regional average price…" — thread got traction, nobody shipped it.

---

**r/CarHacking — AI mandatory in OEM warranty claims** · [thread](https://www.reddit.com/r/CarHacking/comments/1tvzhi5/diagolia_automotive_diagnostics_with_ai/) · This week
> Mechanics confirm AI diagnostic tools are now required for warranty paperwork at some OEM dealers — not optional, not experimental. Adoption is being pushed top-down.

---

**BCG + dealer webinar: "Car shoppers ask AI first, then go to dealers"**
> A Reddit × car dealer webinar Instagram post this week noted: "Car shoppers are asking AI which car to buy, then heading straight to dealers." The first-touch is now AI, not Google. Identical dynamic applies to parts search.

---

**Caribbean / Latin America signals**: Nothing surfaced this week. Anthropic's Project Glasswing (enterprise access program) expanded to 150 orgs across 15+ countries — no Caribbean mentions, but worth applying if eligible.

---

## Action Items

1. **Read AutoParts.com's press release** and map their fitment-verification + delivery-dispatch architecture against PartFinder TT's current design. Their same-day DoorDash layer is the US version of what a ttConnect/local-courier integration could do.

2. **Install and test `MinerU-Skill`** (`github.com/Nebutra/MinerU-Skill`) on your existing supplier PDF catalogs. If it cleanly extracts part numbers and specs into structured Markdown, it replaces your current manual catalog ingestion and unblocks supplier onboarding at scale.

3. **Wire a local Ollama/Gemma 4 fallback** into your WAHA bot's critical path (parts lookup, quote responses). The Claude outage this week was 2 hours — small, but if a customer messages during an outage and gets silence, that's churn.

---

_Sources verified. Items without a publication date appeared in past-7-day filtered searches. No paywalled sources included. Caribbean/LatAm-specific signals: none found this week._
