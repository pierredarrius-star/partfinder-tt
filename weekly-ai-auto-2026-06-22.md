# PartFinder TT — Weekly AI/Auto Research — 2026-06-22

Window: 2026-06-15 → 2026-06-22 (past 7 days). Lens: does it help build/ship/de-risk/cut cost of the voice-calling system?
Continuity: **first report — no prior `weekly-ai-auto-*.md` to diff, so every item is [NEW].** Baseline established for next week.
Honest framing: a quiet week. One item touches your stack and is worth acting on; nothing shipped that solves the #1 risk (Trini-accent STT over noisy shop lines).

## TL;DR (ranked by relevance to the voice-calling build)
1. **[NEW] Gemini 3.1 Flash TTS now streams (Jun 17)** — your stack. Streaming cuts time-to-first-audio, the biggest latency lever on a laggy TT shop line. ~$0.03 per 60s audio out → a few cents per call. Act on this.
2. **[NEW] Speechmatics Melia STT (Jun 16)** — accent/code-switch-first, ~$0.0022/min (cheap enough for volume). But **batch-only, no streaming yet** → unusable in a live call today. Watch for the real-time release; it's the most on-target STT this week.
3. **Nobody advertised accent/noise robustness this week, and the HF Open ASR Leaderboard didn't move** (last updated Jun 11). Your core risk is unaddressed; treat all leaderboard WERs as a clean-audio ceiling, not a guide for shop-line audio.
4. **[NEW] Gnani Prisma v2.5 (Jun 19)** — telephony-native ASR (trained on noisy GSM/VoIP, code-switching) proves the *architecture* you need beats clean-trained models. India-only, not deployable — but it's the design template.
5. **Deliverability is the silent killer:** fresh outbound numbers get auto-flagged "Spam Likely" before a human answers. TT carriers likely don't honor US STIR/SHAKEN or Hiya branded calling — verify locally before scaling calls.

## Track 1 — Voice AI
- **[NEW] Gemini 3.1 Flash TTS streaming** — `streamGenerateContent`/`stream:true` now supported for `gemini-3.1-flash-tts-preview`. Source: ai.google.dev/gemini-api/docs/changelog (Jun 17, verified). Cost ~$5/M chars audio out (~$0.03/min); 1–2 min call TTS = a few cents. *So what:* directly in your stack, lowers perceived latency on bad lines — wire it up. *Skeptic:* it's TTS quality, not accent *recognition*; still `-preview`, keep a fallback.
- **[NEW] Pipecat v1.4.0 (Jun 17, signed release)** — realtime speech-to-speech service-mode plumbing; explicitly handles Gemini Live's quirk of emitting no server turn frames (use local VAD), shaves turn latency. *So what:* the framework to use **if** you move to true Gemini Live S2S. *Skeptic:* that's an architecture change; the cheaper STT→LLM→TTS cascade may stay the right call.
- **[NEW] LiveKit Agents 1.6.2 (Jun 19, signed release)** — adds Gemini 3.1 Flash TTS streaming + AssemblyAI `universal-3-5-pro` STT as default, plus a "Voice Focus" noise preset. *So what:* same streaming TTS exposed if you self-host. *Skeptic:* Voice Focus targets noise, not accent; AssemblyAI on heavy Creole-English over a bad line is unproven.
- **[NEW] Retell "Colloquial Model" + "Expressive Mode" (Jun 19)** — date verified from changelog index; **detail page 404'd, feature specifics unverified.** *So what:* casual register suits chatting up a shop owner — a benchmark candidate. *Skeptic:* "colloquial" almost certainly = American-casual, not Caribbean; adopting Retell replaces your whole Gemini stack.
- **[NEW] Telnyx Inworld Realtime TTS 2 (Jun 16)** + **Inference Conversation History beta (Jun 18)** — on-network carrier+TTS, conversational tone adaptation; the history feature you already do in Supabase. *So what:* on-network *could* mean lower jitter on PSTN into TT. *Skeptic:* no Telnyx local TT numbers; migrating off-stack for one feature is a big lift.
- **Nothing in-window:** Vapi (last ~Jun 1), Bland (Jan), Twilio (Jun 10), OpenAI Realtime (gpt-realtime-2 = May 7), Synthflow (Jun 15 was a deprecation, not a feature).

**STT/TTS models**
- **[NEW] Speechmatics Melia (Jun 16-17)** — multilingual STT, code-switching 55+ languages, pitched at accents "others treat as edge cases." ~$0.129/hr (~$0.0022/min). *So what:* Trini English + Hindi/patois code-switching is its target; cheap at volume. *Skeptic:* **batch-only — no streaming/real-time at launch**, so not usable live yet; FLEURS win is read speech, not telephony.
- **[NEW] Gnani Prisma v2.5 (Jun 19)** — telephony-tuned Indic STT trained on noisy GSM/VoIP + word-level code-switching; claims 15-18% lower WER vs Deepgram Nova-3 / ElevenLabs Scribe v2 on noisy benchmarks. *So what:* proof that telephony-native ASR beats clean-trained models — the design you want. *Skeptic:* India-only languages, no Caribbean coverage, no API region near TT. Not deployable.
- **[NEW traction] NVIDIA Nemotron-3.5-ASR Streaming 0.6B** — card updated Jun 16, ~27.4K downloads/616 likes, but model actually dropped ~Jun 4 (**out of window** — this is a visibility surge, not a release). Runs real-time on CPU, streaming, open weights (license "other" — verify). *So what:* best open-weights base for a low-latency pipeline you'd fine-tune on TT telephony. *Skeptic:* trained on clean corpora — needs Trini-noise fine-tuning to be trusted.
- **HF Open ASR Leaderboard — no change this week** (last updated Jun 11). Top avg WER: Microsoft azure-speech-05-2026 (5.32), IBM granite-speech-4.1-2b (5.65), Zoom scribe_v1 (5.80). Named vendors: ElevenLabs Scribe v2 6.32, AssemblyAI Universal-3-Pro 6.66, Parakeet-0.6b-v3 6.82, Kyutai stt-2.6b-en 6.83. All clean/read benchmarks (AMI/Earnings22/LibriSpeech) — a ceiling, not a guide for noisy Trini lines.

