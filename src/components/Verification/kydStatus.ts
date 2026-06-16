"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { BadgeTone } from "@/components/ui";
import { CheckCircle, Clock, IDCard, Lock, Refresh, Upload, Warning } from "@/icons";
import type { IconProps } from "@/icons/components/types";

/* =============================================================================
   Kura KYD (Know Your Doctor) — verification status model
   -----------------------------------------------------------------------------
   This prototype has no KYD backend. In production these statuses arrive from
   `/me` (authKeys.me) and the KYD status endpoint. Here they persist to
   localStorage so every state in the test matrix is reachable, mirroring the
   pattern SettingsView already uses for preferences.

   The seam a real API plugs into is small and explicit:
     - `normalizeKydStatus()` maps whatever the backend calls a status onto our
       stable `KydStatus` union — change the case labels, not the UI.
     - `readSource()` / the mutations in `useKyd()` are the only places that
       touch storage. Swap them for the real client (and replace the broadcast
       with a query invalidation, e.g. queryClient.invalidateQueries(authKeys.me))
       and the gate UI is unchanged.
   ============================================================================= */

/** Stable status a backend would store for a doctor's licence review. */
export type KydStatus =
  | "not_started"
  | "under_review"
  | "approved"
  | "needs_resubmission"
  | "expired";

/** Runtime-only conditions layered on top of a stored status. */
export type KydRuntime = "ok" | "offline" | "permission_denied" | "unknown_error";

/**
 * The UX state the gate renders. Superset of stored statuses, the transient
 * upload sub-states (owned by the gate, not the backend), and runtime errors.
 */
export type KydUiState =
  | "not_started"
  | "draft"
  | "uploading"
  | "upload_failed"
  | "submitted"
  | "under_review"
  | "approved"
  | "needs_resubmission"
  | "expired"
  | "permission_denied"
  | "offline"
  | "unknown_error";

/**
 * Normalize an arbitrary backend status string onto our stable union.
 * `submitted` collapses into `under_review` — they share one doctor-facing
 * screen; `rejected` collapses into `needs_resubmission` for the same reason.
 */
export function normalizeKydStatus(raw: string | null | undefined): KydStatus {
  switch ((raw ?? "").toLowerCase().trim()) {
    case "":
    case "none":
    case "null":
    case "not_started":
    case "not-submitted":
    case "not_submitted":
    case "draft":
    case "unverified":
    case "explorer":
      return "not_started";
    case "submitted":
    case "in_review":
    case "in-review":
    case "pending":
    case "pending_review":
    case "under_review":
    case "under-review":
    case "reviewing":
      return "under_review";
    case "approved":
    case "verified":
    case "active":
      return "approved";
    case "rejected":
    case "declined":
    case "needs_resubmission":
    case "needs-resubmission":
    case "resubmit":
    case "action_needed":
      return "needs_resubmission";
    case "expired":
      return "expired";
    default:
      // Unknown enum value → safest default is "not verified yet", never an
      // accidental "approved".
      return "not_started";
  }
}

/** Per-state pill metadata. Status is always icon + label, never colour alone. */
export const KYD_STATE_META: Record<
  KydUiState,
  { label: string; tone: BadgeTone; Icon: ComponentType<IconProps> }
> = {
  not_started: { label: "Not verified", tone: "neutral", Icon: IDCard },
  draft: { label: "Draft", tone: "neutral", Icon: Upload },
  uploading: { label: "Uploading", tone: "info", Icon: Upload },
  upload_failed: { label: "Upload failed", tone: "danger", Icon: Warning },
  submitted: { label: "Under review", tone: "info", Icon: Clock },
  under_review: { label: "Under review", tone: "info", Icon: Clock },
  approved: { label: "Verified", tone: "success", Icon: CheckCircle },
  needs_resubmission: { label: "Action needed", tone: "warning", Icon: Warning },
  expired: { label: "Expired", tone: "warning", Icon: Clock },
  permission_denied: { label: "No access", tone: "neutral", Icon: Lock },
  offline: { label: "Offline", tone: "neutral", Icon: Refresh },
  unknown_error: { label: "Status unavailable", tone: "neutral", Icon: Warning },
};

/* ----------------------------- upload validation --------------------------- */

export const KYD_MAX_FILE_MB = 10;
export const KYD_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const KYD_ACCEPT_LABEL = `PDF, JPG, or PNG up to ${KYD_MAX_FILE_MB} MB`;

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXT = /\.(pdf|jpe?g|png)$/i;

/** Returns an inline, doctor-facing error message, or null when the file is OK. */
export function validateKydFile(file: { name: string; size: number; type?: string }): string | null {
  const okType = (file.type && ALLOWED_TYPES.includes(file.type)) || ALLOWED_EXT.test(file.name);
  if (!okType) return "That file type isn't supported. Upload a PDF, JPG, or PNG.";
  if (file.size > KYD_MAX_FILE_MB * 1024 * 1024) {
    return `That file is over ${KYD_MAX_FILE_MB} MB. Upload a smaller PDF, JPG, or PNG.`;
  }
  return null;
}

/* ------------------------------- destinations ------------------------------ */

/*
 * No standalone /orders or /orders/new route exists in this prototype — the
 * order builder lives inside the clinic SPA, on the patient record's Orders
 * tab. This deep-link opens that surface (the "create a lab order" entry).
 * When a real /orders/new route lands, point ORDER_CREATE_HREF at it.
 */
export const ORDER_CREATE_HREF = "/?intent=new-order";
export const WORKSPACE_HREF = "/";
export const VERIFICATION_HREF = "/verification";

