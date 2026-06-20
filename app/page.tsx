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
    { t: t.step1Title, b: t.step1Body },
    { t: t.step2Title, b: t.step2Body },
    { t: t.step3Title, b: t.step3Body },
  ];
  const entries: [string, string, string, string][] = [
    ["/schemes", "🔎", t.openSchemes, t.navSchemes],
    ["/documents", "🗂️", t.openDocs, t.navDocs],
    ["/tracker", "📍", t.openTracker, t.navTracker],
  ];

  return (
    <div className="animate-page-enter">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Centered Hero Section */}
        <section className="text-center py-6 space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-mint-bg px-4 py-1.5 text-xs font-bold text-brand-green border border-mint-border shadow-3xs">
            <span>🔒</span>
            <span>{t.privacyChip}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 tracking-tight max-w-2xl mx-auto">
            {t.homeHeadline}
          </h1>
          <p className="text-[15.5px] leading-relaxed text-slate-600 max-w-2xl mx-auto">
            {t.homeSub}
          </p>
          <div className="pt-2">
            <Link
              href="/schemes"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3.5 text-base font-bold transition hover-lift click-scale shadow-sm"
            >
              <span>🔎</span>
              <span>{t.homeStart}</span>
            </Link>
          </div>
        </section>

        {/* Entry cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {entries.map(([href, icon, title, tag]) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition-all click-scale"
            >
              <div className="text-3xl">{icon}</div>
              <p className="mt-3.5 text-[15.5px] font-bold text-slate-850">{tag}</p>
              <p className="mt-1 text-[13px] font-bold text-brand-green flex items-center gap-1">
                <span>{title}</span>
                <span>→</span>
              </p>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <section className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-2xs hover-lift transition-all">
          <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.homeHow}</h2>
          <ol className="mt-4.5 space-y-4">
            {steps.map((s, idx) => (
              <li key={s.t} className="flex items-start gap-4">
                <span className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full bg-mint-bg text-sm font-bold text-brand-green border border-mint-border/50">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-slate-850">
                    {s.t.replace(/^\d\s*·\s*/, "")}
                  </p>
                  <p className="text-[13.5px] leading-relaxed text-slate-600 mt-0.5">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Engine framing */}
        <section className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-2xs hover-lift transition-all">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint-bg text-xl border border-mint-border/30">
              ⚙️
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.engineTitle}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{t.engineBody}</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {[t.pillEngine, t.pillCited, t.pillOffline].map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600"
                  >
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Container */}
        <section className="rounded-3xl border border-mint-border bg-mint-bg/40 p-5 shadow-3xs flex items-start gap-3 hover-lift transition-all">
          <span className="text-xl shrink-0">🔒</span>
          <div>
            <h2 className="text-[15px] font-bold text-brand-green">{t.privacyTitle}</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-brand-green/90">{t.privacyBody}</p>
          </div>
        </section>

        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 leading-normal max-w-md mx-auto">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
