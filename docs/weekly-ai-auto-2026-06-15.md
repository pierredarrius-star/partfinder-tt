# Weekly AI × Auto Report — 2026-06-15

> Framing: Would this help build, ship, or differentiate PartFinder TT?
> Sources verified. Items older than 7 days dropped (Cars24 June 1 noted as 14 days — included for relevance).

---

## TL;DR (5 bullets)

1. **Claude Agent SDK billing changes TODAY** — Anthropic's credit overhaul takes effect June 15. If PartFinder runs any headless Claude pipelines (parts search, supplier comms), you're now on metered API pricing. Check your seat type now; Enterprise Standard gets $0 credit.
2. **Headroom (+14K GitHub stars this week)** compresses LLM input tokens 60–95% with no quality loss — ships as an MCP server. Direct fit for a RAG-heavy parts catalog use case.
3. **S&P Global Mobility's June 10 report** confirms the aftermarket AI wave is real: Bosch, Meko, AutoTechIQ, and Febi/Bilstein all launched AI diagnostic/estimation tools in the last quarter. The catalog quality + repair estimate layer is where money is moving.
4. **Mechanics on Reddit are using ChatGPT for diagnosis** and predicting service writers and dealership parts counters will be replaced by AI within 10 years — validates PartFinder's bet, but also signals incumbent pressure.
5. **Claude Fable 5 launched June 9** ($10/M input, $50/M output, 90% prompt-caching discount) — new top model, and the caching discount makes it materially cheaper for a parts-search system that sends similar context repeatedly.

---

## Track 1 — AI + Auto Parts

