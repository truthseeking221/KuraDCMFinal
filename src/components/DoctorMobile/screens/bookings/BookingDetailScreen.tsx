"use client";

/* Booking detail — the read view for one of the doctor's bookings. Header with
   lifecycle pill + identity + jump to chart / results, the tests as stacked
   cards, a flagged safety card, the 5-node status timeline, summary facts,
   payment, the lock-policy-gated "What you can do", and patient instructions.
   Every write routes through the shared order-draft api via the action sheets. */

import { useMemo } from "react";
import { cx } from "@/lib/cx";
import {
  Booking as BookingIcon,
  Check as CheckIcon,
  ChevronRight as ChevronRightIcon,
  Flask as FlaskIcon,
  Patient as PatientIcon,
  Setting as SettingIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import {
  bookingCancelLocked,
  bookingEditsLocked,
  formatMoney,
  useOrderDraft,
} from "@/components/OrderDraft";
import type { BookingListItem } from "@/components/OrderDraft/types";
import {
  bookingStatusView,
  getBookingAnchor,
  getBookingNextStepCard,
  getCollectionPlan,
  getDoctorAction,
  getLockReason,
  getPaymentSummary,
  getRouteLabel,
} from "@/components/OrderDraft/bookingShared";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useSheets } from "@/components/DoctorMobile/components/Sheet";
import { Money, Pill, SectionHeader } from "@/components/DoctorMobile/components/primitives";
import type { Tone } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./BookingDetail.module.css";
import {
  BookingActionSheet,
  BookingCancelSheet,
  BookingEditSheet,
  BookingResendSheet,
} from "./BookingSheets";

/* The 5 fixed lifecycle nodes the timeline always renders, with the index that
   maps a booking's current state onto the track. */
const TIMELINE_NODES = ["Booked", "Patient notified", "Sample collected", "At lab", "Results back"] as const;

function currentNodeIndex(order: BookingListItem): number {
  if (order.cancelled) return 1;
  switch (order.bookingStatus) {
    case "scheduled":
      return 1;
    case "in-progress":
      return 3;
    case "results-back":
      return 4;
  }
}

