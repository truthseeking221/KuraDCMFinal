"use client";

/* TelehealthView — video-consultation surface for the doctor's clinic app.
   A consult is a NON-LAB appointment and, economically, an order line (§19):
   each consult carries patient_price, doctor_share, kura_share resolved per
   line, never per booking.

   Implements:
   - §35 Later scope — telehealth/consultation surface is later-scope; this is
     the surface, intentionally calm, not a full EMR.
   - §36 Kura is a coordination platform, not a full EMR — patient context
     (problems + meds) is read-only chart recall pulled from fixtures, never
     an editable clinical record.
   - §27.1 Covered consultation — the insurer pays a FLAT consult fee that in v1
     passes through 100% to the doctor (Kura margin = 0).
   - §20 Doctor spread vs patient price — on a SELF-PAY consult the patient pays
     the full list consult fee; the doctor's spread is the doctor's commission
     (NOT a patient discount) and Kura keeps the remainder (fee − spread). The
     pass-through-to-100% rule is specific to the covered consult and does NOT
     apply to self-pay, so a self-pay split shows a real Kura share.
   - §19 order-line finance — a consult freezes its split only when it is both
     paid AND served (the consult actually happened): fee capture lives in the
     post-consult step, not at booking.

   Self-contained: local fixtures + local state. No backend, no navigation off
   this page. Booking a consult is deliberately distinct from booking a lab. */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Avatar, Badge, Banner, Button, Drawer, Input, Select, Tabs, Textarea, Tooltip } from "@/components/ui";
