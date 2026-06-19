"use client";

/* Mobile KYD (Know Your Doctor) verification state — mobile-local, backend-less.
   The doctor verification gate never blocks ordering (per the KYD model); it is
   a status surfaced in More / a verification view. States are the doctor-facing
   union; transient upload sub-states are collapsed for the compact mobile flow. */

import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@/icons/components/types";
import { CheckCircle, Clock, IDCard, Warning } from "@/icons/components";
import type { Tone } from "../components/primitives";

export type KydUiState = "not-started" | "under-review" | "needs-resubmission" | "expired" | "approved";

export type KydStateMeta = {
  label: string;
  tone: Tone;
  Icon: ComponentType<IconProps>;
  headline: string;
  body: string;
  cta: string | null;
};

export const KYD_STATE_META: Record<KydUiState, KydStateMeta> = {
  "not-started": {
    label: "Not verified",
    tone: "neutral",
    Icon: IDCard,
    headline: "Verify your identity",
    body: "Submit your medical licence and ID so Kura can attribute your orders and claims. Ordering still works while you verify.",
    cta: "Start verification",
  },
  "under-review": {
    label: "Under review",
    tone: "info",
    Icon: Clock,
    headline: "Verification under review",
    body: "Kura is reviewing your documents. This usually takes one business day. You can keep ordering in the meantime.",
    cta: null,
  },
  "needs-resubmission": {
    label: "Action needed",
    tone: "warning",
    Icon: Warning,
    headline: "Resubmit your documents",
    body: "We could not verify your last submission. Re-upload a clear copy of your medical licence and a photo ID.",
    cta: "Resubmit documents",
  },
  expired: {
    label: "Expired",
    tone: "warning",
    Icon: Clock,
    headline: "Verification expired",
    body: "Your verification has lapsed. Re-submit your documents to keep your directory profile active.",
    cta: "Renew verification",
  },
  approved: {
    label: "Verified",
    tone: "success",
    Icon: CheckCircle,
    headline: "You are verified",
    body: "Your identity is confirmed. Orders and claims are attributed to you, and your directory profile is live.",
    cta: null,
  },
};

export type KydApi = {
  uiState: KydUiState;
  meta: KydStateMeta;
  start: () => void;
  submit: () => void;
  fix: () => void;
};

const KydContext = createContext<KydApi | null>(null);

export function KydProvider({
  initialState = "not-started",
  children,
}: {
  initialState?: KydUiState;
  children: ReactNode;
}) {
  const [uiState, setUiState] = useState<KydUiState>(initialState);

  /* not-started → under-review (submitted for review) */
  const start = useCallback(() => setUiState("under-review"), []);
  /* under-review → approved (demo: reviewer approves) */
  const submit = useCallback(() => setUiState("approved"), []);
  /* needs-resubmission / expired → under-review (re-submitted) */
  const fix = useCallback(() => setUiState("under-review"), []);

  const api = useMemo<KydApi>(
    () => ({ uiState, meta: KYD_STATE_META[uiState], start, submit, fix }),
    [uiState, start, submit, fix],
  );

  return createElement(KydContext.Provider, { value: api }, children);
}

export function useKyd(): KydApi {
  const api = useContext(KydContext);
  if (!api) throw new Error("useKyd must be used inside <KydProvider>");
  return api;
}
