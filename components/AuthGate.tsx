"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useProfile } from "@/lib/store";
import { T } from "@/lib/i18n";
import type { StateId } from "@/lib/rules/types";

function getStateOptions(): { value: StateId; label: string }[] {
  return [
    { value: "ANDHRA_PRADESH", label: "Andhra Pradesh" },
    { value: "ARUNACHAL_PRADESH", label: "Arunachal Pradesh" },
    { value: "ASSAM", label: "Assam" },
    { value: "BIHAR", label: "Bihar" },
    { value: "CHHATTISGARH", label: "Chhattisgarh" },
    { value: "GOA", label: "Goa" },
    { value: "GUJARAT", label: "Gujarat" },
    { value: "HARYANA", label: "Haryana" },
    { value: "HIMACHAL_PRADESH", label: "Himachal Pradesh" },
    { value: "JHARKHAND", label: "Jharkhand" },
    { value: "KARNATAKA", label: "Karnataka" },
    { value: "KERALA", label: "Kerala" },
    { value: "MADHYA_PRADESH", label: "Madhya Pradesh" },
    { value: "MAHARASHTRA", label: "Maharashtra" },
    { value: "MANIPUR", label: "Manipur" },
    { value: "MEGHALAYA", label: "Meghalaya" },
    { value: "MIZORAM", label: "Mizoram" },
    { value: "NAGALAND", label: "Nagaland" },
    { value: "ODISHA", label: "Odisha" },
    { value: "PUNJAB", label: "Punjab" },
    { value: "RAJASTHAN", label: "Rajasthan" },
    { value: "SIKKIM", label: "Sikkim" },
    { value: "TAMIL_NADU", label: "Tamil Nadu" },
    { value: "TELANGANA", label: "Telangana" },
    { value: "TRIPURA", label: "Tripura" },
    { value: "UTTAR_PRADESH", label: "Uttar Pradesh" },
    { value: "UTTARAKHAND", label: "Uttarakhand" },
    { value: "WEST_BENGAL", label: "West Bengal" },
    { value: "ANDAMAN_AND_NICOBAR_ISLANDS", label: "Andaman and Nicobar Islands" },
    { value: "CHANDIGARH", label: "Chandigarh" },
    { value: "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU", label: "Dadra and Nagar Haveli and Daman and Diu" },
    { value: "DELHI", label: "Delhi" },
    { value: "JAMMU_AND_KASHMIR", label: "Jammu and Kashmir" },
    { value: "LADAKH", label: "Ladakh" },
    { value: "LAKSHADWEEP", label: "Lakshadweep" },
    { value: "PUDUCHERRY", label: "Puducherry" },
    { value: "CENTRAL", label: "Central / Other" },
  ];
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useProfile();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [age, setAge] = useState(profile.age?.toString() || "");
  const [state, setState] = useState<StateId>(profile.state || "CENTRAL");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lang = profile.language;
  const t = T[lang];

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (nextUser?.uid) {
        localStorage.setItem("haqsetu_current_uid", nextUser.uid);
      } else {
        localStorage.removeItem("haqsetu_current_uid");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("haqsetu-auth-change"));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const resetToken = window.localStorage.getItem("haqsetu_auth_reset");
      if (resetToken) {
        setUser(null);
        setOtpSent(false);
        setConfirmation(null);
        setError("");
        window.localStorage.removeItem("haqsetu_auth_reset");
      }
    }
  }, []);

 useEffect(() => {
  if (!isFirebaseConfigured || !auth) {
    return;
  }

  // Wait a tick so the recaptcha-container div has mounted in the DOM
  const timer = setTimeout(() => {
    const container = document.getElementById("recaptcha-container");
    if (!container) return;

    if (!(window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
      (window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier = verifier;
    }
  }, 100);

  return () => clearTimeout(timer);
}, []);

  useEffect(() => {
    if (!profile.name && name) {
      setProfile((p) => ({ ...p, name }));
    }
  }, [name, profile.name]);

  const isProfileComplete = useMemo(() => {
    return Boolean(
      profile.name?.trim() &&
        profile.age &&
        profile.phone?.trim() &&
        profile.state,
    );
  }, [profile]);

  async function saveOnboarding() {
    const safeAge = Number(age);
    if (!name.trim() || !phone.trim() || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
      setError("Please fill in all onboarding fields.");
      return;
    }
    setProfile((p) => ({
      ...p,
      name: name.trim(),
      phone,
      age: safeAge,
      state,
    }));
    setError("");
  }

  async function handleSendOtp() {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setError("Please enter your phone number.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!isFirebaseConfigured || !auth) {
        setError("Phone verification is not available until Firebase is configured.");
          return;
      }

      const recaptcha = (window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier;
      if (!recaptcha) {
        setError("Phone verification setup is not ready yet.");
        return;
      }
      await recaptcha.render();
      const result = await signInWithPhoneNumber(auth, normalizedPhone, recaptcha);
      setConfirmation(result);
      setOtpSent(true);
      setPhone(normalizedPhone);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (confirmation) {
        await confirmation.confirm(otp);
      } else {
        setError("OTP confirmation is not available yet.");
        return;
      }
      await saveOnboarding();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otpSent) {
      await handleVerifyOtp(e);
      return;
    }
    await handleSendOtp();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm">Loading…</div>
      </main>
    );
  }

  if (!user || !isProfileComplete) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">HaqSetu</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{t.authTitle}</h1>
              </div>
              <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
                <button
                  onClick={() => setMode("signup")}
                  className={`rounded-md px-3 py-1.5 font-semibold ${mode === "signup" ? "bg-white text-emerald-700" : "text-slate-600"}`}
                >
                  {t.authSignup}
                </button>
                <button
                  onClick={() => setMode("signin")}
                  className={`rounded-md px-3 py-1.5 font-semibold ${mode === "signin" ? "bg-white text-emerald-700" : "text-slate-600"}`}
                >
                  {t.authSignin}
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
              <div id="recaptcha-container"></div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-emerald-500"
                  placeholder="+91 98765 43210"
                />
              </div>
              {otpSent ? (
                <div>
                  <label className="text-sm font-medium text-slate-700">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-emerald-500"
                    placeholder="123456"
                  />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">{t.profileName}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t.profileAge}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t.profileState}</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value as StateId)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                >
                  {getStateOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t.authLoading : mode === "signup" ? t.authSignup : t.authSignin}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
