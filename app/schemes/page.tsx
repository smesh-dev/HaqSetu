"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProfile, useTracked, useAIConsent, initialProfile, type TrackedApp } from "@/lib/store";
import { Nav, Chip, BigChip, SITUATIONS, Hero, UnlockPath, TrapCard, BenefitCard } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { nextQuestion } from "@/lib/rules/inquiry";
import { assessmentToFacts, fallbackExplanation } from "@/lib/profile";
import { PERSONAS } from "@/lib/personas";
import type { Assessment, Profile } from "@/lib/rules/types";

type ParsedIntake = Partial<Omit<Profile, "household" | "documentsHave">> & {
  household?: Partial<Profile["household"]>;
  documentsHave?: Profile["documentsHave"];
};

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function parsedFacts(p: ParsedIntake, lang: Lang): string[] {
  const facts: string[] = [];
  const hi = lang === "hi";
  if (p.age !== undefined) facts.push(hi ? `उम्र ${p.age}` : `Age ${p.age}`);
  if (p.gender) facts.push(hi ? ({ female: "महिला", male: "पुरुष", other: "अन्य" }[p.gender]) : ({ female: "Woman", male: "Man", other: "Other" }[p.gender]));
  if (p.state) facts.push(p.state === "BIHAR" ? (hi ? "बिहार" : "Bihar") : p.state === "RAJASTHAN" ? (hi ? "राजस्थान" : "Rajasthan") : (hi ? "अन्य राज्य" : "Other state"));
  if (p.category) facts.push(p.category === "GENERAL" ? (hi ? "सामान्य वर्ग" : "General category") : p.category);
  if (p.annualHouseholdIncome !== undefined) facts.push(hi ? `₹${p.annualHouseholdIncome.toLocaleString("en-IN")} सालाना आय` : `₹${p.annualHouseholdIncome.toLocaleString("en-IN")} annual income`);
  if (p.bpl === true) facts.push(hi ? "BPL/गरीब परिवार" : "BPL/low-income family");
  if (p.occupation) facts.push(p.occupation.replaceAll("_", " "));
  const householdLabels: Partial<Record<keyof Profile["household"], [string, string]>> = {
    isWidow: ["Widow", "विधवा"],
    isPregnantOrLactating: ["Pregnant or nursing", "गर्भवती या स्तनपान"],
    hasSchoolGoingChild: ["Child in school", "स्कूल जाने वाला बच्चा"],
    hasElderly60Plus: ["Age 60+ at home", "घर में 60+ बुज़ुर्ग"],
    lacksPuccaHouse: ["No pucca house", "पक्का घर नहीं"],
    lacksLpg: ["No LPG", "LPG नहीं"],
    isRural: ["Lives in a village", "गाँव में रहते हैं"],
  };
  for (const [key, value] of Object.entries(p.household ?? {})) {
    if (value === true) facts.push(householdLabels[key as keyof Profile["household"]]?.[hi ? 1 : 0] ?? key);
  }
  if (p.documentsHave?.length) facts.push(hi ? `${p.documentsHave.length} दस्तावेज़ बताए` : `${p.documentsHave.length} document${p.documentsHave.length > 1 ? "s" : ""} mentioned`);
  return facts;
}