/* --------------------------------- source ---------------------------------- */

export type KydRecord = {
  status: KydStatus;
  /** Optional — only stored when the current backend supports/requires it. */
  licenceNumber?: string;
  /** Display only — the file name the doctor submitted. Never PHI / never the file. */
  documentName?: string;
  /**
   * Prototype/QA only — a forced UI state that wins over status + runtime so the
   * demo bar can reach every screen (including the transient upload sub-states a
   * real backend never stores). No production backend ever sets this; the real
   * client should ignore it.
   */
  demoUiState?: KydUiState | null;
};

/** Every UI state the gate/home can render — used to validate persisted demo overrides. */
const KYD_UI_STATES: ReadonlySet<KydUiState> = new Set<KydUiState>([
  "not_started",
  "draft",
  "uploading",
  "upload_failed",
  "submitted",
  "under_review",
  "approved",
  "needs_resubmission",
  "expired",
  "permission_denied",
  "offline",
  "unknown_error",
]);

function asUiState(raw: unknown): KydUiState | null {
  return typeof raw === "string" && KYD_UI_STATES.has(raw as KydUiState) ? (raw as KydUiState) : null;
}

const KYD_KEY = "kura.kyd.v1";
/** Same-tab broadcast so the gate, the shell banner, and Settings stay in sync. */
const KYD_EVENT = "kura:kyd-change";
const DEFAULT_RECORD: KydRecord = { status: "not_started" };

function readSource(): KydRecord {
  if (typeof window === "undefined") return DEFAULT_RECORD;
  try {
    const raw = window.localStorage.getItem(KYD_KEY);
    if (!raw) return DEFAULT_RECORD;
    const parsed = JSON.parse(raw) as Partial<KydRecord> & { status?: string };
    return {
      status: normalizeKydStatus(parsed.status),
      licenceNumber: parsed.licenceNumber,
      documentName: parsed.documentName,
      demoUiState: asUiState(parsed.demoUiState),
    };
  } catch {
    return DEFAULT_RECORD;
  }
}

function writeSource(record: KydRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KYD_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable (private mode) — value stays in memory for this tab */
  }
  // Broadcast even if storage failed, so the in-memory optimistic update still
  // reaches other hook instances in this tab.
  window.dispatchEvent(new CustomEvent(KYD_EVENT));
}

/* ---------------------------------- hook ----------------------------------- */

export type UseKyd = {
  /** True until the persisted record has hydrated after mount (SSR-safe). */
  loading: boolean;
  record: KydRecord;
  status: KydStatus;
  runtime: KydRuntime;
  /** Resolved state for the gate — runtime errors win over the stored status. */
  uiState: KydUiState;
  isApproved: boolean;
  /** Submit a new licence for review (first submission or re-upload). */
  submit: (input: { licenceNumber?: string; documentName: string }) => void;
  /** Re-read the source and clear any runtime error (≈ refetch /me). */
  refetch: () => void;
  /** Demo/QA only — force a stored status. */
  setStatus: (status: KydStatus) => void;
  /** Demo/QA only — force a runtime condition (offline / permission / error). */
  setRuntime: (runtime: KydRuntime) => void;
  /** Demo/QA only — force any UI state (incl. transient upload sub-states). null clears it. */
  setDemoState: (state: KydUiState | null) => void;
};

export function useKyd(): UseKyd {
  const [record, setRecord] = useState<KydRecord>(DEFAULT_RECORD);
  const [loading, setLoading] = useState(true);
  const [runtime, setRuntimeState] = useState<KydRuntime>("ok");

  useEffect(() => {
    /* Hydrate once after mount — SSR renders the default, so reading storage in
       a lazy initializer would mismatch the server HTML. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(readSource());
    setLoading(false);

    const sync = () => setRecord(readSource());
    window.addEventListener(KYD_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(KYD_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback((next: KydRecord) => {
    setRecord(next); // optimistic
    writeSource(next); // persist + broadcast (≈ invalidate authKeys.me, then refetch)
  }, []);

  const submit = useCallback(
    (input: { licenceNumber?: string; documentName: string }) => {
      /* A real submission clears any demo override so the genuine flow shows. */
      commit({
        status: "under_review",
        licenceNumber: input.licenceNumber,
        documentName: input.documentName,
        demoUiState: null,
      });
    },
    [commit],
  );

  const setStatus = useCallback(
    (status: KydStatus) => {
      const current = readSource();
      commit(status === "not_started" ? { status } : { ...current, status, demoUiState: null });
    },
    [commit],
  );

  const setDemoState = useCallback(
    (state: KydUiState | null) => {
      /* Override wins over status + runtime; clear the runtime so the override is
         the single source while it's active. */
      setRuntimeState("ok");
      commit({ ...readSource(), demoUiState: state });
    },
    [commit],
  );

  const refetch = useCallback(() => {
    /* ≈ refetch /me: drop the runtime error and any demo override, re-read. */
    setRuntimeState("ok");
    const current = readSource();
    commit({ ...current, demoUiState: null });
  }, [commit]);

  /* Resolution order: demo override → runtime error → stored status. */
  const uiState: KydUiState = record.demoUiState ?? (runtime !== "ok" ? runtime : record.status);

  return {
    loading,
    record,
    status: record.status,
    runtime,
    uiState,
    isApproved: uiState === "approved",
    submit,
    refetch,
    setStatus,
    setRuntime: setRuntimeState,
    setDemoState,
  };
}
