# PartFinder TT — Weekly AI/Auto Research — 2026-07-06

*Window: 2026-06-29 → 2026-07-06. First report in the series, so everything is
[NEW] and there's no prior-week baseline to diff. Firecrawl was out of API
credits this week and most vendor docs blocked automated fetch, so dates were
verified via search snippets + primary press releases; a few items I couldn't
date-verify are dropped rather than guessed.*

## TL;DR (ranked by relevance to the voice-calling build)
1. **Gemini 3.1 Flash Live shipped July 1** — your stack's native-audio model got a real upgrade (better tone/acoustic handling, cheap: ~$0.005/min audio-in, $0.018/min audio-out). Directly on your critical path. **[NEW]**
2. **Retell ran a full Launch Week (Jun 29–Jul 3)**: Conductor (QA/observability), Live Call Monitoring, built-in CRM. The QA tooling is what you'd use to catch Trini-accent failures. **[NEW]**
3. **No new accent/noise-robust ASR shipped this week.** Leaderboard king (Canary-Qwen, ~5.63% WER) is clean-English only — irrelevant to a noisy Trini shop line. The tool to actually test remains Speechmatics Ursa 2.
4. **Ground truth (TriniTuner):** T&T suppliers publish *both* phone and WhatsApp numbers — WhatsApp is entrenched, so your wedge is answer-rate/speed, not channel novelty.
5. **Spam/reputation:** your "one call at a time" design is the single best defense against carrier spam-flagging. Keep it.

---

## Track 1 — Voice AI

**[NEW] Gemini 3.1 Flash Live — July 1, 2026** ([blog.google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-live/)). Google's highest-quality real-time audio model; explicitly better at "acoustic nuances like pitch and pace," now live in 200+ countries, all output watermarked. Preview via Gemini Live API in AI Studio. **Cost:** ~$3/1M audio-in tokens, $12/1M audio-out (~$0.005/min in, $0.018/min out) — a 2-min supplier call is roughly **$0.02–0.03 in model audio**, trivial next to telephony.
*So what:* it's your stack, it's cheap, and tone-handling matters for a natural-sounding call. **The catch (your #1 risk):** native speech-to-speech means Gemini's *own* ASR transcribes the Caribbean-accented, noisy line — you cannot swap in a noise-hardened recognizer. If Gemini mis-hears "NZE144" or a fast clerk, you have no lever. Benchmark it against a pipeline (Speechmatics STT → Gemini text → TTS) on real Trini call audio before committing to native-audio.

**[NEW] Retell Launch Week 2026 (Jun 29–Jul 3)** ([changelog](https://www.retellai.com/changelog); [Conductor PR, 6/29](https://www.globenewswire.com/news-release/2026/06/29/3318979/0/en/voice-ai-startup-retell-ai-launches-conductor-featuring-the-first-ever-graph-native-review-interface-for-production-voice-agents.html)). Three relevant drops: **Conductor** (graph-native review/QA for production agents), **Live Call Monitoring** (watch active calls live), **built-in CRM** (2-way Salesforce/HubSpot sync).
*So what:* Retell is pilot-able telephony+voice at ~$0.07–0.09/min bundled (~$0.15/2-min call before international termination). Conductor + Live Monitoring are exactly the tooling to debug where the accent breaks. CRM sync is irrelevant to you (Supabase is your store).

**STT / accent-noise:** nothing genuinely new in-window. Context worth holding: **Canary-Qwen 2.5B** still tops the [HF Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard) (~5.63% WER) — but that's clean read-English; it says nothing about a shouting clerk over shop noise. **Speechmatics Ursa 2** (trained on ~1M hrs of noisy/accented/VoIP audio; ~94% noise-adaptation in G2 scoring) remains the realistic candidate for your risk axis. No leaderboard substitutes for a Trini-accent eval set.

**TTS:** nothing new worth flagging. Sub-100ms is table stakes (Cartesia Sonic, ElevenLabs Flash, Rime). **Real gap:** no Caribbean-accented voice exists — your AI will sound American/foreign, which on a local shop line can read as an overseas scam call. Worth a small A/B (neutral vs. most-neutral-available accent) on pickup/cooperation rate.

---

## Track 2 — Vehicle data & dossier
Nothing notable this week. One durable point surfaced while checking: **NHTSA vPIC will not decode JDM grey-import chassis codes** (your own example, NZE144, is a Toyota chassis code, not a VIN-decodable value). For Japanese used imports — most of the T&T fleet — the dossier needs chassis-code tables, not vPIC. [jdmvin.com](https://jdmvin.com/) and [JP Sheet](https://jpsheet.com/chassis-decoder/) (962 verified codes) are web-only, no clean API; you'll likely scrape/table these yourself.

## Track 3 — AI tooling for my stack
Nothing notable this week beyond Gemini 3.1 Flash Live (Track 1). WhatsApp MCP servers only produced a July 3 *comparison* post, not a release — nothing to act on. No Anthropic/Meta/OpenAI drop in-window changes your parts-search or voice cost/accuracy.

## Track 4 — Broader automotive AI
Light. Adjacent pattern only: ~60% of US repair shops projected to run some AI by late 2026, mostly *inbound* receptionist bots (e.g. Numa). That's the opposite of your *outbound* supplier-sourcing — no direct competitor doing AI-phones-suppliers-for-a-part surfaced. Bland's ~June Series C (voice AI, enterprise) is a funding datapoint, not a threat to your niche.

## Track 5 — Community & ground truth
- **TriniTuner** ([parts classifieds](https://www.trinituner.com/v4/forums/viewforum.php?f=6)): suppliers list **both** phone and WhatsApp (e.g. one HID/LED seller: phone 355-3165 / WhatsApp 704-5442). Confirms phone-first buying — but WhatsApp is already normal here, so "we call instead of WhatsApp" isn't itself the pitch. The pitch is: a live call gets an answer *now* where a WhatsApp blast sits unread.
- **Reputation/regulatory:** US FCC/TCPA now requires AI-voice disclosure at call *start*. **T&T is not under the FCC**, so your "disclose only if asked" design is legally clear locally — but in a tiny market where suppliers talk to each other, a shop that later feels deceived is a reputational cost, not a legal one. US carrier spam-flagging keys on high-volume/short/low-answer patterns; **your one-call-at-a-time design is exactly the low-volume profile that avoids flags** — protect that. Verify Digicel/bmobile caller-ID/labeling behavior separately; STIR/SHAKEN is a US framework and doesn't cover TT termination.

---

## Action items (max 3)
1. **Build a Trini-accent eval set (10–20 real shop-call clips, noisy)** and run Gemini 3.1 Flash Live (native audio) head-to-head vs. Speechmatics Ursa 2 → Gemini text. This is the single test that de-risks your whole thesis; do it before more feature work.
2. **Price the real cost driver: TT telephony termination.** Model audio is ~$0.02–0.03/call; outbound-to-TT-mobile minutes likely dominate. Compare Twilio international vs. a local Digicel/bmobile SIP trunk for a 2-min call — that ratio decides managed (Retell/Vapi) vs. self-hosted pipeline.
3. **Spin up Retell's Conductor/Live Monitoring on a 5-call pilot** to a couple of friendly small-parts shops — cheapest way to see the accent/noise failure modes on a real line without building your own observability yet.
