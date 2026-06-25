"use client";

/* The mobile app shell + router. Everything else lives in foundation state
   (MobileAppContext / EncounterContext / Sheet), the shared OrderDraft / Kyd
   providers, and the per-screen components under ./screens. This file is ONLY:
   providers → shell chrome (top bar, sync strip, bottom nav, cart dock, sheet
   host) → a router that maps useMobileApp() section + view stack to a screen. */

import type { ComponentType } from "react";
import { toast } from "sonner";
import { KuraLogomark } from "@/icons/brand/KuraLogomark";
import {
  ArrowLeft,
  Booking,
  Catalog,
  Home,
  More,
  Patient,
  Refresh,
  Search,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import { cx } from "@/lib/cx";

import { OrderDraftProvider } from "@/components/OrderDraft/OrderDraftContext";
import { ACTIVE_PATIENT_ID } from "@/components/OrderDraft/OrderDraftContext";

import { MobileAppProvider, useMobileApp } from "./state/MobileAppContext";
import type { MobileSection, MobileView } from "./state/MobileAppContext";
import { EncounterProvider } from "./state/EncounterContext";
import { KydProvider } from "./data/kyd";
import { SheetsProvider, SheetHost } from "./components/Sheet";
import { OrderCartDock } from "./components/OrderCartDock";

import { HomeScreen } from "./screens/HomeScreen";
import { SearchOverlay } from "./screens/SearchOverlay";
import { PatientsRosterScreen } from "./screens/patients/PatientsRosterScreen";
import { PatientChartScreen } from "./screens/patients/PatientChartScreen";
import { ResultReviewScreen } from "./screens/patients/ResultReviewScreen";
import { BookingsListScreen } from "./screens/bookings/BookingsListScreen";
import { BookingDetailScreen } from "./screens/bookings/BookingDetailScreen";
import { BookingComposerFlow } from "./screens/composer/BookingComposerFlow";
import { CartScreen } from "./screens/cart/CartScreen";
import { CatalogScreen } from "./screens/catalog/CatalogScreen";
import { MoreScreen } from "./screens/more/MoreScreen";
import { SettingsScreen } from "./screens/more/SettingsScreen";
import { SettingsSection } from "./screens/more/SettingsSection";
import { VerificationFlow } from "./screens/more/VerificationFlow";

import styles from "./DoctorMobileApp.module.css";

/* -------------------------------------------------------------------- props -- */

export type DoctorMobileAppProps = {
  /** which bottom-nav tab to land on */
  initialSection?: MobileSection;
  /** deep-link: open a patient chart on top of its tab */
  initialPatientId?: string;
  /** deep-link: open a booking detail on top of the bookings tab */
  initialBookingCode?: string;
  /** deep-link: an explicit pushed view (wins over the id shortcuts above) */
  initialView?: MobileView;
};

type IconComponent = ComponentType<IconProps>;

const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "patients", label: "Patients", Icon: Patient },
  { id: "bookings", label: "Bookings", Icon: Booking },
  { id: "catalog", label: "Catalog", Icon: Catalog },
  { id: "more", label: "More", Icon: More },
] satisfies Array<{ id: MobileSection; label: string; Icon: IconComponent }>;

const SECTION_TITLES: Record<MobileSection, string> = {
  home: "Home",
  patients: "Patients",
  bookings: "Bookings",
  catalog: "Catalog",
  more: "More",
};

/* The pushed view sets the contextual title; falls back to the tab title. */
function viewTitle(view: MobileView, section: MobileSection): string {
  switch (view.kind) {
    case "patient":
    case "chart-result":
      return "Patient chart";
    case "booking":
      return "Booking";
    case "composer":
      return "New booking";
    case "cart":
      return "Order draft";
    case "settings":
      return "Settings";
    case "verification":
      return "Verification";
    case "result-review":
      return "Review results";
    case "none":
    default:
      return SECTION_TITLES[section];
  }
}

/* -------------------------------------------------------- public component -- */

