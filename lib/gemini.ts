// Server-side ONLY. The Gemini key never reaches the browser.
//
// The LLM has a deliberately narrow job in HaqSetu:
//   1. parse free-text into structured Profile fields (NLP intake), and
//   2. explain a verdict the deterministic engine already computed.
// It never decides eligibility and never invents a threshold.
//
// Every LLM call has a deterministic fallback so the demo still works if the
// API key is missing, rate-limited, or invalid.
//
// NOTE: imported only by server-side route handlers — the key stays on the server.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const KEY = process.env.GEMINI_API_KEY || "";

export function geminiConfigured(): boolean {
  return KEY.length > 0;
}

interface GenOpts {
  json?: boolean;
  temperature?: number;
}

// Low-level call to the Gemini REST API. Returns null on any failure so callers
// fall back to deterministic behaviour.
async function geminiCall(prompt: string, opts: GenOpts = {}): Promise<string | null> {
  if (!KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      // These are simple structuring/restating tasks — skip the model's
      // "thinking" budget (2.5+) for lower latency. Older models ignore it.
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      // Send the key as a header (works for AI Studio API keys) — avoids leaking
      // it in any logged URL.
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
      // Don't hang the request if Gemini is slow.
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.error(`[gemini] ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? null;
  } catch (err) {
    console.error("[gemini] call failed:", (err as Error).message);
    return null;
  }
}

export interface ParsedProfile {
  category?: "SC" | "ST" | "OBC" | "EWS" | "GENERAL";
  gender?: "male" | "female" | "other";
  state?: "RAJASTHAN" | "BIHAR" | "CENTRAL";
  age?: number;
  annualHouseholdIncome?: number;
  bpl?: boolean;
  occupation?: "landless_laborer" | "small_farmer" | "informal" | "salaried" | "unemployed" | "homemaker" | "other";
  landAcres?: number;
  disability?: "none" | "benchmark" | "severe";
  household?: Partial<{
    isWidow: boolean;
    isPregnantOrLactating: boolean;
    hasSchoolGoingChild: boolean;
    hasElderly60Plus: boolean;
    lacksPuccaHouse: boolean;
    lacksLpg: boolean;
    isRural: boolean;
  }>;
  documentsHave?: ("aadhaar" | "bank" | "caste" | "income" | "ews" | "domicile" | "ration_bpl" | "disability_udid")[];
  language?: "en" | "hi";
}

const PARSE_SYSTEM = `You are the intake parser for HaqSetu, a tool that helps poor and marginalised Indian families discover the government welfare schemes and certificates they may be entitled to.
Extract ONLY what the user actually stated or clearly implied. Do not guess, do not decide eligibility — you only structure what they said.
Return STRICT JSON with any of these keys (omit keys you cannot determine):
{
 "category": "SC"|"ST"|"OBC"|"EWS"|"GENERAL",
 "gender": "male"|"female"|"other",
 "state": "RAJASTHAN"|"BIHAR"|"CENTRAL",
 "age": number,
 "annualHouseholdIncome": number (rupees; convert 'lakh' e.g. 1.8 lakh => 180000),
 "bpl": boolean (true if they say poor/below poverty line/BPL/Antyodaya or hold a BPL ration card),
 "occupation": "landless_laborer"|"small_farmer"|"informal"|"salaried"|"unemployed"|"homemaker"|"other",
 "landAcres": number,
 "disability": "none"|"benchmark"|"severe",
 "household": { "isWidow": bool, "isPregnantOrLactating": bool, "hasSchoolGoingChild": bool, "hasElderly60Plus": bool, "lacksPuccaHouse": bool, "lacksLpg": bool, "isRural": bool },
 "documentsHave": array of "aadhaar"|"bank"|"caste"|"income"|"ews"|"domicile"|"ration_bpl"|"disability_udid",
 "language": "en"|"hi"
}
Notes: daily-wage/labourer with no land => "landless_laborer"; farmer/khet => "small_farmer"; street vendor/domestic/self-employed => "informal". "widow"/पति की मृत्यु => isWidow. pregnant/expecting/गर्भवती => isPregnantOrLactating. child in school/college => hasSchoolGoingChild. kachha/mud house => lacksPuccaHouse. no gas/LPG/चूल्हा => lacksLpg. village/गाँव => isRural true. Map any mentioned documents (Aadhaar, ration card, bank account, caste/income/domicile certificate) into documentsHave. If text is in Hindi set language "hi".`;

// Deterministic fallback parser — keyword/number heuristics so the
// conversational box still does something useful without the API.
function fallbackParse(text: string): ParsedProfile {
  const t = text.toLowerCase();
  const out: ParsedProfile = {};
  const hh: NonNullable<ParsedProfile["household"]> = {};
  if (/[ऀ-ॿ]/.test(text)) out.language = "hi";

  if (/\bobc\b|other backward|पिछड़ा/.test(t)) out.category = "OBC";
  else if (/\bsc\b|scheduled caste|dalit|दलित|अनुसूचित जाति/.test(t)) out.category = "SC";
  else if (/\bst\b|scheduled tribe|adivasi|आदिवासी/.test(t)) out.category = "ST";
  else if (/\bews\b|economically weaker/.test(t)) out.category = "EWS";
  else if (/general|सामान्य/.test(t)) out.category = "GENERAL";

  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख)/);
  if (lakh) out.annualHouseholdIncome = Math.round(parseFloat(lakh[1]) * 100000);
  else {
    const thou = t.match(/(\d{4,7})\s*(?:per year|a year|annual|sal|साल)/);
    if (thou) out.annualHouseholdIncome = parseInt(thou[1], 10);
  }

  const age = t.match(/\b(\d{1,3})\s*(?:years?|yrs?|saal|साल|उम्र|year-old|age)\b/);
  if (age) out.age = parseInt(age[1], 10);

  if (/\bbpl\b|below poverty|poor|गरीब|antyodaya|अंत्योदय/.test(t)) out.bpl = true;

  if (/daily wage|labour|labor|दिहाड़ी|मजदूर|landless/.test(t)) out.occupation = "landless_laborer";
  else if (/farmer|farm|khet|खेत|किसान|zameen|land/.test(t)) out.occupation = "small_farmer";
  else if (/vendor|domestic|self-employed|informal/.test(t)) out.occupation = "informal";

  const acre = t.match(/(\d+(?:\.\d+)?)\s*(?:acre|एकड़|bigha)/);
  if (acre) { out.landAcres = parseFloat(acre[1]); if (!out.occupation) out.occupation = "small_farmer"; }

  if (/disab|divyang|दिव्यांग|विकलांग|handicap/.test(t)) out.disability = "severe";

  if (/rajasthan|राजस्थान/.test(t)) out.state = "RAJASTHAN";
  else if (/bihar|बिहार/.test(t)) out.state = "BIHAR";

  if (/\bwoman\b|\bfemale\b|\bgirl\b|daughter|wife|mother|बेटी|महिला|लड़की|पत्नी|माँ/.test(t)) out.gender = "female";
  else if (/\bman\b|\bmale\b|\bson\b|husband|father|बेटा|पति|पिता/.test(t)) out.gender = "male";

  if (/widow|पति की मृत्यु|पति की मौत|विधवा/.test(t)) hh.isWidow = true;
  if (/pregnan|expecting|गर्भवती|बच्चा होने|maternity|baby/.test(t)) hh.isPregnantOrLactating = true;
  if (/school|college|पढ़|class \d|कक्षा|student|बच्चे.*स्कूल/.test(t)) hh.hasSchoolGoingChild = true;
  if (/kachha|kaccha|mud house|कच्चा|no house|no pucca/.test(t)) hh.lacksPuccaHouse = true;
  if (/no gas|no lpg|बिना गैस|चूल्ह|firewood|lakdi/.test(t)) hh.lacksLpg = true;
  if (/village|gaon|गाँव|gram|rural|देहात/.test(t)) hh.isRural = true;

  // documents
  const docs: NonNullable<ParsedProfile["documentsHave"]> = [];
  if (/aadhaar|aadhar|आधार/.test(t)) docs.push("aadhaar");
  if (/bank|खाता|jan dhan/.test(t)) docs.push("bank");
  if (/ration|राशन/.test(t)) docs.push("ration_bpl");
  if (/caste certificate|जाति प्रमाण/.test(t)) docs.push("caste");
  if (/income certificate|आय प्रमाण/.test(t)) docs.push("income");
  if (/domicile|निवास प्रमाण/.test(t)) docs.push("domicile");
  if (docs.length) out.documentsHave = docs;

  if (Object.keys(hh).length) out.household = hh;
  return out;
}

export async function parseProfileText(
  text: string
): Promise<{ parsed: ParsedProfile; source: "gemini" | "fallback" }> {
  const llm = await geminiCall(`${PARSE_SYSTEM}\n\nUSER TEXT:\n"""${text}"""`, {
    json: true,
    temperature: 0,
  });
  if (llm) {
    try {
      const cleaned = llm.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
      const parsed = JSON.parse(cleaned) as ParsedProfile;
      return { parsed, source: "gemini" };
    } catch {
      /* fall through */
    }
  }
  return { parsed: fallbackParse(text), source: "fallback" };
}

// ---- Explanation generation (explain-only, never decides) ----

const EXPLAIN_SYSTEM = `You are the explainer for HaqSetu, speaking to a poor, possibly low-literacy Indian family who often don't know what help they're entitled to. A deterministic rules engine has ALREADY decided everything below. Your ONLY job is to restate it warmly, simply, and encouragingly.
HARD RULES:
- Do NOT change, add, or invent any scheme, number, verdict, or document. Only restate what is given.
- Keep the cautious framing: "you may be eligible" — never promise "you will get" or "you qualify".
- Lead with hope: name the main benefits they may get, then the ONE or TWO documents that unlock the most.
- Use very simple words and short sentences (imagine explaining to someone who left school early). No jargon, no markdown headers.
- 4-7 sentences, then one line telling them they can get free help at their Gram Panchayat or a Common Service Centre (CSC), and to confirm there.`;

export async function explainAssessment(
  engineFacts: string,
  language: "en" | "hi"
): Promise<{ text: string; source: "gemini" | "fallback" }> {
  const langInstr =
    language === "hi"
      ? "Write the explanation in simple conversational Hindi (Devanagari)."
      : "Write the explanation in simple conversational English.";
  const llm = await geminiCall(`${EXPLAIN_SYSTEM}\n${langInstr}\n\nENGINE FACTS:\n${engineFacts}`, {
    temperature: 0.3,
  });
  if (llm) return { text: llm.trim(), source: "gemini" };
  return { text: "", source: "fallback" };
}
