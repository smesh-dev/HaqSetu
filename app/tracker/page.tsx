"use client";

import { useProfile, useTracked, TRACK_STATUSES, type TrackStatus, type TrackedApp } from "@/lib/store";
import { Nav } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { SCHEMES } from "@/lib/rules/schemes";

const SCHEME_MAP = Object.fromEntries(SCHEMES.map((s) => [s.id, { name: s.name, hindiName: s.hindiName, icon: s.icon }]));

const NEXT_STEP: Record<TrackStatus, { en: string; hi: string }> = {
  to_start: { en: "Gather the documents and apply at the portal/office.", hi: "दस्तावेज़ जुटाएँ और पोर्टल/कार्यालय पर आवेदन करें।" },
  applied: { en: "Wait for verification; follow up at the office if it's been over 2 weeks.", hi: "सत्यापन की प्रतीक्षा करें; 2 सप्ताह से अधिक हो तो कार्यालय में संपर्क करें।" },
  under_review: { en: "Being verified — keep the Aadhaar-linked phone reachable for any OTP.", hi: "सत्यापन जारी — OTP हेतु आधार से जुड़ा फ़ोन साथ रखें।" },
  approved: { en: "Approved! Make sure your Aadhaar-seeded bank account is active so the money lands.", hi: "मंज़ूर! सुनिश्चित करें कि आधार-सीड बैंक खाता सक्रिय है ताकि पैसा आ जाए।" },
  received: { en: "Done — benefit received. 🎉", hi: "हो गया — लाभ मिल गया। 🎉" },
  rejected: { en: "Find the exact reason (use RTI if unclear), fix it, and re-apply.", hi: "सटीक कारण जानें (ज़रूरत हो तो RTI), उसे ठीक करें, और फिर से आवेदन करें।" },
};

export default function TrackerPage() {
  const [profile, setProfile] = useProfile();
  const [tracked, setTracked] = useTracked();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  function addEligible() {
    const a = runAssessment({ ...profile, language: lang });
    const now = new Date().toISOString();
    setTracked((prev) => {
      const have = new Set(prev.map((x) => x.schemeId));
      const add = a.matches.filter((m) => !have.has(m.id)).map((m) => ({ schemeId: m.id, status: "to_start" as TrackStatus, addedAt: now, updatedAt: now }));
      return [...prev, ...add];
    });
  }
  function setStatus(id: string, status: TrackStatus) {
    setTracked((prev) => prev.map((x) => (x.schemeId === id ? { ...x, status, updatedAt: new Date().toISOString() } : x)));
  }
  function setNote(id: string, note: string) {
    setTracked((prev) => prev.map((x) => (x.schemeId === id ? { ...x, note } : x)));
  }
  function remove(id: string) {
    setTracked((prev) => prev.filter((x) => x.schemeId !== id));
  }

  const done = tracked.filter((x) => x.status === "received").length;
  const statusLabel = (s: TrackStatus) => t[`st_${s}` as keyof typeof t] as string;

  return (
    <>
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-md">
          <h1 className="text-xl font-extrabold">📍 {t.trackerTitle}</h1>
          <p className="mt-1 text-[14px] text-emerald-50">{t.trackerLead}</p>
          {tracked.length > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.round((done / tracked.length) * 100)}%` }} /></div>
              <p className="mt-1 text-[12px] text-emerald-50">{t.progress.replace("{done}", String(done)).replace("{total}", String(tracked.length))}</p>
            </div>
          )}
        </section>

        <button onClick={addEligible} className="w-full rounded-2xl bg-white py-3 text-sm font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50">+ {t.addEligible}</button>

        {tracked.length === 0 ? (
          <section className="rounded-3xl bg-white p-6 text-center text-[14px] text-slate-500 shadow-sm ring-1 ring-slate-200">{t.noTracked}</section>
        ) : (
          <div className="space-y-3">
            {tracked.map((a: TrackedApp) => {
              const s = SCHEME_MAP[a.schemeId];
              if (!s) return null;
              return (
                <section key={a.schemeId} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-2xl ring-1 ring-emerald-100">{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[15px] font-bold text-slate-900">{lang === "hi" ? s.hindiName : s.name}</h3>
                        <button onClick={() => remove(a.schemeId)} className="text-[12px] text-slate-400 hover:text-rose-600">{t.remove}</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {TRACK_STATUSES.map((st) => (
                          <button key={st} onClick={() => setStatus(a.schemeId, st)} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${a.status === st ? (st === "rejected" ? "bg-rose-600 text-white ring-rose-600" : st === "received" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-slate-800 text-white ring-slate-800") : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`}>{statusLabel(st)}</button>
                        ))}
                      </div>
                      <p className="mt-2 text-[13px] text-slate-600"><span className="font-semibold text-slate-500">{t.nextStep}: </span>{NEXT_STEP[a.status][lang]}</p>
                      <input value={a.note ?? ""} onChange={(e) => setNote(a.schemeId, e.target.value)} placeholder={t.notePh} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <footer className="pb-10 pt-2 text-center text-[11px] text-slate-400">{t.trust}</footer>
      </main>
    </>
  );
}