## Track 2 — Vehicle data & dossier
Nothing notable this week. No in-window VIN library, JDM chassis-code decoder, or OEM/fitment dataset qualified. Near-miss: NHTSA vPIC v4.06 / June DB dated **6/13** (just outside window) and it only added EV "Triple/Quad Motor" metadata — US-only, irrelevant to the JDM grey-imports that dominate TT. The hardest, highest-value piece (JDM chassis→trim/engine/drivetrain) remains a gap with no tooling cadence. Re-check next week for the vPIC July drop.

## Track 3 — AI tooling for my stack
- **[NEW] Gemini API deprecations (Jun 15)** — Imagen 4 + Gemini 3 Image models shut down Aug 17, 2026; Veo 2/3 video Jun 30. *So what:* an **action item, not an upgrade** — if any image-to-part path touches Imagen 4, you have a migration deadline. Ignore if you only use Flash for text/vision understanding.
- **[NEW] `vercel/eve` agent framework (TS, created Jun 16)** — Vercel-native agent framework (sandbox, workflows). *So what:* most stack-aligned (Vercel+Next+TS) option to evaluate for call orchestration. *Skeptic:* brand new — don't bet the calling loop on it yet.
- **[NEW] `helloxz/zocr` (Jun 17)** — self-hostable OCR API wrapping Baidu PP-OCRv6 (strong on industrial/part-number text). *So what:* reference if you build an OCR microservice for reading part numbers off box labels instead of calling Gemini vision.
- **[NEW] GLM-5.2 open weights (Jun 16)** — 753B MoE, MIT, 1M context, text-only. *So what:* marginal — a cost floor for bulk text reasoning if Gemini per-token costs balloon. Text-only, not self-hostable by a small team. Not a voice play.
- **MCP directories (PulseMCP/Smithery/mcp.so/awesome-mcp-servers):** no commerce/telephony/WhatsApp/inventory/image-to-part server verifiably shipped or updated in-window.
- *Out-of-window but worth a separate eval pass (don't chase as "new"):* Gemini 3.5 Flash GA (May 19, biggest cost/speed lever for your text path), OpenAI gpt-realtime @ $0.017/min (May), PP-OCRv6 (Jun 11).

## Track 4 — Broader automotive AI
Nothing notable this week. Checked aftermarketnews / Auto Service World / SEMA — only stale diagnostics-tool incrementalism. Roadzen/VehicleCare's $10M insurer mandate (Jun 16, verified) is AI insurance/claims, not parts/supplier-network — no lesson for you. Dropped.

## Track 5 — Community & ground truth
- **Deliverability/number-reputation (general, recurring risk — specific Reddit thread surfaced but date-unverifiable; Reddit was unscrapeable this run, treat thread as unconfirmed):** fresh outbound numbers get auto-flagged "Spam Likely" by carrier/Hiya engines before anyone answers. *So what:* a direct kill-switch for a calling product. Mitigation: register caller ID with analytics engines, warm numbers, keep per-number volume low / answer-rate high. **Verify whether TT carriers honor STIR/SHAKEN or branded calling — likely not.**
- **Trade distrust of AI in diagnosis (r/mechanics, date-unverifiable):** techs shame AI for *diagnosis*, tolerate it for paperwork. *So what:* keep PartFinder framed as procurement/logistics (finding/pricing a known part), never as advising what's wrong with the car.
- **Market premise (background, not datable):** TT parts trade runs on "Call or WhatsApp" everywhere. Reinforces the voice premise — but flags that a voice-*only* approach may miss how Trinis actually prefer to transact. No in-window TriniTuner thread found.
- *Method caveat:* Reddit (firecrawl + WebFetch) and hn.algolia.com were blocked this run, so HN 7-day sweep and exact Reddit dates couldn't be confirmed; community items are reported with that uncertainty rather than asserted as fact.

## Action items (max 3)
1. **Pilot Gemini 3.1 Flash TTS streaming on the call path** — wire `stream:true`, measure time-to-first-audio vs your current TTS on a real (laggy) TT line. Highest-leverage, in-stack, cents-per-call.
2. **Record a Trini-accent shop-line test set now** (10-20 real clerk clips, noisy). You can't evaluate any STT against your #1 risk without it — leaderboards won't tell you. Run it against your current Gemini path as a baseline so next week's options (esp. Speechmatics Melia real-time when it lands) are measurable.
3. **Audit outbound number reputation before scaling** — check if your calling numbers show "Spam Likely," and confirm with the local TT carrier what (if any) branded/verified caller-ID exists. Cheap to check, expensive to ignore.
