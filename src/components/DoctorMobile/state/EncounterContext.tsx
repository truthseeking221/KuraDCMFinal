"use client";

/* Mobile-local encounter engine — the treatment loop on top of the review
   chart: note / ICD / Rx / referral / follow-up → encounter timeline → claim
   readiness. All demo-local state (does NOT touch the desktop page.tsx). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  icdCandidateByCode,
  noteScaffold,
  rxFormulary,
  rxFrequencies,
  type NoteScaffold,
} from "../data/encounter";

export type NoteStatus = "none" | "draft" | "signed";

export type EncounterMed = { title: string; meta: string; ai?: boolean; rx?: boolean };

export type EncounterReferral = { service: string; destination: string; urgency: string; code: string };

export type EncounterEntryKind = "note" | "icd" | "rx" | "order" | "referral" | "followup" | "claim";
export type EncounterEntry = { id: number; kind: EncounterEntryKind; label: string; detail?: string };

export type SelfReportedResolution = "confirmed" | "dismissed";

export type EncounterApi = {
  note: NoteScaffold;
  setNote: (partial: Partial<NoteScaffold>) => void;
  noteStatus: NoteStatus;
  saveNoteDraft: () => void;
  signNote: () => void;

  icdCodes: string[];
  addIcd: (code: string) => void;
  removeIcd: (code: string) => void;

  meds: EncounterMed[];
  addMed: (item: EncounterMed) => void;
  signedRx: string[];
  prescribe: (drug: string, dose: string, freq: string, duration: string) => void;

  referral: EncounterReferral | null;
  sendReferral: (record: { service: string; destination: string; urgency: string }) => void;

  followUp: string | null;
  scheduleFollowUp: (label: string) => void;

  selfReported: Record<string, SelfReportedResolution>;
  resolveSelfReported: (id: string, res: SelfReportedResolution, label: string) => void;
  clearSelfReported: (id: string, label: string) => void;

  entries: EncounterEntry[];
  logEntry: (kind: EncounterEntryKind, label: string, detail?: string) => void;

  claimChecks: Array<{ id: string; label: string; done: boolean }>;
  claimReady: boolean;
};

const INITIAL_ICD = ["E11.65", "I10"];

const INITIAL_MEDS: EncounterMed[] = [
  { title: "Metformin 1 g", meta: "Twice daily" },
  { title: "Lisinopril 10 mg", meta: "Once daily" },
];

const EncounterContext = createContext<EncounterApi | null>(null);

export function EncounterProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<EncounterEntry[]>([]);
  const entrySeqRef = useRef(0);
  const [icdCodes, setIcdCodes] = useState<string[]>(INITIAL_ICD);
  const [meds, setMeds] = useState<EncounterMed[]>(INITIAL_MEDS);
  const [signedRx, setSignedRx] = useState<string[]>([]);
  const [note, setNoteState] = useState<NoteScaffold>(noteScaffold);
  const [noteStatus, setNoteStatus] = useState<NoteStatus>("none");
  const [referral, setReferral] = useState<EncounterReferral | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [selfReported, setSelfReported] = useState<Record<string, SelfReportedResolution>>({});

  const logEntry = useCallback((kind: EncounterEntryKind, label: string, detail?: string) => {
    entrySeqRef.current += 1;
    const id = entrySeqRef.current;
    setEntries((current) => [...current, { id, kind, label, detail }]);
  }, []);

  const setNote = useCallback((partial: Partial<NoteScaffold>) => {
    setNoteState((current) => ({ ...current, ...partial }));
  }, []);

  const saveNoteDraft = useCallback(() => {
    setNoteStatus((current) => (current === "signed" ? current : "draft"));
    logEntry("note", "Note drafted", "Unsigned — not yet part of the legal record");
  }, [logEntry]);

  const signNote = useCallback(() => {
    setNoteStatus("signed");
    logEntry("note", "Signed note", noteScaffold.reason);
  }, [logEntry]);

  const addIcd = useCallback(
    (code: string) => {
      const entry = icdCandidateByCode.get(code);
      setIcdCodes((codes) => (codes.includes(code) ? codes : [...codes, code]));
      if (entry) logEntry("icd", `Added ${entry.code} — ${entry.label}`, entry.trigger);
      else logEntry("icd", `Added ${code}`);
    },
    [logEntry],
  );

  const removeIcd = useCallback((code: string) => {
    setIcdCodes((codes) => codes.filter((existing) => existing !== code));
  }, []);

  const addMed = useCallback(
    (item: EncounterMed) => {
      setMeds((current) => (current.some((med) => med.title === item.title) ? current : [...current, item]));
      logEntry("rx", `Added medication — ${item.title}`, item.ai ? "From AI suggestion · not yet a signed Rx" : item.meta);
    },
    [logEntry],
  );

  const prescribe = useCallback(
    (drug: string, dose: string, freq: string, duration: string) => {
      const formulary = rxFormulary.find((item) => item.drug === drug);
      const freqLabel = rxFrequencies.find((option) => option.value === freq)?.label ?? freq;
      const klass = formulary?.class ?? "Prescription";
      const title = `${drug} ${dose}`.trim();
      setMeds((current) =>
        current.some((med) => med.title === title) ? current : [...current, { title, meta: `${klass} · ${freqLabel}`, rx: true }],
      );
      setSignedRx((current) => (current.includes(drug) ? current : [...current, drug]));
      logEntry("rx", `Prescribed ${title}`, `${freqLabel} · ${duration} · signed Rx · PDF for any pharmacy`);
    },
    [logEntry],
  );

  const sendReferral = useCallback(
    (record: { service: string; destination: string; urgency: string }) => {
      entrySeqRef.current += 1;
      const code = `KR-9134-${String(2400 + entrySeqRef.current * 7).slice(-4)}`;
      setReferral({ ...record, code });
      logEntry(
        "referral",
        `Referred ${record.service.toLowerCase()} — ${record.destination}`,
        `${record.urgency} · ${code} · patient notified via Telegram`,
      );
    },
    [logEntry],
  );

  const scheduleFollowUp = useCallback(
    (label: string) => {
      setFollowUp(label);
      logEntry("followup", `Scheduled follow-up in ${label}`, "Telegram reminder to 070 ··· 496");
    },
    [logEntry],
  );

  const resolveSelfReported = useCallback(
    (id: string, res: SelfReportedResolution, label: string) => {
      setSelfReported((current) => ({ ...current, [id]: res }));
      logEntry(
        "note",
        res === "confirmed" ? `Confirmed self-reported — ${label}` : `Dismissed self-reported — ${label}`,
        res === "confirmed" ? "Moved into the clinical record" : "Marked not clinically relevant today",
      );
    },
    [logEntry],
  );

  const clearSelfReported = useCallback(
    (id: string, label: string) => {
      setSelfReported((current) => {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      });
      logEntry("note", `Reopened self-reported — ${label}`, "Back to unverified — needs a decision");
    },
    [logEntry],
  );

  const claimChecks = useMemo(
    () => [
      { id: "icd", label: "ICD-10 coded", done: icdCodes.length > 0 },
      { id: "note", label: "Signed note", done: noteStatus === "signed" },
      { id: "labs", label: "Lab evidence — HbA1c results on file", done: true },
      { id: "identity", label: "Identity verified · Forte active", done: true },
      { id: "therapy", label: "Therapy plan — Rx, referral, or follow-up", done: signedRx.length > 0 || referral !== null || followUp !== null },
    ],
    [icdCodes.length, noteStatus, signedRx.length, referral, followUp],
  );
  const claimReady = claimChecks.every((check) => check.done);

  const claimLoggedRef = useRef(false);
  useEffect(() => {
    if (claimReady && !claimLoggedRef.current) {
      claimLoggedRef.current = true;
      logEntry("claim", "Claim packet ready", "ICD · signed note · lab evidence · therapy plan");
    }
  }, [claimReady, logEntry]);

  const api = useMemo<EncounterApi>(
    () => ({
      note,
      setNote,
      noteStatus,
      saveNoteDraft,
      signNote,
      icdCodes,
      addIcd,
      removeIcd,
      meds,
      addMed,
      signedRx,
      prescribe,
      referral,
      sendReferral,
      followUp,
      scheduleFollowUp,
      selfReported,
      resolveSelfReported,
      clearSelfReported,
      entries,
      logEntry,
      claimChecks,
      claimReady,
    }),
    [
      note,
      setNote,
      noteStatus,
      saveNoteDraft,
      signNote,
      icdCodes,
      addIcd,
      removeIcd,
      meds,
      addMed,
      signedRx,
      prescribe,
      referral,
      sendReferral,
      followUp,
      scheduleFollowUp,
      selfReported,
      resolveSelfReported,
      clearSelfReported,
      entries,
      logEntry,
      claimChecks,
      claimReady,
    ],
  );

  return <EncounterContext.Provider value={api}>{children}</EncounterContext.Provider>;
}

export function useEncounter(): EncounterApi {
  const api = useContext(EncounterContext);
  if (!api) throw new Error("useEncounter must be used inside <EncounterProvider>");
  return api;
}
