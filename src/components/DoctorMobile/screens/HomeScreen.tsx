"use client";

/* HomeScreen — the doctor's work launcher AND hub.

   Mirrors the desktop Practice Home (src/components/HomeView): a warm greeting +
   one orienting line, the primary "Book lab tests" action, a directory search
   trigger, then three CONNECTED worklists — every row deep-links to the exact
   record, never a generic tab:
     • Needs attention   → the patient chart (urgent / watch acuity)
     • Patient follow-ups → the patient chart (routine, stable acuity)
     • Recent bookings    → the booking detail
   An Explorer/verification callout appears only while KYD is unapproved
   (ordering never blocks). Card aesthetic — peer rows inside shared card groups,
   never card-in-card. */

import { useMemo } from "react";
import { cx } from "@/lib/cx";
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
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
  getHomeAttention,
  getHomeFollowups,
  homeAttentionCount,
} from "@/components/DoctorMobile/data/clinical";
import {
  ListRow,
  SectionHeader,
  toneClass,
  type Tone,
} from "@/components/DoctorMobile/components/primitives";

/* Earnings awareness — one calm line, not a revenue cockpit. Demo-static so it
   stays SSR-deterministic (no Date.now / random). */
const EARNINGS = { today: "$18.40", month: "$412.60" } as const;

const DOCTOR_NAME = "Dr. Pierre";

/* Status is never colour alone — every attention tone carries its own glyph.
   Mirrors the desktop Home tone→icon map. */
function attentionIcon(tone: Tone) {
  switch (tone) {
    case "danger":
      return <Warning size={16} variant="stroke" aria-hidden="true" />;
    case "warning":
      return <Clock size={16} variant="stroke" aria-hidden="true" />;
    case "success":
      return <CheckCircle size={16} variant="stroke" aria-hidden="true" />;
    case "info":
      return <Flask size={16} variant="stroke" aria-hidden="true" />;
    default:
      return <Calendar size={16} variant="stroke" aria-hidden="true" />;
  }
}

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

export function HomeScreen() {
  const { openComposer, openSearch, go, pushPatient, pushBooking, openVerification } =
    useMobileApp();
  const { allBookings } = useOrderDraft();
  const kyd = useKyd();

  /* Concrete, deep-linked worklists (see clinical.ts) — coherent with the
     Patients roster and partitioned by acuity so no patient appears twice. */
  const attention = useMemo(() => getHomeAttention(), []);
  const followups = useMemo(() => getHomeFollowups(), []);
  const attentionTotal = homeAttentionCount();

  /* Cross-patient queue, newest first; the full list lives in Bookings. */
  const recent = useMemo<BookingListItem[]>(() => allBookings.slice(0, 4), [allBookings]);

  const verifyNeeded = kyd.uiState !== "approved";

  /* Warm, count-aware orienting line — the morning-briefing feeling. */
  const todayLine =
    attentionTotal === 0
      ? "You're all caught up. Have a calm day."
      : `${attentionTotal} ${attentionTotal === 1 ? "patient needs" : "patients need"} you today.`;

  return (
    <div className={base.sectionStack}>
      {/* ---- Hero: greeting + orienting line + earnings + primary actions --- */}
      <header className={styles.hero}>
        <div className={styles.heroLede}>
          <h1 className={styles.greeting}>Good morning, {DOCTOR_NAME}</h1>
          <p className={styles.todayLine}>{todayLine}</p>
        </div>
        <p className={styles.earnings}>
          <span>
            <span className={styles.earningsValue}>{EARNINGS.today}</span> earned today
          </span>
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
        <button className={styles.verifyCallout} type="button" onClick={openVerification}>
          <span className={styles.verifyIcon}>
            <kyd.meta.Icon size={18} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.verifyTitle}>{kyd.meta.headline}</span>
          <span className={styles.verifyBody}>
            <span>{kyd.meta.label}</span>
            <span className={styles.verifyCta}>
              Verify to unlock
              <ChevronRight size={14} variant="stroke" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}

      {/* ---- Needs attention — each row opens the patient chart -------------- */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="Needs attention"
          action={
            attention.length > 0 ? (
              <button className={base.textButton} type="button" onClick={() => go("patients")}>
                See all
              </button>
            ) : undefined
          }
        />
        {attention.length === 0 ? (
          <p className={styles.empty}>You&rsquo;re all caught up. Nothing needs review.</p>
        ) : (
          <div className={base.cardGroup}>
            {attention.map((task) => (
              <ListRow
                key={task.id}
                leading={attentionIcon(task.tone)}
                tone={task.tone}
                title={task.name}
                meta={task.action}
                sub={task.context}
                onClick={() => pushPatient(task.patientId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Patient follow-ups — routine next touch, opens the chart ------- */}
      {followups.length > 0 && (
        <section className={base.sectionStack}>
          <SectionHeader
            title="Patient follow-ups"
            action={
              <button className={base.textButton} type="button" onClick={() => go("patients")}>
                See all
              </button>
            }
          />
          <div className={base.cardGroup}>
            {followups.map((patient) => (
              <button
                key={patient.id}
                type="button"
                className={styles.followRow}
                onClick={() => pushPatient(patient.patientId)}
              >
                <span className={base.avatar} aria-hidden="true">
                  {patient.initials}
                </span>
                <span className={styles.followBody}>
                  <span className={styles.followName}>{patient.name}</span>
                  <span className={styles.followAction}>{patient.action}</span>
                  <span className={styles.followWhen}>{patient.lastActivity}</span>
                </span>
                <ChevronRight size={16} variant="stroke" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---- Recent bookings — opens the booking detail --------------------- */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="Recent bookings"
          action={
            recent.length > 0 ? (
              <button className={base.textButton} type="button" onClick={() => go("bookings")}>
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
                    <span className={styles.recentSub}>
                      {code} · {order.placedAt ?? "Today"}
                    </span>
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
