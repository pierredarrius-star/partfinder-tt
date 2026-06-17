# Weekly AI/Auto Research — PartFinder TT

**Date:** 2026-06-17 · **Window:** June 10–17, 2026 (7 days)
**Continuity:** No prior `weekly-ai-auto-*.md` found — this is report #1, so everything is **[NEW]**. Next week I'll diff against this file.

A quiet-to-moderate week. One STT/TTS pair worth a real pilot, one cheap-but-batch-only STT, a Gemini streaming-TTS ship on your own stack, and a new far-field leaderboard that's a better noise proxy than the famous one. Nothing solved the core risk: no vendor this week claims **Caribbean/Trini-accented** English, and nobody published telephony-grade accent numbers. You still have to audition voices and run your own eval on recorded T&T calls.

---

## TL;DR (ranked by relevance to the voice-calling build)

1. **Cartesia Sonic-3.5 TTS + Ink-2 STT [NEW]** (Jun 15) — one API for both ends of the pipeline, sub-90ms TTS / ~100ms STT, explicitly pitched at noisy phone lines. Strongest single candidate this week — but the "#1" claims aren't on telephony or Trini accents. *Audition before trusting.*
2. **Speechmatics Melia STT [NEW]** (Jun 16) — cheapest in class (~$0.0043 for a 2-min call) and accent-focused, **but batch-only at launch** — it cannot drive a live call yet. Pilot on *recorded* calls now.
3. **Gemini TTS streaming went live [NEW]** (Jun 17) — `gemini-3.1-flash-tts-preview` now streams; cuts perceived latency on calls. Your stack, near-zero switching cost. Gemini 3.1 Flash Live remains your cheapest realtime baseline (cents/call).
4. **HF Far-Field ASR (FFASR) leaderboard [NEW]** (Jun 11) — noisy/distant-mic benchmark, the best public proxy for a din-filled shop. Cohere Transcribe leads at 17.9 WER — note that's ~3× the clean-speech numbers, which is the honest signal.
5. **Telephony spam-labeling is the silent killer [NEW]** (Jun 13) — outbound calls flagged "Scam Likely" tank pickup rates. Plan number rotation + local-presence caller ID from day one. (Caveat: the tooling is US/STIR-SHAKEN-based and won't map cleanly to T&T carriers.)

---

## Track 1 — Voice AI

**Text-to-speech / STT pairs**
- **Cartesia Sonic-3.5 (TTS) + Ink-2 (STT) [NEW]** — SSM-based realtime TTS + streaming STT, sold for voice agents; claims #1 on Artificial Analysis Speech Arena and STT boards. [cartesia.ai/launch](https://cartesia.ai/launch/) (Jun 15). *Cost:* no per-char price on the launch page (3-months-free promo) — get a quote; legacy Sonic ran ~$0.02–0.04/min. *Accent/latency:* sub-90ms first-audio, ~100ms transcript, native turn detection — inside the phone budget even with TT↔US RTT; a Bolna testimonial cites alphanumerics + code-switching surviving on a phone line (relevant to part numbers/VINs). **No Caribbean-accent claim.** *So what:* best one-vendor pipeline this week — stress-test Ink-2 on real TT-accented callers + shop noise before believing the leaderboard.
- **Speechmatics Melia (STT) [NEW]** — multilingual, code-switching, explicitly tuned for accented speech; claims wins over Deepgram/MS/AssemblyAI on FLEURS. [speechmatics.com](https://speechmatics.com) (Jun 16). *Cost:* from **$0.129/hr (~$0.0043 for 2 min), 10 hrs/mo free — cheapest here.** *Accent:* strong track record, but **batch-only at launch (no streaming yet)** and FLEURS is *read* speech with no Trinidadian English. *So what:* most promising STT to watch; unusable for live calls until streaming ships — pilot on recordings.
- **ElevenLabs changelog [NEW]** (Jun 15) — no new voice model; telephony plumbing only: SIP `enabled_codecs`, `enable_phoneme_tags` (force pronunciation of part/brand names), transfer TTS overrides. *So what:* phoneme tags help nail Trini names if you stay on 11Labs; not a reason to switch.
- **Deepgram [NEW, minor]** (Jun 11 self-hosted 260611) — Persian profanity filter, Flux streaming redaction, `diarize_model` param. Nothing improves accent handling. **AssemblyAI, NVIDIA Parakeet/Canary, Kyutai, Moonshine, Gladia, Rime, PlayHT, Hume, Deepgram Aura: nothing verifiable in window.**

**Realtime speech-to-speech**
- **Gemini Live [ONGOING context]** — `gemini-3.5-live-translate-preview` dropped **Jun 9 (one day before window)** and is translation-only — wrong tool for an English-only TT call. Verified pricing: `gemini-3.1-flash-live-preview` ≈ $0.005/$0.018 audio in/out — **cents per call, your cheapest realtime path.** *So what:* nothing new shipped *for you* this week; 3.1-flash-live stays the baseline to beat.
- **OpenAI Realtime** — nothing in window (GPT-Realtime-2 was May 7). Note a **Jun 12 production incident** (static/crackling over WebRTC) — reliability flag, not a feature.

**Platforms** — **Pipecat v1.4.0** (Jun 16, turn-event hooks) and **LiveKit Agents v1.6.0** (Jun 11, **async tools** — lets the agent say "let me check, one sec" while querying suppliers instead of dead air; genuinely useful). Retell "Colloquial Model" (Jun 11) is output-styling, irrelevant to the STT risk. Vapi/Bland/Synthflow/Twilio/Telnyx: nothing in window (Twilio items were PR).

---

## Track 2 — Vehicle data & dossier

Light week, nothing JDM. **NHTSA vPIC v4.06 [NEW]** (Jun 13) — quarterly US VIN-decoder refresh. *So what:* low value for you — it fills US-spec make/model/year but **does not decode JDM trim/grade or chassis codes (NZE144, GDA/B, DC5)**, so it returns sparse/blank fields for T&T's Japanese used imports. No new JDM decoder libs, fitment APIs, or image-to-part datasets created/updated this week. Standing gap: generic ISO-3779 tools ignore the JDM frame/grade plate that actually holds the dossier data you need.

---

## Track 3 — AI tooling for the stack

- **Gemini TTS streaming [NEW]** (Jun 17) — `streamGenerateContent` for `gemini-3.1-flash-tts-preview`. [ai.google.dev changelog](https://ai.google.dev/gemini-api/docs/changelog). *So what:* stream speech instead of waiting for full render — direct latency win on calls. Worth a spike.
- **Gemini deprecations [NEW]** (Jun 15) — Imagen 4 + Gemini-3 image models off **Aug 17**; Veo 2/3 off Jun 30. *So what:* if any OCR/image-to-part prototype touches `imagen-4.0-*`, migrate before Aug 17.
- **MCP servers** (commerce/telephony/WhatsApp/OCR/image-to-part): nothing notable — only marketing filler and pre-existing WhatsApp repos.
- **GitHub Trending:** XiaomiMiMo/MiMo-Code (9.5k stars, created Jun 10) and peers are all coding-agent CLIs — no commerce/voice/parts relevance. Skip.

---

## Track 4 — Broader automotive AI

Nothing notable this week. The fresh-looking items (PartsTrader Orderly, Bosch–Uptake, Meko) all date to March/early June and carry no new lesson or competitive threat to a phone-based parts-finder. No in-window funding/acquisition/shutdown worth flagging.

---

## Track 5 — Community & ground truth

- **Post-call capture is the real hard part [NEW]** — r/AI_Agents (~Jun 16): an agent heard "call back after 10" correctly but the summary dropped it. *So what:* build reliable post-call extraction of "in stock / call back Tuesday / price," not just good TTS.
- **Spam-labeling kills pickup [NEW]** (Jun 13, technology.org) — "Scam Likely" flags are the #1 connect-rate killer; vendors rotate numbers + use local-presence caller ID. *So what:* a single static T&T outbound number will degrade — plan rotation early. **Caveat:** STIR/SHAKEN is US infra; Caribbean carriers differ, so the fixes won't map directly.
- **Rising distrust of unknown callers [NEW]** (~Jun 12–15) — scam-awareness reels pushing "hang up, call back a known number." *So what:* your disclose-only-if-asked posture sits against a hardening climate; expect clerk rejection risk.
- **Trinidad ground truth** — TriniTuner classifieds + TT FB groups confirm "call or WhatsApp" is *the* buying channel — but sellers expect a *human* contact. **No organic Caribbean discussion of AI phone agents this week — a genuine gap to fill by direct outreach, not search.**
- **Leaderboards:** Open ASR Leaderboard (updated Jun 11) — Azure-speech 5.32 WER tops, IBM Granite-speech / NVIDIA Parakeet lead the self-hostable pack. **Critical caveat:** these are clean read-speech WERs; 8kHz narrowband noisy Trini phone audio will be far worse. Use the board to *shortlist*, then run your own eval.

---

## Action items (max 3)

1. **Pilot Cartesia Ink-2 + Speechmatics Melia on the same 10–15 recorded Trini supplier calls** (noisy, accented, with part numbers/VINs). Compare WER on *your* audio — ignore both vendors' leaderboard claims. This directly attacks your #1 risk and costs almost nothing.
2. **Spike Gemini 3.1-flash-tts streaming** (shipped Jun 17) into your call loop and measure end-to-end latency **from a T&T egress**, not the datasheet — network RTT, not model latency, is your real budget.
3. **Decide your number-reputation strategy now:** test whether a local T&T (868) caller ID lifts pickup vs. a foreign/VoIP number, and design for number rotation. US STIR/SHAKEN tooling won't save you here — this is a Caribbean-carrier question to validate by calling.
