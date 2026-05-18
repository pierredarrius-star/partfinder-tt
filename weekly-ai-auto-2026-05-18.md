# Weekly AI × Auto Aftermarket Report — 2026-05-18

_Framed for PartFinder TT (Next.js · Supabase · WAHA · Ollama/Gemma 4). Past 7 days only._

---

## TL;DR

1. **Anthropic acquired Stainless (today, May 18)** — the SDK-generator powering Claude, OpenAI, and Google SDKs. Hosted product shutting down; existing SDKs stay intact. No emergency, but it signals Anthropic tightening its developer toolchain.
2. **Jenova.ai launched a photo-based AI auto mechanic** with parts sourcing built in — the closest live comp to what PartFinder TT is building. Study it now.
3. **Mastra** (TypeScript agent framework, 21K+ stars, built-in RAG + MCP) is the fastest-rising framework that slots directly into a Next.js stack.
4. **Ollama v0.22.1 ships full Gemma 4 support with tool calling** — your local model can now return structured JSON for parts queries without a prompt hack.
5. **PartsTrader's Orderly™ is live at 650+ Crash Champions shops** — enterprise-grade AI procurement is proven; TT's opportunity is the same workflow at indie-shop scale.

---

## Track 1 — AI + Auto Parts

**Jenova.ai — AI Auto Mechanic with photo diagnostics + parts sourcing**
May 2026 launch; users photograph a part or describe a symptom and get sourcing leads.
_So what for PartFinder TT:_ This is your direct template and competitive benchmark — reverse-engineer their image-to-part UX before designing your own.
[Source](https://www.jenova.ai/en/resources/ai-auto-mechanic-202605)

**PartsTrader Orderly™ — AI end-to-end collision parts procurement, now at full scale**
Launched Dec 2025; Crash Champions completed deployment across 650+ shops by May 2026. Covers pre-procurement accuracy, intelligent sourcing, and post-purchase reconciliation.
_So what for PartFinder TT:_ This is the enterprise ceiling. Your TT version is Orderly for a single-island market with WhatsApp as the front-end — the workflow is proven.
[Source](https://www.aftermarketmatters.com/collision-repair/collision-product-news/partstrader-launches-ai-powered-parts-procurement-platform/) · [BusinessWire](https://www.businesswire.com/news/home/20251202166776/en/PartsTrader-Launches-Orderly-AI-Powered-End-to-End-Procurement-for-Collision-Repair-Industry)

**AutoSonix — converts engine/mechanical sounds into diagnostic data for dealers**
Covered by Automotive News; targets service departments facing technician shortages.
_So what for PartFinder TT:_ Not a direct competitor, but confirms AI is moving upstream in the repair funnel (sound → diagnosis → part needed). A future WhatsApp audio flow for PartFinder TT is plausible.
[Source](https://www.autonews.com/retail/an-autosonix-ai-diagnostics-tool-0407/)

**Market signal: 60%+ of auto repair shops expected to use AI by late 2026**
Dominant tools are ALLDATA (OEM repair data + AI diagnostics), Mitchell ProDemand (verified shop repairs), Tekmetric and Mitchell 1 for multi-supplier parts ordering. Shops report saving 15–30 min/job on parts sourcing with integrated supplier search.
_So what for PartFinder TT:_ Mechanics want **multi-supplier price comparison in one shot**, not just lookup — that's table stakes, not a differentiator.
[Source](https://www.wickedfile.com/blogs/how-can-auto-repair-shops-use-ai-in-2026)

---

## Track 2 — AI Tooling

**Anthropic acquires Stainless — SDK generator for TypeScript, Python, Go, Java, and more**
Announced May 18, 2026. Deal reported at $300M+. Stainless generated every official Anthropic SDK. Hosted product (SDK generator SaaS) will be wound down; customers keep ownership of SDKs already generated.
_So what for PartFinder TT:_ No immediate stack impact — the Claude SDK you use today is unaffected. Watch for tighter Anthropic toolchain integration (MCP, Agent SDK) coming out of this team.
[Anthropic](https://www.anthropic.com/news/anthropic-acquires-stainless) · [TechCrunch](https://techcrunch.com/2026/05/18/anthropic-has-acquired-the-dev-tools-startup-used-by-openai-google-and-cloudflare/)

**Mastra — opinionated TypeScript agent framework, 21K+ stars, trending May 2026**
Built-in RAG pipelines, MCP server support, observability dashboard, visual workflow builder. Designed to coexist with Next.js.
_So what for PartFinder TT:_ If your agent/search logic is currently ad-hoc, Mastra gives you a structured, TypeScript-native alternative to LangChain — worth a spike before you go deeper on custom agent code.
[GitHub](https://github.com/topics/ai-agents)

**PageIndex — reasoning-based RAG replacing vector search, +4.5K stars this week**
Claims reasoning over indexed docs outperforms embedding search for targeted knowledge bases. Sweet spot: structured catalogs and document Q&A.
_So what for PartFinder TT:_ If you're building a parts catalog RAG on top of Supabase pgvector, test PageIndex against your current approach — it may reduce embedding overhead for a bounded parts dataset.
[Source](https://www.shareuhack.com/en/posts/github-trending-weekly-2026-05-13)

**Ollama v0.22.1 — full Gemma 4 support with tool calling and thinking modes**
Released May 3, 2026. Gemma 4 is now multimodal (text + image input), supports structured tool calls natively.
_So what for PartFinder TT:_ **Upgrade now.** Your Ollama/Gemma 4 setup can replace prompt-hacked JSON extraction with proper tool-call outputs — cleaner parts search responses, fewer parsing failures.
[Ollama](https://ollama.com/library/gemma4) · [Guide](https://effloow.com/articles/gemma-4-local-setup-ollama-open-webui-guide-2026)

**Kimi K2.6 — MoE model, MIT licensed, strong coding, now in Ollama library**
Added to Ollama May 2026. MIT license, top-tier SWE-bench scores. Also new: Qwen 3.6 (77.2% SWE-bench).
_So what for PartFinder TT:_ Benchmark Kimi K2.6 against Gemma 4 for parts description generation and OEM code extraction — MIT license means zero deployment friction.
[Ollama library](https://ollama.com/library)

**Pacvue MCP server — commerce media data via MCP, launched May 14**
Connects campaign performance, keyword, inventory, and share-of-voice data to Claude, ChatGPT, Copilot, Gemini via MCP protocol.
_So what for PartFinder TT:_ Shows the MCP-as-data-connector pattern is solidifying for commerce — validates using an MCP server to connect your Supabase parts inventory to Claude agents.
[Manila Times](https://www.manilatimes.net/2026/05/14/tmt-newswire/globenewswire/pacvue-launches-mcp-server-making-commerce-media-data-accessible-across-enterprise-ai-tools/2344053/amp)

---

## Track 3 — Community Signals

**Mechanics trust OEM data, not AI inference.** Discussions around ALLDATA and ProDemand show shops adopting AI that cites verified repair records from real shops — not generated answers. OEM data coverage is the trust moat, not the AI layer itself. For PartFinder TT, sourcing accurate OEM part numbers matters more than the chatbot UX.

**Multi-supplier price comparison is the #1 workflow shops want automated.** Tekmetric and Mitchell 1 adoption is driven by the "search 5 suppliers at once" feature. Mechanics aren't excited about AI for its own sake — they care about saving 15–30 min/job on phones and tabs.

**Caribbean: Chinese OEMs and EVs entering TT market, rising SUV demand.** New vehicle models from BYD, Chery, and others are flooding the market with unfamiliar part numbers. This creates exactly the lookup gap PartFinder TT should own — OEM catalogs for these brands are sparse or only available in Mandarin.
[Frost & Sullivan](https://www.frost.com/growth-opportunity-news/unlocking-growth-in-the-automotive-industry-in-mexico-brazil-and-the-caribbean-tgc-cim-mk/)

---

## Action Items

1. **Upgrade your Ollama stack to v0.22.1 and test Gemma 4 tool calling** on your actual parts-search queries. Native structured outputs should replace any JSON-extraction prompting you're doing today. Cheap, fast win.

2. **Spend 30 minutes on Jenova.ai's image-to-parts flow** — sign up, photograph a part, trace how they handle the image-to-query-to-result pipeline. This is the closest live product to your roadmap and the UX patterns are worth stealing.

3. **Spike Mastra for your Next.js agent layer** — clone the starter, wire it to one Supabase table (e.g., parts catalog), and see if their built-in RAG + MCP integration simplifies what you'd otherwise hand-roll. Give it 2–3 hours before deciding if it fits.

---

_Sources: [Anthropic](https://www.anthropic.com/news/anthropic-acquires-stainless) · [TechCrunch](https://techcrunch.com/2026/05/18/anthropic-has-acquired-the-dev-tools-startup-used-by-openai-google-and-cloudflare/) · [Jenova.ai](https://www.jenova.ai/en/resources/ai-auto-mechanic-202605) · [PartsTrader/Aftermarket Matters](https://www.aftermarketmatters.com/collision-repair/collision-product-news/partstrader-launches-ai-powered-parts-procurement-platform/) · [BusinessWire](https://www.businesswire.com/news/home/20251202166776/en/PartsTrader-Launches-Orderly-AI-Powered-End-to-End-Procurement-for-Collision-Repair-Industry) · [Automotive News/AutoSonix](https://www.autonews.com/retail/an-autosonix-ai-diagnostics-tool-0407/) · [WickedFile](https://www.wickedfile.com/blogs/how-can-auto-repair-shops-use-ai-in-2026) · [Ollama](https://ollama.com/library/gemma4) · [Effloow/Gemma 4 guide](https://effloow.com/articles/gemma-4-local-setup-ollama-open-webui-guide-2026) · [Pacvue MCP](https://www.manilatimes.net/2026/05/14/tmt-newswire/globenewswire/pacvue-launches-mcp-server-making-commerce-media-data-accessible-across-enterprise-ai-tools/2344053/amp) · [GitHub Trending May 13](https://www.shareuhack.com/en/posts/github-trending-weekly-2026-05-13) · [Frost & Sullivan Caribbean](https://www.frost.com/growth-opportunity-news/unlocking-growth-in-the-automotive-industry-in-mexico-brazil-and-the-caribbean-tgc-cim-mk/)_
