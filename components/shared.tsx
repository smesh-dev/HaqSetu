"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tx } from "@/lib/rules/types";
import type { Assessment, DocId, Profile, Readiness, SchemeMatch, Verdict, YesNoUnsure } from "@/lib/rules/types";
import { T, type Dict, type Lang } from "@/lib/i18n";

export const DOC_ICON: Record<DocId, string> = {
  aadhaar: "🪪", bank: "🏦", caste: "📜", income: "💰", ews: "📄", domicile: "🏠", ration_bpl: "🍚", disability_udid: "♿",
};
export const ALL_DOCS: DocId[] = ["aadhaar", "bank", "ration_bpl", "caste", "income", "domicile", "disability_udid"];

export const VERDICT_META: Record<Verdict, { key: keyof Dict; cls: string; dot: string }> = {
  likely_eligible: { key: "youMayGet", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  maybe_eligible: { key: "worthChecking", cls: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  need_info: { key: "tellMore", cls: "bg-sky-100 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  likely_not: { key: "notNow", cls: "bg-slate-200 text-slate-600 ring-slate-300", dot: "bg-slate-400" },
};

export function hh(p: Profile, patch: Partial<Profile["household"]>): Profile {
  return { ...p, household: { ...p.household, ...patch } };
}

export const SITUATIONS: { key: string; icon: string; en: string; hi: string; on: (p: Profile) => Profile; off: (p: Profile) => Profile; active: (p: Profile) => boolean }[] = [
  { key: "bpl", icon: "🪙", en: "BPL / low-income household", hi: "BPL / कम-आय परिवार", on: (p) => ({ ...p, bpl: true }), off: (p) => ({ ...p, bpl: undefined }), active: (p) => p.bpl === true },
  { key: "widow", icon: "🕊️", en: "Widow", hi: "विधवा", on: (p) => hh(p, { isWidow: true }), off: (p) => hh(p, { isWidow: false }), active: (p) => p.household.isWidow },
  { key: "preg", icon: "🤰", en: "Pregnant / new mother", hi: "गर्भवती / नई माँ", on: (p) => hh(p, { isPregnantOrLactating: true }), off: (p) => hh(p, { isPregnantOrLactating: false }), active: (p) => p.household.isPregnantOrLactating },
  { key: "child", icon: "🎒", en: "Children in school/college", hi: "बच्चे स्कूल/कॉलेज में", on: (p) => hh(p, { hasSchoolGoingChild: true }), off: (p) => hh(p, { hasSchoolGoingChild: false }), active: (p) => p.household.hasSchoolGoingChild },
  { key: "elder", icon: "👵", en: "Elderly (60+) at home", hi: "घर में बुज़ुर्ग (60+)", on: (p) => hh(p, { hasElderly60Plus: true }), off: (p) => hh(p, { hasElderly60Plus: false }), active: (p) => p.household.hasElderly60Plus },
  { key: "disab", icon: "♿", en: "Person with disability", hi: "दिव्यांग व्यक्ति", on: (p) => ({ ...p, disability: "severe" }), off: (p) => ({ ...p, disability: "none" }), active: (p) => p.disability !== "none" },
  { key: "village", icon: "🌾", en: "Live in a village", hi: "गाँव में रहते हैं", on: (p) => hh(p, { isRural: true }), off: (p) => hh(p, { isRural: false }), active: (p) => p.household.isRural },
  { key: "kachha", icon: "🏚️", en: "No pucca (solid) house", hi: "पक्का घर नहीं", on: (p) => hh(p, { lacksPuccaHouse: true }), off: (p) => hh(p, { lacksPuccaHouse: false }), active: (p) => p.household.lacksPuccaHouse },
  { key: "nolpg", icon: "🔥", en: "No gas (LPG) connection", hi: "गैस कनेक्शन नहीं", on: (p) => hh(p, { lacksLpg: true }), off: (p) => hh(p, { lacksLpg: false }), active: (p) => p.household.lacksLpg },
  { key: "laborer", icon: "👷", en: "Daily-wage / no fixed job", hi: "दिहाड़ी / पक्की नौकरी नहीं", on: (p) => ({ ...p, occupation: "landless_laborer" }), off: (p) => ({ ...p, occupation: undefined }), active: (p) => p.occupation === "landless_laborer" },
  { key: "farmer", icon: "🚜", en: "Own farmland", hi: "खेती की ज़मीन है", on: (p) => ({ ...p, occupation: "small_farmer" }), off: (p) => ({ ...p, occupation: undefined }), active: (p) => p.occupation === "small_farmer" },
];

// ----------------------------- Nav -----------------------------------------
export function Nav({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  const t = T[lang];
  const path = usePathname();
  const tabs: [string, string][] = [["/", t.navHome], ["/schemes", t.navSchemes], ["/documents", t.navDocs], ["/tracker", t.navTracker]];
  return (
    <header className="no-print sticky top-0 z-20 bg-gradient-to-br from-emerald-700 to-teal-600 text-white shadow-sm">
      <div className="mx-auto max-w-3xl px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg font-bold ring-1 ring-white/25">हक़</div>
            <div><p className="text-lg font-extrabold leading-none">HaqSetu</p><p className="text-[11px] text-emerald-50">{t.tagline}</p></div>
          </Link>
          <div className="flex rounded-lg bg-white/15 p-0.5 text-xs ring-1 ring-white/20">
            {(["en", "hi"] as const).map((l) => (
              <button key={l} onClick={() => onLang(l)} className={`rounded-md px-2.5 py-1 font-semibold transition ${lang === l ? "bg-white text-emerald-700" : "text-white/90"}`}>{l === "en" ? "EN" : "हिं"}</button>
            ))}
          </div>
        </div>
        <nav className="mt-2.5 flex gap-1 overflow-x-auto">
          {tabs.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return <Link key={href} href={href} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-semibold transition ${active ? "bg-[var(--background)] text-emerald-700" : "text-white/90 hover:bg-white/10"}`}>{label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}

// ----------------------------- small inputs --------------------------------
export function Chip({ active, onClick, label, small }: { active: boolean; onClick: () => void; label: string; small?: boolean }) {
  return <button onClick={onClick} className={`rounded-xl ${small ? "px-2.5 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm"} font-semibold ring-1 transition ${active ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>{label}</button>;
}

export function BigChip({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-[13px] font-semibold ring-1 transition ${active ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>
      <span className="text-xl leading-none">{icon}</span><span className="leading-tight">{label}</span>
    </button>
  );
}

export function YNU({ label, value, onChange, t }: { label: string; value?: YesNoUnsure; onChange: (v: YesNoUnsure) => void; t: Dict }) {
  const opts: [YesNoUnsure, string][] = [["yes", t.yes], ["no", t.no], ["unsure", t.unsure]];
  return (
    <div>
      <p className="mb-1 text-[12px] font-medium text-slate-600">{label}</p>
      <div className="flex gap-1.5">{opts.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${value === v ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>{l}</button>)}</div>
    </div>
  );
}

// ----------------------------- result blocks -------------------------------
export function Hero({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  const valueLine = a.estimatedAnnualValue > 0 ? t.perYear.replace("{v}", a.estimatedAnnualValue.toLocaleString("en-IN")) : "";
  const c = a.coverage;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-md">
      <p className="text-sm font-medium text-emerald-50">{t.resultsFor}</p>
      <p className="mt-1 text-[15px] text-emerald-50">{t.entitledTo}</p>
      <p className="text-4xl font-extrabold leading-tight">{a.matches.length} {t.benefitsWord}</p>
      {(valueLine || a.hasOneTimeBenefits) && <p className="mt-1 text-lg font-semibold text-amber-200">{valueLine}{valueLine && a.hasOneTimeBenefits ? " " : ""}{a.hasOneTimeBenefits ? t.plusOneTime : ""}</p>}
      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/20"><p className="text-2xl font-bold">{c.claimableNowCount}</p><p className="text-[11px] text-emerald-50">{t.claimNow}</p></div>
        <div className="flex-1 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/20"><p className="text-2xl font-bold">{c.blockedCount}</p><p className="text-[11px] text-emerald-50">{t.blockedBy}</p></div>
      </div>
    </section>
  );
}

export function ReadinessCard({ r, lang }: { r: Readiness; lang: Lang }) {
  const t = T[lang];
  const sev = {
    blocker: { card: "border-rose-300 bg-rose-50", badge: "bg-rose-200 text-rose-900", label: t.sevBlocker },
    warning: { card: "border-amber-300 bg-amber-50", badge: "bg-amber-200 text-amber-900", label: t.sevWarning },
    info: { card: "border-slate-300 bg-slate-50", badge: "bg-slate-200 text-slate-700", label: t.sevInfo },
  };
  const scoreColor = r.blockers > 0 ? "text-rose-600" : r.warnings > 0 ? "text-amber-600" : "text-emerald-600";
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-[15px] font-bold text-slate-900">🛡️ {t.readyTitle}</h3><p className="mt-1 text-[13px] text-slate-600">{t.readyBody}</p></div>
        <div className="shrink-0 text-center"><p className={`text-3xl font-extrabold ${scoreColor}`}>{r.score}</p><p className="text-[10px] text-slate-400">{t.readyScore}</p></div>
      </div>
      {r.issues.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-[14px] font-medium text-emerald-800 ring-1 ring-emerald-200">✅ {t.allClear}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {r.issues.map((i) => {
            const m = sev[i.severity];
            return (
              <li key={i.id} className={`rounded-2xl border p-3 ${m.card}`}>
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.badge}`}>{m.label}</span><p className="text-[14px] font-bold text-slate-900">{tx(i.title, lang)}</p></div>
                <p className="mt-1 text-[13px] text-slate-700">{tx(i.detail, lang)}</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-900">👉 {t.fixLabel} <span className="font-normal text-slate-700">{tx(i.fix, lang)}</span></p>
                {i.affects.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{i.affects.map((a, idx) => <span key={idx} className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{tx(a, lang).replace(/\s*\(.*\)/, "")}</span>)}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function UnlockPath({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-[15px] font-bold text-slate-900">🪜 {t.unlockPathTitle}</h3>
      <p className="mt-1 text-[13px] text-slate-600">{t.unlockPathBody}</p>
      <ol className="mt-3 space-y-3">
        {a.unlockPath.map((s) => (
          <li key={s.docId} className="trace-step">
            <div className="flex items-center gap-2"><span className="text-xl">{s.icon}</span><span className="text-[15px] font-bold text-slate-800">{lang === "hi" ? s.hindiName : s.name}</span>{s.newlyUnlocksCount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">+{s.newlyUnlocksCount} {t.opens}</span>}</div>
            {s.newlyUnlocks.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{s.newlyUnlocks.map((u, j) => <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{tx(u, lang).replace(/\s*\(.*\)/, "")}</span>)}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrapCard({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  const g = a.docGaps[0];
  if (!g) return null;
  return (
    <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
      <div className="flex items-center gap-2"><span className="text-xl">🔑</span><h3 className="text-[15px] font-bold text-amber-900">{t.unlockTitle}</h3></div>
      <p className="mt-1 text-[14px] text-amber-900">{t.unlockBody.replace("{n}", String(g.unlocksCount))}</p>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-amber-200">
        <span className="text-3xl">{g.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{lang === "hi" ? g.hindiName : g.name}</p>
          <p className="text-[13px] text-slate-600">{tx(g.what, lang)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">{g.unlocksSchemes.map((s, i) => <span key={i} className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{tx(s, lang).replace(/\s*\(.*\)/, "")}</span>)}</div>
        </div>
      </div>
      {g.alternativesForPoor && <p className="mt-2 text-[13px] text-amber-800">💡 {tx(g.alternativesForPoor, lang)}</p>}
      {g.applyAt.portalUrl && <a href={g.applyAt.portalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">{t.unlockCta}: {tx(g.applyAt.portal, lang)} ↗</a>}
    </section>
  );
}

export function BenefitCard({ m, lang, isTracked, onTrack }: { m: SchemeMatch; lang: Lang; isTracked?: boolean; onTrack?: (id: string) => void }) {
  const t = T[lang];
  const meta = VERDICT_META[m.verdict];
  const primary = lang === "hi" ? m.hindiName : m.name;
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-2xl ring-1 ring-emerald-100">{m.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-slate-900">{primary}</h3>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{t[meta.key] as string}</span>
          </div>
          <p className="text-[13px] font-medium text-emerald-700">{tx(m.benefit, lang)}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{tx(m.headline, lang)}</p>

          {m.missingDocs.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[12px] font-semibold text-amber-700">{t.stillNeed}:</p>
              <div className="mt-1 flex flex-wrap gap-1">{m.missingDocs.map((d) => <span key={d} className="rounded-lg bg-amber-50 px-2 py-1 text-[12px] font-medium text-amber-800 ring-1 ring-amber-200">{DOC_ICON[d]} {t.docNames[d]}</span>)}</div>
              {m.missingDocTip && <p className="mt-1.5 text-[12px] text-slate-500">⚠️ {tx(m.missingDocTip, lang)}</p>}
            </div>
          )}

          <div className="mt-2.5 text-[13px] text-slate-600">
            <span className="font-semibold text-slate-500">{t.applyAt}: </span>
            {m.applyAt.portalUrl ? <a href={m.applyAt.portalUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{tx(m.applyAt.portal, lang)}</a> : tx(m.applyAt.portal, lang)}
            <span className="text-slate-400"> · {tx(m.applyAt.authority, lang)}</span>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            {m.reasons.length > 0 && (
              <details className="group flex-1">
                <summary className="cursor-pointer list-none text-[12px] font-semibold text-emerald-700 marker:hidden"><span className="inline-block transition group-open:rotate-90">▸</span> {t.showReason}</summary>
                <div className="mt-1.5 space-y-1.5">{m.reasons.map((s, i) => <div key={i} className="trace-step text-[12.5px] text-slate-600"><span className="font-medium text-slate-700">{tx(s.label, lang)}.</span> {tx(s.detail, lang)}</div>)}</div>
              </details>
            )}
            {onTrack && <button onClick={() => onTrack(m.id)} className={`no-print shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${isTracked ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-emerald-700 ring-emerald-300 hover:bg-emerald-50"}`}>{isTracked ? t.tracked : `+ ${t.trackThis}`}</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
