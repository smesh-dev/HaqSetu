"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useProfile, clearAll, clearSession, writeProfileForUid } from "@/lib/store";

// Hackathon demo account — fully local, no Firebase / SMS billing required.
const DEMO_PHONE_DIGITS = "9999888800";
const DEMO_OTP = "543210";
const DEMO_UID = "demo-uid-9999888800";
import { T } from "@/lib/i18n";
import type { StateId } from "@/lib/rules/types";

export function getStateOptions(): { value: StateId; label: string }[] {
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
  const [isMockFallback, setIsMockFallback] = useState(false);
  const lang = profile.language;
  const t = T[lang];

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const isMock = localStorage.getItem("haqsetu_mock_user") === "true";
      if (isMock) {
        const mockPhone = localStorage.getItem("haqsetu_mock_phone") || "+919876543210";
        const mockUid = `mock-uid-${mockPhone.replace(/\D/g, "")}`;
        setUser({ uid: mockUid, phoneNumber: mockPhone } as any);
        localStorage.setItem("haqsetu_current_uid", mockUid);
      } else {
        setUser(null);
        localStorage.removeItem("haqsetu_current_uid");
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem("haqsetu_current_uid", nextUser.uid);
      } else {
        const isMock = localStorage.getItem("haqsetu_mock_user") === "true";
        if (isMock) {
          const mockPhone = localStorage.getItem("haqsetu_mock_phone") || "+919876543210";
          const mockUid = `mock-uid-${mockPhone.replace(/\D/g, "")}`;
          setUser({ uid: mockUid, phoneNumber: mockPhone } as any);
          localStorage.setItem("haqsetu_current_uid", mockUid);
        } else {
          setUser(null);
          localStorage.removeItem("haqsetu_current_uid");
        }
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

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Please enter your phone number.");
      return;
    }

    // Hackathon demo account — works in every environment, no SMS/billing needed.
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const isDemoAccount = phoneDigits === DEMO_PHONE_DIGITS || phoneDigits === `91${DEMO_PHONE_DIGITS}`;
    if (isDemoAccount) {
      setSubmitting(true);
      if (!otpSent) {
        setOtpSent(true);
        setSubmitting(false);
        return;
      }

      if (otp.trim() !== DEMO_OTP) {
        setError(`Invalid OTP. For the demo account, please use ${DEMO_OTP}.`);
        setSubmitting(false);
        return;
      }

      if (mode === "signup") {
        const safeAge = Number(age);
        if (!name.trim() || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
          setError("Please fill in all onboarding fields.");
          setSubmitting(false);
          return;
        }
        // Write straight to the uid-scoped key so it survives the key switch below.
        writeProfileForUid(DEMO_UID, (p) => ({
          ...p,
          name: name.trim(),
          phone: normalizedPhone,
          age: safeAge,
          state,
        }));
      }

      localStorage.setItem("haqsetu_mock_user", "true");
      localStorage.setItem("haqsetu_mock_phone", normalizedPhone);
      localStorage.setItem("haqsetu_current_uid", DEMO_UID);
      setUser({ uid: DEMO_UID, phoneNumber: normalizedPhone } as any);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("haqsetu-auth-change"));
      }
      setSubmitting(false);
      return;
    }

    const mustUseMock = !isFirebaseConfigured || !auth || isMockFallback;

    if (mustUseMock && isDev) {
      setSubmitting(true);
      if (!otpSent) {
        setOtpSent(true);
        setOtp("123456");
        setIsMockFallback(true);
        setSubmitting(false);
        return;
      }

      if (otp.trim() !== "123456") {
        setError("Invalid OTP. For development mock auth, please use 123456.");
        setSubmitting(false);
        return;
      }

      const mockUid = `mock-uid-${normalizedPhone.replace(/\D/g, "")}`;
      localStorage.setItem("haqsetu_mock_user", "true");
      localStorage.setItem("haqsetu_mock_phone", normalizedPhone);
      localStorage.setItem("haqsetu_current_uid", mockUid);

      if (mode === "signup") {
        const safeAge = Number(age);
        if (!name.trim() || !normalizedPhone || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
          setError("Please fill in all onboarding fields.");
          setSubmitting(false);
          return;
        }
        writeProfileForUid(mockUid, (p) => ({
          ...p,
          name: name.trim(),
          phone: normalizedPhone,
          age: safeAge,
          state,
        }));
      }
      setUser({ uid: mockUid, phoneNumber: normalizedPhone } as any);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("haqsetu-auth-change"));
      }
      setSubmitting(false);
      return;
    }

    // Real Firebase Auth
    setSubmitting(true);
    if (!otpSent) {
      try {
        if (!auth) {
          throw new Error("Firebase Auth is not initialized.");
        }
        const recaptcha = (window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier;
        if (!recaptcha) {
          throw new Error("Recaptcha verifier not ready.");
        }
        await recaptcha.render();
        const result = await signInWithPhoneNumber(auth, normalizedPhone, recaptcha);
        setConfirmation(result);
        setOtpSent(true);
      } catch (err: any) {
        const errCode = err?.code || "";
        const errMsg = err?.message || "";
        const isBilling = errCode.includes("billing-not-enabled") || errMsg.includes("billing-not-enabled");
        if (isDev && isBilling) {
          // Dev fallback to mock auth so local sign-in keeps working without the Blaze plan.
          console.warn("Firebase phone auth requires the Blaze billing plan. Falling back to local mock authentication (OTP: 123456).");
          setIsMockFallback(true);
          setOtpSent(true);
          setOtp("123456");
        } else if (isBilling) {
          setError(
            lang === "hi"
              ? "फ़ोन साइन-इन अभी उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।"
              : "Phone sign-in is temporarily unavailable (SMS service not enabled). Please try again later.",
          );
        } else if (errCode.includes("invalid-phone-number")) {
          setError(
            lang === "hi"
              ? "अमान्य फ़ोन नंबर। कृपया देश कोड सहित दर्ज करें, जैसे +91…"
              : "Invalid phone number. Please include the country code, e.g. +91…",
          );
        } else if (errCode.includes("too-many-requests")) {
          setError(
            lang === "hi"
              ? "बहुत अधिक प्रयास। कृपया कुछ देर बाद पुनः प्रयास करें।"
              : "Too many attempts. Please try again in a little while.",
          );
        } else {
          setError(err instanceof Error ? err.message : "Failed to send OTP.");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Verify OTP
    try {
      if (!confirmation) {
        throw new Error("No verification code confirmation available.");
      }
      const userCredential = await confirmation.confirm(otp);
      const nextUser = userCredential.user;

      if (mode === "signup") {
        const safeAge = Number(age);
        if (!name.trim() || !normalizedPhone || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
          setError("Please fill in all onboarding fields.");
          setSubmitting(false);
          return;
        }
        writeProfileForUid(nextUser.uid, (p) => ({
          ...p,
          name: name.trim(),
          phone: normalizedPhone,
          age: safeAge,
          state,
        }));
      }

      setUser(nextUser);
      localStorage.setItem("haqsetu_current_uid", nextUser.uid);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("haqsetu-auth-change"));
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !isProfileComplete) {
    const isOnboarding = Boolean(user && !isProfileComplete);

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">HaqSetu</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {isOnboarding
                    ? (lang === "hi" ? "प्रोफ़ाइल पूरी करें" : "Complete your profile")
                    : (mode === "signup" ? t.authTitle : (lang === "hi" ? "खाते में लॉगिन करें" : "Login to your account"))}
                </h1>
                {isOnboarding && (
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === "hi" 
                      ? `आप फोन नंबर ${phone || user?.phoneNumber} से जुड़े हैं। जारी रखने के लिए कृपया अपनी प्रोफ़ाइल विवरण भरें।` 
                      : `You are signed in as ${phone || user?.phoneNumber}. Please complete your profile to continue.`}
                  </p>
                )}
              </div>
              {!isOnboarding && (
                <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setOtpSent(false);
                      setError("");
                    }}
                    className={`rounded-md px-3 py-1.5 font-semibold ${mode === "signup" ? "bg-white text-emerald-700" : "text-slate-600"}`}
                  >
                    {t.authSignup}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setOtpSent(false);
                      setError("");
                    }}
                    className={`rounded-md px-3 py-1.5 font-semibold ${mode === "signin" ? "bg-white text-emerald-700" : "text-slate-600"}`}
                  >
                    {t.authSignin}
                  </button>
                </div>
              )}
            </div>

            <form 
              onSubmit={isOnboarding ? (e) => { e.preventDefault(); saveOnboarding(); } : handleAuthSubmit} 
              className="mt-6 space-y-4"
            >
              <div id="recaptcha-container"></div>
              
              {!isOnboarding && (
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-emerald-500 font-bold"
                    placeholder="+91 98765 43210"
                    required
                    disabled={otpSent}
                  />
                </div>
              )}

              {!isOnboarding && otpSent && (
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-emerald-500 font-bold"
                    placeholder="123456"
                    required
                  />
                </div>
              )}

              {(isOnboarding || mode === "signup") && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700 font-bold">{t.profileName}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 font-bold">{t.profileAge}</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 font-bold"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 font-bold">{t.profileState}</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value as StateId)}
                      className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 bg-white font-bold"
                      required
                    >
                      {getStateOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 transition"
              >
                {submitting 
                  ? t.authLoading 
                  : isOnboarding 
                    ? (lang === "hi" ? "प्रोफ़ाइल पूरी करें" : "Complete Profile") 
                    : !otpSent
                      ? (lang === "hi" ? "OTP प्राप्त करें" : "Get OTP")
                      : mode === "signup" ? t.authSignup : t.authSignin}
              </button>
            </form>

            {isOnboarding && (
              <button
                type="button"
                onClick={async () => {
                  if (auth) {
                    await signOut(auth).catch(() => {});
                  }
                  clearSession();
                  window.location.reload();
                }}
                className="mt-4 w-full text-center text-xs font-semibold text-rose-600 hover:underline"
              >
                {lang === "hi" ? "🚪 लॉग आउट करें (दूसरा नंबर उपयोग करें)" : "🚪 Log out (use different number)"}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
