"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Nav } from "@/components/shared";
import { auth } from "@/lib/firebase";
import { useProfile } from "@/lib/store";
import { T } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useProfile();
  const lang = profile.language;
  const t = T[lang];

  async function handleLogout() {
    try {
      if (auth) {
        await signOut(auth);
      }
      localStorage.removeItem("haqsetu_mock_user");
    } catch {}
    router.push("/");
  }

  const details = [
    { label: t.profileName, value: profile.name || "—" },
    { label: t.profileAge, value: profile.age || "—" },
    { label: t.profilePhone, value: profile.phone || "—" },
    { label: t.profileState, value: profile.state || "—" },
    { label: t.profileEmail, value: profile.email || "—" },
  ];

  return (
    <>
      <Nav lang={lang} onLang={(l) => setProfile((p) => ({ ...p, language: l }))} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-md">
          <p className="text-sm font-semibold text-emerald-50">{t.profileTitle}</p>
          <h1 className="mt-1 text-2xl font-bold">{profile.name || t.profileTitle}</h1>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((d) => (
              <div key={d.label} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[12px] font-semibold text-slate-500">{d.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{d.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 inline-flex rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {t.logout}
          </button>
        </section>
      </main>
    </>
  );
}
