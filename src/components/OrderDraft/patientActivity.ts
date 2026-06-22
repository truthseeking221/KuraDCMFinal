"use client";

/* Unified per-patient activity log — the one place every clinical + operational
   event is recorded so the chart can show a single trustworthy history.

   Frontend-only prototype: localStorage-backed, cross-tab synced, keyed by
   patientId. Mirrors the favorites/userBundles store pattern. Event producers
   call `logPatientActivity(patientId, {...})`; the Activity tab reads via
   `usePatientActivity(patientId)`. Timestamps are epoch ms stamped at log time
   (client only) so the server snapshot stays stable for hydration. */

import { useCallback, useMemo, useSyncExternalStore } from "react";

const ACTIVITY_KEY = "kura.patientActivity.v1";
const ACTIVITY_EVENT = "kura:patient-activity-change";

/* One palette of event types so the timeline icon + tone stays consistent
   wherever an event is logged from. */
export type ActivityType =
  | "order"
  | "tube"
  | "payment"
  | "booking"
  | "note"
  | "rx"
  | "referral"
  | "followup"
  | "icd"
  | "claim"
  | "identity"
  | "careplan"
  | "result";

export type ActivityEntry = {
  id: string;
  patientId: string;
  type: ActivityType;
  title: string;
  detail?: string;
  /* who did it — defaults to the signed-in doctor */
  actor?: string;
  /* epoch ms; stamped client-side at log time */
  at: number;
};

type ActivityMap = Record<string, ActivityEntry[]>;

const SERVER_SNAPSHOT: ActivityEntry[] = [];
let snapshot: ActivityMap | null = null;
const listeners = new Set<() => void>();
let listening = false;
let seq = 0;

function read(): ActivityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ActivityMap) : {};
  } catch {
    return {};
  }
}

function write(map: ActivityMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable (private mode) — keep in memory for this tab */
  }
}

function getMap(): ActivityMap {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

function notify() {
  listeners.forEach((l) => l());
}

function syncFromEvent(event?: Event) {
  const detail = event instanceof CustomEvent ? event.detail : null;
  snapshot = detail && typeof detail === "object" ? (detail as ActivityMap) : read();
  notify();
}

function ensureWindowListeners() {
  if (typeof window === "undefined" || listening) return;
  window.addEventListener(ACTIVITY_EVENT, syncFromEvent);
  window.addEventListener("storage", syncFromEvent);
  listening = true;
}

function releaseIfIdle() {
  if (typeof window === "undefined" || !listening || listeners.size > 0) return;
  window.removeEventListener(ACTIVITY_EVENT, syncFromEvent);
  window.removeEventListener("storage", syncFromEvent);
  listening = false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureWindowListeners();
  return () => {
    listeners.delete(listener);
    releaseIfIdle();
  };
}

function commit(map: ActivityMap) {
  snapshot = map;
  write(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: map }));
  } else {
    notify();
  }
}

/* Imperative producer — safe to call from anywhere (context actions, encounter
   log, etc). Prepends newest-first. Returns the new entry id. De-dupes a rapid
   exact-duplicate (same patient+type+title within 1.2s) so a double-render or
   double-click never doubles the log. */
export function logPatientActivity(
  patientId: string,
  entry: { type: ActivityType; title: string; detail?: string; actor?: string; at?: number },
): string {
  if (!patientId) return "";
  const map = getMap();
  const at = entry.at ?? (typeof Date !== "undefined" ? Date.now() : 0);
  const existing = map[patientId] ?? [];
  const last = existing[0];
  if (last && last.type === entry.type && last.title === entry.title && at - last.at < 1200) {
    return last.id;
  }
  seq += 1;
  const id = `act_${at.toString(36)}_${seq.toString(36)}`;
  const next: ActivityEntry = {
    id,
    patientId,
    type: entry.type,
    title: entry.title,
    detail: entry.detail,
    actor: entry.actor ?? "You",
    at,
  };
  commit({ ...map, [patientId]: [next, ...existing] });
  return id;
}

/* Demo seed — the active chart (Sokha) arrives with a believable history so the
   Activity tab reads as a living record, not an empty shell. Real events append
   on top as the doctor works. Seeded once, client-side, only if empty. */
const DEMO_PATIENT_ID = "sokha-chan";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const DEMO_SEED: Array<Omit<ActivityEntry, "id" | "patientId" | "at"> & { ago: number }> = [
  { type: "payment", title: "Payment received · KHQR", detail: "$26.00 collected before pickup", actor: "Reception", ago: 8 * MIN },
  { type: "tube", title: "Tubes ready · 2 tubes", detail: "EDTA purple · SST gold — labelled and scanned", ago: 35 * MIN },
  { type: "order", title: "Order placed · 3 tests", detail: "HbA1c · Lipid panel · Creatinine + eGFR · KO-4604", ago: 42 * MIN },
  { type: "result", title: "Results back · HbA1c", detail: "9.4% · above target — flagged for review", ago: 5 * HOUR },
  { type: "note", title: "Signed note", detail: "Renal marker and glycemic follow-up review", ago: 1 * DAY + 2 * HOUR },
  { type: "referral", title: "Referred ophthalmology", detail: "Retinopathy screen · Calmette Hospital", ago: 1 * DAY + 2 * HOUR },
  { type: "careplan", title: "Care plan reviewed", detail: "v2 · CKD + glycemic goals updated", ago: 3 * DAY },
];

function ensureSeed(patientId: string) {
  if (patientId !== DEMO_PATIENT_ID || typeof Date === "undefined") return;
  const map = getMap();
  if (map[patientId]?.length) return;
  const now = Date.now();
  const seeded: ActivityEntry[] = DEMO_SEED.map((e, i) => ({
    id: `seed_${i}`,
    patientId,
    type: e.type,
    title: e.title,
    detail: e.detail,
    actor: e.actor ?? "You",
    at: now - e.ago,
  }));
  commit({ ...map, [patientId]: seeded });
}

/* Idempotent demo seed; safe to call from a client effect. */
export function seedDemoPatientActivity(patientId: string) {
  ensureSeed(patientId);
}

function getPatientSnapshot(patientId: string): ActivityEntry[] {
  return getMap()[patientId] ?? SERVER_SNAPSHOT;
}

export function usePatientActivity(patientId: string): ActivityEntry[] {
  const getSnap = useCallback(() => getPatientSnapshot(patientId), [patientId]);
  const entries = useSyncExternalStore(subscribe, getSnap, () => SERVER_SNAPSHOT);
  /* newest-first already; memo keeps referential stability for consumers */
  return useMemo(() => entries, [entries]);
}
