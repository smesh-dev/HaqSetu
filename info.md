# HaqSetu — हक़सेतु · team brief

*The benefits you're owed — found, explained, claimed.*
**USAII Global AI Hackathon 2026 · Undergraduate Track · Challenge 4 (Fix Systems People Depend On) → Direction A: Benefits Navigator**

---

## What it is (one line)
A **privacy-first, bilingual one-stop app** that gets a poor/marginalised Indian family from *"I don't know what I'm owed"* → finding the government schemes they qualify for → fixing the document errors that get applications rejected → tracking each application until the money arrives.

## Who it's for
Low-income, often low-literacy or rural Indians — a widow, a landless daily-wage worker, a pregnant informal worker, a small farmer, a parent of a first-gen student. People entitled to benefits who don't get them because the system is confusing, paperwork-gated, and unforgiving.

## The problem (researched, cited in-app)
- **Documentation trap:** ~20% of benefit exclusion is *purely* missing paperwork. In one district 80%+ of SC/OBC families had no caste certificate → locked out of *every* scheme meant for them.
- **Awareness gap:** 800M+ eligible, ₹210B+ budget, hugely underused. ~2/3 of eligible widows never claim their pension.
- **Silent post-approval failure:** ~8–12% of *already-approved* scholarships are never paid — Aadhaar–bank seeding / name-mismatch / IFSC errors.

---

## What it offers — 4 sections (one local profile flows through all)
1. **Home** — explains the flow + privacy promise.
2. **Find benefits** (`/schemes`) — adaptive AI intake (or icon-tap/free-text) → schemes you may be owed, an estimated ₹/year, the document **unlock path**, and a step-by-step plan.
3. **My documents** (`/documents`) — a **DigiLocker-style local vault** + a **rejection-proofing audit** that catches the exact errors that kill applications. Nothing is uploaded.
4. **Tracker** (`/tracker`) — follow each application: *to-start → applied → under verification → approved → money received*.

**11 real schemes modelled:** NSAP pensions (old-age/widow/disability), NFSA ration, PM-KISAN, PMAY-G housing, Ayushman Bharat PM-JAY, PM Ujjwala, Post-Matric Scholarship, PMMVY maternity, MGNREGA.

---

## How the AI works (the important part)
```
Your words / answers → AI structures & decides what to ask → Rules engine decides (cited) → AI explains → You decide & verify
```
- **Deterministic rules engine** owns every eligibility verdict (income caps, BPL/age gates, scheme criteria). It **never hallucinates** — and runs **on your device**.
- **AI does the parts that can't be hard-coded:** (1) **adaptive intake** — a value-of-information loop that simulates each unknown answer and asks the *single most useful next question* ("Chosen by AI · could open up N more benefits"); (2) reads messy free-text/Hindi into structure; (3) explains the result kindly. The LLM never decides eligibility.
- **Entitlement dependency graph:** computes which one document unlocks the most benefits + a coverage gap (claimable now vs blocked).
- **Rejection-proofing audit:** checks your documents for name mismatch, Aadhaar–DBT seeding, dormant account, IFSC format, certificate recency, OBC-NCL → readiness score + exact fixes.

## Privacy
Profile + documents stay **only in the browser (localStorage)** — never uploaded. Engine runs on-device. The only outbound calls are the **optional, consent-gated** Gemini intake/explanation, which get typed text or a short de-identified summary (no ID numbers). Works even with no API key (local fallbacks).

## Stack
Next.js 16 + TypeScript + Tailwind v4. Google **Gemini** (`gemini-2.5-flash`, free tier) for the optional NL parts. Run: `npm install && npm run dev`. Engine self-test: `npx tsx scripts/test-engine.ts` (26/26 pass).

---

## Judging criteria & how we score (Challenge 4, UG)
| Criterion | Weight | Our estimate | How we win it |
|---|---|---|---|
| Problem Understanding | 20% | ~18 | Specific user + system + real constraints, research-cited. |
| **AI Reasoning** | **30%** | **~26–27** | Adaptive value-of-information questioning + parse + explain. Answers "why LLM vs rules?" explicitly: rules for facts, AI for uncertainty. |
| Solution Design | 25% | ~23 | Coherent input→reason→output→action→track pipeline; 4-section platform. |
| Impact & Insight | 15% | ~13 | Quantified entitlement, the trap insight, real behaviour change. |
| Responsible AI | 10% | ~9–10 | "May qualify" framing, citations, human-in-loop, privacy-first, hallucination-safe by design. |

**Estimated total ≈ 88–91 / 100.**

### Devpost fields (short)
- **Human-in-loop:** AI never approves benefits or issues certificates — the Gram Panchayat / issuing officer / scheme authority does; we route the user to free human help (CSC).
- **Responsible-AI guardrail:** risk = false confidence / wrongful exclusion → mitigations: strict "may qualify" language, every rule cited & dated, AI barred from deciding eligibility, poor-friendly alternatives surfaced.
- **Tools:** Next.js/React/TS/Tailwind (free), Gemini API (free tier), Claude Code (disclosed).
- **Data:** public govt scheme rules + reputable research; synthetic personas. No real personal data.

## Honest limitations (say these in the pitch)
- Scheme values are **researched MVP figures, dated** — flagged "verify at a CSC."
- Document scan / DigiLocker link are **simulated from user-confirmed inputs** (a hackathon can't do live DigiLocker/PFMS integration).
- Covers Rajasthan + Bihar (+ central fallback) and 11 central schemes — intentionally narrow and transparent.

## Best demo path (for the video)
Home → **Find benefits** → load the **Imran** persona → answer 1–2 adaptive questions → see schemes + unlock path → **My documents** shows the rejection-proofing audit catching the **name-mismatch + Aadhaar-seeding** errors → **Tracker** follows it to "money received." Narrate the rules-vs-AI split out loud.
