"use client";

/* Mobile app navigation + global-search state. The shell renders one active
   tab (section) with a STACK of pushed views over it (list→detail push). The
   search overlay is global. activePatientId is the chart/order context the
   ordering surfaces bind to. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ACTIVE_PATIENT_ID } from "@/components/OrderDraft/OrderDraftContext";

export type MobileSection = "home" | "patients" | "bookings" | "catalog" | "more";

export type MobileView =
  | { kind: "none" }
  | { kind: "patient"; patientId: string }
  | { kind: "chart-result"; patientId: string; resultId: string }
  | { kind: "booking"; code: string }
  | { kind: "composer" }
  | { kind: "cart" }
  | { kind: "settings"; sectionId?: string }
  | { kind: "verification" }
  | { kind: "result-review"; code: string; patientId: string };

export type MobileAppApi = {
  section: MobileSection;
  go: (section: MobileSection) => void;

  /* pushed views (stacked over the active tab) */
  view: MobileView;
  pushPatient: (patientId: string) => void;
  openChartResult: (patientId: string, resultId: string) => void;
  pushBooking: (code: string) => void;
  openComposer: () => void;
  openCart: () => void;
  openSettings: (sectionId?: string) => void;
  openVerification: () => void;
  openResultReview: (code: string, patientId: string) => void;
  back: () => void;
  resetTo: (section: MobileSection) => void;

  // global directory search
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  /* active chart/order patient */
  activePatientId: string;
};

const NONE: MobileView = { kind: "none" };

const MobileAppContext = createContext<MobileAppApi | null>(null);

export function MobileAppProvider({
  initial,
  children,
}: {
  initial?: { section?: MobileSection; view?: MobileView };
  children: ReactNode;
}) {
  const [section, setSection] = useState<MobileSection>(initial?.section ?? "home");
  /* stack of pushed views; the top is the visible view, empty = bare tab */
  const [stack, setStack] = useState<MobileView[]>(() =>
    initial?.view && initial.view.kind !== "none" ? [initial.view] : [],
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string>(ACTIVE_PATIENT_ID);

  const view = stack.length > 0 ? stack[stack.length - 1] : NONE;

  const push = useCallback((next: MobileView) => {
    setStack((current) => [...current, next]);
  }, []);

  const go = useCallback((next: MobileSection) => {
    setSection(next);
    setStack([]);
  }, []);

  const resetTo = useCallback((next: MobileSection) => {
    setSection(next);
    setStack([]);
    setSearchOpen(false);
  }, []);

  const back = useCallback(() => {
    setStack((current) => (current.length > 0 ? current.slice(0, -1) : current));
  }, []);

  const pushPatient = useCallback(
    (patientId: string) => {
      setActivePatientId(patientId);
      push({ kind: "patient", patientId });
    },
    [push],
  );

  const openChartResult = useCallback(
    (patientId: string, resultId: string) => {
      setActivePatientId(patientId);
      push({ kind: "chart-result", patientId, resultId });
    },
    [push],
  );

  const pushBooking = useCallback((code: string) => push({ kind: "booking", code }), [push]);
  const openComposer = useCallback(() => push({ kind: "composer" }), [push]);
  const openCart = useCallback(() => push({ kind: "cart" }), [push]);
  const openSettings = useCallback((sectionId?: string) => push({ kind: "settings", sectionId }), [push]);
  const openVerification = useCallback(() => push({ kind: "verification" }), [push]);
  /* Result review is a clinic-wide entry (reachable from any booking), so set the
     active patient to the BOOKING's patient before pushing — otherwise the summary
     and the committed change-set would read/write whoever was last active. */
  const openResultReview = useCallback(
    (code: string, patientId: string) => {
      setActivePatientId(patientId);
      push({ kind: "result-review", code, patientId });
    },
    [push],
  );

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo<MobileAppApi>(
    () => ({
      section,
      go,
      view,
      pushPatient,
      openChartResult,
      pushBooking,
      openComposer,
      openCart,
      openSettings,
      openVerification,
      openResultReview,
      back,
      resetTo,
      searchOpen,
      openSearch,
      closeSearch,
      activePatientId,
    }),
    [
      section,
      go,
      view,
      pushPatient,
      openChartResult,
      pushBooking,
      openComposer,
      openCart,
      openSettings,
      openVerification,
      openResultReview,
      back,
      resetTo,
      searchOpen,
      openSearch,
      closeSearch,
      activePatientId,
    ],
  );

  return <MobileAppContext.Provider value={value}>{children}</MobileAppContext.Provider>;
}

export function useMobileApp(): MobileAppApi {
  const api = useContext(MobileAppContext);
  if (!api) throw new Error("useMobileApp must be used inside <MobileAppProvider>");
  return api;
}