import {
  ArrowRight as ArrowRightIcon,
  Calendar as CalendarIcon,
  Cash as CashIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  CheckShield as ShieldIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Close as CloseIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  MedicalMask as MicIcon,
  Note as NoteIcon,
  Pill as PillIcon,
  TeleConsultation as TeleIcon,
  User as UserIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./TelehealthView.css";

/* ---- types -------------------------------------------------------------- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";
type TabId = "today" | "upcoming" | "past";

/* A consult's payer: self-pay (patient pays the list consult fee) or an
   insurer-covered consult fee that passes through to the doctor (§27.1). */
type Payer =
  | { kind: "self-pay"; fee: string }
  | { kind: "covered"; insurer: string; fee: string };

type Problem = { label: string; detail: string; tone: Tone };
type Med = { name: string; dose: string };
/* a recent relevant result for chart recall (§36 read-only). `flag` drives the
   paired tone+icon — a value alone is never colored. */
type Lab = { label: string; value: string; date: string; flag: Tone };
/* a recorded allergy — severe ones read as danger, the rest neutral. */
type Allergy = { substance: string; reaction: string; severe?: boolean };

/* the cross-surface follow-through chosen at wrap-up — each links another part
   of the app (Kura is a coordination platform: this records intent, the actual
   prescription / lab order / calendar entry lives on its own surface, §36). */
type NextAction = "rx" | "labs" | "follow-up";

type Consult = {
  id: string;
  patient: string;
  initials: string;
  age: string;
  /* why the patient booked — one calm line */
  reason: string;
  /* scheduled wall-clock time, static for determinism */
  time: string;
  /* relative meta for upcoming/past lists */
  when: string;
  payer: Payer;
  /* chart-style recall (§36 read-only) */
  problems: Problem[];
  meds: Med[];
  /* most recent relevant results the doctor reviews going in (§36 read-only) */
  labs: Lab[];
  /* recorded allergies — checked before prescribing */
  allergies: Allergy[];
  /* last completed visit, for continuity */
  lastVisit?: string;
  tab: TabId;
  /* the next-slot consult shows a waiting-room ready state */
  ready?: boolean;
  /* a consult that never happened — closed without a served outcome. Carries a
     short reason; renders as a warning row with no fee (no §19 served line). */
  status?: { kind: "cancelled" | "no-show"; reason: string };
  /* set once a consult is served + fee captured */
  outcome?: {
    duration: string;
    fee: string;
    feeNote: string;
    note: string;
    /* the per-line split frozen at capture (§19) — stored so the detail drawer
       shows the exact economics that were posted, not a recompute. */
    doctorShare: string;
    kuraShare: string;
    /* which cross-surface follow-ups the doctor triggered on close */
    actions: NextAction[];
  };
};

/* ---- fixtures ----------------------------------------------------------- */

/* The doctor's consult fee list price — a single flat per-visit fee, the same
   number the insurer reimburses on a covered consult (§27.1 flat fee). */
const CONSULT_FEE = "$18.00";

/* The doctor's commission on a self-pay, doctor-originated consult (§20). The
   patient still pays the full CONSULT_FEE list price; this spread is the
   doctor's cut and Kura keeps fee − spread. Covered consults ignore this and
   pass through 100% (§27.1). Expressed in minor units for exact arithmetic. */
const SELF_PAY_SPREAD_CENTS = 1200; // $12.00 of the $18.00 list fee

/* Resolve the per-line economic split (§19, §20, §27.1) for a captured fee.
   Returns doctor + Kura share in dollars; never floats currency for display. */
function resolveSplit(payer: Payer, feeStr: string): {
  doctor: string;
  kura: string;
  feeNote: string;
} {
  const feeCents = dollarsToCents(feeStr);
  if (payer.kind === "covered") {
    /* §27.1: covered consult fee passes through 100% — Kura margin = 0. */
    return {
      doctor: centsToDollars(feeCents),
      kura: centsToDollars(0),
      feeNote: `${payer.insurer} covered · pass-through 100% to you`,
    };
  }
  /* §20: self-pay — doctor keeps the spread, Kura keeps the remainder. */
  const doctorCents = Math.min(SELF_PAY_SPREAD_CENTS, feeCents);
  return {
    doctor: centsToDollars(doctorCents),
    kura: centsToDollars(feeCents - doctorCents),
    feeNote: "Self-pay · your spread is your commission",
  };
}

const INITIAL_CONSULTS: Consult[] = [
  {
    id: "c-sokha",
    patient: "Sokha Chann",
    initials: "SC",
    age: "54 · F",
    reason: "Review fasting glucose, adjust metformin",
    time: "09:30",
    when: "Today · 09:30",
    tab: "today",
    ready: true,
    payer: { kind: "covered", insurer: "Forte", fee: CONSULT_FEE },
    lastVisit: "In-clinic · May 28 (12 weeks ago her last review)",
    problems: [
      { label: "Type 2 diabetes", detail: "HbA1c 7.9% · last lab Jun 9", tone: "warning" },
      { label: "Stage 2 CKD", detail: "eGFR 68 · stable", tone: "neutral" },
    ],
    meds: [
      { name: "Metformin", dose: "1000 mg · twice daily" },
      { name: "Lisinopril", dose: "10 mg · once daily" },
    ],
    labs: [
      { label: "HbA1c", value: "7.9%", date: "Jun 9", flag: "warning" },
      { label: "Creatinine", value: "1.1 mg/dL", date: "Jun 9", flag: "neutral" },
      { label: "Blood pressure", value: "138/86", date: "May 28", flag: "warning" },
    ],
    allergies: [{ substance: "Sulfa drugs", reaction: "Rash", severe: false }],
  },
  {
    id: "c-dara",
    patient: "Dara Pich",
    initials: "DP",
    age: "41 · M",
    reason: "Persistent cough, 10 days",
    time: "10:15",
    when: "Today · 10:15",
    tab: "today",
    payer: { kind: "self-pay", fee: CONSULT_FEE },
    lastVisit: "Telehealth · Apr 2 (BP check)",
    problems: [{ label: "Hypertension", detail: "Controlled on therapy", tone: "neutral" }],
    meds: [{ name: "Amlodipine", dose: "5 mg · once daily" }],
    labs: [
      { label: "Blood pressure", value: "126/80", date: "Apr 2", flag: "success" },
      { label: "Chest x-ray", value: "Not on file", date: "—", flag: "neutral" },
    ],
    allergies: [{ substance: "Penicillin", reaction: "Anaphylaxis", severe: true }],
  },
  {
    id: "c-mealea",
    patient: "Mealea Sok",
    initials: "MS",
    age: "29 · F",
    reason: "Thyroid follow-up, lab results",
    time: "11:00",
    when: "Today · 11:00",
    tab: "today",
    payer: { kind: "covered", insurer: "Sovannaphum", fee: CONSULT_FEE },
    lastVisit: "Telehealth · Mar 14 (dose titration)",
    problems: [{ label: "Hypothyroidism", detail: "TSH 4.1 · on levothyroxine", tone: "info" }],
    meds: [{ name: "Levothyroxine", dose: "75 mcg · once daily" }],
    labs: [
      { label: "TSH", value: "4.1 mIU/L", date: "Jun 12", flag: "info" },
      { label: "Free T4", value: "1.2 ng/dL", date: "Jun 12", flag: "success" },
    ],
    allergies: [],
  },
  {
    id: "c-vibol",
    patient: "Vibol Chea",
    initials: "VC",
    age: "63 · M",
    reason: "Post-discharge check after pneumonia",
    time: "Tomorrow · 14:00",
    when: "Tomorrow · 14:00",
    tab: "upcoming",
    payer: { kind: "self-pay", fee: CONSULT_FEE },
    lastVisit: "In-clinic · Jun 18 (hospital discharge)",
    problems: [{ label: "COPD", detail: "On inhaled therapy", tone: "neutral" }],
    meds: [{ name: "Salbutamol", dose: "Inhaler · as needed" }],
    labs: [
      { label: "O₂ saturation", value: "94% room air", date: "Jun 18", flag: "warning" },
      { label: "WBC", value: "8.2 ×10⁹/L", date: "Jun 18", flag: "success" },
    ],
    allergies: [],
  },
  {
    id: "c-chenda",
    patient: "Chenda Lim",
    initials: "CL",
    age: "37 · F",
    reason: "Migraine management review",
    time: "Mon · 09:00",
    when: "Mon · 09:00",
    tab: "upcoming",
    payer: { kind: "covered", insurer: "Forte", fee: CONSULT_FEE },
    lastVisit: "Telehealth · May 5 (prophylaxis start)",
    problems: [{ label: "Chronic migraine", detail: "On prophylaxis", tone: "neutral" }],
    meds: [{ name: "Propranolol", dose: "40 mg · twice daily" }],
    labs: [{ label: "Blood pressure", value: "108/68", date: "May 5", flag: "success" }],
    allergies: [{ substance: "Codeine", reaction: "Nausea", severe: false }],
  },
  {
    id: "c-rith",
    patient: "Rith Nuon",
    initials: "RN",
    age: "48 · M",
    reason: "Lipid review after statin start",
    time: "Yesterday · 15:30",
    when: "Yesterday · 15:30",
    tab: "past",
    payer: { kind: "self-pay", fee: CONSULT_FEE },
    lastVisit: "In-clinic · Apr 20 (statin start)",
    problems: [{ label: "Dyslipidemia", detail: "On atorvastatin", tone: "neutral" }],
    meds: [{ name: "Atorvastatin", dose: "20 mg · once daily" }],
    labs: [
      { label: "LDL", value: "118 mg/dL", date: "Jun 15", flag: "warning" },
      { label: "ALT", value: "28 U/L", date: "Jun 15", flag: "success" },
    ],
    allergies: [],
    outcome: {
      duration: "12:24",
      fee: CONSULT_FEE,
      feeNote: "Self-pay · paid by KHQR",
      note: "Tolerating statin well, no myalgia. Continue 20 mg. Repeat lipid panel in 8 weeks.",
      doctorShare: "$12.00",
      kuraShare: "$6.00",
      actions: ["labs", "follow-up"],
    },
  },
  {
    id: "c-nary",
    patient: "Nary Suon",
    initials: "NS",
    age: "33 · F",
    reason: "Antenatal follow-up",
    time: "Yesterday · 11:00",
    when: "Yesterday · 11:00",
    tab: "past",
    payer: { kind: "covered", insurer: "Forte", fee: CONSULT_FEE },
    lastVisit: "Telehealth · Jun 1 (24-week review)",
    problems: [{ label: "Pregnancy", detail: "26 weeks · routine", tone: "info" }],
    meds: [{ name: "Ferrous sulfate", dose: "200 mg · once daily" }],
    labs: [{ label: "Hemoglobin", value: "10.8 g/dL", date: "Jun 1", flag: "warning" }],
    allergies: [],
    /* a real never-happened consult: no outcome, no fee captured (§19). */
    status: { kind: "no-show", reason: "Patient did not join the waiting room" },
  },
];

const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: HeartIcon,
  success: CheckCircleIcon,
  neutral: UserIcon,
};

/* The post-consult follow-through options. Each links another surface; on this
   page we only record the intent and confirm it via a cross-surface toast — the
   real prescription / lab order / calendar entry lives on its own surface (§36
   coordination platform, not a monolithic EMR). */
const NEXT_ACTIONS: {
  id: NextAction;
  label: string;
  hint: string;
  surface: string;
  Icon: (props: IconProps) => React.ReactElement;
  toast: (patient: string) => string;
}[] = [
  {
    id: "rx",
    label: "Write prescription",
    hint: "Send to Dispensary",
    surface: "Dispensary",
    Icon: PillIcon,
    toast: (p) => `Prescription draft started for ${p}`,
  },
  {
    id: "labs",
    label: "Order follow-up labs",
    hint: "Open a lab booking",
    surface: "Lab booking",
    Icon: FlaskIcon,
    toast: (p) => `Lab order opened for ${p}`,
  },
  {
    id: "follow-up",
    label: "Schedule follow-up",
    hint: "Add to Calendar",
    surface: "Calendar",
    Icon: CalendarIcon,
    toast: (p) => `Follow-up added to Calendar for ${p}`,
  },
];