**S&P Global Mobility report: "AI is changing vehicle repair and diagnostics"**
Published June 10 by Aftermarket Matters. Bosch's *Super Technician* (AI diagnostic assistant using global repair knowledge pool) deployed at shops. Swedish distributor Meko launched AI diagnostics backed by 10 years of repair records. AutoTechIQ launched *AutoQuoteIQ* — AI-powered repair estimates using shop historical data + millions of work orders. Febi/Bilstein shipped an AI fluid-testing device (on-site oil/transmission analysis, generates condition report). S&P's takeaway: AI reduces 8,000 fault codes per vehicle/year to 5–10 actionable issues.
[Source](https://www.aftermarketmatters.com/national-news/artificial-intelligence-is-changing-vehicle-repair-and-diagnostics/) | **So what:** The catalog enrichment and repair estimate layer is where incumbents are spending. PartFinder TT can leapfrog by combining AI diagnosis with parts availability in a single WhatsApp-native flow — something none of these US/EU players will build for TT.

**Cars24 AI Labs — $20M fund** *(June 1 — 14 days ago, included for relevance)*
Pre-owned car marketplace Cars24 launched a $20M initiative to fund AI-native products, partnering with OpenAI, AWS, and ElevenLabs. Focused on build/invest/partner model for early-stage AI startups. CEO framing: "AI is the biggest technology shift of our generation."
[Source](https://motoring-trends.com/technology/cars24-launches-ai-labs-with-20-million-investment-initiative) | **So what:** Used-car marketplaces are now building AI labs. The parts search vertical is adjacent and underserved in emerging markets — TT included.

**Bosch acquires Uptake Technologies**
Bosch announced in March (confirmed in the June 10 report) the acquisition of Uptake, a Chicago AI startup specializing in predictive analytics for commercial fleets.
[Source](https://www.aftermarketmatters.com/national-news/artificial-intelligence-is-changing-vehicle-repair-and-diagnostics/) | **So what:** Fleet predictive maintenance is a potential PartFinder vertical — vehicle maintenance schedules tied to parts pre-ordering. Long-term roadmap signal.

---

## Track 2 — AI Tooling

**[chopratejas/headroom](https://github.com/chopratejas/headroom) | +14,266 ★ this week | Python | MIT**
Compresses LLM input 60–95% (tool output, logs, files, RAG chunks) before they reach the model — no quality degradation. Ships three ways: Python library, proxy server, or MCP server. Dominated GitHub trending this week.
**So what for PartFinder TT:** Parts catalog RAG pipelines repeatedly send large context (catalog descriptions, supplier listings, OEM data). Dropping token count 60–95% makes Fable 5 feasible at scale without blowing the API budget.

**[microsoft/markitdown](https://github.com/microsoft/markitdown) | +11,177 ★ this week | Python | MIT**
Converts PDF, Word, Excel, PowerPoint, and images to clean Markdown. Monthly trending regular — durable utility.
**So what:** Supplier price lists, OEM PDF catalogs, and parts images all need ingestion. Markitdown is the conversion layer that feeds your Supabase vector store without custom parsers.

**[mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | +6,616 ★ this week | Python | MIT**
AI agent skill that researches any topic across Reddit, X, YouTube, HN, Polymarket, and the web — synthesizes a grounded 30-day summary.
**So what:** Could be adapted as a supplier-monitoring skill — track parts pricing trends, demand spikes, or competitor activity on a schedule.

**[supermemoryai/supermemory](https://github.com/supermemoryai/supermemory) | +2,434 ★ this week | TypeScript | MIT**
Memory engine exposed as an API. Built on Cloudflare Workers + Postgres. Fast, scalable.
**So what:** PartFinder's WhatsApp flow needs cross-session memory ("last time you asked for Corolla front pads, here's what changed"). Supermemory is the cleanest open drop-in for this.

**[CopilotKit/CopilotKit](https://github.com/CopilotKit/CopilotKit) | +2,173 ★ this week | TypeScript | MIT**
Frontend agent stack (React, Angular, mobile, Slack). Makers of the AG-UI Protocol — bidirectional agent↔frontend communication standard.
**So what:** If PartFinder adds an in-browser AI parts assistant alongside the WhatsApp channel, CopilotKit is the cleanest React integration path.

**Claude Fable 5 — Released June 9, 2026**
Anthropic's new top model. Pricing: $10/M input, $50/M output, **90% prompt-caching discount on cache hits**.
[Source](https://www.truefoundry.com/blog/claude-fable-5-api-benchmarks-pricing-how-to-use-it) | **So what:** The 90% caching discount is the important number. A parts search that sends the same large system prompt and catalog context on every query can drop effective input cost to $1/M on cached tokens — makes real-time AI search economically viable.

**Claude Agent SDK credit overhaul — Effective TODAY (June 15)**
Agent SDK and `claude -p` (headless) usage exits Pro/Max/Team/Enterprise subscription pools. Replaced by a separate monthly dollar credit billed at standard API rates (non-pooled, no rollover). Enterprise Standard seats get $0 credit. OpenAI countered May 14 with 2 months free Codex ($200/mo tier).
[Source](https://www.digitalapplied.com/blog/anthropic-claude-credit-overhaul-june-15-2026) | **So what:** If PartFinder's CI/CD or supplier-query pipelines authenticate via ACP or claude -p, those costs just changed. Action: audit last 30 days of Agent SDK usage, enable prompt caching, and decide whether to stay on subscription credit or migrate to direct API key billing.

**OpenAI mulling price cuts (CNBC, June 11)**
WSJ reported OpenAI is considering cutting prices for paid access as competitive pressure from Anthropic intensifies.
[Source](https://www.cnbc.com/2026/06/11/openai-mulls-slashing-prices-ahead-of-competition-from-anthropic-wsj.html) | **So what:** API cost will keep falling. Don't over-optimize for cost now at the expense of quality; Fable 5 + caching is likely the better bet.

---

## Track 3 — Community Signals

**r/Luxembourg: "Car repair costs in 2026 - AI to the rescue" (2 days ago)**
Driver described using AI to narrow down what needed fixing before visiting the garage, then sourcing own parts, then bringing them to the shop. Commenters confirmed garages themselves are using AI to doublecheck diagnoses. Multiple-step AI-assisted workflow is becoming normalized.
[Source](https://www.reddit.com/r/Luxembourg/comments/1u157x8/car_repair_costs_in_2026_ai_to_the_rescue/) | The pattern described — AI diagnosis → own parts → cheaper labor — is exactly the PartFinder TT value proposition. Consumers are already doing this manually; the platform formalizes the flow.

**r/mechanics: "Where do you see this industry headed in the next 10 years?"**
Mechanics on this thread said service writers "will absolutely be replaced with AI and kiosks" and that dealership parts departments already have robots delivering parts.
[Source](https://www.reddit.com/r/mechanics/comments/1tmbcrb/where_do_you_see_this_industry_headed_in_next_10/) | The incumbents (dealers, large chains) are already automating the parts counter. Independent shops in TT won't have that infrastructure — PartFinder's WhatsApp-native search fills that gap for the independent channel.

**r/Cartalk: ChatGPT for door cable diagnosis (this week)**
User reported ChatGPT walked them through diagnosing a faulty cable with wiring diagrams. "ChatGPT perfectly brought me through diagnosis. Job done."
[Source](https://www.reddit.com/r/Cartalk/comments/1u2brf6/someone_please_help/) | DIY diagnosis via AI is already proven behavior. The gap PartFinder fills is the next step: "I know what I need — where do I buy it in Trinidad?"

---

## Action Items

1. **Audit Claude API usage TODAY.** The Anthropic billing change is live as of today (June 15). If any PartFinder pipeline uses Agent SDK or `claude -p` headless invocations, check what seat type you're on and enable prompt caching immediately. The caching discount (0.1× on cache hits) is the highest-leverage cost lever available — prioritize this before adding new features.

2. **Add headroom to your parts-search RAG pipeline.** Install [chopratejas/headroom](https://github.com/chopratejas/headroom) and run your current parts-lookup prompts through it. If you see 60%+ token reduction, you've materially cut your per-query cost — which may make real-time AI suggestions on the frontend viable.

3. **Check Partora.** An app called *Partora: AI Car Parts Marketplace* appeared in App Store "similar apps" suggestions this week alongside parts marketplaces. No Caribbean focus found, but the positioning is identical to PartFinder TT. [App Store link](https://apps.apple.com/us/app/partora/id6754330241) — worth a 10-minute review to understand their AI feature set and whether they're expanding markets.

---

*Sources: aftermarketmatters.com (June 10), motoring-trends.com (June 1), shareuhack.com/github-trending (June 9), digitalapplied.com (May 16/June 15), truefoundry.com (June 9), cnbc.com (June 11), reddit.com (June 13–14), apps.apple.com*
