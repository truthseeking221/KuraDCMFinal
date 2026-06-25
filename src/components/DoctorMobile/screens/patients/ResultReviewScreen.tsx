"use client";

/* Result review — a pushed view opened from a booking (openResultReview(code))
   or a chart result. It surfaces the result-review shape (What changed · Why it
   matters · Relevant current treatment) from the SHARED domain helper
   (resultReviewSummary), and offers ONE "Review and update plan" CTA that opens a
   mobile plan-review sheet seeded via deriveResultReviewChangeSet. The doctor
   signs ONCE → commitPlanChangeSet (via useEncounter().applyResultReview) → the
   booking result loop closes (markResultReviewed + closeResultLoop). No second
   trip to Care Plan to "record review". */

import { useMemo } from "react";
import { useOrderDraft } from "@/components/OrderDraft";
import { mapLabKeyToItemId } from "@/components/OrderDraft/labMapping";
import type { BookingListItem } from "@/components/OrderDraft/types";
import { getRouteLabel } from "@/components/OrderDraft/bookingShared";
import { LabKeyTrendChart, getLabHistoryPreview } from "@/components/ui/LabHistory";
import type { LabPreviewEntry } from "@/components/ui/LabHistory";
import { cx } from "@/lib/cx";
import { ArrowLeft, CheckCircle, Heart, Note, Pill as PillIcon, Warning } from "@/icons/components";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import { useSheets } from "@/components/DoctorMobile/components/Sheet";
import { ResultPlanReviewSheet } from "@/components/DoctorMobile/screens/patients/encounterSheets";
import { Pill, SectionHeader, StickyCtaDock, toneTextClass } from "@/components/DoctorMobile/components/primitives";
import type { Tone } from "@/components/DoctorMobile/components/primitives";
import {
  resultReviewSummary,
  useCarePlans,
  useMedications,
  livingPlanOf,
} from "@/features/care-plan/domain";
import type { ResultAnalyte, ResultReviewInput, ResultReviewSummary, ResultSeverity } from "@/features/care-plan/domain";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { toast } from "sonner";

/* A flagged lab line lifted from the booking, joined to the patient's lab history
   preview for value/reference/trend. */
type ReviewResult = {
  labKey: string;
  labName: string;
  preview: LabPreviewEntry | null;
};

const STATUS_FLAG: Record<LabPreviewEntry["status"], ResultAnalyte["flag"]> = {
  critical: "critical",
  abnormal: "high",
  watch: "high",
  normal: "normal",
};

const SEVERITY_RANK: Record<ResultSeverity, number> = { normal: 0, abnormal: 1, critical: 2 };

/* Build the reviewable results for a booking: every line that maps to a lab key,
   joined to its preview entry. Falls back to the patient's flagged previews when
   the booking has no mappable lines (reorder etc.). */
function resolveResults(order: BookingListItem, previews: LabPreviewEntry[]): ReviewResult[] {
  const byItemId = new Map<string, LabPreviewEntry>();
  previews.forEach((entry) => {
    const itemId = mapLabKeyToItemId(entry.key);
    if (itemId) byItemId.set(itemId, entry);
  });

  const fromLines: ReviewResult[] = [];
  const seen = new Set<string>();
  order.lines.forEach((line) => {
    const ref = line.labRefs[0];
    const labKey = ref?.labKey ?? null;
    const preview = labKey
      ? previews.find((entry) => entry.key === labKey) ?? null
      : line.itemId
        ? byItemId.get(line.itemId) ?? null
        : null;
    const key = preview?.key ?? labKey ?? line.lineId;
    if (seen.has(key)) return;
    seen.add(key);
    fromLines.push({
      labKey: preview?.key ?? labKey ?? "",
      labName: preview?.detail.labName ?? ref?.labName ?? line.displayName,
      preview,
    });
  });

  const withPreview = fromLines.filter((result) => result.preview !== null);
  if (withPreview.length > 0) return withPreview;

  const flagged = previews.filter((entry) => entry.status !== "normal");
  if (flagged.length > 0) {
    return flagged.map((entry) => ({ labKey: entry.key, labName: entry.detail.labName, preview: entry }));
  }
  return fromLines.length > 0 ? fromLines : previews.map((entry) => ({ labKey: entry.key, labName: entry.detail.labName, preview: entry }));
}

/* Map a reviewable result to a shared-domain analyte (trendKey is the SAME key
   goals/monitoring use, so the seed can match the goal it serves). */
