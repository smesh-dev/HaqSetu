"use client";

import { useEffect, useState } from "react";
import type { Profile } from "./rules/types";

// Privacy-first persistence. Everything lives in the browser's localStorage on
// THIS device — the profile, the document vault, and the application tracker.
// Nothing is uploaded. The rules engine also runs on-device; only the optional
// AI explanation ever sends a short, de-identified summary to the server.

export const initialProfile: Profile = {
  language: "en",
  state: "CENTRAL",
  category: "GENERAL",
  disability: "none",
  household: {
    isWidow: false,
    isPregnantOrLactating: false,
    hasSchoolGoingChild: false,
    hasElderly60Plus: false,
    lacksPuccaHouse: false,
    lacksLpg: false,
    isRural: true,
  },
  documentsHave: [],
};

function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [val, setVal] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setVal(JSON.parse(s) as T);
    } catch {
      /* ignore */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  }, [key, val, loaded]);
  return [val, setVal, loaded];
}

export function useProfile() {
  return useLocal<Profile>("haqsetu_profile", initialProfile);
}

export type TrackStatus = "to_start" | "applied" | "under_review" | "approved" | "received" | "rejected";
export const TRACK_STATUSES: TrackStatus[] = ["to_start", "applied", "under_review", "approved", "received", "rejected"];

export interface TrackedApp {
  schemeId: string;
  status: TrackStatus;
  note?: string;
  addedAt: string;
  updatedAt: string;
}

export function useTracked() {
  return useLocal<TrackedApp[]>("haqsetu_tracked", []);
}

// Consent for the optional AI explanation (the only thing that ever leaves the device).
export function useAIConsent() {
  return useLocal<boolean>("haqsetu_ai_consent", true);
}

export function clearAll() {
  try {
    localStorage.removeItem("haqsetu_profile");
    localStorage.removeItem("haqsetu_tracked");
    localStorage.removeItem("haqsetu_ai_consent");
  } catch {
    /* ignore */
  }
}
