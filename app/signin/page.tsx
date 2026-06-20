"use client";

import Link from "next/link";

export default function SigninPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use the main onboarding screen to sign in and continue.</p>
        <Link href="/" className="mt-4 inline-block rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Go to home</Link>
      </div>
    </main>
  );
}
