"use client";

import { Avatar, Badge, Banner, Button } from "@/components/ui";
import { openVerification, useKyd, type KydUiState } from "@/components/Verification";
import {
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Catalog as CatalogIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  CheckShield as ShieldIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./HomeView.css";

/* Home is a doctor work *launcher*, not only a revenue dashboard. It answers, in
   order: (1) what needs attention now, (2) which bookings need a next step,
   (3) which patient follow-ups are waiting, (4) what the doctor earned.
   Licence is only a conditional blocker — never the page. Two modes:
     • Explorer Home  — not approved yet: compact licence banner + next step,
       plus demo patient + catalog so the page is never an empty dashboard.
     • Practice Home  — approved: greeting, needs-attention, lab-order
       lifecycle, recent orders/patients, account. */

export type HomeTone = "danger" | "warning" | "info" | "neutral" | "success";

export type HomeAttentionItem = {
  id: string;
  tone: HomeTone;
  label: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
};

export type HomeRecentOrder = {
  id: string;
  bookingCode: string;
  patient: string;
  patientMeta: string;
  initials: string;
  tests: string;
  statusLabel: string;
  statusTone: HomeTone;
  updated: string;
  nextActionLabel: string;
  nextActionTone?: "brand" | "muted";
  onOpen: () => void;
};

export type HomeRecentPatient = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  reason: string;
  reasonTone: HomeTone;
  openedAt: string;
  onOpen: () => void;
};

/* One earning transaction — the doctor's spread on a single booking, with its
   settlement state. "+" earns, "−" owed back to Kura (paid-not-served). */
export type HomeEarningTxn = {
  id: string;
  detail: string;
  amount: string;
  amountTone: "success" | "warning" | "danger";
  statusLabel: string;
  time: string;
};

/* Doctor earnings — the spread the doctor keeps on lab orders they place. A calm
   awareness summary (today + month-to-date) plus a short transaction history,
   never a revenue cockpit. */
export type HomeEarnings = {
  today: string;
  todayDetail: string;
  month: string;
  monthDetail: string;
  trend?: string;
  trendTone?: "success" | "neutral";
  transactions?: HomeEarningTxn[];
  onView?: () => void;
};

export type HomeModel = {
  doctorName: string;
  dateLabel: string;
  needsAttention: HomeAttentionItem[];
  recentOrders: HomeRecentOrder[];
  recentPatients: HomeRecentPatient[];
  earnings?: HomeEarnings;
};

export type HomeViewProps = {
  model: HomeModel;
  /* Create lab order opens the real order flow (phone verify / patient search →
     identity resolution → tests → payment & timing → confirm). */
  onCreateOrder: () => void;
  onFindPatient: () => void;
  onBrowseCatalog: () => void;
  onViewBookings: () => void;
  /* Explorer escape hatch — open the demo patient record. */
  onOpenDemoPatient: () => void;
};

/* Status is never colour alone: every tone carries a matching icon. */
const TONE_ICON: Record<HomeTone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: FlaskIcon,
  success: CheckCircleIcon,
  neutral: CalendarIcon,
};

function badgeTone(tone: HomeTone): "neutral" | "info" | "success" | "warning" | "danger" {
  return tone;
}

function parseSignedMoney(amount: string): number | null {
  const value = amount.trim();

  if (!/\d/.test(value)) return null;

  const sign = value.startsWith("-") || value.startsWith("−") ? -1 : 1;
  const numeric = Number(value.replace(/[^0-9.]/g, ""));

  return Number.isFinite(numeric) ? sign * numeric : null;
}

function formatSignedMoney(value: number): string {
  const sign = value < 0 ? "−" : "+";
  const absoluteValue = Math.abs(value);
  const formatted = absoluteValue.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(absoluteValue) ? 0 : 2,
  });

  return `${sign}$${formatted}`;
}

function summarizeTransactionGroup(transactions: HomeEarningTxn[]): string {
  if (transactions.length === 1) return transactions[0].detail;

  return `${transactions.length} orders`;
}

