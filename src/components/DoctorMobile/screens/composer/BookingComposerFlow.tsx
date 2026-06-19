"use client";

/* BookingComposerFlow — the full-screen new-booking wizard opened by
   openComposer(). Phone -> Patient -> Tests -> Payment -> Confirm -> Placed.
   The identity steps (Phone + Patient) are delegated to IdentityGate, which
   resolves a BookingPatient + DoctorIdentityDecision. Once an identity is
   resolved the flow advances to test selection, payment, a confirm review with
   the cash gate, then originateDoctorBooking. The sticky footer drives
   Back / Continue / Place; gestural back (useMobileApp().back) closes the flow
   or steps back one stage. */

import { useMemo, useState } from "react";
import { ArrowLeft, Booking, CheckCircle, Patient, Plus } from "@/icons";
import { cx } from "@/lib/cx";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useOrderDraft } from "@/components/OrderDraft";
import { getBookingTestSummary, getRouteLabel } from "@/components/OrderDraft/bookingShared";
import type { BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import type {
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  PlacedOrderSummary,
  PscPayChoice,
} from "@/components/OrderDraft/types";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { Pill, StickyCtaDock } from "@/components/DoctorMobile/components/primitives";
import { IdentityGate, type ResolvedIdentity } from "./IdentityGate";
import { ConfirmStep, PaymentStep, priceSet, TestsStep } from "./composerSteps";
import styles from "./composer.module.css";

type Step = "identity" | "tests" | "payment" | "confirm" | "placed";

const STEP_RAIL: Array<{ id: Step; label: string }> = [
  { id: "identity", label: "Patient" },
  { id: "tests", label: "Tests" },
  { id: "payment", label: "Pay" },
  { id: "confirm", label: "Confirm" },
];

export function BookingComposerFlow() {
  const { back, pushBooking, pushPatient, go } = useMobileApp();
  const { originateDoctorBooking } = useOrderDraft();

  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");
  const [cashReceived, setCashReceived] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrderSummary | null>(null);

  const reachedIndex = STEP_RAIL.findIndex((s) => s.id === step);
  const safeReachedIndex = reachedIndex === -1 ? STEP_RAIL.length : reachedIndex;

  function toggleTest(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleResolved(resolved: ResolvedIdentity) {
    setIdentity(resolved);
    setStep("tests");
  }

  /* step back one stage; from the first stage, gestural/Back closes the flow. */
  function stepBack() {
    switch (step) {
      case "tests":
        setStep("identity");
        break;
      case "payment":
        setStep("tests");
        break;
      case "confirm":
        setStep("payment");
        break;
      default:
        back();
    }
  }

  function place() {
    if (!identity || selectedIds.size === 0) return;
    if (pscPay === "cash" && !cashReceived) return;
    const summary = originateDoctorBooking({
      patientId: identity.patientId,
      patient: identity.patient,
      itemIds: [...selectedIds],
      pscPay,
      patientAssurance: identity.assurance as DoctorPatientAssurance,
      identityDecision: identity.decision as DoctorIdentityDecision,
    });
    if (summary) {
      setPlaced(summary);
      setStep("placed");
    }
  }

  function restart() {
    setStep("identity");
    setIdentity(null);
    setSelectedIds(new Set());
    setPscPay("later");
    setCashReceived(false);
    setPlaced(null);
  }

  const { known, unpricedCount } = priceSet(selectedIds);

  return (
    <div className={base.sectionStack}>
      <ComposerHeader
        step={step}
        onClose={() => back()}
      />

      {step !== "placed" && (
        <StepRail reachedIndex={safeReachedIndex} current={step} />
      )}

      {step === "identity" && (
        <IdentityGate
          onResolved={handleResolved}
          renderActions={(actions) => (
            <StickyCtaDock>
              {actions.onSecondary ? (
                <button className={base.secondaryButton} type="button" onClick={actions.onSecondary}>
                  {actions.secondaryLabel}
                </button>
              ) : (
                <button className={base.secondaryButton} type="button" onClick={() => back()}>
                  Cancel
                </button>
              )}
              {!actions.hidePrimary && (
                <button
                  className={base.primaryButton}
                  type="button"
                  disabled={actions.primaryDisabled}
                  onClick={actions.onPrimary}
                >
                  {actions.primaryLabel}
                </button>
              )}
            </StickyCtaDock>
          )}
        />
      )}

      {step === "tests" && identity && (
        <>
          <IdentityRecap identity={identity} />
          <TestsStep selectedIds={selectedIds} onToggle={toggleTest} />
          <StickyCtaDock>
            <button className={base.secondaryButton} type="button" onClick={stepBack}>
              Back
            </button>
            <button
              className={base.primaryButton}
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setStep("payment")}
            >
              Continue · {selectedIds.size} test{selectedIds.size === 1 ? "" : "s"}
            </button>
          </StickyCtaDock>
        </>
      )}

      {step === "payment" && identity && (
        <>
          <PaymentStep
            selectedIds={selectedIds}
            pscPay={pscPay}
            onChange={(choice) => {
              setPscPay(choice);
              if (choice !== "cash") setCashReceived(false);
            }}
          />
          <StickyCtaDock>
            <button className={base.secondaryButton} type="button" onClick={stepBack}>
              Back
            </button>
            <button className={base.primaryButton} type="button" onClick={() => setStep("confirm")}>
              Review
            </button>
          </StickyCtaDock>
        </>
      )}

      {step === "confirm" && identity && (
        <>
          <ConfirmStep
            patient={identity.patient}
            selectedIds={selectedIds}
            pscPay={pscPay}
            cashReceived={cashReceived}
            onToggleCash={() => setCashReceived((v) => !v)}
          />
          <StickyCtaDock>
            <button className={base.secondaryButton} type="button" onClick={stepBack}>
              Back
            </button>
            <button
              className={base.primaryButton}
              type="button"
              disabled={selectedIds.size === 0 || (pscPay === "cash" && !cashReceived)}
              onClick={place}
            >
              Place booking · {unpricedCount > 0 ? `$${known.toFixed(2)}+` : `$${known.toFixed(2)}`}
            </button>
          </StickyCtaDock>
        </>
      )}

      {step === "placed" && placed && identity && (
        <PlacedView
          summary={placed}
          patient={identity.patient}
          patientId={identity.patientId}
          onOpenBooking={() => pushBooking(placed.bookingCode ?? placed.code)}
          onOpenChart={() => pushPatient(identity.patientId)}
          onNew={restart}
          onBookings={() => go("bookings")}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- header --- */

function ComposerHeader({ step, onClose }: { step: Step; onClose: () => void }) {
  const title = step === "placed" ? "Booking placed" : "New booking";
  return (
    <div className={base.composerStepHead} style={{ alignItems: "center" }}>
      <button className={base.iconButton} type="button" onClick={onClose} aria-label="Close">
        <ArrowLeft size={18} variant="stroke" aria-hidden="true" />
      </button>
      <h1 className={styles.headerTitle}>{title}</h1>
      <span className={styles.headerSpacer} aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------- step rail --- */

function StepRail({ reachedIndex, current }: { reachedIndex: number; current: Step }) {
  return (
    <div className={base.filterChips} role="group" aria-label="Booking steps">
      {STEP_RAIL.map((s, index) => {
        const done = index < reachedIndex;
        const active = s.id === current;
        return (
          <span
            key={s.id}
            className={cx(base.filterChip, active && base.filterChipActive, done && styles.stepDone)}
            aria-current={active ? "step" : undefined}
          >
            {index + 1}. {s.label}
          </span>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- identity recap -- */

function IdentityRecap({ identity }: { identity: ResolvedIdentity }) {
  const provisional = identity.assurance === "provisional";
  return (
    <div className={base.patientBar}>
      <h2>{identity.patient.name}</h2>
      <div className={base.patientTags}>
        <span>{identity.patient.phone ?? identity.patient.phoneMasked}</span>
        {provisional ? <Pill tone="warning">Provisional</Pill> : <Pill tone="success">Confirmed</Pill>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- placed view --- */

function PlacedView({
  summary,
  patient,
  onOpenBooking,
  onOpenChart,
  onNew,
  onBookings,
}: {
  summary: PlacedOrderSummary;
  patient: BookingPatient;
  patientId: string;
  onOpenBooking: () => void;
  onOpenChart: () => void;
  onNew: () => void;
  onBookings: () => void;
}) {
  const testSummary = useMemo(() => getBookingTestSummary(summary, 3), [summary]);
  const routeLabel = useMemo(() => getRouteLabel(summary), [summary]);
  return (
    <div className={base.sectionStack}>
      <div className={base.successPanel}>
        <CheckCircle size={32} variant="solid" aria-hidden="true" />
        <h2>Booking placed for {patient.name}</h2>
        <p>Internal reception will confirm the draw at the PSC.</p>
        <div className={base.bookingCode}>{summary.bookingCode ?? summary.code}</div>
      </div>

      <div className={base.reviewBlock}>
        <div className={base.reviewRow}>
          <span>Tests</span>
          <strong>{testSummary}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Collection</span>
          <strong>{routeLabel}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Payment</span>
          <strong>{summary.payment.label}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Total</span>
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>
            ${summary.total.toFixed(2)}
            {summary.unpricedCount > 0 ? ` · +${summary.unpricedCount} at PSC` : ""}
          </strong>
        </div>
      </div>

      <div className={base.cardGroup}>
        <button className={base.primaryButton} type="button" onClick={onOpenBooking}>
          <Booking size={16} variant="stroke" aria-hidden="true" /> Open booking
        </button>
        <button className={base.secondaryButton} type="button" onClick={onOpenChart}>
          <Patient size={16} variant="stroke" aria-hidden="true" /> Open chart
        </button>
        <button className={base.secondaryButton} type="button" onClick={onNew}>
          <Plus size={16} variant="stroke" aria-hidden="true" /> New booking
        </button>
        <button className={base.textButton} type="button" onClick={onBookings}>
          Back to bookings
        </button>
      </div>
    </div>
  );
}

export default BookingComposerFlow;