function toAnalyte(result: ReviewResult): ResultAnalyte {
  const preview = result.preview;
  const status = preview?.status ?? "watch";
  return {
    trendKey: result.labKey || undefined,
    label: result.labName,
    value: preview?.latestValue ?? undefined,
    unit: preview?.latestUnit || undefined,
    flag: STATUS_FLAG[status],
  };
}

/* The booking-derived result the review reads against. Severity is the worst lab
   status on the booking; the headline (most severe) analyte names the panel. */
function toResultInput(order: BookingListItem, results: ReviewResult[]): ResultReviewInput {
  const analytes = results.map(toAnalyte);
  const ranked = [...results].sort(
    (a, b) => statusSeverity(b.preview?.status) - statusSeverity(a.preview?.status),
  );
  const headline = ranked[0];
  const severity: ResultSeverity = analytes.reduce<ResultSeverity>((worst, _, i) => {
    const s = analyteSeverity(results[i].preview?.status);
    return SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst;
  }, "normal");
  return {
    code: order.bookingCode ?? order.code,
    label: headline?.labName,
    severity,
    analytes,
  };
}

function statusSeverity(status: LabPreviewEntry["status"] | undefined): number {
  return SEVERITY_RANK[analyteSeverity(status)];
}

function analyteSeverity(status: LabPreviewEntry["status"] | undefined): ResultSeverity {
  if (status === "critical") return "critical";
  if (status === "abnormal" || status === "watch") return "abnormal";
  return "normal";
}

/* What changed · Why it matters · Current treatment — the review surface
   shape, all from the shared summary. No success card; one tone-carried "why". */
