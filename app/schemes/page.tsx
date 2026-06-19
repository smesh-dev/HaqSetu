"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useProfile, useTracked, useAIConsent, initialProfile, type TrackedApp } from "@/lib/store";
import { Nav, Chip, BigChip, SITUATIONS, Hero, UnlockPath, TrapCard, BenefitCard } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { nextQuestion } from "@/lib/rules/inquiry";
import { assessmentToFacts, fallbackExplanation } from "@/lib/profile";
import { PERSONAS } from "@/lib/personas";
import type { Assessment, Profile } from "@/lib/rules/types";

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
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [explanation, setExplanation] = useState<{ text: string; source: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleParse() {
    if (!freeText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: freeText }) });
      const data = await res.json();
      if (data.parsed) {
        const p = data.parsed;
        setProfile((prev) => ({
          ...prev,
          category: p.category ?? prev.category, gender: p.gender ?? prev.gender, state: p.state ?? prev.state,
          age: p.age ?? prev.age, annualHouseholdIncome: p.annualHouseholdIncome ?? prev.annualHouseholdIncome,
          bpl: p.bpl ?? prev.bpl, occupation: p.occupation ?? prev.occupation, landAcres: p.landAcres ?? prev.landAcres,
          disability: p.disability ?? prev.disability, household: { ...prev.household, ...(p.household ?? {}) },
          documentsHave: p.documentsHave ? Array.from(new Set([...prev.documentsHave, ...p.documentsHave])) : prev.documentsHave,
        }));
        if (p.language) setLang(p.language);
        setParseSource(data.source);
      }
    } catch {
      /* ignore — the buttons still work */
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
    <>
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* free-text intake */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 no-print">
          <label className="block text-[15px] font-semibold text-slate-800">{t.describe}</label>
          <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={3} placeholder={t.placeholder} className="mt-2 w-full resize-none rounded-2xl border border-slate-300 p-3 text-[15px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={handleParse} disabled={parsing || !freeText.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">{parsing ? t.reading : `✨ ${t.understand}`}</button>
            {parseSource && <span className="text-xs text-slate-500">{parseSource === "gemini" ? "Understood by AI ✓" : "Read locally ✓"}</span>}
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">{t.tryPersona}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{PERSONAS.map((p) => <button key={p.id} onClick={() => loadPersona(p.id)} title={p.blurb} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200">{p.name}</button>)}</div>
          </div>
        </section>

        {/* guided AI intake — value-of-information reasoning */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-200 no-print">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-base ring-1 ring-emerald-100">🤖</span><h2 className="text-[15px] font-bold text-slate-800">{t.guidedTitle}</h2></div>
          {guided ? (
            <div className="mt-3">
              <p className="text-[16px] font-semibold text-slate-900">{guided.question[lang]}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {guided.options.map((o, i) => (
                  <button key={i} onClick={() => { setProfile((p) => o.apply(p)); setAsked((a) => [...a, guided.id]); }} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-emerald-50 hover:ring-emerald-300">{o.label[lang]}</button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-emerald-700">✨ {t.askedBadge} · {t.guidedWhy.replace("{n}", String(guided.impact))}</p>
            </div>
          ) : (
            <p className="mt-3 text-[14px] font-medium text-emerald-800">✓ {t.guidedDone}</p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[12px] text-slate-500">{t.soFar.replace("{n}", String(liveCount))}</span>
            <button onClick={handleSubmit} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{busy ? t.finding : `🔎 ${t.seeBenefits}`}</button>
          </div>
        </section>

        {/* manual form (optional / advanced) */}
        <details className="group no-print">
          <summary className="cursor-pointer list-none rounded-2xl bg-white px-5 py-3 text-[14px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 marker:hidden"><span className="inline-block transition group-open:rotate-90">▸</span> {t.orForm}</summary>
          <div className="mt-3 space-y-5">
        {/* who */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 no-print">
          <h2 className="text-[15px] font-bold text-slate-800">{t.whoTitle}</h2>
          <p className="mt-3 text-[13px] font-medium text-slate-600">{t.category}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">{(["SC", "ST", "OBC", "EWS", "GENERAL"] as const).map((c) => <Chip key={c} active={profile.category === c} onClick={() => setProfile((p) => ({ ...p, category: c }))} label={c === "GENERAL" ? (lang === "hi" ? "सामान्य" : "General") : c} />)}</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><p className="mb-1 text-[13px] font-medium text-slate-600">{t.age}</p><input type="number" value={profile.age ?? ""} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value === "" ? undefined : Number(e.target.value) }))} placeholder="—" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" /></div>
            <div><p className="mb-1 text-[13px] font-medium text-slate-600">{t.gender}</p><div className="flex gap-1.5">{(["female", "male", "other"] as const).map((g) => <Chip key={g} small active={profile.gender === g} onClick={() => setProfile((p) => ({ ...p, gender: g }))} label={g === "female" ? (lang === "hi" ? "महिला" : "Woman") : g === "male" ? (lang === "hi" ? "पुरुष" : "Man") : (lang === "hi" ? "अन्य" : "Other")} />)}</div></div>
            <div><p className="mb-1 text-[13px] font-medium text-slate-600">{t.state}</p><div className="flex gap-1.5">{(["RAJASTHAN", "BIHAR", "CENTRAL"] as const).map((s) => <Chip key={s} small active={profile.state === s} onClick={() => setProfile((p) => ({ ...p, state: s }))} label={s === "RAJASTHAN" ? (lang === "hi" ? "राजस्थान" : "Rajasthan") : s === "BIHAR" ? (lang === "hi" ? "बिहार" : "Bihar") : (lang === "hi" ? "अन्य" : "Other")} />)}</div></div>
          </div>
          <div className="mt-4"><p className="mb-1 text-[13px] font-medium text-slate-600">{t.income}</p><input type="number" value={profile.annualHouseholdIncome ?? ""} onChange={(e) => setProfile((p) => ({ ...p, annualHouseholdIncome: e.target.value === "" ? undefined : Number(e.target.value) }))} placeholder="e.g. 90000" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-1/2" /></div>
        </section>

        {/* situation */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 no-print">
          <h2 className="text-[15px] font-bold text-slate-800">{t.situationTitle}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{SITUATIONS.map((s) => <BigChip key={s.key} icon={s.icon} label={lang === "hi" ? s.hi : s.en} active={s.active(profile)} onClick={() => setProfile((p: Profile) => (s.active(p) ? s.off(p) : s.on(p)))} />)}</div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <p className="text-[12px] text-slate-600">{t.docsHint}</p>
            <Link href="/documents" className="text-[12px] font-semibold text-emerald-700 hover:underline">{t.editDocs}</Link>
          </div>
          <button onClick={handleSubmit} disabled={busy} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{busy ? t.finding : `🔎 ${t.submit}`}</button>
        </section>
          </div>
        </details>

        {/* results */}
        {result && (
          <div ref={resultRef} className="space-y-5 fade-up">
            <div className="hidden print:block text-lg font-bold text-slate-900">HaqSetu — {lang === "hi" ? "मेरी लाभ योजना" : "my benefit plan"}</div>
            <div className="flex justify-end gap-2 no-print">
              <button onClick={() => window.print()} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">🖨️ {t.printPlan}</button>
              <button onClick={() => { setResult(null); setExplanation(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-300">{t.reset}</button>
            </div>

            <Hero a={result} lang={lang} />
            {result.unlockPath.length > 0 && <UnlockPath a={result} lang={lang} />}
            <TrapCard a={result} lang={lang} />

            {explanation?.text && (
              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-slate-800">💬 {t.explainTitle}</h3><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{explanation.source === "gemini" ? "Gemini" : "offline"}</span></div>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{explanation.text}</p>
                <p className="mt-2 text-[11px] italic text-slate-400">{t.explainNote}</p>
              </section>
            )}

            <div className="space-y-3">{result.matches.map((m) => <BenefitCard key={m.id} m={m} lang={lang} isTracked={isTracked(m.id)} onTrack={toggleTrack} />)}</div>

            {result.actionPlan.length > 0 && (
              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-[15px] font-bold text-slate-900">🧭 {t.planTitle}</h3>
                <ol className="mt-3 space-y-3">{result.actionPlan.map((s) => (
                  <li key={s.order} className="flex gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${s.kind === "get_document" ? "bg-amber-500" : s.kind === "apply_scheme" ? "bg-emerald-600" : "bg-slate-500"}`}>{s.order}</span><div><p className="text-[15px] font-semibold text-slate-800">{s.title[lang]}</p><p className="text-[13px] text-slate-600">{s.detail[lang]}</p></div></li>
                ))}</ol>
              </section>
            )}

            <label className="no-print flex items-center gap-2 rounded-2xl bg-white p-3 text-[12px] text-slate-600 shadow-sm ring-1 ring-slate-200"><input type="checkbox" checked={aiConsent} onChange={(e) => setAIConsent(e.target.checked)} className="h-4 w-4 rounded" /> {t.aiConsent}</label>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-[15px] font-bold text-slate-800">📚 {t.sources}</h3>
              <ul className="mt-3 space-y-2.5">{result.citations.map((c) => (
                <li key={c.id} className="text-[13px] leading-snug"><p className="font-semibold text-slate-800">{c.label[lang]} <span className="ml-1 font-normal text-slate-400">· {c.asOf}</span></p><p className="text-slate-600">{c.source}</p>{c.note && <p className="text-slate-500">{c.note[lang]}</p>}{c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{t.verify} ↗</a>}</li>
              ))}</ul>
            </section>
          </div>
        )}
        <footer className="pb-10 pt-2 text-center text-[11px] text-slate-400">{t.trust}</footer>
      </main>
    </>
  );
}
