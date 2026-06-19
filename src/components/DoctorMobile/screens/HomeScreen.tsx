"use client";

/* HomeScreen — the doctor's work launcher.

   Mirrors the desktop Practice Home (src/components/HomeView): a calm greeting +
   earnings awareness line, the primary "Book lab tests" action, a full-width
   directory search trigger, the "Needs attention" worklist, and "Recent
   bookings" off the shared cross-patient queue. An Explorer/verification callout
   appears only while KYD is unapproved (ordering never blocks). Borderless /
   airy / hairline — every value is a hairline ListRow, nothing is a boxed card. */

import { useMemo } from "react";
import { cx } from "@/lib/cx";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Flask,
  Search as SearchIcon,
  Warning,
} from "@/icons/components";
import { useOrderDraft } from "@/components/OrderDraft";
import {
  bookingStatusView,
  getBookingTestSummary,
} from "@/components/OrderDraft/bookingShared";
import type { BookingListItem } from "@/components/OrderDraft/types";

import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./HomeScreen.module.css";

import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useKyd } from "@/components/DoctorMobile/data/kyd";
import {
  getNeedsAttentionItems,
  type NeedsAttentionItem,
} from "@/components/DoctorMobile/data/clinical";
import {
  ListRow,
  SectionHeader,
  toneClass,
  type Tone,
} from "@/components/DoctorMobile/components/primitives";

/* Earnings awareness — calm summary, not a revenue cockpit. Demo-static so it
   stays SSR-deterministic (no Date.now / random). */
const EARNINGS = {
  today: "$18.40",
  todayDetail: "4 orders placed",
  month: "$412.60",
} as const;

const DOCTOR_NAME = "Dr. Pierre";

/* Map a doctor-read booking status tone (ui Badge tone) to the mobile Tone the
   primitives expect. The two vocabularies overlap; "primary" never occurs here. */
function statusToTone(tone: string): Tone {
  switch (tone) {
    case "danger":
    case "warning":
    case "info":
    case "success":
    case "neutral":
      return tone;
    default:
      return "neutral";
  }
}

/* Tone → leading glyph for an attention row. */
function attentionIcon(tone: Tone) {
  if (tone === "danger") return <Warning size={16} variant="stroke" aria-hidden="true" />;
  if (tone === "success") return <CheckCircle size={16} variant="stroke" aria-hidden="true" />;
  return <Bell size={16} variant="stroke" aria-hidden="true" />;
}

export function HomeScreen() {
  const {
    openComposer,
    openSearch,
    go,
    pushBooking,
    openVerification,
  } = useMobileApp();
  const { allBookings } = useOrderDraft();
  const kyd = useKyd();

  const attention = getNeedsAttentionItems();

  /* Cross-patient queue, newest first (already sorted by the draft store); show
     the most recent handful — the full list lives in Bookings. */
  const recent = useMemo<BookingListItem[]>(() => allBookings.slice(0, 5), [allBookings]);

  const verifyNeeded = kyd.uiState !== "approved";

  function followAttention(item: NeedsAttentionItem) {
    /* Deep-link by intent: the home worklist items resolve to a section view. */
    go(item.target);
  }

  return (
    <div className={base.sectionStack}>
      {/* ---- Hero: greeting + earnings + primary action ---------------------- */}
      <header className={styles.hero}>
        <div>
          <p className={base.eyebrow}>Practice home</p>
          <h1 className={styles.greeting}>Good morning, {DOCTOR_NAME}</h1>
        </div>
        <p className={styles.earnings}>
          <span className={styles.earningsValue}>{EARNINGS.today}</span>
          <span>earned today · {EARNINGS.todayDetail}</span>
          <span className={styles.earningsDivider}>·</span>
          <span>
            <span className={styles.earningsValue}>{EARNINGS.month}</span> this month
          </span>
        </p>
        <button className={base.primaryButton} type="button" onClick={openComposer}>
          <Flask size={18} variant="stroke" aria-hidden="true" />
          Book lab tests
        </button>
        <button className={base.searchBox} type="button" onClick={openSearch}>
          <SearchIcon size={18} variant="stroke" aria-hidden="true" />
          <span className={base.searchBoxPlaceholder}>Search patients, bookings, tests</span>
        </button>
      </header>

      {/* ---- Verification callout (only while unapproved) -------------------- */}
      {verifyNeeded && (
        <button
          className={styles.verifyCallout}
          type="button"
          onClick={openVerification}
        >
          <span className={styles.verifyIcon}>
            <kyd.meta.Icon size={18} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.verifyTitle}>{kyd.meta.headline}</span>
          <span className={styles.verifyBody}>
            <span>{kyd.meta.label}</span>
            <span className={styles.verifyCta}>
              Verify to unlock
              <ArrowRight size={14} variant="stroke" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}

      {/* ---- Needs attention ------------------------------------------------- */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="Needs attention"
          meta={attention.length > 0 ? `${attention.length}` : undefined}
        />
        {attention.length === 0 ? (
          <p className={styles.empty}>You&rsquo;re all caught up. Nothing needs review.</p>
        ) : (
          <div className={base.cardGroup}>
            {attention.map((item) => (
              <ListRow
                key={item.id}
                leading={attentionIcon(item.tone)}
                tone={item.tone}
                title={item.label}
                meta={item.detail}
                sub={item.context}
                onClick={() => followAttention(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Recent bookings ------------------------------------------------- */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="Recent bookings"
          action={
            recent.length > 0 ? (
              <button
                className={base.textButton}
                type="button"
                onClick={() => go("bookings")}
              >
                See all
              </button>
            ) : undefined
          }
        />
        {recent.length === 0 ? (
          <p className={styles.empty}>No bookings yet. Book lab tests to get started.</p>
        ) : (
          <div className={base.cardGroup}>
            {recent.map((order) => {
              const status = bookingStatusView(order);
              const tone = statusToTone(status.tone);
              const code = order.bookingCode ?? order.code;
              return (
                <button
                  key={order.code}
                  type="button"
                  className={styles.recentRow}
                  onClick={() => pushBooking(order.code)}
                >
                  <span className={cx(styles.recentName, order.cancelled && base.itemMuted)}>
                    {order.patientName}
                  </span>
                  <span className={styles.recentMeta}>{getBookingTestSummary(order)}</span>
                  <span className={styles.recentStatusLine}>
                    <span className={cx(base.statusPill, toneClass(tone))}>
                      <status.Icon size={12} variant="stroke" aria-hidden="true" />
                      {status.label}
                    </span>
                    <span className={styles.recentSub}>{code} · {order.placedAt ?? "Today"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomeScreen;
