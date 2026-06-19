"use client";

import { useState } from "react";
import { useProfile } from "@/lib/store";
import { Nav, BigChip, YNU, ReadinessCard, DOC_ICON, ALL_DOCS } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import type { DocDetails, DocId } from "@/lib/rules/types";

export default function DocumentsPage() {
  const [profile, setProfile] = useProfile();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  function toggleDoc(d: DocId) {
    setProfile((p) => ({ ...p, documentsHave: p.documentsHave.includes(d) ? p.documentsHave.filter((x) => x !== d) : [...p.documentsHave, d] }));
  }
  function setName(doc: DocId, val: string) {
    setProfile((p) => { const cur: DocDetails = p.docDetails ?? { names: {} }; return { ...p, docDetails: { ...cur, names: { ...cur.names, [doc]: val } } }; });
  }
  function setDD(patch: Partial<DocDetails>) {
    setProfile((p) => ({ ...p, docDetails: { names: {}, ...(p.docDetails ?? {}), ...patch } }));
  }

  // Simulated DigiLocker import. In production this uses DigiLocker's
  // consent-based API; even then, document files never touch our servers — we
  // only read which documents exist. Here we just mark a typical set held.
  function importDigiLocker() {
    setImporting(true);
    setTimeout(() => {
      setProfile((p) => ({ ...p, documentsHave: Array.from(new Set([...p.documentsHave, "aadhaar", "bank", "ration_bpl", "domicile"])) as DocId[] }));
      setImporting(false);
      setImported(true);
    }, 900);
  }

  const assessment = runAssessment({ ...profile, language: lang });
  const hasDocs = profile.documentsHave.length > 0;

  return (
    <>
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <h1 className="text-xl font-extrabold text-emerald-900">🗂️ {t.docsTitle}</h1>
          <p className="mt-1 text-[14px] text-emerald-800">{t.docsLead}</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">🔒 {t.privacyChip}</p>
        </section>

        {/* DigiLocker import */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <button onClick={importDigiLocker} disabled={importing} className="flex items-center gap-2 rounded-2xl bg-[#1b4ba3] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
            <span>📲</span> {importing ? t.importing : t.importDigi}
          </button>
          {imported && <p className="mt-2 text-[12px] font-medium text-emerald-700">✓ {lang === "hi" ? "डिजीलॉकर से दस्तावेज़ जुड़ गए।" : "Documents added from DigiLocker."}</p>}
          <p className="mt-2 text-[11px] text-slate-400">{t.importNote}</p>
        </section>

        {/* vault */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-[15px] font-bold text-slate-800">{t.haveQ}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{ALL_DOCS.map((d) => <BigChip key={d} icon={DOC_ICON[d]} label={t.docNames[d]} active={profile.documentsHave.includes(d)} onClick={() => toggleDoc(d)} />)}</div>

          {hasDocs && (
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">{t.detailsTitle}</h3>
                <p className="mt-0.5 text-[12px] text-slate-500">{t.detailsHint}</p>
              </div>
              <div className="space-y-2">
                {profile.documentsHave.filter((d) => ["aadhaar", "bank", "caste", "income", "ration_bpl"].includes(d)).map((d) => (
                  <div key={d}><p className="mb-1 text-[12px] font-medium text-slate-600">{t.nameOnDoc} {t.docNames[d]}</p><input value={profile.docDetails?.names?.[d] ?? ""} onChange={(e) => setName(d, e.target.value)} placeholder="—" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" /></div>
                ))}
              </div>
              {profile.documentsHave.includes("bank") && (<>
                <YNU label={t.seedQ} value={profile.docDetails?.bankAadhaarSeeded} onChange={(v) => setDD({ bankAadhaarSeeded: v })} t={t} />
                <YNU label={t.dormantQ} value={profile.docDetails?.bankDormant} onChange={(v) => setDD({ bankDormant: v })} t={t} />
                <div><p className="mb-1 text-[12px] font-medium text-slate-600">{t.ifscLabel}</p><input value={profile.docDetails?.bankIfsc ?? ""} onChange={(e) => setDD({ bankIfsc: e.target.value })} placeholder="SBIN0001234" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-1/2" /></div>
              </>)}
              {profile.documentsHave.includes("aadhaar") && <YNU label={t.mobileQ} value={profile.docDetails?.aadhaarMobileLinked} onChange={(v) => setDD({ aadhaarMobileLinked: v })} t={t} />}
              {profile.documentsHave.includes("caste") && profile.category === "OBC" && <YNU label={t.nclQ} value={profile.docDetails?.casteIsNCL} onChange={(v) => setDD({ casteIsNCL: v })} t={t} />}
              {profile.documentsHave.includes("income") && <div><p className="mb-1 text-[12px] font-medium text-slate-600">{t.incomeYearQ}</p><input type="number" value={profile.docDetails?.incomeCertYear ?? ""} onChange={(e) => setDD({ incomeCertYear: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="2024" className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" /></div>}
            </div>
          )}
        </section>

        {/* live rejection-proofing audit */}
        {hasDocs ? <ReadinessCard r={assessment.readiness} lang={lang} /> : (
          <section className="rounded-3xl bg-white p-5 text-center text-[14px] text-slate-500 shadow-sm ring-1 ring-slate-200">{t.addFirst}</section>
        )}

        <footer className="pb-10 pt-2 text-center text-[11px] text-slate-400">{t.trust}</footer>
      </main>
    </>
  );
}
