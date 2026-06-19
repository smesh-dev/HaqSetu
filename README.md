# HaqSetu — हक़सेतु · *The benefits you're owed — found, explained, claimed.*

**USAII Global AI Hackathon 2026 · Undergraduate Track · Challenge 4 — “Fix Systems People Depend On” · Direction A: Benefits Navigator**

HaqSetu is a one-stop, **privacy-first** platform that helps **poor and marginalised Indian families discover the government welfare schemes and certificates they may be entitled to** — then untangles the paperwork that keeps them out, **rejection-proofs** their application, and tracks it to money-in-hand, in plain **Hindi or English**.

> 🤝 Free guidance. We never ask for money. A government officer makes the final decision.
> 🔒 Privacy-first: your documents and profile never leave your device — the rules engine runs in your browser, nothing is uploaded.

## Four sections (a real platform, not one chat box)

| Page | What it does |
|---|---|
| **Home** | Explains the flow + the privacy promise; entry points to each section. |
| **Find benefits** (`/schemes`) | Eligibility finder — icon-tap or free-text intake → schemes you may be owed, the unlock path, and a step-by-step plan. |
| **My documents** (`/documents`) | A **DigiLocker-style local vault** + the **rejection-proofing audit** that catches the errors which kill applications. Nothing is uploaded. |
| **Tracker** (`/tracker`) | Follow each application from *to-start → applied → under verification → approved → money received*, with the next step always clear. |

One **local profile** (in your browser) flows through all four — enter once, reuse everywhere.

---

## The problem (why this matters)

India runs one of the world's largest welfare systems — **800M+ eligible citizens and a >$210B annual budget** — yet a huge share of benefits never reaches the people they're meant for. Not because people don't want them, but because the system is confusing, fragmented, and gated behind paperwork. From field research:

- **The documentation trap.** ~**20% of benefit exclusion is purely a documentation problem.** In one Jharkhand district, **80%+ of Dalits and OBCs had no caste certificate — so they could apply for *none* of the schemes meant for them.** One missing paper (often Aadhaar) silently blocks many benefits at once; getting it unlocks them together.
- **The awareness gap.** Eligible people simply don't know what they qualify for. **Two-thirds of eligible widows in Delhi never claim their pension**, mostly for lack of information.
- Add low literacy, language barriers, the digital divide, and middlemen who charge for things that are free.

Real-world inspiration: **Haqdarshak, Code for America, Benefits Data Trust** — organisations that close this gap with technology + human help.

## What HaqSetu does

1. **Understands you** — tell it your situation in your own words (Hindi/English), or tap big, icon-led buttons (“Widow”, “Live in a village”, “No gas connection”, “Which papers do you have?”). No forms-literacy required.
2. **Finds your benefits** — a deterministic rules engine matches you against real schemes: **NSAP pensions (old-age / widow / disability), NFSA ration card, PM-KISAN, PMAY-G housing, Ayushman Bharat PM-JAY, PM Ujjwala, Post-Matric Scholarship, PMMVY maternity, MGNREGA** — each with an honest *“you may be eligible”* verdict.
3. **Untangles the documentation trap** — the signature feature: it computes **which single document unlocks the most benefits** and tells you to get that first (“Get your bank account → unlocks 3 of your benefits”), with poor-friendly alternatives (self-declaration via Patwari/Gram Panchayat, Jan Dhan zero-balance account, introducer-based Aadhaar).
4. **Rejection-proofs your application** — the core feature. Before you apply, a deterministic audit checks *your specific documents* for the errors that silently reject forms or stop the money **even after approval**: name spelled differently across Aadhaar/bank/certificate, Aadhaar not *seeded* to your bank for DBT, dormant account, invalid IFSC, stale income certificate, OBC certificate not marked Non-Creamy-Layer. It returns a readiness score and the exact fix for each.
5. **Remembers you and produces an artifact** — your profile is saved on your device and reused across every scheme and visit (no re-explaining), and you can **print a ready-to-carry plan** to hand to a CSC operator.
6. **Gives a simple plan** — numbered steps in dependency order, plus where to get **free human help** (Gram Panchayat / Common Service Centre).

It also shows a running estimate — *“You may be entitled to ~₹X/year + one-time help”* — to turn an abstract maze into a concrete, motivating number.

---

## The AI architecture (why this isn't just a chatbot)

The defining choice is **what the AI is and isn't allowed to do** — which directly answers the judge's “why AI / why not pure LLM?” lens.