function summarizeEarningTransactions(transactions: HomeEarningTxn[]): HomeEarningTxn[] {
  const groups = new Map<string, HomeEarningTxn[]>();

  transactions.forEach((txn) => {
    const key = `${txn.statusLabel}|${txn.time}|${txn.amountTone}`;
    groups.set(key, [...(groups.get(key) ?? []), txn]);
  });

  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0];

    let total = 0;
    let canSum = true;

    group.forEach((txn) => {
      const amount = parseSignedMoney(txn.amount);

      if (amount === null) {
        canSum = false;
        return;
      }

      total += amount;
    });

    return {
      ...group[0],
      id: group.map((txn) => txn.id).join("__"),
      detail: summarizeTransactionGroup(group),
      amount: canSum ? formatSignedMoney(total) : group[0].amount,
    };
  });
}

export function HomeView(props: HomeViewProps) {
  const kyd = useKyd();
  const { uiState } = kyd;
  return uiState !== "approved" ? <ExplorerHome {...props} uiState={uiState} /> : <PracticeHome {...props} />;
}

/* ---- Practice Home (approved) ------------------------------------------- */

/* page.tsx may emit needsAttention out of urgency order. This priority makes the
   worst thing always read first; a stable sort keeps seeded order within a tone. */
const ATTENTION_PRIORITY: Record<HomeTone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
  neutral: 4,
};