const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  rx: "Prescription sent to Dispensary",
  labs: "Follow-up labs ordered",
  "follow-up": "Follow-up scheduled",
};

/* ---- money helpers (integer minor units; never float for display) ------- */

function dollarsToCents(s: string): number {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Math.round(n * 100);
}

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ---- payer chip --------------------------------------------------------- */

function PayerChip({ payer }: { payer: Payer }) {
  if (payer.kind === "self-pay") {
    return (
      <Badge appearance="subtle" tone="neutral" icon={<CashIcon size={12} variant="stroke" />}>
        Self-pay {payer.fee}
      </Badge>
    );
  }
  /* Keep the chip compact so a long insurer name never crowds the row's fixed
     column; the exact fee lives in a tooltip (fix #13). */
  return (
    <Tooltip content={`${payer.insurer} covered · ${payer.fee} consult fee`}>
      <Badge appearance="subtle" tone="info" icon={<ShieldIcon size={12} variant="stroke" />}>
        {payer.insurer} · covered
      </Badge>
    </Tooltip>
  );
}

/* ========================================================================= */

export function TelehealthView() {
  const [consults, setConsults] = useState<Consult[]>(INITIAL_CONSULTS);
  const [tab, setTab] = useState<TabId>("today");

  /* in-call state — the consult currently in session, plus its mock controls */
  const [inCall, setInCall] = useState<Consult | null>(null);

  /* post-consult capture drawer — opened on End call */
  const [wrapUp, setWrapUp] = useState<Consult | null>(null);

  /* book-a-consult drawer */
  const [booking, setBooking] = useState(false);

  /* read-only patient-context preview — opened from a not-yet-ready row's
     "Open". Previewing a slot must NOT start a billable, timer-running call. */
  const [preview, setPreview] = useState<Consult | null>(null);

  /* past-consult detail — the note, frozen economics, and what was actioned. */
  const [detail, setDetail] = useState<Consult | null>(null);

  const today = consults.filter((c) => c.tab === "today");
  const upcoming = consults.filter((c) => c.tab === "upcoming");
  const past = consults.filter((c) => c.tab === "past");

  /* the waiting-room slot: the ready consult that hasn't been served yet */
  const nextUp = today.find((c) => c.ready && !c.outcome);

  /* earned today = sum of captured consult fees that became paid-plus-served
     today. A consult only contributes once it is served (§19 / §22). */
  const earnedCents = consults
    .filter((c) => c.tab === "past" && c.outcome && c.when.startsWith("Today"))
    .reduce((sum, c) => sum + dollarsToCents(c.outcome!.fee), 0);
  const servedTodayCount = consults.filter(
    (c) => c.tab === "past" && c.outcome && c.when.startsWith("Today"),
  ).length;

  const tabItems = [
    { label: "Today", value: "today" as const, count: today.length },
    { label: "Upcoming", value: "upcoming" as const, count: upcoming.length },
    { label: "Past", value: "past" as const, count: past.length },
  ];

  const list = tab === "today" ? today : tab === "upcoming" ? upcoming : past;

  /* a "today" list with zero rows: distinguish a day that has already been
     fully served (everything moved to Past) from a genuinely empty schedule. */
  const servedAnyToday = consults.some((c) => c.outcome && c.when.startsWith("Today"));

  /* the element that opened the call — restore focus to it when the call ends. */
  const callTriggerRef = useRef<HTMLElement | null>(null);

  /* lock background scroll + make the page inert while the immersive call is up
     (fixes #9 / #12 — background list must not scroll or be tabbable). */
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inCall) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = rootRef.current;
    root?.setAttribute("aria-hidden", "true");
    root?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = prevOverflow;
      root?.removeAttribute("aria-hidden");
      root?.removeAttribute("inert");
    };
  }, [inCall]);

  const startCall = (consult: Consult) => {
    callTriggerRef.current = (document.activeElement as HTMLElement) ?? null;
    setInCall(consult);
  };

  /* End a call → freeze nothing yet; open the wrap-up where fee is captured. */
  const endCall = (consult: Consult) => {
    setInCall(null);
    callTriggerRef.current?.focus({ preventScroll: true });
    setWrapUp(consult);
  };

  /* Mark the waiting-room consult a no-show — it never happened, so no fee and
     no served line (§19). Moves straight to Past with a status, not an outcome. */
  const markNoShow = (consult: Consult) => {
    setConsults((prev) =>
      prev.map((c) =>
        c.id === consult.id
          ? {
              ...c,
              tab: "past",
              ready: false,
              when: `Today · ${c.time}`,
              status: { kind: "no-show", reason: "Patient did not join the waiting room" },
            }
          : c,
      ),
    );
    setTab("past");
    toast("Marked as no-show", { description: `${consult.patient} · no fee captured` });
  };

  /* Undo a just-closed consult: revert it to Today and clear its outcome, so the
     optimistic capture is recoverable (checklist item 7). */
  const undoClose = (id: string) => {
    setConsults((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, tab: "today", ready: true, outcome: undefined } : c,
      ),
    );
    setTab("today");
  };

  /* Confirm wrap-up → the consult becomes paid-plus-served and moves to Past
     with an immutable outcome row (§19 / §23 — we append, never edit). The split
     resolved here is frozen onto the outcome so the detail drawer later shows
     the exact economics that posted. */
  const confirmWrapUp = (
    consult: Consult,
    note: string,
    feeStr: string,
    actions: NextAction[],
  ) => {
    const { feeNote, doctor, kura } = resolveSplit(consult.payer, feeStr);
    setConsults((prev) =>
      prev.map((c) =>
        c.id === consult.id
          ? {
              ...c,
              tab: "past",
              ready: false,
              /* c.time is a bare wall-clock time; the day label is separate, so
                 the persisted when string is never double-prefixed (e.g. no
                 "Today · Today · 14:30"). */
              when: `Today · ${c.time}`,
              outcome: {
                duration: "08:12",
                fee: feeStr,
                feeNote,
                note,
                doctorShare: doctor,
                kuraShare: kura,
                actions,
              },
            }
          : c,
      ),
    );
    setWrapUp(null);
    setTab("past");
    /* fire one cross-surface toast per chosen follow-up — each links another
       surface; this page only records the intent (§36). */
    actions.forEach((a) => {
      const meta = NEXT_ACTIONS.find((n) => n.id === a);
      if (meta) toast(meta.toast(consult.patient), { description: `→ ${meta.surface}` });
    });
    toast.success("Consult closed", {
      description: `${consult.patient} · ${feeStr} captured`,
      action: {
        label: "Undo",
        onClick: () => undoClose(consult.id),
      },
    });
  };

  /* slots already taken by a current consult (any tab) — used to block a
     duplicate booking into an occupied slot (fix #14). */
  const takenSlots = consults.map((c) => c.when);
  const existingIds = consults.map((c) => c.id);

  const addBookedConsult = (c: Consult) => {
    setConsults((prev) => [...prev, c]);
    setBooking(false);
    setTab(c.tab);
    toast.success("Consult booked", { description: `${c.patient} · ${c.time}` });
  };

  return (
    <div className="tele" ref={rootRef}>
      {/* ---- up next / waiting room ---------------------------------------- */}
      <section className="tele-band" aria-label="Up next">
        <div className="tele-band-head">
          <p className="tele-eyebrow">Up next</p>
          <Button
            intent="secondary"
            size="sm"
            leadingIcon={<CalendarIcon size={15} variant="stroke" />}
            onClick={() => setBooking(true)}
          >
            Book a consult
          </Button>
        </div>

        {nextUp ? (
          <div className="tele-next" role="group" aria-label={`Next consult with ${nextUp.patient}`}>
            <span className="tele-next-mark" aria-hidden>
              <TeleIcon size={26} variant="duotone" />
            </span>
            <div className="tele-next-copy">
              <span className="tele-next-status">
                <span className="tele-pulse" aria-hidden />
                In the waiting room
              </span>
              <strong>{nextUp.patient}</strong>
              <span className="tele-next-reason">
                {nextUp.time} · {nextUp.reason}
              </span>
              <span className="tele-next-payer">
                <PayerChip payer={nextUp.payer} />
              </span>
            </div>
            <div className="tele-next-actions">
              <Button
                intent="primary"
                leadingIcon={<TeleIcon size={16} variant="stroke" />}
                onClick={() => startCall(nextUp)}
              >
                Start consult
              </Button>
              <Button
                intent="ghost"
                size="sm"
                leadingIcon={<WarningIcon size={15} variant="stroke" />}
                onClick={() => markNoShow(nextUp)}
              >
                No-show
              </Button>
            </div>
          </div>
        ) : (
          <div className="tele-next tele-next--empty">
            <span className="tele-next-mark tele-next-mark--muted" aria-hidden>
              <CheckCircleIcon size={22} variant="stroke" />
            </span>
            <div className="tele-next-copy">
              <strong>No one is waiting</strong>
              <span className="tele-next-reason">
                Today&rsquo;s scheduled consults are below. The next patient appears here when they join.
              </span>
            </div>
          </div>
        )}

        {/* earned-today awareness — calm, one line, not a cockpit */}
        <p className="tele-earned">
          <CashIcon size={14} variant="stroke" aria-hidden />
          {servedTodayCount === 0 ? (
            <span>No consults closed yet today. Fees are captured when a consult ends.</span>
          ) : (
            <span>
              <strong>{centsToDollars(earnedCents)}</strong> earned from {servedTodayCount}{" "}
              {servedTodayCount === 1 ? "consult" : "consults"} today · paid plus served.
            </span>
          )}
        </p>
      </section>

      {/* ---- lists --------------------------------------------------------- */}
      <section className="tele-list" aria-label="Consultations">
        <div className="tele-list-head">
          <Tabs<TabId> items={tabItems} value={tab} onChange={setTab} aria-label="Consult lists" />
        </div>

        {list.length === 0 ? (
          <div className="tele-empty">
            <span aria-hidden className="tele-empty-ic">
              <CalendarIcon size={18} variant="stroke" />
            </span>
            <span>
              {tab === "today"
                ? servedAnyToday
                  ? "All done for today — every consult has been closed."
                  : "Nothing booked for today yet."
                : tab === "upcoming"
                  ? "Nothing booked beyond today yet."
                  : "No past consults to show."}
            </span>
            {tab !== "past" && (
              <Button intent="outline" size="sm" onClick={() => setBooking(true)}>
                Book a consult
              </Button>
            )}
          </div>
        ) : (
          <ul className="tele-rows">
            {list.map((c) => (
              <ConsultRow
                key={c.id}
                consult={c}
                tab={tab}
                onStart={() => startCall(c)}
                onOpen={() => setPreview(c)}
                onDetail={() => setDetail(c)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ---- in-call panel ------------------------------------------------- */}
      {inCall && (
        <InCallPanel
          consult={inCall}
          onEnd={() => endCall(inCall)}
        />
      )}

      {/* ---- post-consult wrap-up ----------------------------------------- */}
      <WrapUpDrawer
        consult={wrapUp}
        onClose={() => setWrapUp(null)}
        onConfirm={confirmWrapUp}
      />

      {/* ---- patient-context preview (not a live call) -------------------- */}
      <PreviewDrawer consult={preview} onClose={() => setPreview(null)} />

      {/* ---- past-consult detail (note + economics + actioned) ------------ */}
      <PastDetailDrawer consult={detail} onClose={() => setDetail(null)} />

      {/* ---- book a consult ----------------------------------------------- */}
      <BookConsultDrawer
        open={booking}
        onClose={() => setBooking(false)}
        onBook={addBookedConsult}
        takenSlots={takenSlots}
        existingIds={existingIds}
      />
    </div>
  );
}

/* ---- consult row -------------------------------------------------------- */

function ConsultRow({
  consult,
  tab,
  onStart,
  onOpen,
  onDetail,
}: {
  consult: Consult;
  tab: TabId;
  onStart: () => void;
  onOpen: () => void;
  onDetail: () => void;
}) {
  const isPast = tab === "past";
  return (
    <li className={cx("tele-row", consult.ready && !isPast && "tele-row--ready")}>
      <span className="tele-row-time">
        <ClockIcon size={13} variant="stroke" aria-hidden />
        {consult.time}
      </span>

      <span className="tele-row-patient">
        <Avatar initials={consult.initials} name={consult.patient} size="sm" />
        <span className="tele-row-id">
          <strong>{consult.patient}</strong>
          <small>
            {consult.age} · {consult.reason}
          </small>
        </span>
      </span>

      <span className="tele-row-payer">
        <PayerChip payer={consult.payer} />
      </span>

      <span className="tele-row-action">
        {isPast ? (
          /* past rows are openable to a read-only detail drawer (note +
             economics + what was actioned), so the status is a button. */
          <button type="button" className="tele-row-detail" onClick={onDetail}>
            {consult.outcome ? (
              <span className="tele-row-served">
                <CheckCircleIcon size={13} variant="stroke" aria-hidden />
                {consult.outcome.duration} · {consult.outcome.fee}
              </span>
            ) : consult.status ? (
              <span className="tele-row-noshow">
                <WarningIcon size={13} variant="stroke" aria-hidden />
                {consult.status.kind === "no-show" ? "No-show" : "Cancelled"}
              </span>
            ) : (
              <span className="tele-row-muted">Closed</span>
            )}
            <ChevronRightIcon size={14} variant="stroke" aria-hidden />
          </button>
        ) : consult.ready ? (
          <Button
            intent="primary"
            size="sm"
            leadingIcon={<TeleIcon size={15} variant="stroke" />}
            onClick={onStart}
          >
            Start
          </Button>
        ) : (
          <Button
            intent="secondary"
            size="sm"
            trailingIcon={<ChevronRightIcon size={15} variant="stroke" aria-hidden />}
            onClick={onOpen}
          >
            Open
          </Button>
        )}
      </span>
    </li>
  );
}

/* ---- shared chart recall (read-only, §36) ------------------------------- */

/* The pre-consult context the doctor reviews: reason, last visit, active
   problems, current meds, most recent relevant labs, and allergies. Used in the
   preview drawer, the in-call rail, and the past-consult detail — one source so
   the chart looks identical wherever it appears. `compact` drops the heavier
   card chrome for the dark in-call rail. */
function ChartRecall({ consult }: { consult: Consult }) {
  const hasChart =
    consult.problems.length > 0 ||
    consult.meds.length > 0 ||
    consult.labs.length > 0 ||
    consult.allergies.length > 0;

  return (
    <div className="tele-chart">
      {consult.lastVisit && (
        <p className="tele-chart-last">
          <ClockIcon size={13} variant="stroke" aria-hidden />
          <span>
            <small>Last visit</small>
            {consult.lastVisit}
          </span>
        </p>
      )}

      {consult.allergies.length > 0 && (
        <div className="tele-context-block">
          <h3>Allergies</h3>
          <ul className="tele-allergies">
            {consult.allergies.map((a) => (
              <li
                key={a.substance}
                className={cx("tele-allergy", a.severe && "tele-allergy--severe")}
              >
                <span className="tele-allergy-ic" aria-hidden>
                  <WarningIcon size={13} variant="stroke" />
                </span>
                <span>
                  <strong>{a.substance}</strong>
                  <small>
                    {a.reaction}
                    {a.severe ? " · severe" : ""}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {consult.problems.length > 0 && (
        <div className="tele-context-block">
          <h3>Active problems</h3>
          <ul className="tele-context-problems">
            {consult.problems.map((p) => {
              const Icon = TONE_ICON[p.tone];
              return (
                <li key={p.label} className={cx("tele-prob", `tele-tone-${p.tone}`)}>
                  <span className="tele-prob-ic" aria-hidden>
                    <Icon size={14} variant="stroke" />
                  </span>
                  <span>
                    <strong>{p.label}</strong>
                    <small>{p.detail}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {consult.labs.length > 0 && (
        <div className="tele-context-block">
          <h3>Recent results</h3>
          <ul className="tele-labs">
            {consult.labs.map((l) => (
              <li key={l.label} className={cx("tele-lab", `tele-tone-${l.flag}`)}>
                <span className="tele-lab-name">{l.label}</span>
                <span className="tele-lab-val">{l.value}</span>
                <span className="tele-lab-date">{l.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {consult.meds.length > 0 && (
        <div className="tele-context-block">
          <h3>Current medications</h3>
          <ul className="tele-context-meds">
            {consult.meds.map((m) => (
              <li key={m.name}>
                <span className="tele-med-ic" aria-hidden>
                  <PillIcon size={14} variant="stroke" />
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.dose}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasChart && (
        <p className="tele-context-foot">
          <UserIcon size={12} variant="stroke" aria-hidden />
          No chart recall on file for this patient yet.
        </p>
      )}
    </div>
  );
}

/* ---- patient-context preview (read-only, NOT a live call) --------------- */

function PreviewDrawer({ consult, onClose }: { consult: Consult | null; onClose: () => void }) {
  if (!consult) return null;
  const isPast = consult.tab === "past";
  return (
    <Drawer
      open
      onClose={onClose}
      title="Consult preview"
      subtitle={`${consult.patient} · ${consult.when}`}
      width={440}
      footer={
        <div className="tele-wrap-foot">
          <Button intent="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="tele-preview">
        {consult.status ? (
          <Banner
            tone="warning"
            title={consult.status.kind === "no-show" ? "Marked as no-show" : "Consult cancelled"}
            icon={<WarningIcon size={16} variant="stroke" />}
          >
            {consult.status.reason}. The consult never happened, so no fee was captured.
          </Banner>
        ) : (
          <Banner
            tone="info"
            title={isPast ? "This consult is closed" : "Not in the waiting room yet"}
            icon={<ClockIcon size={16} variant="stroke" />}
          >
            {isPast
              ? "Reviewing past context. Its outcome and fee are already captured and immutable."
              : "The patient has not joined. The live call starts from the waiting room when they arrive."}
          </Banner>
        )}

        <p className="tele-section-label">Patient context</p>
        <div className="k-card tele-card">
          <div className="tele-card-id">
            <Avatar initials={consult.initials} name={consult.patient} size="md" />
            <div>
              <strong>{consult.patient}</strong>
              <small>{consult.age}</small>
            </div>
            <PayerChip payer={consult.payer} />
          </div>
          <p className="tele-context-reason">
            <NoteIcon size={13} variant="stroke" aria-hidden />
            {consult.reason}
          </p>
          <ChartRecall consult={consult} />
        </div>

        <p className="tele-context-foot">
          <ShieldIcon size={12} variant="stroke" aria-hidden />
          Read-only chart recall. Kura is a coordination platform, not an EMR.
        </p>
      </div>
    </Drawer>
  );
}

/* ---- past-consult detail (note + frozen economics + actioned) ----------- */

function PastDetailDrawer({ consult, onClose }: { consult: Consult | null; onClose: () => void }) {
  if (!consult) return null;
  const { outcome, status } = consult;
  const covered = consult.payer.kind === "covered";
  return (
    <Drawer
      open
      onClose={onClose}
      title="Consult detail"
      subtitle={`${consult.patient} · ${consult.when}`}
      width={460}
      footer={
        <div className="tele-wrap-foot">
          <Button intent="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="tele-preview">
        {status ? (
          <Banner
            tone="warning"
            title={status.kind === "no-show" ? "Marked as no-show" : "Consult cancelled"}
            icon={<WarningIcon size={16} variant="stroke" />}
          >
            {status.reason}. The consult never happened, so no fee was captured and no order line
            was served (§19).
          </Banner>
        ) : (
          <Banner
            tone="success"
            title="Served and captured"
            icon={<CheckCircleIcon size={16} variant="stroke" />}
          >
            Paid plus served. The note and economics below are frozen — a correction posts a
            reversal, never an edit.
          </Banner>
        )}

        <div className="tele-card-id tele-card-id--plain">
          <Avatar initials={consult.initials} name={consult.patient} size="md" />
          <div>
            <strong>{consult.patient}</strong>
            <small>{consult.age}</small>
          </div>
          <PayerChip payer={consult.payer} />
        </div>

        <p className="tele-context-reason">
          <NoteIcon size={13} variant="stroke" aria-hidden />
          {consult.reason}
        </p>

        {outcome ? (
          <>
            <p className="tele-section-label">Consult note</p>
            <div className="k-card tele-card">
              <p className="tele-detail-note">{outcome.note}</p>
              <p className="tele-detail-dur">
                <ClockIcon size={13} variant="stroke" aria-hidden />
                Duration {outcome.duration}
              </p>
            </div>

            <p className="tele-section-label">Order-line economics</p>
            <div className="k-card tele-card">
              <dl className="tele-split" aria-label="Economic split">
                <div>
                  <dt>{covered ? "Payer paid" : "Patient paid"}</dt>
                  <dd>{outcome.fee}</dd>
                </div>
                <div>
                  <dt>Your share</dt>
                  <dd className="tele-split-you">{outcome.doctorShare}</dd>
                </div>
                <div>
                  <dt>Kura share</dt>
                  <dd className={cx(covered && "tele-split-zero")}>{outcome.kuraShare}</dd>
                </div>
              </dl>
              <p className="tele-detail-feenote">{outcome.feeNote}</p>
            </div>

            <div className="tele-followthrough">
              <p className="tele-section-label">Follow-through</p>
              {outcome.actions.length > 0 ? (
                <ul className="tele-detail-actions">
                  {outcome.actions.map((a) => (
                    <li key={a}>
                      <CheckCircleIcon size={14} variant="stroke" aria-hidden />
                      {NEXT_ACTION_LABEL[a]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tele-wrap-hint">No follow-up actions were triggered at close.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="tele-section-label">Patient context</p>
            <div className="k-card tele-card">
              <ChartRecall consult={consult} />
            </div>
          </>
        )}

        <p className="tele-context-foot">
          <ShieldIcon size={12} variant="stroke" aria-hidden />
          Read-only. Kura is a coordination platform, not an EMR.
        </p>
      </div>
    </Drawer>
  );
}

/* ---- in-call panel ------------------------------------------------------ */

function InCallPanel({ consult, onEnd }: { consult: Consult; onEnd: () => void }) {
  const [phase, setPhase] = useState<"connecting" | "joined">("connecting");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  /* a single Escape (or End) opens this confirm — it never terminates a live,
     billable consult on its own (fix #1). */
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const joined = phase === "joined";

  /* connecting → joined: the timer does not run and End is disabled until the
     call is actually joined (fix #2). */
  useEffect(() => {
    const t = window.setTimeout(() => setPhase("joined"), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!joined) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [joined]);

  const requestEnd = useCallback(() => {
    if (!joined) return;
    setConfirmingEnd(true);
  }, [joined]);

  /* Escape requests an end (shows confirm); it never ends the call outright.
     Tab is trapped inside the panel so the inert background stays unreachable. */
  useEffect(() => {
    const panel = panelRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (confirmingEnd) setConfirmingEnd(false);
        else requestEnd();
        return;
      }
      if (event.key === "Tab" && panel) {
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>("button:not([disabled])"),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const first = panel?.querySelector<HTMLElement>("button:not([disabled])");
    (first ?? panel)?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmingEnd, requestEnd]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      className="tele-call"
      role="dialog"
      aria-modal="true"
      aria-label={`Consult with ${consult.patient}`}
      tabIndex={-1}
    >
      <div className="tele-call-main">
        <header className="tele-call-top">
          <span className="tele-call-rec">
            {joined ? (
              <>
                <span className="tele-pulse" aria-hidden />
                Live · {mm}:{ss}
              </>
            ) : (
              <>
                <span className="tele-spinner" aria-hidden />
                Connecting…
              </>
            )}
          </span>
          <div className="tele-call-meta">
            {/* connection / quality indicator — calm, reflects joined state */}
            <span
              className={cx("tele-signal", joined ? "tele-signal--good" : "tele-signal--wait")}
              title={joined ? "Connection stable" : "Establishing connection"}
            >
              <span className="tele-signal-bars" aria-hidden>
                <i /> <i /> <i />
              </span>
              {joined ? "Stable" : "Connecting"}
            </span>
            <PayerChip payer={consult.payer} />
          </div>
        </header>

        <div className="tele-stage">
          {!joined ? (
            <div className="tele-stage-off">
              <span className="tele-spinner tele-spinner--lg" aria-hidden />
              <span>Connecting to {consult.patient}…</span>
            </div>
          ) : cameraOff ? (
            <div className="tele-stage-off">
              <TeleIcon size={40} variant="duotone" aria-hidden />
              <span>Camera is off</span>
            </div>
          ) : (
            <div className="tele-stage-feed" aria-hidden>
              <Avatar initials={consult.initials} name={consult.patient} size="lg" />
              <span className="tele-stage-name">{consult.patient}</span>
              <span className="tele-stage-sub">{consult.age}</span>
            </div>
          )}
          <span className="tele-stage-self" aria-hidden>
            You
          </span>

          {confirmingEnd && (
            <div className="tele-call-confirm" role="alertdialog" aria-label="End the consult?">
              <div className="tele-call-confirm-card">
                <WarningIcon size={22} variant="stroke" aria-hidden />
                <strong>End the consult?</strong>
                <span>You&rsquo;ll move to the note and fee step to close it out.</span>
                <div className="tele-call-confirm-acts">
                  <Button intent="outline" onClick={() => setConfirmingEnd(false)}>
                    Cancel
                  </Button>
                  <Button
                    intent="primary"
                    leadingIcon={<CheckIcon size={15} variant="stroke" />}
                    onClick={onEnd}
                  >
                    End consult
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="tele-call-controls">
          <button
            type="button"
            className={cx("tele-ctrl", muted && "tele-ctrl--off")}
            aria-pressed={muted}
            disabled={!joined}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? (
              <CloseIcon size={18} variant="stroke" aria-hidden />
            ) : (
              <MicIcon size={18} variant="stroke" aria-hidden />
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            className={cx("tele-ctrl", cameraOff && "tele-ctrl--off")}
            aria-pressed={cameraOff}
            disabled={!joined}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            onClick={() => setCameraOff((c) => !c)}
          >
            {cameraOff ? (
              <CloseIcon size={18} variant="stroke" aria-hidden />
            ) : (
              <TeleIcon size={18} variant="stroke" aria-hidden />
            )}
            {cameraOff ? "Camera on" : "Camera off"}
          </button>
          <button
            type="button"
            className="tele-ctrl tele-ctrl--end"
            onClick={requestEnd}
            disabled={!joined}
            title={joined ? undefined : "Available once connected"}
            aria-label={joined ? "End consult" : "End consult — available once connected"}
          >
            <CloseIcon size={18} variant="stroke" aria-hidden />
            End consult
          </button>
        </footer>
      </div>

      {/* patient context — read-only chart recall (§36) */}
      <aside className="tele-context" aria-label="Patient context">
        <div className="tele-context-id">
          <Avatar initials={consult.initials} name={consult.patient} size="md" />
          <div>
            <strong>{consult.patient}</strong>
            <small>{consult.age}</small>
          </div>
        </div>

        <p className="tele-context-reason">
          <NoteIcon size={13} variant="stroke" aria-hidden />
          {consult.reason}
        </p>

        <ChartRecall consult={consult} />

        <p className="tele-context-foot">
          <ShieldIcon size={12} variant="stroke" aria-hidden />
          Read-only chart recall. Kura is a coordination platform, not an EMR.
        </p>
      </aside>
    </div>,
    document.body,
  );
}

/* ---- wrap-up drawer (note + fee capture) -------------------------------- */

function WrapUpDrawer({
  consult,
  onClose,
  onConfirm,
}: {
  consult: Consult | null;
  onClose: () => void;
  onConfirm: (consult: Consult, note: string, fee: string, actions: NextAction[]) => void;
}) {
  if (!consult) return null;
  /* keyed remount resets the draft cleanly per consult — no reset-in-effect */
  return <WrapUpBody key={consult.id} consult={consult} onClose={onClose} onConfirm={onConfirm} />;
}

function WrapUpBody({
  consult,
  onClose,
  onConfirm,
}: {
  consult: Consult;
  onClose: () => void;
  onConfirm: (consult: Consult, note: string, fee: string, actions: NextAction[]) => void;
}) {
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [selfPayAmount, setSelfPayAmount] = useState(() => consult.payer.fee.replace("$", ""));
  const [amountTouched, setAmountTouched] = useState(false);
  const [actions, setActions] = useState<NextAction[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleAction = (id: NextAction) =>
    setActions((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const covered = consult.payer.kind === "covered";
  const feeStr = covered ? consult.payer.fee : `$${Number(selfPayAmount || "0").toFixed(2)}`;
  const feeCents = dollarsToCents(feeStr);

  /* Validation (#5 / #7): a real assessment note (not "asdf") and, for self-pay,
     a positive amount. Covered consults pass a fixed fee so amount is always ok. */
  const noteReady = note.trim().length >= 10;
  const amountValid = covered || feeCents > 0;
  const ready = noteReady && amountValid;

  /* a self-pay collection under the list fee is a real edge worth surfacing
     (§20: the patient pays the full list price), but it is not blocking. */
  const underCollected = !covered && feeCents > 0 && feeCents < dollarsToCents(CONSULT_FEE);

  /* Resolve the per-line split (§19/§20/§27.1) from the captured fee. */
  const split = resolveSplit(consult.payer, feeStr);

  const handleConfirm = () => {
    if (!ready || saving) return;
    setSaving(true);
    /* optimistic-but-pending capture — a short delay also blocks a double
       submit (#6). The parent mutation closes this drawer. */
    window.setTimeout(() => {
      onConfirm(consult, note.trim(), feeStr, actions);
    }, 600);
  };

  return (
    <Drawer
      open
      onClose={saving ? () => {} : onClose}
      title="Close consult"
      subtitle={`${consult.patient} · ${consult.time}`}
      width={460}
      footer={
        <div className="tele-wrap-foot">
          <Button intent="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="primary"
            disabled={!ready}
            loading={saving}
            leadingIcon={<CheckIcon size={15} variant="stroke" />}
            onClick={handleConfirm}
          >
            {saving ? "Capturing…" : "Confirm & capture"}
          </Button>
        </div>
      }
    >
      <div className="tele-wrap">
        <Banner tone="success" title="Consult served" icon={<CheckCircleIcon size={16} variant="stroke" />}>
          The video call has ended. Adding the note and fee marks this consult paid plus served.
        </Banner>

        <div className="tele-wrap-block">
          <h3>Consult note</h3>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            onBlur={() => setNoteTouched(true)}
            rows={4}
            placeholder="Assessment and plan — what you advised and any follow-up."
            aria-label="Consult note"
            error={
              noteTouched && !noteReady
                ? "Add a brief assessment and plan to close the consult."
                : undefined
            }
          />
          {!(noteTouched && !noteReady) && (
            <p className="tele-wrap-hint">A short assessment and plan is required to close the consult.</p>
          )}
        </div>

        <div className="k-card tele-card tele-econ">
          <div className="k-card__head">
            <h3 className="k-card__title">Order-line economics</h3>
            <PayerChip payer={consult.payer} />
          </div>
          <div className="k-card__body tele-econ-body">
            {covered ? (
              <div className="tele-fee tele-fee--covered">
                <span className="tele-fee-ic" aria-hidden>
                  <ShieldIcon size={16} variant="stroke" />
                </span>
                <div className="tele-fee-copy">
                  <strong>{consult.payer.fee} consult fee</strong>
                  <small>
                    {consult.payer.kind === "covered" ? consult.payer.insurer : ""} pays a flat
                    consult fee. In v1 it passes through 100% to you — Kura margin is $0.00.
                  </small>
                </div>
                <Badge appearance="subtle" tone="info" icon={<ShieldIcon size={12} variant="stroke" />}>
                  Pass-through
                </Badge>
              </div>
            ) : (
              <div className="tele-fee tele-fee--self">
                <Input
                  label="Amount collected"
                  inputMode="decimal"
                  value={selfPayAmount}
                  onChange={(e) => setSelfPayAmount(e.currentTarget.value.replace(/[^0-9.]/g, ""))}
                  onBlur={() => setAmountTouched(true)}
                  leadingIcon={<span aria-hidden>$</span>}
                  aria-label="Self-pay amount collected"
                  containerClassName="tele-fee-amount"
                  error={amountTouched && !amountValid ? "Enter the amount collected." : undefined}
                />
                {underCollected ? (
                  <p className="tele-wrap-warn">
                    <WarningIcon size={13} variant="stroke" aria-hidden />
                    Below the {CONSULT_FEE} list fee. The patient pays the full list price for a
                    consult — confirm this under-collection is intended.
                  </p>
                ) : (
                  <p className="tele-wrap-hint">
                    Patient pays the full list consult fee. Your spread is your commission, not a
                    patient discount — Kura keeps the remainder of the list fee.
                  </p>
                )}
              </div>
            )}

            <dl className="tele-split" aria-label="Economic split">
              <div>
                <dt>{covered ? "Payer pays" : "Patient pays"}</dt>
                <dd>{feeStr}</dd>
              </div>
              <div>
                <dt>Your share</dt>
                <dd className="tele-split-you">{split.doctor}</dd>
              </div>
              <div>
                <dt>Kura share</dt>
                <dd className={cx(covered && "tele-split-zero")}>{split.kura}</dd>
              </div>
            </dl>

            <p className="tele-wrap-foot-note">
              {covered
                ? "Covered consult fee passes through 100% to you — Kura margin is $0.00 on this line (§27.1)."
                : "Self-pay: you keep your spread as commission and Kura keeps the rest of the list fee (§20)."}{" "}
              This split freezes only on confirm — paid plus served. It cannot be edited later; a
              correction posts a reversal (§19).
            </p>
          </div>
        </div>

        <div className="tele-wrap-block">
          <h3>Next actions</h3>
          <p className="tele-wrap-hint">
            Optional follow-through. Each opens another surface — Kura coordinates, it isn&rsquo;t
            one monolithic record.
          </p>
          <div className="tele-actions">
            {NEXT_ACTIONS.map((a) => {
              const on = actions.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={cx("tele-action", on && "tele-action--on")}
                  aria-pressed={on}
                  disabled={saving}
                  onClick={() => toggleAction(a.id)}
                >
                  <span className="tele-action-ic" aria-hidden>
                    <a.Icon size={16} variant="stroke" />
                  </span>
                  <span className="tele-action-copy">
                    <strong>{a.label}</strong>
                    <small>{a.hint}</small>
                  </span>
                  <span className="tele-action-check" aria-hidden>
                    {on ? (
                      <CheckCircleIcon size={16} variant="stroke" />
                    ) : (
                      <ArrowRightIcon size={14} variant="stroke" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ---- book a consult (distinct from booking a lab) ----------------------- */

const BOOKABLE_PATIENTS = [
  { id: "p-sokha", name: "Sokha Chann", initials: "SC", age: "54 · F" },
  { id: "p-dara", name: "Dara Pich", initials: "DP", age: "41 · M" },
  { id: "p-vibol", name: "Vibol Chea", initials: "VC", age: "63 · M" },
  { id: "p-chenda", name: "Chenda Lim", initials: "CL", age: "37 · F" },
];

const SLOTS = ["Today · 14:30", "Today · 16:00", "Tomorrow · 09:30", "Tomorrow · 11:15", "Mon · 10:00"];

function BookConsultDrawer({
  open,
  onClose,
  onBook,
  takenSlots,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onBook: (c: Consult) => void;
  takenSlots: string[];
  existingIds: string[];
}) {
  if (!open) return null;
  /* mount fresh per open — local draft starts empty without a reset effect */
  return (
    <BookConsultBody
      onClose={onClose}
      onBook={onBook}
      takenSlots={takenSlots}
      existingIds={existingIds}
    />
  );
}

function BookConsultBody({
  onClose,
  onBook,
  takenSlots,
  existingIds,
}: {
  onClose: () => void;
  onBook: (c: Consult) => void;
  takenSlots: string[];
  existingIds: string[];
}) {
  const [patientId, setPatientId] = useState("");
  const [reason, setReason] = useState("");
  const [slot, setSlot] = useState("");
  const [payerKind, setPayerKind] = useState<"self-pay" | "covered">("self-pay");
  const [insurer, setInsurer] = useState("Forte");
  const [error, setError] = useState<string | null>(null);

  const patient = BOOKABLE_PATIENTS.find((p) => p.id === patientId);
  const ready = !!patient && reason.trim().length >= 3 && !!slot;

  const submit = () => {
    if (!patient || !slot) return;
    const id = `c-${patient.id}-${slot.replace(/\W+/g, "")}`;
    /* dedupe (#14): the same patient + slot would collide on key and double the
       row, and a slot already filled by anyone is a real double-book. */
    if (existingIds.includes(id)) {
      setError("That patient already has a consult in this slot.");
      return;
    }
    if (takenSlots.includes(slot)) {
      setError("That slot is already taken. Pick another time.");
      return;
    }
    const isToday = slot.startsWith("Today");
    /* Slots are "Day · HH:MM". Split into a bare wall-clock time for the row's
       time column and the full slot for the relative when meta, so the Today
       column is uniform (bare times) and when is never double-prefixed (§ fix). */
    const bareTime = slot.includes("·") ? slot.split("·").pop()!.trim() : slot;
    const payer: Payer =
      payerKind === "self-pay"
        ? { kind: "self-pay", fee: CONSULT_FEE }
        : { kind: "covered", insurer, fee: CONSULT_FEE };
    onBook({
      id,
      patient: patient.name,
      initials: patient.initials,
      age: patient.age,
      reason: reason.trim(),
      time: bareTime,
      when: slot,
      tab: isToday ? "today" : "upcoming",
      payer,
      problems: [],
      meds: [],
      labs: [],
      allergies: [],
    });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Book a video consult"
      subtitle="A consult is a non-lab appointment"
      width={440}
      footer={
        <div className="tele-wrap-foot">
          <Button intent="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="primary" disabled={!ready} leadingIcon={<CalendarIcon size={15} variant="stroke" />} onClick={submit}>
            Book consult
          </Button>
        </div>
      }
    >
      <div className="tele-book">
        <Banner tone="info" title="This books a consult, not a lab" icon={<TeleIcon size={16} variant="stroke" />}>
          For tests, draws or specimens, use the lab order flow instead. A consult bills a single
          flat fee.
        </Banner>

        {error && (
          <Banner tone="warning" title="Can't book this slot" icon={<WarningIcon size={16} variant="stroke" />}>
            {error}
          </Banner>
        )}

        <label className="tele-book-field">
          <span>Patient</span>
          <Select
            value={patientId}
            placeholder="Select a patient"
            onChange={(e) => setPatientId(e.currentTarget.value)}
          >
            {BOOKABLE_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.age}
              </option>
            ))}
          </Select>
        </label>

        <div className="tele-book-field">
          <span>Reason for consult</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
            placeholder="e.g. medication review, results follow-up"
            aria-label="Reason for consult"
          />
        </div>

        <label className="tele-book-field">
          <span>Slot</span>
          <Select
            value={slot}
            placeholder="Pick a time"
            onChange={(e) => {
              setSlot(e.currentTarget.value);
              setError(null);
            }}
          >
            {SLOTS.map((s) => {
              const taken = takenSlots.includes(s);
              return (
                <option key={s} value={s} disabled={taken}>
                  {s}
                  {taken ? " · taken" : ""}
                </option>
              );
            })}
          </Select>
        </label>

        <div className="tele-book-field">
          <span>Payer</span>
          <div className="tele-payer-toggle" role="radiogroup" aria-label="Payer">
            <button
              type="button"
              role="radio"
              aria-checked={payerKind === "self-pay"}
              className={cx("tele-payer-opt", payerKind === "self-pay" && "tele-payer-opt--on")}
              onClick={() => setPayerKind("self-pay")}
            >
              <CashIcon size={15} variant="stroke" aria-hidden />
              <span>
                <strong>Self-pay</strong>
                <small>Patient pays {CONSULT_FEE}</small>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={payerKind === "covered"}
              className={cx("tele-payer-opt", payerKind === "covered" && "tele-payer-opt--on")}
              onClick={() => setPayerKind("covered")}
            >
              <ShieldIcon size={15} variant="stroke" aria-hidden />
              <span>
                <strong>Insurer-covered</strong>
                <small>Flat fee, passes to you</small>
              </span>
            </button>
          </div>
        </div>

        {payerKind === "covered" && (
          <label className="tele-book-field">
            <span>Insurer</span>
            <Select value={insurer} onChange={(e) => setInsurer(e.currentTarget.value)}>
              <option value="Forte">Forte</option>
              <option value="Sovannaphum">Sovannaphum</option>
            </Select>
          </label>
        )}

        <p className="tele-book-note">
          <CashIcon size={13} variant="stroke" aria-hidden />
          The fee is captured after the consult ends, once it is paid plus served.
        </p>
      </div>
    </Drawer>
  );
}

export default TelehealthView;
