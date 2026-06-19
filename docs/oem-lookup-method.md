# OEM Part-Number Lookup — Method & Guardrails

**Principle: read OEM part numbers from the manufacturer catalog (EPC). Never let an LLM generate them.**

An LLM recalls part numbers from training patterns, which produces confident, correctly-formatted, *wrong* numbers. The fix is retrieval + verification — not prompting alone, and definitely not fine-tuning (you cannot train reliable 10-digit part numbers into model weights).

## Why — the failure we're guarding against

A third-party Gemini-based "AI mechanic" bot was asked for the front-right ABS wheel speed sensor on a **2012 Toyota Corolla Axio NZE144**. It answered **`89542-12070`**.

That is a real Toyota part — but for the **previous generation** (chassis NZE121 / E120, 2003–2008). The correct number is **`89542-12100`**, confirmed in **both** PartSouq and Amayama (genuine Toyota-Japan EPC, chassis NZE144, "ABS & VSC" group). Right family, right side, wrong application — the exact error class that erodes customer trust.

| Position | Part number | Source |
|----------|-------------|--------|
| Front RH (speed sensor) | `89542-12100` | PartSouq + Amayama (NZE144) |
| Front LH (speed sensor) | `89543-12100` | PartSouq + Amayama (NZE144) |
| Rear (speed sensor) | `89546-12110` | catalog / aftermarket listings |
| ❌ Bot's answer | `89542-12070` | NZE121 (2003–2008) — wrong generation |

## The method (how the correct number was found)

1. **Pin the vehicle to its chassis/platform code** (NZE144), not just year/make/model — "2012 Corolla" is ambiguous (E140 vs E160, 2WD vs 4WD, JDM vs US).
2. **Query an authoritative EPC keyed to that chassis** — PartSouq or Amayama (genuine Toyota-Japan catalog).
3. **Navigate to the correct functional group** — "ABS & VSC" holds the wheel-speed sensors.
4. **Read the line for the exact position** — "SENSOR, SPEED, FRONT RH". Note the catalog uses **RH/LH** (not right/left) and **"speed sensor"** (not "wheel sensor").
5. **Cross-verify two sources** and **reverse-verify** that the candidate maps back to the chassis — this is what exposed `89542-12070` as the wrong generation.
6. **Check the frame/date-range split** if numbers differ within a generation (needs the frame number).

## How this is enforced in code (Earl — `src/app/api/chat-earl/route.ts`)

1. **Retrieval, not recall.** Earl keyword-searches `vehicle_oem_parts` (scraped from PartSouq per VIN) and injects only matching rows into the prompt context.
2. **Vocabulary bridge** (`PART_SYNONYM_MAP`). Maps customer words to catalog terms before the search — `right→rh`, `left→lh`, `rotor→disc` — so "right front sensor" actually matches "SENSOR, SPEED, FRONT RH".
3. **Output guardrail** (`verifyPartNumbers`). Every `\d{5}-\d{5}` in Earl's reply is checked (digits-only) against the retrieved rows; anything not present is redacted to `[unverified — check your VIN on PartSouq]`. Earl physically cannot ship a number that wasn't retrieved for that vehicle.

The system prompt also forbids inventing numbers, but the prompt is advisory — the guardrail is the enforcement.

## Voice agent (future)

The same rule applies on calls: the number the agent **speaks** must come from a catalog lookup keyed to the chassis, never from the model. Resolve the part number from the dossier/EPC before dialing, and have the agent read it back to the supplier for confirmation.

## Known gaps / follow-ups

- **`normalizePartQuery` in `src/lib/ai.ts` is ungrounded** — it asks Gemini to add "part compatibility" with no catalog behind it, so an invented detail could be blasted to suppliers. It should clean the description only and pull any number from the catalog. *(Top priority.)*
- **Guardrail covers numeric (Toyota/most JDM) formats only** — Nissan/Honda alphanumeric numbers (e.g. `44300-S5A-003`) aren't matched yet.
- **Multi-word synonyms** ("wheel speed sensor" → "speed sensor") aren't handled by the token-based search.
- **No supersession tracking** — Toyota replaces numbers over time; the scrape is current-at-capture.

---
*Verified 2026-06. Front-RH ABS sensor for NZE144 Axio = `89542-12100`.*