export function BookingDetailScreen({ code }: { code: string }) {
  const { allBookings } = useOrderDraft();
  const { back, pushPatient, openResultReview } = useMobileApp();
  const sheets = useSheets();

  const order = useMemo(
    () => allBookings.find((booking) => booking.code === code || booking.bookingCode === code),
    [allBookings, code],
  );

  if (!order) {
    return (
      <div className={base.sectionStack}>
        <div className={cx(base.banner, base.tone_neutral)}>
          <WarningIcon size={16} variant="stroke" aria-hidden="true" />
          <span>This booking is no longer available.</span>
        </div>
        <button type="button" className={base.secondaryButton} onClick={back}>
          Back to bookings
        </button>
      </div>
    );
  }

  const status = bookingStatusView(order);
  const action = getDoctorAction(order);
  const plan = getCollectionPlan(order);
  const nextStep = getBookingNextStepCard(order);
  const editsLocked = bookingEditsLocked(order);
  const cancelLocked = bookingCancelLocked(order);
  const lockReason = getLockReason(order);
  const resultsBack = order.bookingStatus === "results-back" && !order.cancelled;
  const currentIndex = currentNodeIndex(order);
  const code_ = order.bookingCode ?? order.code;

  const openActions = () => {
    sheets.open((close) => (
      <BookingActionSheet
        order={order}
        close={close}
        openEdit={() => {
          close();
          sheets.open((closeEdit) => <BookingEditSheet order={order} close={closeEdit} />);
        }}
        openCancel={() => {
          close();
          sheets.open((closeCancel) => <BookingCancelSheet order={order} close={closeCancel} />);
        }}
        openResend={() => {
          close();
          sheets.open((closeResend) => <BookingResendSheet order={order} close={closeResend} />);
        }}
      />
    ));
  };

  return (
    <div className={base.sectionStack}>
      {/* header */}
      <div className={base.sectionStack}>
        <div className={base.bookingTop}>
          <SectionHeader title={order.patientName} />
          <Pill tone={status.tone as Tone}>
            <status.Icon size={12} variant="stroke" aria-hidden="true" />
            {status.label}
          </Pill>
        </div>
        <p className={base.muted}>
          {code_} · MRN {order.mrn} · {order.phoneMasked}
        </p>
        <div className={styles.headerLinks}>
          {resultsBack ? (
            <button
              type="button"
              className={base.primaryButton}
              onClick={() => openResultReview(order.code)}
            >
              <FlaskIcon size={14} variant="stroke" aria-hidden="true" />
              Review results
            </button>
          ) : (
            <button type="button" className={base.primaryButton} onClick={() => pushPatient(order.patientId)}>
              <PatientIcon size={14} variant="stroke" aria-hidden="true" /> Open chart
            </button>
          )}
        </div>
      </div>

      {/* flagged safety card */}
      {order.flagged && !order.cancelled && (
        <div className={cx(base.safetyStrip, base.tone_danger)}>
          <WarningIcon size={16} variant="stroke" aria-hidden="true" />
          <div>
            <strong>Abnormal results need review</strong>
            <span>Flagged values must be reviewed before this report is sent.</span>
          </div>
        </div>
      )}

      {/* tests */}
      <div>
        <SectionHeader title="Tests" meta={`${order.lines.length} ordered`} />
        <div className={base.cardGroup}>
          {order.lines.map((line) => (
            <div key={line.lineId} className={cx(base.testRow, styles.testCard)}>
              <span className={base.taskBody}>
                <span className={base.taskPatient}>{line.displayName}</span>
                <span className={base.taskMeta}>
                  {resultsBack ? "Result ready" : status.label}
                </span>
              </span>
              <Money usd={line.price} />
            </div>
          ))}
        </div>
      </div>

      {/* status timeline */}
      <div>
        <SectionHeader title="Progress" meta={nextStep.title} />
        <ol className={base.track}>
          {TIMELINE_NODES.map((node, index) => {
            const done = !order.cancelled && index < currentIndex;
            const current = !order.cancelled && index === currentIndex;
            return (
              <li
                key={node}
                className={cx(base.trackStep, done && base.trackDone, current && base.trackCurrent)}
              >
                <span className={base.trackNode}>
                  {done ? <CheckIcon size={11} variant="stroke" aria-hidden="true" /> : null}
                </span>
                <span className={base.trackBody}>
                  <strong>{node}</strong>
                  {current && <small>{nextStep.body}</small>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* summary facts */}
      <div>
        <SectionHeader title="Booking" />
        <div className={base.reviewBlock}>
          <div className={base.reviewRow}>
            <span>Route</span>
            <strong>{getRouteLabel(order)}</strong>
          </div>
          <div className={base.reviewRow}>
            <span>Collection</span>
            <strong>{plan.detail ? `${plan.label} · ${plan.detail}` : plan.label}</strong>
          </div>
          <div className={base.reviewRow}>
            <span>Total</span>
            <strong>{formatMoney(order.total)}</strong>
          </div>
          {order.unpricedCount > 0 && (
            <div className={base.reviewRow}>
              <span>Unpriced</span>
              <strong>
                {order.unpricedCount} priced at the desk
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* payment */}
      <div>
        <SectionHeader title="Payment" />
        <div className={base.cardGroup}>
          <div className={base.payRow}>
            <span>{order.payment.label}</span>
            <strong className={cx(action.tone === "danger" && base.text_danger)}>
              {getPaymentSummary(order)}
            </strong>
          </div>
        </div>
      </div>

      {/* what you can do */}
      <div>
        <SectionHeader title="What you can do" />
        <div className={base.cardGroup}>
          {!editsLocked && (
            <p className={styles.canDoRow}>You can still add or remove tests before collection.</p>
          )}
          {!order.cancelled && !cancelLocked && (
            <p className={styles.canDoRow}>You can cancel this booking until the sample reaches the lab.</p>
          )}
          {lockReason && <p className={cx(styles.canDoRow, base.muted)}>{lockReason}</p>}
          {order.cancelled && (
            <p className={styles.canDoRow}>This booking is cancelled. You can restore it or order again.</p>
          )}
        </div>
      </div>

      {/* patient instructions */}
      {!order.cancelled && (
        <div className={cx(base.banner, base.tone_info)}>
          <BookingIcon size={16} variant="stroke" aria-hidden="true" />
          <span>
            {order.route === "psc"
              ? `Patient shows ${getBookingAnchor(order)} at the PSC. We reminded them by Telegram and SMS.`
              : `Use ${getBookingAnchor(order)} when handing the sample to the lab.`}
          </span>
        </div>
      )}

      {/* actions */}
      <button type="button" className={cx(base.desktopLink, styles.actionsTrigger)} onClick={openActions}>
        <span className={styles.actionsLabel}>
          <SettingIcon size={16} variant="stroke" aria-hidden="true" /> Manage booking
        </span>
        <ChevronRightIcon size={16} variant="stroke" aria-hidden="true" />
      </button>
    </div>
  );
}