function ReviewSummaryCard({ summary }: { summary: ResultReviewSummary }) {
  const treatment = summary.relevantTreatment;
  const hasTreatment =
    treatment.medications.length > 0 || !!treatment.goalLabel || treatment.openInterventions.length > 0;

  return (
    <section className={base.sectionStack}>
      <div className={base.sectionStack} style={{ gap: "var(--space-1)" }}>
        <span className={base.eyebrow}>What changed</span>
        <p className={base.taskPatient}>{summary.whatChanged}</p>
      </div>

      <div className={base.sectionStack} style={{ gap: "var(--space-1)" }}>
        <span className={base.eyebrow}>Why it matters</span>
        <p className={cx(base.taskPatient, toneTextClass(summary.whyTone))}>{summary.whyItMatters}</p>
      </div>

      {hasTreatment ? (
        <div className={base.sectionStack} style={{ gap: "var(--space-2)" }}>
          <span className={base.eyebrow}>Current treatment</span>
          {treatment.goalLabel ? (
            <div className={base.testRow} style={{ gridTemplateColumns: "32px minmax(0,1fr) auto" }}>
              <span className={cx(base.taskIcon)}>
                <Heart size={16} variant="stroke" aria-hidden="true" />
              </span>
              <span className={base.taskBody}>
                <span className={base.taskPatient}>{treatment.goalLabel}</span>
                {treatment.goalTarget ? (
                  <span className={base.taskReason}>Target {treatment.goalTarget}</span>
                ) : null}
              </span>
              {treatment.goalLatest ? (
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{treatment.goalLatest}</strong>
              ) : null}
            </div>
          ) : null}
          {treatment.medications.map((med) => (
            <div key={`${med.drug}-${med.dose ?? ""}`} className={base.testRow} style={{ gridTemplateColumns: "32px minmax(0,1fr) auto" }}>
              <span className={base.taskIcon}>
                <PillIcon size={16} variant="stroke" aria-hidden="true" />
              </span>
              <span className={base.taskBody}>
                <span className={base.taskPatient}>
                  {med.drug}
                  {med.dose ? ` ${med.dose}` : ""}
                </span>
                {med.frequency ? <span className={base.taskReason}>{med.frequency}</span> : null}
              </span>
            </div>
          ))}
          {treatment.openInterventions.length > 0 ? (
            <p className={base.muted}>Open: {treatment.openInterventions.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ResultReviewScreen({ code, patientId }: { code: string; patientId: string }) {
  const { allBookings, markResultReviewed, notifyPatient, closeResultLoop } = useOrderDraft();
  const { back, pushPatient } = useMobileApp();
  const { applyResultReview } = useEncounter();
  const { open } = useSheets();
  /* Scope the whole review to the BOOKING's patient (threaded from openResultReview),
     not whatever chart was last active — otherwise the summary and the committed
     change-set would read/write the wrong patient. */
  const { plans } = useCarePlans(patientId);
  const { meds } = useMedications(patientId);

  const order = useMemo(
    () => allBookings.find((booking) => booking.code === code || booking.bookingCode === code),
    [allBookings, code],
  );

  const previews = useMemo(() => getLabHistoryPreview(), []);
  const results = useMemo(() => (order ? resolveResults(order, previews) : []), [order, previews]);
  const resultInput = useMemo(
    () => (order ? toResultInput(order, results) : null),
    [order, results],
  );

  const living = useMemo(() => livingPlanOf(plans), [plans]);
  const summary = useMemo(
    () =>
      living && resultInput
        ? resultReviewSummary(
            living,
            undefined,
            resultInput,
            meds.map((m) => ({
              drug: m.drug,
              dose: m.dose,
              frequency: m.frequency,
              focusId: m.focusId,
              indication: m.indication,
              verification: m.verification,
            })),
          )
        : null,
    [living, resultInput, meds],
  );

  if (!order || !resultInput) {
    return (
      <div className={base.sectionStack}>
        <div className={cx(base.banner, base.tone_neutral)}>
          <Warning size={16} variant="stroke" aria-hidden="true" />
          <span>These results are no longer available.</span>
        </div>
        <button type="button" className={base.secondaryButton} onClick={back}>
          <ArrowLeft size={14} variant="stroke" aria-hidden="true" /> Back
        </button>
      </div>
    );
  }

  const anchor = order.bookingCode ?? order.code;
  const headline = results.find((result) => result.labKey === resultInput.analytes?.[0]?.trendKey) ?? results[0];
  const headerTone: Tone = resultInput.severity === "critical" ? "danger" : resultInput.severity === "abnormal" ? "warning" : "success";
  const needsChange = resultInput.severity !== "normal";

  /* Normal result: confirm + notify + close in one tap, no plan change. */
  const confirmAndClose = () => {
    markResultReviewed(anchor, resultInput.interpretation);
    notifyPatient(anchor);
    closeResultLoop(anchor);
    toast.success("Result confirmed", { description: `${order.patientName} notified` });
    back();
  };

  /* Abnormal/critical: open the seeded plan-review sheet → sign once → commit →
     close the loop on the booking. */
  const openPlanReview = () => {
    open((close) => (
      <ResultPlanReviewSheet
        close={close}
        patientId={patientId}
        result={resultInput}
        focusId={summary?.focusId}
        onSigned={() => {
          applyResultReview(patientId, resultInput, summary?.focusId);
          markResultReviewed(anchor, resultInput.interpretation);
          closeResultLoop(anchor);
          toast.success("Plan updated", { description: `${order.patientName} notified` });
          back();
        }}
      />
    ));
  };

  return (
    <div className={base.sectionStack}>
      {/* header — one status pill, no duplicated datum */}
      <div className={base.sectionStack}>
        <div className={base.bookingTop}>
          <SectionHeader title="Review results" />
          <Pill tone={headerTone}>
            {needsChange ? (
              <>
                <Warning size={12} variant="stroke" aria-hidden="true" />
                {resultInput.severity === "critical" ? "Critical" : "Off target"}
              </>
            ) : (
              <>
                <CheckCircle size={12} variant="stroke" aria-hidden="true" />
                In range
              </>
            )}
          </Pill>
        </div>
        <p className={base.muted}>
          {order.patientName} · {anchor} · {getRouteLabel(order)}
        </p>
        <button type="button" className={base.secondaryButton} onClick={() => pushPatient(order.patientId)}>
          Open chart
        </button>
      </div>

      {/* What changed · Why it matters · Current treatment */}
      {summary ? <ReviewSummaryCard summary={summary} /> : null}

      {/* trend for the headline result — clinical context, not a repeated datum */}
      {headline?.labKey ? (
        <div className={base.cardGroup} style={{ padding: "var(--space-3) 0" }}>
          <LabKeyTrendChart labKey={headline.labKey} />
        </div>
      ) : null}

      <StickyCtaDock>
        {needsChange ? (
          <button type="button" className={base.primaryButton} style={{ width: "100%" }} onClick={openPlanReview}>
            <Note size={16} variant="stroke" aria-hidden="true" />
            Update plan
          </button>
        ) : (
          <button type="button" className={base.primaryButton} style={{ width: "100%" }} onClick={confirmAndClose}>
            <CheckCircle size={16} variant="stroke" aria-hidden="true" />
            Confirm and notify patient
          </button>
        )}
      </StickyCtaDock>
    </div>
  );
}

export default ResultReviewScreen;