function PracticeHome({
  model,
  onCreateOrder,
  onFindPatient,
  onViewBookings,
}: HomeViewProps) {
  const recentOrders = model.recentOrders ?? [];
  const recentPatients = model.recentPatients ?? [];
  const earnings = model.earnings;
  const earningTransactions = earnings?.transactions ?? [];
  const summarizedEarningTransactions = summarizeEarningTransactions(earningTransactions);
  const attention = [...(model.needsAttention ?? [])].sort(
    (a, b) => ATTENTION_PRIORITY[a.tone] - ATTENTION_PRIORITY[b.tone],
  );
  const attentionCount = attention.length;
  /* The count pill earns its red: neutral by default, danger only when a
     danger item is actually present — never a permanent alarm tint. */
  const hasDanger = attention.some((item) => item.tone === "danger");

  /* A warm, time-aware greeting + one calm orienting line — the morning
     briefing feeling, never a metrics dashboard. */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLine =
    attentionCount === 0
      ? "You're all caught up. Have a calm day."
      : `${attentionCount} ${attentionCount === 1 ? "thing needs" : "things need"} your attention today.`;

  return (
    <div className="home home--practice" aria-label="Doctor home">
      <header className="home-masthead">
        <div className="home-masthead-row">
          <div className="home-masthead-lede">
            <p className="home-eyebrow">{model.dateLabel}</p>
            <h1>
              {greeting}, {model.doctorName}
            </h1>
            <p className="home-masthead-sub">{todayLine}</p>
          </div>
        </div>
      </header>

      <div className="home-workbench">
        <div className="home-main-panel">
          <section className="home-attention-panel" aria-label="Needs attention">
            <div className="home-attention-head">
              <h2>Needs attention</h2>
              {attentionCount > 0 && (
                <Badge appearance="subtle" className="home-section-count" tone={hasDanger ? "danger" : "neutral"}>
                  {attentionCount}
                </Badge>
              )}
            </div>
            {attentionCount === 0 ? (
              <div className="home-empty-row">
                <span aria-hidden className="home-empty-ic">
                  <CheckCircleIcon size={18} variant="stroke" />
                </span>
                <span>{"You're all caught up. Nothing needs your attention."}</span>
              </div>
            ) : (
              <ul className="home-attention-list">
                {attention.map((item) => {
                  const Icon = TONE_ICON[item.tone];
                  return (
                    <li className={cx("home-attention-row", `tone-${item.tone}`)} key={item.id}>
                      <span aria-hidden className="home-tone-icon">
                        <Icon size={18} variant="stroke" />
                      </span>
                      <span className="home-attention-copy">
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                      </span>
                      {/* One secondary CTA with a trailing chevron — the chevron
                          rides inside the button, not a separate decorative column. */}
                      <Button
                        className="home-attention-cta"
                        intent="secondary"
                        size="sm"
                        trailingIcon={<ChevronRightIcon aria-hidden size={16} variant="stroke" />}
                        onClick={item.onAction}
                      >
                        {item.actionLabel}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="home-lab-activity" aria-label="Lab bookings">
            <div className="home-section-head">
              <h2>
                Lab bookings
                {recentOrders.length > 0 && (
                  <Badge appearance="subtle" className="home-section-count" tone="neutral">
                    {recentOrders.length}
                  </Badge>
                )}
              </h2>
              {recentOrders.length > 0 && (
                <button type="button" className="home-section-action" onClick={onViewBookings}>
                  View all
                  <ChevronRightIcon aria-hidden size={13} variant="stroke" />
                </button>
              )}
            </div>
            {recentOrders.length === 0 ? (
              <EmptyRow
                icon={<BookingIcon size={18} variant="stroke" />}
                text="No lab bookings yet."
                action={{ label: "Book lab tests", onClick: onCreateOrder }}
              />
            ) : (
              <div className="home-activity-frame">
                <table className="home-activity-table">
                  <thead>
                    <tr>
                      <th scope="col">Patient</th>
                      <th scope="col">Tests</th>
                      <th scope="col">Status</th>
                      <th scope="col">Next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const Icon = TONE_ICON[order.statusTone];
                      const actionIsMuted = order.nextActionTone === "muted";
                      return (
                        <tr key={order.id}>
                          <td className="home-table-patient-cell">
                            <button className="home-table-patient" onClick={order.onOpen} type="button">
                              <Avatar initials={order.initials} name={order.patient} size="sm" />
                              <span>
                                <strong>{order.patient}</strong>
                                <small>
                                  {order.bookingCode} · {order.patientMeta}
                                </small>
                              </span>
                            </button>
                          </td>
                          <td className="home-tests">{order.tests}</td>
                          <td>
                            <Badge appearance="subtle" tone={badgeTone(order.statusTone)} icon={<Icon size={12} variant="stroke" />}>
                              {order.statusLabel}
                            </Badge>
                          </td>
                          <td className="home-next-cell">
                            {actionIsMuted ? (
                              <span className="home-next-muted">{order.nextActionLabel}</span>
                            ) : (
                              <Button
                                className="home-next-cta"
                                intent="secondary"
                                size="sm"
                                trailingIcon={<ChevronRightIcon aria-hidden size={16} variant="stroke" />}
                                onClick={order.onOpen}
                              >
                                {order.nextActionLabel}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {recentPatients.length > 0 && (
            <section className="home-section home-patients-panel" aria-label="Patient follow-ups">
              <div className="home-section-head">
                <h2>
                  Patient follow-ups
                  <Badge appearance="subtle" className="home-section-count" tone="neutral">
                    {recentPatients.length}
                  </Badge>
                </h2>
                <button type="button" className="home-section-action" onClick={onFindPatient}>
                  View all
                  <ChevronRightIcon aria-hidden size={13} variant="stroke" />
                </button>
              </div>
              <ul className="home-chart-list">
                {recentPatients.map((patient) => {
                  const ReasonIcon = TONE_ICON[patient.reasonTone];
                  return (
                    <li key={patient.id}>
                      <button
                        aria-label={`Open ${patient.name} chart for ${patient.reason}`}
                        className={cx("home-chart-row", `tone-${patient.reasonTone}`)}
                        onClick={patient.onOpen}
                        type="button"
                      >
                        <Avatar initials={patient.initials} name={patient.name} size="sm" />
                        <span className="home-chart-copy">
                          <strong>{patient.name}</strong>
                          <small>{patient.detail}</small>
                        </span>
                        <span className="home-chart-reason">
                          <strong>
                            <ReasonIcon aria-hidden size={12} variant="stroke" />
                            {patient.reason}
                          </strong>
                          <small>{patient.openedAt}</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {earnings && (
          <aside className="home-side-rail" aria-label="Doctor earnings">
            <section className="home-rail-section" aria-label="Your earnings">
              <div className="home-rail-head">
                <h3>Your earnings</h3>
                {earnings.onView && (
                  <button type="button" className="home-section-action" onClick={earnings.onView}>
                    Details
                    <ChevronRightIcon aria-hidden size={13} variant="stroke" />
                  </button>
                )}
              </div>
              <div className="home-earnings">
                <div className="home-earning">
                  <strong>{earnings.today}</strong>
                  <span>Today</span>
                  <small>{earnings.todayDetail}</small>
                </div>
                <div className="home-earning">
                  <strong>{earnings.month}</strong>
                  <span>This month</span>
                  <small>{earnings.monthDetail}</small>
                </div>
              </div>
              {earnings.trend && (() => {
                const TrendIcon = TONE_ICON[earnings.trendTone ?? "neutral"];
                return (
                  <p className={cx("home-earning-trend", `tone-${earnings.trendTone ?? "neutral"}`)}>
                    <TrendIcon aria-hidden size={13} variant="stroke" />
                    {earnings.trend}
                  </p>
                );
              })()}
            </section>

            {earningTransactions.length > 0 && (
              <section className="home-rail-section" aria-label="Transaction history">
                <div className="home-rail-head">
                  <h3>Transaction history</h3>
                  {earnings.onView && (
                    <button type="button" className="home-section-action" onClick={earnings.onView}>
                      View all
                      <ChevronRightIcon aria-hidden size={13} variant="stroke" />
                    </button>
                  )}
                </div>
                <ul className="home-txn-list">
                  {summarizedEarningTransactions.slice(0, 4).map((txn) => (
                    <li key={txn.id}>
                      <button
                        aria-label={`${txn.amount}, ${txn.statusLabel}, ${txn.detail}, ${txn.time}`}
                        className="home-txn-row"
                        type="button"
                        onClick={earnings.onView}
                      >
                        <span className="home-txn-copy">
                          <strong className={`tone-${txn.amountTone}`}>{txn.amount}</strong>
                          <small>{txn.detail}</small>
                        </span>
                        <span className="home-txn-money">
                          <strong>{txn.statusLabel}</strong>
                          <small>{txn.time}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---- Explorer Home (not approved) --------------------------------------- */

type ExplorerState = {
  tone: "info" | "success" | "warning" | "danger" | "neutral";
  bannerTone: "info" | "success" | "warning" | "danger";
  Icon: (props: IconProps) => React.ReactElement;
  title: string;
  body: string;
  /* primary next action; kind selects the handler. omit for terminal/in-flight
     states (uploading, permission_denied). */
  action?: { label: string; kind: "verify" | "retry"; intent?: "primary" | "outline" };
  /* network-dependent actions (demo order, retry) are disabled offline. */
  offline?: boolean;
};

const EXPLORER: Record<KydUiState, ExplorerState> = {
  not_started: {
    tone: "warning", bannerTone: "warning", Icon: ShieldIcon,
    title: "Verify your licence to order labs",
    body: "Upload your medical licence. You can use the demo patient and catalog now.",
    action: { label: "Start verification", kind: "verify", intent: "primary" },
  },
  draft: {
    tone: "info", bannerTone: "info", Icon: UploadIcon,
    title: "Finish licence verification",
    body: "Submit your licence to unlock real lab orders.",
    action: { label: "Continue verification", kind: "verify", intent: "primary" },
  },
  uploading: {
    tone: "info", bannerTone: "info", Icon: UploadIcon,
    title: "Submitting your licence…",
    body: "Uploading your document. This usually takes a moment.",
  },
  upload_failed: {
    tone: "danger", bannerTone: "danger", Icon: WarningIcon,
    title: "Licence upload failed",
    body: "Try submitting your document again.",
    action: { label: "Retry upload", kind: "verify", intent: "primary" },
  },
  submitted: {
    tone: "info", bannerTone: "info", Icon: ClockIcon,
    title: "Licence under review",
    body: "Submitted — reviews are usually approved within 24 hours. No action needed.",
    action: { label: "View submission", kind: "verify", intent: "outline" },
  },
  under_review: {
    tone: "info", bannerTone: "info", Icon: ClockIcon,
    title: "Licence under review",
    body: "Reviews are usually approved within 24 hours. No action needed.",
    action: { label: "View submission", kind: "verify", intent: "outline" },
  },
  approved: {
    tone: "success", bannerTone: "success", Icon: ShieldIcon,
    title: "Your licence is verified",
    body: "You can now create real lab orders for this clinic.",
  },
  needs_resubmission: {
    tone: "warning", bannerTone: "warning", Icon: WarningIcon,
    title: "Resubmit your licence",
    body: "Upload a clearer or updated document to continue.",
    action: { label: "Fix submission", kind: "verify", intent: "primary" },
  },
  expired: {
    tone: "warning", bannerTone: "warning", Icon: ClockIcon,
    title: "Your licence has expired",
    body: "Renew it to place real lab orders again. Real order creation is blocked until you do.",
    action: { label: "Renew licence", kind: "verify", intent: "primary" },
  },
  permission_denied: {
    tone: "neutral", bannerTone: "info", Icon: LockIcon,
    title: "Verification isn't available for your role",
    body: "Ask a clinic admin to update your access. You don't need to re-upload anything.",
  },
  offline: {
    tone: "neutral", bannerTone: "warning", Icon: RefreshIcon,
    title: "You're offline",
    body: "Reconnect, then retry to check your licence status.",
    action: { label: "Retry", kind: "retry", intent: "outline" },
    offline: true,
  },
  unknown_error: {
    tone: "neutral", bannerTone: "danger", Icon: WarningIcon,
    title: "Licence status unavailable",
    body: "Try again in a moment.",
    action: { label: "Retry", kind: "retry", intent: "outline" },
  },
};

function ExplorerHome({
  model,
  uiState,
  onCreateOrder,
  onBrowseCatalog,
  onOpenDemoPatient,
}: HomeViewProps & { uiState: KydUiState }) {
  const kyd = useKyd();
  const state = EXPLORER[uiState] ?? EXPLORER.not_started;
  const Icon = state.Icon;
  const onAction = state.action?.kind === "retry" ? kyd.refetch : openVerification;

  return (
    <div className="home home--explorer" aria-label="Get started with Kura">
      <header className="home-top">
        <div className="home-greeting">
          <h2>Welcome, {model.doctorName}</h2>
          <p className="home-masthead-sub">Start verification, or explore Kura with demo data.</p>
        </div>
      </header>

      {/* Compact licence banner — a conditional blocker, not a hero. */}
      <Banner
        tone={state.bannerTone}
        title={state.title}
        icon={<Icon size={18} variant="stroke" />}
        actions={
          state.action ? (
            <Button intent={state.action.intent ?? "primary"} size="sm" onClick={onAction}>
              {state.action.label}
            </Button>
          ) : undefined
        }
      >
        {state.body}
      </Banner>

      {/* Same workbench rhythm as approved Home: launch rows in the main panel,
          After approval demoted to a quiet rail (drops below on smaller screens). */}
      <div className="home-workbench">
        <div className="home-main-panel">
          <Section title="Available now">
            <ul className="home-explore-list">
              <li>
                <ExploreRow
                  icon={<HeartIcon size={18} variant="stroke" />}
                  title="Demo patient"
                  detail="Review a real patient chart."
                  onClick={onOpenDemoPatient}
                />
              </li>
              <li>
                <ExploreRow
                  icon={<CatalogIcon size={18} variant="stroke" />}
                  title="Lab catalog"
                  detail="Browse tests, tubes and turnaround."
                  onClick={onBrowseCatalog}
                />
              </li>
              <li>
                <ExploreRow
                  icon={<FlaskIcon size={18} variant="stroke" />}
                  title="Order walkthrough"
                  detail="Preview the lab order flow."
                  onClick={onCreateOrder}
                  disabled={state.offline}
                />
              </li>
            </ul>
          </Section>
        </div>

        <aside className="home-side-rail" aria-label="After approval">
          <Section title="After approval">
            <ul className="home-unlock">
              <li><ShieldIcon size={15} variant="stroke" /> Real lab orders</li>
              <li><ShareIcon size={15} variant="stroke" /> PSC or clinic draws</li>
              <li><CheckIcon size={15} variant="stroke" /> Patient result sharing</li>
            </ul>
          </Section>
        </aside>
      </div>
    </div>
  );
}

/* ---- Shared pieces ------------------------------------------------------ */

function Section({
  title,
  count,
  hint,
  action,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <section className="home-section" aria-label={title}>
      <div className="home-section-head">
        <h3>
          {title}
          {count !== undefined && (
            <Badge appearance="subtle" className="home-section-count" tone="neutral">
              {count}
            </Badge>
          )}
        </h3>
        {hint && <span className="home-section-hint">{hint}</span>}
        {action && (
          <button className="home-section-action" onClick={action.onClick} type="button">
            {action.label}
            <ChevronRightIcon aria-hidden size={13} variant="stroke" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function ExploreRow({
  icon,
  title,
  detail,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="home-explore-row" disabled={disabled} onClick={onClick} type="button">
      <span aria-hidden className="home-explore-ic">
        {icon}
      </span>
      <span className="home-explore-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <ChevronRightIcon aria-hidden size={16} variant="stroke" />
    </button>
  );
}

function EmptyRow({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="home-empty-row">
      <span aria-hidden className="home-empty-ic">
        {icon}
      </span>
      <span>{text}</span>
      {action && (
        <Button intent="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