```
Your words  →  AI structures  →  Rules engine decides  →  AI explains kindly  →  You decide & verify
  (NLP)         (Gemini)          (deterministic, cited)      (Gemini)             (human-in-the-loop)
```

- A **deterministic, unit-tested rules engine** (`lib/rules/`) owns **every** eligibility verdict. Welfare rules (income ceilings, BPL/age gates, scheme criteria) are precise facts an LLM can hallucinate — so the LLM never decides them.
- **Adaptive AI-guided intake** (`lib/rules/inquiry.ts`) is a **value-of-information** reasoning chain: for every unknown about the person it simulates the answer against the engine and asks the *single most informative next question* — showing "Chosen by AI · could open up N more benefits." The form becomes optional; the AI decides what to learn next. (Decision-support reasoning, the rubric's highest-weighted ask.)
- An **entitlement dependency graph** (`lib/rules/graph.ts`) models schemes → documents → prerequisite documents as a DAG, then walks it in prerequisite order to compute the **optimal unlock path** ("get these papers in this order; each opens these benefits") and a **coverage gap** (how many benefits you can claim *now* vs. how many are locked behind missing documents). This is real graph reasoning a chatbot guesses at and gets wrong.
- The whole engine is **fully bilingual** — every user-facing line is authored by us in English *and* Hindi (`Localized`), so the chosen language renders consistently end to end. The LLM only translates its own free-text restatement.
- **Gemini** does only two language jobs: **parse** a free-text/Hindi story into a structured profile, and **restate** the engine's result in warm, simple words. It cannot invent a scheme, number, or document.
- **Glass-box + citations:** every scheme and document shows its reasoning trace and a dated public source.
- **Privacy-first:** the engine runs in the browser, so the profile and documents never need to be sent anywhere. They're stored only in `localStorage` on the device. The only outbound calls are the *optional* Gemini intake/explanation, which receive typed text or a short de-identified summary (never ID numbers or document data) and are consent-gated.

---

## "Why not just ask ChatGPT?" — the honest answer

A modern LLM with thinking mode *can* reason about a scheme and even sketch the document dependencies. So **eligibility advice is commoditised, and we don't pretend otherwise.** HaqSetu's value is the part a conversation structurally cannot be:

- **It's a system of record, not a chat.** Your profile is captured once as structured data and reused across 11 schemes and across visits. A chat forgets you when the tab closes; the next office visit, you re-explain everything.
- **It runs a deterministic audit over *your* documents.** The rejection-proofing engine (`lib/rules/validation.ts`) is exact, repeatable, and exhaustive — it always checks Aadhaar-DBT seeding, name-consistency, IFSC validity (a literal format check), certificate recency and NCL. An LLM mentions these only if you happen to ask, phrases them differently each time, and can hallucinate an IFSC or miss the seeding step entirely. ~8–12% of *approved* scholarships are lost to exactly these errors — the failure happens **after** any chatbot has said "you're eligible."
- **It produces a verifiable artifact**, not prose: a printable, field-traceable plan to hand to a CSC. An LLM-typed form value can be silently wrong; ours is filled deterministically from data you confirmed.
- **It's built for someone who can't prompt** — icon-tap intake, full Hindi, works offline, and routes to free human help. The people losing benefits are precisely those who would never open ChatGPT.
- **The knowledge is curated and dated**, versioned in code with citations, not recalled fuzzily from a model's training data.

In one line: **the LLM is the friendly front door; the product is the structured citizen record + the deterministic rejection-proofing engine + the artifact it generates.** Take the LLM away and HaqSetu still works (it falls back to local parsing and templated explanations); take the engine away and you just have a chatbot.

---

## Run it locally

```bash
cp .env.example .env.local       # paste your Gemini API key (server-side only)
npm install
npm run dev                      # http://localhost:3000
npx tsx scripts/test-engine.ts   # rules-engine self-test across all 5 personas
```

The app **works even without a Gemini key** — intake falls back to a local keyword parser and the explanation to a deterministic summary, so the rules engine and the demo never break.

| Env var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini key, used only on the server (never shipped to the browser). |
| `GEMINI_MODEL` | Default `gemini-2.5-flash`. |

### Project map
```
app/page.tsx            Home — explainer, privacy promise, section entry points
app/schemes/page.tsx    Find benefits — intake + results (runs the engine on-device)
app/documents/page.tsx  My documents — DigiLocker-style local vault + rejection-proofing audit
app/tracker/page.tsx    Tracker — application status from start to money received
components/shared.tsx    Nav + all bilingual UI/result components
lib/store.ts             Privacy-first localStorage hooks (profile, tracked apps, AI consent)
lib/i18n.ts              Bilingual UI dictionary
app/api/parse/route.ts  Optional NLP intake: free text -> structured profile (Gemini)
app/api/explain/route.ts Optional plain-language summary of an on-device result (Gemini)
lib/rules/schemes.ts    11 welfare schemes with deterministic eligibility logic
lib/rules/documents.ts  Foundational documents, prerequisites, poor-friendly alternatives
lib/rules/inquiry.ts    Adaptive AI intake: value-of-information next-question selection
lib/rules/graph.ts      Entitlement DAG: optimal document unlock-path + coverage gap
lib/rules/validation.ts Rejection-proofing audit (name/DBT/IFSC/recency/NCL) → readiness score
lib/rules/engine.ts     Scheme matching + documentation-trap + value estimate + action plan
lib/rules/citations.ts  Every rule & statistic's public, dated source
lib/personas.ts         5 synthetic personas (widow, landless labourer, pregnant worker, OBC student, small farmer)
```

---

## Devpost submission fields

**Project Description.** HaqSetu helps poor and marginalised Indian families discover the welfare schemes and certificates they may be entitled to, untangles the “documentation trap” that locks them out, and gives a simple step-by-step plan in plain Hindi/English. It serves widows, daily-wage workers, small farmers, parents of students and people with disability who lose benefits they're legally owed because the system is confusing, fragmented, and paperwork-gated.

**Track & Challenge.** Undergraduate Track · Challenge 4 (Fix Systems People Depend On) · Direction A (Benefits Navigator).

**AI Architecture.** *Inputs:* a free-text situation (Hindi/English) plus a structured profile (community, age, gender, household income, BPL status, occupation/land, disability, household situation flags, and which documents they already hold). *AI capabilities:* conversational NLP intake (field extraction) + generative plain-language explanation. *Processing:* the LLM structures the story → a deterministic engine matches the person to cited schemes, then computes which missing document unlocks the most benefits → the LLM restates the result kindly. *Outputs:* a list of schemes they may be entitled to with verdicts and reasoning, the documentation-trap “unlock” card, an estimated annual value, and a sequenced action plan with where to get free help.

**Human-in-the-Loop.** The AI does **not** approve benefits or issue certificates — those are decided by the Gram Panchayat / issuing officer / scheme authority, who verify documents and are accountable. HaqSetu only surfaces what a person *may* be entitled to and routes them to a human (issuing office or CSC) to confirm. Every AI-parsed field is shown for the user to correct before anything is assessed.

**Responsible AI Guardrail.** *Risk:* false confidence / wrongful exclusion — telling a poor family they qualify (or don't) and being wrong has real consequences. *Mitigations:* (1) strictly “you **may** be eligible” framing, never a guarantee; (2) the LLM is structurally barred from deciding eligibility or inventing numbers — a cited rules engine decides; (3) every rule shows a dated public source; (4) need-more-info and “worth checking” states instead of false negatives; (5) poor-friendly alternatives surfaced (self-declaration, Jan Dhan, introducer Aadhaar) so people aren't wrongly turned away; (6) persistent “free guidance, not an official decision — confirm at your Gram Panchayat/CSC”.

**Tools Used.** Next.js, React, TypeScript, Tailwind CSS (free/open-source). Google Gemini API (`gemini-2.5-flash`) — free tier. AI coding assistance: Claude Code (disclosed).

**Data Disclosure.** Only **publicly available government scheme rules** (NSAP, NFSA, PM-KISAN, PMAY-G, PM-JAY, PM Ujjwala, National Scholarship Portal, PMMVY, MGNREGA, UIDAI/PMJDY) and reputable public research on welfare exclusion (Haqdarshak field studies, IDinsight, CAG), plus **synthetic personas** created by the team. No real personal data or government databases are accessed. Scheme values are researched MVP approximations, each dated and flagged for verification.

---

## Honest scope & limitations
- Document/certificate process is detailed for **Rajasthan and Bihar** (+ a generic central fallback); 11 major central schemes are modelled. Coverage is intentionally narrow and transparent — state schemes and exact thresholds vary and change.
- Scheme values are researched MVP figures and **dated**; always confirm at a Gram Panchayat / CSC. This caution *is* the product's responsible-AI thesis, not a footnote.
- The tool can't verify the truthfulness of self-reported facts.
```