export default function SchemesPage() {
  const [profile, setProfile] = useProfile();
  const [tracked, setTracked] = useTracked();
  const [aiConsent, setAIConsent] = useAIConsent();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  const [freeText, setFreeText] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState("");
  const [parseSummary, setParseSummary] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [explanation, setExplanation] = useState<{ text: string; source: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechBaseRef = useRef("");

  useEffect(() => {
    setSpeechSupported(Boolean(speechRecognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechError(t.micUnsupported);
      return;
    }

    setSpeechError("");
    setParseError("");
    setParseSource("");
    setParseSummary([]);
    speechBaseRef.current = freeText.trim();
    const recognition = new Recognition();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i][0]?.transcript ?? "";
      const separator = speechBaseRef.current && transcript.trim() ? " " : "";
      setFreeText(`${speechBaseRef.current}${separator}${transcript.trimStart()}`);
    };
    recognition.onerror = (event) => {
      setSpeechError(event.error === "not-allowed" || event.error === "service-not-allowed" ? t.micPermission : t.micError);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setSpeechError(t.micError);
    }
  }

  async function handleParse() {
    if (!freeText.trim()) return;
    recognitionRef.current?.stop();
    setParsing(true);
    setParseError("");
    setParseSource("");
    setParseSummary([]);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: freeText }) });
      const data = await res.json().catch(() => ({})) as { parsed?: ParsedIntake; source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || t.parseError);
      if (!data.parsed) throw new Error(t.parseError);

      const p = data.parsed;
      const detectedLang: Lang = p.language === "hi" ? "hi" : p.language === "en" ? "en" : lang;
      const nextProfile: Profile = {
        ...initialProfile,
        ...p,
        language: detectedLang,
        household: { ...initialProfile.household, ...(p.household ?? {}) },
        documentsHave: Array.from(new Set(p.documentsHave ?? [])),
      };
      const facts = parsedFacts(p, detectedLang);
      if (facts.length === 0) throw new Error(t.noDetailsDetected);
      setProfile(nextProfile);
      setParseSummary(facts);
      setParseSource(data.source ?? "fallback");
      setAsked([]);
      setResult(null);
      setExplanation(null);
    } catch (error) {
      setParseError(error instanceof Error && error.message ? error.message : t.parseError);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    const a = runAssessment({ ...profile, language: lang });
    setResult(a);
    // Explanation: on-device fallback unless the user consents to the AI summary.
    if (aiConsent) {
      try {
        const res = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: assessmentToFacts(a), language: lang }) });
        const data = await res.json();
        setExplanation({ text: data.text || fallbackExplanation(a, lang), source: data.text ? data.source : "offline" });
      } catch {
        setExplanation({ text: fallbackExplanation(a, lang), source: "offline" });
      }
    } else {
      setExplanation({ text: fallbackExplanation(a, lang), source: "offline" });
    }
    setBusy(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function loadPersona(id: string) {
    const p = PERSONAS.find((x) => x.id === id);
    if (!p) return;
    setProfile({ ...initialProfile, ...p.profile });
    setFreeText(p.freeText);
    setParseSource("");
    setParseSummary([]);
    setParseError("");
    setAsked([]);
    setResult(null);
    setExplanation(null);
  }

  const guided = nextQuestion({ ...profile, language: lang }, asked);
  const liveCount = runAssessment({ ...profile, language: lang }).matches.length;

  const isTracked = (id: string) => tracked.some((x) => x.schemeId === id);
  function toggleTrack(id: string) {
    const now = new Date().toISOString();
    setTracked((prev) => (prev.some((x) => x.schemeId === id) ? prev.filter((x) => x.schemeId !== id) : [...prev, { schemeId: id, status: "to_start", addedAt: now, updatedAt: now } as TrackedApp]));
  }

  return (
    <div className="animate-page-enter">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header Tag */}
        <div className="text-center">
          <span className="text-[11px] font-bold text-brand-green uppercase tracking-widest">
            {t.navSchemes}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {t.describe.replace(/\s*—\s*.*$/, "")}
          </h1>
        </div>

        {/* free-text intake card */}
        <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition-all no-print">
          <label className="block text-[13.5px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
            {t.describe}
          </label>
          <div className="relative mt-2">
            <textarea
              suppressHydrationWarning
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                setParseSource("");
                setParseSummary([]);
                setParseError("");
              }}
              rows={3}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-2xl border border-slate-200 p-4 pb-12 pr-14 text-[14.5px] outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition-all"
            />
            <button
              type="button"
              onClick={toggleSpeech}
              disabled={!speechSupported}
              aria-label={listening ? t.stopListening : t.startListening}
              title={listening ? t.stopListening : t.startListening}
              className={`absolute bottom-3.5 right-3.5 grid h-10 w-10 place-items-center rounded-full shadow-sm ring-1 transition-all click-scale ${
                listening
                  ? "animate-pulse bg-red-500 text-white ring-red-300"
                  : "bg-brand-green text-white ring-brand-green hover:bg-brand-green-hover"
              } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:ring-slate-250`}
            >
              {listening ? (
                <span className="h-3.5 w-3.5 rounded-sm bg-current" />
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
                </svg>
              )}
            </button>
          </div>
          {listening && (
            <p role="status" className="mt-2 text-xs font-bold text-red-600 animate-pulse">
              ● {t.listening} ({lang === "hi" ? "हिंदी" : "English"})
            </p>
          )}
          {!speechSupported && <p className="mt-2 text-xs text-slate-400">{t.micUnsupported}</p>}
          {speechError && <p role="alert" className="mt-2 text-xs font-semibold text-red-650">{speechError}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleParse}
              disabled={parsing || !freeText.trim()}
              className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-2.5 text-[13.5px] font-bold text-white transition hover-lift click-scale disabled:opacity-50 disabled:pointer-events-none"
            >
              {parsing ? t.reading : `✨ ${t.understand}`}
            </button>
            {parseSource && (
              <span role="status" className="text-xs font-bold text-brand-green bg-mint-bg px-2.5 py-1 rounded-xl border border-mint-border/50">
                {parseSource === "gemini" ? t.understoodAI : t.understoodLocal}
              </span>
            )}
          </div>
          {parseSummary.length > 0 && (
            <div className="mt-4 rounded-2xl bg-mint-bg/50 p-4 border border-mint-border">
              <p className="text-xs font-bold text-brand-green uppercase tracking-wider">{t.detected}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {parseSummary.map((fact) => (
                  <span
                    key={fact}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 border border-mint-border/80 shadow-3xs"
                  >
                    {fact}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-brand-green/90">{t.reviewDetected}</p>
            </div>
          )}
          {parseError && (
            <p
              role="alert"
              className="mt-3 rounded-2xl bg-red-50/70 px-4 py-3 text-xs font-bold text-red-700 border border-red-100"
            >
              {parseError}
            </p>
          )}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.tryPersona}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPersona(p.id)}
                  title={p.blurb}
                  className="rounded-full bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 click-scale hover-lift"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* guided AI intake — value-of-information reasoning */}
        <section className="rounded-3xl bg-white p-6 border border-mint-border shadow-2xs hover-lift transition-all no-print">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8.5 w-8.5 place-items-center rounded-xl bg-mint-bg text-base border border-mint-border/50">
              🤖
            </span>
            <h2 className="text-[15px] font-bold text-slate-800 uppercase tracking-wider">
              {t.guidedTitle}
            </h2>
          </div>
          {guided ? (
            <div className="mt-4">
              <p className="text-[16px] font-bold text-slate-800">{guided.question[lang]}</p>
              <div className="mt-3.5 flex flex-col gap-2">
                {guided.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setProfile((p) => o.apply(p));
                      setAsked((a) => [...a, guided.id]);
                    }}
                    className="w-full text-left rounded-2xl bg-white border border-slate-200 hover:border-brand-green/50 hover:bg-mint-bg/10 px-4 py-3.5 text-sm font-bold text-slate-750 transition-all hover-lift click-scale shadow-3xs flex items-center justify-between"
                  >
                    <span>{o.label[lang]}</span>
                    <span className="text-slate-400">→</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12px] font-bold text-brand-green">
                ✨ {t.askedBadge} · {t.guidedWhy.replace("{n}", String(guided.impact))}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-[14.5px] font-bold text-brand-green">
              ✓ {t.guidedDone}
            </p>
          )}
          <div className="mt-5 flex items-center justify-between gap-4 pt-3.5 border-t border-slate-100">
            <span className="text-[12.5px] font-bold text-slate-450">
              {t.soFar.replace("{n}", String(liveCount))}
            </span>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-3 text-sm font-bold text-white shadow-sm transition hover-lift click-scale disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? t.finding : `🔎 ${t.seeBenefits}`}
            </button>
          </div>
        </section>

        {/* manual form (optional / advanced) */}
        <details className="group no-print">
          <summary className="cursor-pointer list-none rounded-2xl bg-white px-5 py-4 text-[14px] font-bold text-slate-700 shadow-2xs border border-slate-250/80 marker:hidden flex items-center justify-between hover-lift transition">
            <span>{t.orForm}</span>
            <span className="inline-block transition-transform duration-250 group-open:rotate-90">▸</span>
          </summary>
          <div className="mt-4 space-y-6">
            {/* who */}
            <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition">
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.whoTitle}</h2>
              <p className="mt-3.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">
                {t.category}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["SC", "ST", "OBC", "EWS", "GENERAL"] as const).map((c) => (
                  <Chip
                    key={c}
                    active={profile.category === c}
                    onClick={() => setProfile((p) => ({ ...p, category: c }))}
                    label={c === "GENERAL" ? (lang === "hi" ? "सामान्य" : "General") : c}
                  />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.age}</p>
                  <input
                    type="number"
                    value={profile.age ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        age: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.gender}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["female", "male", "other"] as const).map((g) => (
                      <Chip
                        key={g}
                        small
                        active={profile.gender === g}
                        onClick={() => setProfile((p) => ({ ...p, gender: g }))}
                        label={
                          g === "female"
                            ? lang === "hi"
                              ? "महिला"
                              : "Woman"
                            : g === "male"
                            ? lang === "hi"
                              ? "पुरुष"
                              : "Man"
                            : lang === "hi"
                            ? "अन्य"
                            : "Other"
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.state}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["RAJASTHAN", "BIHAR", "CENTRAL"] as const).map((s) => (
                      <Chip
                        key={s}
                        small
                        active={profile.state === s}
                        onClick={() => setProfile((p) => ({ ...p, state: s }))}
                        label={
                          s === "RAJASTHAN"
                            ? lang === "hi"
                              ? "राजस्थान"
                              : "Rajasthan"
                            : s === "BIHAR"
                            ? lang === "hi"
                              ? "बिहार"
                              : "Bihar"
                            : lang === "hi"
                            ? "अन्य"
                              : "Other"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.income}</p>
                <input
                  type="number"
                  value={profile.annualHouseholdIncome ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      annualHouseholdIncome: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 90000"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition sm:w-1/2"
                />
              </div>
            </section>

            {/* situation */}
            <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition">
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.situationTitle}</h2>
              <div className="mt-4.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {SITUATIONS.map((s) => (
                  <BigChip
                    key={s.key}
                    icon={s.icon}
                    label={lang === "hi" ? s.hi : s.en}
                    active={s.active(profile)}
                    onClick={() => setProfile((p: Profile) => (s.active(p) ? s.off(p) : s.on(p)))}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200/60 shadow-3xs">
                <p className="text-[12.5px] text-slate-500 font-semibold leading-relaxed">{t.docsHint}</p>
                <Link
                  href="/documents"
                  className="text-[12.5px] font-bold text-brand-green hover:text-brand-green-hover shrink-0 hover:underline"
                >
                  {t.editDocs}
                </Link>
              </div>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="mt-5 w-full rounded-2xl bg-brand-green hover:bg-brand-green-hover py-3.5 text-[15.5px] font-bold text-white shadow-md transition hover-lift click-scale disabled:opacity-50"
              >
                {busy ? t.finding : `🔎 ${t.submit}`}
              </button>
            </section>
          </div>
        </details>

        {/* results */}
        {result && (
          <div ref={resultRef} className="space-y-6 fade-up">
            <div className="hidden print:block text-lg font-bold text-slate-900">
              HaqSetu — {lang === "hi" ? "मेरी लाभ योजना" : "my benefit plan"}
            </div>
            <div className="flex justify-end gap-2.5 no-print">
              <button
                onClick={() => window.print()}
                className="rounded-2xl bg-slate-850 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover-lift click-scale transition"
              >
                🖨️ {t.printPlan}
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setExplanation(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-550 hover-lift click-scale hover:bg-slate-50 transition"
              >
                {t.reset}
              </button>
            </div>

            <Hero a={result} lang={lang} />
            {result.unlockPath.length > 0 && <UnlockPath a={result} lang={lang} />}
            <TrapCard a={result} lang={lang} />

            {explanation?.text && (
              <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[15px] font-bold text-slate-850">💬 {t.explainTitle}</h3>
                  <span className="rounded-lg bg-mint-bg px-2.5 py-0.5 text-[10.5px] font-bold text-brand-green border border-mint-border/50">
                    {explanation.source === "gemini" ? "Gemini" : "offline"}
                  </span>
                </div>
                <p className="mt-3.5 whitespace-pre-line text-[14.5px] leading-relaxed text-slate-650">
                  {explanation.text}
                </p>
                <p className="mt-3 text-[11px] italic text-slate-400 font-semibold">{t.explainNote}</p>
              </section>
            )}

            <div className="space-y-4">
              {result.matches.map((m) => (
                <BenefitCard
                  key={m.id}
                  m={m}
                  lang={lang}
                  isTracked={isTracked(m.id)}
                  onTrack={toggleTrack}
                />
              ))}
            </div>

            {result.actionPlan.length > 0 && (
              <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition">
                <h3 className="text-[15px] font-bold text-slate-850">🧭 {t.planTitle}</h3>
                <ol className="mt-4 space-y-4">
                  {result.actionPlan.map((s) => (
                    <li key={s.order} className="flex gap-4">
                      <span
                        className={`grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-3xs ${
                          s.kind === "get_document"
                            ? "bg-amber-500"
                            : s.kind === "apply_scheme"
                            ? "bg-brand-green"
                            : "bg-slate-500"
                        }`}
                      >
                        {s.order}
                      </span>
                      <div>
                        <p className="text-[15px] font-bold text-slate-800">{s.title[lang]}</p>
                        <p className="text-[13.5px] text-slate-550 leading-relaxed mt-0.5">
                          {s.detail[lang]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <label className="no-print flex items-center gap-2.5 rounded-2xl bg-white border border-slate-200/80 p-4 text-[12.5px] text-slate-550 shadow-3xs cursor-pointer select-none hover-lift hover:bg-slate-50/55 transition-colors">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAIConsent(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-brand-green focus:ring-mint-bg cursor-pointer"
              />
              <span className="font-semibold leading-none">{t.aiConsent}</span>
            </label>

            <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition">
              <h3 className="text-[15px] font-bold text-slate-850">📚 {t.sources}</h3>
              <ul className="mt-4 space-y-4 divide-y divide-slate-100">
                {result.citations.map((c, idx) => (
                  <li key={c.id} className={`text-[13.5px] leading-relaxed ${idx > 0 ? "pt-4" : ""}`}>
                    <p className="font-bold text-slate-800">
                      {c.label[lang]} <span className="ml-1 text-xs font-semibold text-slate-405">· {c.asOf}</span>
                    </p>
                    <p className="text-slate-550">{c.source}</p>
                    {c.note && <p className="text-slate-500 italic mt-0.5">{c.note[lang]}</p>}
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-green font-bold hover:text-brand-green-hover hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {t.verify} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
