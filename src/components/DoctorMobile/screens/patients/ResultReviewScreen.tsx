"use client";

/* Result review — a pushed view opened from a booking (openResultReview(code))
   or a chart result. Resolves the booking from the shared cross-patient queue,
   surfaces the flagged result (test · value · reference), its full trend
   (LabKeyTrendChart), and a reflex / clinical context callout. A sticky
   "Confirm & send" logs an encounter entry and pops the view. */

import { useMemo } from "react";
import { useOrderDraft } from "@/components/OrderDraft";
import { mapLabKeyToItemId } from "@/components/OrderDraft/labMapping";
import type { BookingListItem } from "@/components/OrderDraft/types";
import { getBookingTestSummary, getRouteLabel } from "@/components/OrderDraft/bookingShared";
import { LabKeyTrendChart, getLabHistoryPreview } from "@/components/ui/LabHistory";
import type { LabPreviewEntry } from "@/components/ui/LabHistory";
import { cx } from "@/lib/cx";
import { ArrowLeft, CheckCircle, Flask, Info, Share, Warning } from "@/icons/components";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import { Pill, SectionHeader, StickyCtaDock, toneTextClass } from "@/components/DoctorMobile/components/primitives";
import type { Tone } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { toast } from "sonner";

/* The result the doctor reviews: a flagged lab line lifted from the booking,
   joined to the patient's lab history preview for value/reference/trend. */
type ReviewResult = {
  labKey: string;
  labName: string;
  preview: LabPreviewEntry | null;
};

const STATUS_TONE: Record<LabPreviewEntry["status"], Tone> = {
  critical: "danger",
  abnormal: "danger",
  watch: "warning",
  normal: "success",
};

const STATUS_LABEL: Record<LabPreviewEntry["status"], string> = {
  critical: "Critical",
  abnormal: "Abnormal",
  watch: "Watch",
  normal: "In range",
};

/* Build the reviewable results for a booking: every line that maps to a lab
   key, joined to its preview entry. Falls back to the patient's flagged
   previews when the booking has no mappable lines (reorder etc.). */
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

  /* Prefer rows that have a real trend/preview; if none, fall back to the
     patient's flagged previews so the screen is never empty. */
  const withPreview = fromLines.filter((result) => result.preview !== null);
  if (withPreview.length > 0) return withPreview;

  const flagged = previews.filter((entry) => entry.status !== "normal");
  if (flagged.length > 0) {
    return flagged.map((entry) => ({ labKey: entry.key, labName: entry.detail.labName, preview: entry }));
  }
  return fromLines.length > 0 ? fromLines : previews.map((entry) => ({ labKey: entry.key, labName: entry.detail.labName, preview: entry }));
}

function ResultCard({ result }: { result: ReviewResult }) {
  const preview = result.preview;
  const status = preview?.status ?? "watch";
  const tone = STATUS_TONE[status];
  const value = preview?.latestValue ?? "—";
  const unit = preview?.latestUnit ?? "";
  const reference = preview?.reference ?? "no reference";
  const lastResult = preview?.lastResult ?? "—";

  return (
    <section className={base.sectionStack}>
      <div className={base.resultHeader}>
        <div>
          <SectionHeader title={result.labName} />
          <p className={base.muted}>
            {reference} · last {lastResult}
          </p>
        </div>
        <Pill tone={tone}>
          {status === "normal" ? (
            <CheckCircle size={12} variant="stroke" aria-hidden="true" />
          ) : (
            <Warning size={12} variant="stroke" aria-hidden="true" />
          )}
          {STATUS_LABEL[status]}
        </Pill>
      </div>

      {/* flagged value, oversized + tabular */}
      <div className={base.resultDetail}>
        <div className={base.resultPanel} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
          <span className={base.taskBody}>
            <span className={base.taskPatient}>Latest result</span>
            {preview?.detail.reasonText ? (
              <span className={cx(base.taskReason, toneTextClass(tone))}>{preview.detail.reasonText}</span>
            ) : null}
          </span>
          <strong className={cx(toneTextClass(tone))} style={{ fontVariantNumeric: "tabular-nums", fontSize: 20 }}>
            {value}
            {unit ? <small style={{ fontSize: 12, marginLeft: 4 }}>{unit}</small> : null}
          </strong>
        </div>
      </div>

      {/* full trend chart, when the patient has a series for this key */}
      {result.labKey ? (
        <div className={base.cardGroup} style={{ padding: "var(--space-3) 0" }}>
          <LabKeyTrendChart labKey={result.labKey} />
        </div>
      ) : null}

      {/* reflex / clinical context */}
      {preview?.detail.evidence ? (
        <div className={cx(base.banner, base.tone_info)}>
          <Info size={16} variant="stroke" aria-hidden="true" />
          <span>{preview.detail.evidence}</span>
        </div>
      ) : null}
      {preview?.detail.clinicalNote ? (
        <div className={cx(base.reflexCard)}>
          <Flask size={16} variant="stroke" aria-hidden="true" />
          <span>{preview.detail.clinicalNote}</span>
        </div>
      ) : null}
    </section>
  );
}

export function ResultReviewScreen({ code }: { code: string }) {
  const { allBookings } = useOrderDraft();
  const { back, pushPatient } = useMobileApp();
  const { logEntry } = useEncounter();

  const order = useMemo(
    () => allBookings.find((booking) => booking.code === code || booking.bookingCode === code),
    [allBookings, code],
  );

  const previews = useMemo(() => getLabHistoryPreview(), []);
  const results = useMemo(() => (order ? resolveResults(order, previews) : []), [order, previews]);

  if (!order) {
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
  const flaggedCount = results.filter((result) => result.preview && result.preview.status !== "normal").length;
  const headerTone: Tone = flaggedCount > 0 ? "danger" : "success";

  const confirmAndSend = () => {
    const summary = results.map((result) => result.labName).join(" · ") || getBookingTestSummary(order);
    logEntry(
      "note",
      `Reviewed results — ${order.patientName}`,
      `${anchor} · ${summary} · sent to patient via Telegram`,
    );
    toast.success("Results confirmed and sent", {
      description: `${order.patientName} notified on Telegram`,
    });
    back();
  };

  return (
    <div className={base.sectionStack}>
      {/* header */}
      <div className={base.sectionStack}>
        <div className={base.bookingTop}>
          <SectionHeader title="Review results" />
          <Pill tone={headerTone}>
            {flaggedCount > 0 ? (
              <>
                <Warning size={12} variant="stroke" aria-hidden="true" />
                {flaggedCount} flagged
              </>
            ) : (
              <>
                <CheckCircle size={12} variant="stroke" aria-hidden="true" />
                All in range
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

      {/* one card per reviewable result */}
      {results.map((result, index) => (
        <ResultCard key={`${result.labKey || result.labName}-${index}`} result={result} />
      ))}

      {results.length === 0 ? (
        <div className={cx(base.banner, base.tone_neutral)}>
          <Info size={16} variant="stroke" aria-hidden="true" />
          <span>No structured results to review for this booking yet.</span>
        </div>
      ) : null}

      <StickyCtaDock>
        <button type="button" className={base.primaryButton} style={{ width: "100%" }} onClick={confirmAndSend}>
          <Share size={16} variant="stroke" aria-hidden="true" />
          Confirm &amp; send to patient
        </button>
      </StickyCtaDock>
    </div>
  );
}

export default ResultReviewScreen;