export function DoctorMobileApp({
  initialSection = "home",
  initialPatientId,
  initialBookingCode,
  initialView,
}: DoctorMobileAppProps = {}) {
  const resolvedView = resolveInitialView({ initialPatientId, initialBookingCode, initialView });

  return (
    <OrderDraftProvider patientId={ACTIVE_PATIENT_ID}>
      <KydProvider>
        <EncounterProvider>
          <MobileAppProvider initial={{ section: initialSection, view: resolvedView }}>
            <SheetsProvider>
              <AppShell />
              <SheetHost />
            </SheetsProvider>
          </MobileAppProvider>
        </EncounterProvider>
      </KydProvider>
    </OrderDraftProvider>
  );
}

function resolveInitialView({
  initialPatientId,
  initialBookingCode,
  initialView,
}: Pick<DoctorMobileAppProps, "initialPatientId" | "initialBookingCode" | "initialView">):
  | MobileView
  | undefined {
  if (initialView) return initialView;
  if (initialPatientId) return { kind: "patient", patientId: initialPatientId };
  if (initialBookingCode) return { kind: "booking", code: initialBookingCode };
  return undefined;
}

/* ----------------------------------------------------------------- shell ---- */

function AppShell() {
  const { section, view, go, back, openSearch } = useMobileApp();
  const canGoBack = view.kind !== "none";
  const title = viewTitle(view, section);

  return (
    <main className={styles.viewport}>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <div className={styles.brandLockup}>
            {canGoBack ? (
              <button className={styles.iconButton} type="button" aria-label="Back" onClick={back}>
                <ArrowLeft size={20} variant="stroke" aria-hidden="true" />
              </button>
            ) : (
              <span className={styles.logoBadge} aria-hidden="true">
                <KuraLogomark width={24} height={20} />
              </span>
            )}
            <div>
              <p className={styles.eyebrow}>Mekong Clinic · AM session</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} type="button" aria-label="Open search" onClick={openSearch}>
              <Search size={20} variant="stroke" aria-hidden="true" />
            </button>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Refresh"
              onClick={() => toast.success("Synced just now")}
            >
              <Refresh size={20} variant="stroke" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.syncStrip}>
          <span className={styles.liveDot} aria-hidden="true" />
          Synced 2 min ago · cached clinical tasks available offline
        </div>

        <div className={styles.content}>
          <Router />
        </div>

        <OrderCartDock />

        <nav className={styles.bottomNav} aria-label="Doctor mobile navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={cx(styles.navItem, section === id && styles.navItemActive)}
              type="button"
              aria-pressed={section === id}
              onClick={() => go(id)}
            >
              <Icon size={22} variant={section === id ? "solid" : "stroke"} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <SearchOverlay />
    </main>
  );
}

/* ---------------------------------------------------------------- router ---- */

function Router() {
  const { section, view } = useMobileApp();

  /* A pushed view wins over the bare tab screen. */
  switch (view.kind) {
    case "patient":
      return <PatientChartScreen patientId={view.patientId} />;
    case "chart-result":
      return <PatientChartScreen patientId={view.patientId} />;
    case "booking":
      return <BookingDetailScreen code={view.code} />;
    case "composer":
      return <BookingComposerFlow />;
    case "cart":
      return <CartScreen />;
    case "settings":
      return view.sectionId ? <SettingsSection sectionId={view.sectionId} /> : <SettingsScreen />;
    case "verification":
      return <VerificationFlow />;
    case "result-review":
      return <ResultReviewScreen code={view.code} patientId={view.patientId} />;
    case "none":
    default:
      return <TabScreen section={section} />;
  }
}

function TabScreen({ section }: { section: MobileSection }) {
  switch (section) {
    case "home":
      return <HomeScreen />;
    case "patients":
      return <PatientsRosterScreen />;
    case "bookings":
      return <BookingsListScreen />;
    case "catalog":
      return <CatalogScreen />;
    case "more":
      return <MoreScreen />;
    default:
      return <HomeScreen />;
  }
}

export default DoctorMobileApp;
