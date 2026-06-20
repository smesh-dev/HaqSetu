"use client";

import { useState, type ChangeEvent } from "react";
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  function toggleDoc(d: DocId) {
    setProfile((p) => ({ ...p, documentsHave: p.documentsHave.includes(d) ? p.documentsHave.filter((x) => x !== d) : [...p.documentsHave, d] }));
  }
  function setName(doc: DocId, val: string) {
    setProfile((p) => { const cur: DocDetails = p.docDetails ?? { names: {} }; return { ...p, docDetails: { ...cur, names: { ...cur.names, [doc]: val } } }; });
  }
  function setDD(patch: Partial<DocDetails>) {
    setProfile((p) => ({ ...p, docDetails: { names: {}, ...(p.docDetails ?? {}), ...patch } }));
  }
  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }
  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const assessment = runAssessment({ ...profile, language: lang });
  const hasDocs = profile.documentsHave.length > 0;

  return (
    <div className="animate-page-enter">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header Tag */}
        <div className="text-center">
          <span className="text-[11px] font-bold text-brand-green uppercase tracking-widest">
            {t.docsTitle}
          </span>
          <h1 className="text-2xl font-bold text-slate-850 mt-1">
            {t.docsLead.replace(/\s*—\s*.*$/, "")}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">
            {t.uploadNote}
          </p>
        </div>

        {/* upload from device card */}
        <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition-all">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.uploadTitle}</h2>
              <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{t.uploadHint}</p>
            </div>
            <label
              htmlFor="device-upload"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-3 text-sm font-bold text-white transition hover-lift click-scale shadow-xs select-none shrink-0"
            >
              📁 {t.uploadButton}
            </label>
            <input
              id="device-upload"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          {uploadedFiles.length > 0 && (
            <ul className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100 shadow-3xs">
              {uploadedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 text-xs font-bold text-slate-650"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-slate-400 font-semibold">{formatSize(file.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* vault checklist card */}
        <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs hover-lift transition-all">
          <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider mb-3.5">
            {t.haveQ}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {ALL_DOCS.map((d) => (
              <BigChip
                key={d}
                icon={DOC_ICON[d]}
                label={t.docNames[d]}
                active={profile.documentsHave.includes(d)}
                onClick={() => toggleDoc(d)}
              />
            ))}
          </div>

          {hasDocs && (
            <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-[14.5px] font-bold text-slate-800">{t.detailsTitle}</h3>
                <p className="mt-0.5 text-[12.5px] text-slate-500 leading-relaxed">{t.detailsHint}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {profile.documentsHave
                  .filter((d) => ["aadhaar", "bank", "caste", "income", "ration_bpl"].includes(d))
                  .map((d) => (
                    <div key={d}>
                      <p className="mb-1.5 text-[13px] font-bold text-slate-600">
                        {t.nameOnDoc} {t.docNames[d]}
                      </p>
                      <input
                        value={profile.docDetails?.names?.[d] ?? ""}
                        onChange={(e) => setName(d, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                      />
                    </div>
                  ))}
              </div>
              <div className="space-y-4 pt-3 border-t border-slate-50">
                {profile.documentsHave.includes("bank") && (
                  <>
                    <YNU
                      label={t.seedQ}
                      value={profile.docDetails?.bankAadhaarSeeded}
                      onChange={(v) => setDD({ bankAadhaarSeeded: v })}
                      t={t}
                    />
                    <YNU
                      label={t.dormantQ}
                      value={profile.docDetails?.bankDormant}
                      onChange={(v) => setDD({ bankDormant: v })}
                      t={t}
                    />
                    <div>
                      <p className="mb-1.5 text-[13px] font-bold text-slate-600">{t.ifscLabel}</p>
                      <input
                        value={profile.docDetails?.bankIfsc ?? ""}
                        onChange={(e) => setDD({ bankIfsc: e.target.value })}
                        placeholder="SBIN0001234"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition sm:w-1/2"
                      />
                    </div>
                  </>
                )}
                {profile.documentsHave.includes("aadhaar") && (
                  <YNU
                    label={t.mobileQ}
                    value={profile.docDetails?.aadhaarMobileLinked}
                    onChange={(v) => setDD({ aadhaarMobileLinked: v })}
                    t={t}
                  />
                )}
                {profile.documentsHave.includes("caste") && profile.category === "OBC" && (
                  <YNU
                    label={t.nclQ}
                    value={profile.docDetails?.casteIsNCL}
                    onChange={(v) => setDD({ casteIsNCL: v })}
                    t={t}
                  />
                )}
                {profile.documentsHave.includes("income") && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-bold text-slate-600">{t.incomeYearQ}</p>
                    <input
                      type="number"
                      value={profile.docDetails?.incomeCertYear ?? ""}
                      onChange={(e) =>
                        setDD({
                          incomeCertYear: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="2024"
                      className="w-32 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* live rejection-proofing audit */}
        {hasDocs ? (
          <ReadinessCard r={assessment.readiness} lang={lang} />
        ) : (
          <section className="rounded-3xl bg-white p-6 text-center text-[14px] text-slate-500 border border-slate-200/80 shadow-2xs hover-lift transition">
            {t.addFirst}
          </section>
        )}

        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
