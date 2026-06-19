"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store";
import { Nav } from "@/components/shared";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

export default function Home() {
  const [profile, setProfile] = useProfile();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  const steps = [
    { t: t.step1Title, b: t.step1Body, icon: "🔎" },
    { t: t.step2Title, b: t.step2Body, icon: "🛡️" },
    { t: t.step3Title, b: t.step3Body, icon: "📍" },
  ];
  const entries: [string, string, string, string][] = [
    ["/schemes", "🔎", t.openSchemes, t.navSchemes],
    ["/documents", "🗂️", t.openDocs, t.navDocs],
    ["/tracker", "📍", t.openTracker, t.navTracker],
  ];

  return (
    <>
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-md">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/20">🔒 {t.privacyChip}</span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight">{t.homeHeadline}</h1>
          <p className="mt-2 text-[15px] text-emerald-50">{t.homeSub}</p>
          <Link href="/schemes" className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 text-base font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50">🔎 {t.homeStart}</Link>
        </section>

        {/* Entry cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {entries.map(([href, icon, title, tag]) => (
            <Link key={href} href={href} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-300">
              <div className="text-2xl">{icon}</div>
              <p className="mt-2 text-[15px] font-bold text-slate-900">{tag}</p>
              <p className="mt-0.5 text-[13px] text-emerald-700">{title} →</p>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-[15px] font-bold text-slate-800">{t.homeHow}</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s) => (
              <li key={s.t} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg ring-1 ring-emerald-100">{s.icon}</span>
                <div><p className="text-[15px] font-semibold text-slate-800">{s.t}</p><p className="text-[13px] text-slate-600">{s.b}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* Engine framing */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl ring-1 ring-emerald-100">⚙️</span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">{t.engineTitle}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t.engineBody}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{[t.pillEngine, t.pillCited, t.pillOffline].map((p) => <span key={p} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">✓ {p}</span>)}</div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-[15px] font-bold text-emerald-900">🔒 {t.privacyTitle}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">{t.privacyBody}</p>
        </section>

        <footer className="pb-10 pt-2 text-center text-[11px] text-slate-400">{t.trust}</footer>
      </main>
    </>
  );
}
