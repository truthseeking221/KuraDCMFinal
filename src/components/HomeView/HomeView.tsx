"use client";

import { Avatar, Badge, Banner, Button } from "@/components/ui";
import { DemoStateBar, openVerification, useKyd, type KydUiState } from "@/components/Verification";
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
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./HomeView.css";

/* Home is a doctor work *launcher*, not a licence-review page. It answers, in
   order: (1) what needs attention now, (2) what can I do next (create order /
   find patient), (3) what was recently active, (4) is anything blocking me.
   Licence is only a conditional blocker — never the page. Two modes:
     • Explorer Home  — not approved yet: compact licence banner + next step,
       plus demo patient + catalog so the page is never an empty dashboard.
     • Practice Home  — approved: greeting, create order, patient search,
       needs-attention, lab-order lifecycle, recent orders/patients, account. */

export type HomeTone = "danger" | "warning" | "info" | "neutral" | "success";

export type HomeAttentionItem = {
  id: string;
  tone: HomeTone;
  label: string;
  detail: string;
  /* Who the work is about — patient names, so the doctor knows the scope
     without clicking through. */
  context?: string;
  actionLabel: string;
  onAction: () => void;
};

export type HomeLifecycleCell = {
  id: string;
  /* Doctor-facing lifecycle label (Awaiting collection / Sample collected /
     Results returned) — backed by booking bookingStatus. */
  label: string;
  count: number;
  tone: HomeTone;
  onOpen: () => void;
};

export type HomeRecentOrder = {
  id: string;
  patient: string;
  initials: string;
  tests: string;
  statusLabel: string;
  statusTone: HomeTone;
  updated: string;
  onOpen: () => void;
};

export type HomeRecentPatient = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  onOpen: () => void;
};

export type HomeModel = {
  doctorName: string;
  dateLabel: string;
  needsAttention: HomeAttentionItem[];
  lifecycle: HomeLifecycleCell[];
  recentOrders: HomeRecentOrder[];
  recentPatients: HomeRecentPatient[];
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

export function HomeView(props: HomeViewProps) {
  const kyd = useKyd();
  const { uiState } = kyd;
  return (
    <>
      {uiState !== "approved" ? <ExplorerHome {...props} uiState={uiState} /> : <PracticeHome {...props} />}
      {/* Prototype-only: KYD state simulator, collapsed by default so QA tooling
          doesn't compete with the doctor workspace. Native <details> = keyboard
          accessible. Flip any verification state without opening the gate. */}
      <details className="home-demo">
        <summary className="home-demo-summary">Prototype controls</summary>
        <div className="home-demo-body">
          <button type="button" className="home-demo-patient" onClick={props.onOpenDemoPatient}>
            Open demo patient — Sokha Chann chart
          </button>
          <DemoStateBar kyd={kyd} />
        </div>
      </details>
    </>
  );
}

/* ---- Practice Home (approved) ------------------------------------------- */

function PracticeHome({
  model,
  onCreateOrder,
  onFindPatient,
  onViewBookings,
  onBrowseCatalog,
}: HomeViewProps) {
  const { needsAttention, lifecycle, recentOrders, recentPatients } = model;

  return (
    <div className="home home--practice" aria-label="Doctor home">
      <header className="home-top">
        <div className="home-greeting">
          <h2>Good morning, {model.doctorName}</h2>
        </div>
        <Button intent="primary" leadingIcon={<PlusIcon size={16} variant="stroke" />} onClick={onCreateOrder}>
          Create lab order
        </Button>
      </header>

      {/* Patient search sits near the top; name or phone, never OTP here. */}
      <button className="home-search" onClick={onFindPatient} type="button">
        <SearchIcon aria-hidden size={18} variant="stroke" />
        <span>Find a patient by name or phone</span>
        <kbd>⌘K</kbd>
      </button>

      {/* Glance layer: today's pipeline at a glance, full width. Each tile drills
          into the matching Bookings filter — summary first, detail on click. */}
      <div className="home-today" role="group" aria-label="Today's work">
        {lifecycle.map((cell) => (
          <button
            className={cx("home-today-cell", `tone-${cell.tone}`)}
            key={cell.id}
            onClick={cell.onOpen}
            type="button"
          >
            <span className="home-today-text">
              <span className="home-today-count">{cell.count}</span>
              <span className="home-today-label">{cell.label}</span>
            </span>
            <ChevronRightIcon aria-hidden className="home-today-go" size={15} variant="stroke" />
          </button>
        ))}
      </div>

      {/* Work layer: priorities + recent orders on the left, people + shortcuts
          on the right. Collapses to one column on narrow. */}
      <div className="home-grid">
        <div className="home-col home-col--main">
          <Section title="Needs attention" count={needsAttention.length || undefined}>
            {needsAttention.length === 0 ? (
              <EmptyRow icon={<CheckCircleIcon size={18} variant="stroke" />} text="You're all caught up — nothing needs attention." />
            ) : (
              <ul className="home-attn">
                {needsAttention.map((item) => {
                  const Icon = TONE_ICON[item.tone];
                  return (
                    <li className="home-attn-row" key={item.id}>
                      <span aria-hidden className={cx("home-attn-ic", `tone-${item.tone}`)}>
                        <Icon size={16} variant="stroke" />
                      </span>
                      <span className="home-attn-copy">
                        <span className="home-attn-label">{item.label}</span>
                        <span className="home-attn-detail">{item.detail}</span>
                        {item.context ? <span className="home-attn-context">{item.context}</span> : null}
                      </span>
                      {item.tone === "danger" ? (
                        <Button intent="outline" size="sm" onClick={item.onAction}>
                          {item.actionLabel}
                        </Button>
                      ) : (
                        <button type="button" className="home-attn-link" onClick={item.onAction}>
                          {item.actionLabel}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Recent orders" action={{ label: "View all", onClick: onViewBookings }}>
            {recentOrders.length === 0 ? (
              <EmptyRow
                icon={<BookingIcon size={18} variant="stroke" />}
                text="No recent orders yet."
                action={{ label: "Create lab order", onClick: onCreateOrder }}
              />
            ) : (
              <ul className="home-orders">
                {recentOrders.map((order) => {
                  const Icon = TONE_ICON[order.statusTone];
                  return (
                    <li key={order.id}>
                      <button className="home-order-row" onClick={order.onOpen} type="button">
                        <Avatar initials={order.initials} name={order.patient} size="sm" />
                        <span className="home-order-copy">
                          <span className="home-order-name">{order.patient}</span>
                          <span className="home-order-tests">{order.tests}</span>
                        </span>
                        <span className="home-order-meta">
                          <Badge appearance="subtle" tone={badgeTone(order.statusTone)} icon={<Icon size={12} variant="stroke" />}>
                            {order.statusLabel}
                          </Badge>
                          <span className="home-order-updated">{order.updated}</span>
                        </span>
                        <ChevronRightIcon aria-hidden size={15} variant="stroke" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="home-col home-col--side">
          {recentPatients.length > 0 && (
            <Section title="Recent patients">
              <ul className="home-patients">
                {recentPatients.map((patient) => (
                  <li key={patient.id}>
                    <button className="home-patient-row" onClick={patient.onOpen} type="button">
                      <Avatar initials={patient.initials} name={patient.name} size="sm" />
                      <span className="home-patient-copy">
                        <span className="home-patient-name">{patient.name}</span>
                        <span className="home-patient-detail">{patient.detail}</span>
                      </span>
                      <ChevronRightIcon aria-hidden size={15} variant="stroke" />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Jump to">
            <ul className="home-jump">
              <li>
                <button className="home-jump-row" onClick={onBrowseCatalog} type="button">
                  <CatalogIcon aria-hidden size={17} variant="stroke" />
                  <span>Browse lab catalog</span>
                  <ChevronRightIcon aria-hidden size={15} variant="stroke" />
                </button>
              </li>
              <li>
                <button className="home-jump-row" onClick={onViewBookings} type="button">
                  <BookingIcon aria-hidden size={17} variant="stroke" />
                  <span>All bookings</span>
                  <ChevronRightIcon aria-hidden size={15} variant="stroke" />
                </button>
              </li>
              <li>
                <button className="home-jump-row" onClick={onFindPatient} type="button">
                  <SearchIcon aria-hidden size={17} variant="stroke" />
                  <span>Find a patient</span>
                  <ChevronRightIcon aria-hidden size={15} variant="stroke" />
                </button>
              </li>
            </ul>
          </Section>
        </div>
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
    title: "Verify your licence to create real lab orders",
    body: "Explore the catalog and a demo patient while your medical licence is reviewed.",
    action: { label: "Start verification", kind: "verify", intent: "primary" },
  },
  draft: {
    tone: "info", bannerTone: "info", Icon: UploadIcon,
    title: "Finish verifying your licence",
    body: "You started verification but haven't submitted it yet.",
    action: { label: "Continue verification", kind: "verify", intent: "primary" },
  },
  uploading: {
    tone: "info", bannerTone: "info", Icon: UploadIcon,
    title: "Submitting your licence…",
    body: "Hang tight — we're uploading your document. This usually takes a moment.",
  },
  upload_failed: {
    tone: "danger", bannerTone: "danger", Icon: WarningIcon,
    title: "Licence upload didn't go through",
    body: "Something interrupted the upload. Try submitting your document again.",
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
    body: "Reviews are usually approved within 24 hours. No action needed meanwhile.",
    action: { label: "View submission", kind: "verify", intent: "outline" },
  },
  approved: {
    tone: "success", bannerTone: "success", Icon: ShieldIcon,
    title: "Your licence is verified",
    body: "You can now create real lab orders for this clinic.",
  },
  needs_resubmission: {
    tone: "warning", bannerTone: "warning", Icon: WarningIcon,
    title: "Your licence needs another look",
    body: "We couldn't approve it as submitted. Re-upload a clearer or updated document to continue.",
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
    body: "This is a workspace permission issue — ask a clinic admin to update your access. You don't need to re-upload anything.",
  },
  offline: {
    tone: "neutral", bannerTone: "warning", Icon: RefreshIcon,
    title: "You're offline",
    body: "Showing cached content. Reconnect, then retry to check your licence status.",
    action: { label: "Retry", kind: "retry", intent: "outline" },
    offline: true,
  },
  unknown_error: {
    tone: "neutral", bannerTone: "danger", Icon: WarningIcon,
    title: "Licence status unavailable",
    body: "We couldn't load your verification status. The page is fine — try again in a moment.",
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
          <p className="home-eyebrow">{model.dateLabel}</p>
          <h2>Welcome, {model.doctorName}</h2>
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

      <div className="home-explore">
        <Section title="Available now" hint="No licence needed">
          <div className="home-explore-cards">
            <ExploreCard
              icon={<HeartIcon size={18} variant="stroke" />}
              title="Demo patient"
              detail="Review the Sokha Chann chart and care plan."
              onClick={onOpenDemoPatient}
            />
            <ExploreCard
              icon={<CatalogIcon size={18} variant="stroke" />}
              title="Lab catalog"
              detail="Browse tests, tubes, turnaround and coverage."
              onClick={onBrowseCatalog}
            />
            <ExploreCard
              icon={<FlaskIcon size={18} variant="stroke" />}
              title="Demo order walkthrough"
              detail="See how a lab order flows, end to end."
              onClick={onCreateOrder}
              disabled={state.offline}
            />
          </div>
        </Section>

        <Section title="Unlocks after approval" hint="Clinical actions">
          <ul className="home-unlock">
            <li><ShieldIcon size={15} variant="stroke" /> Create real lab orders</li>
            <li><ShareIcon size={15} variant="stroke" /> Route PSC or clinic draws</li>
            <li><CheckIcon size={15} variant="stroke" /> Send results to patients</li>
          </ul>
        </Section>
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
          {count !== undefined && <span className="home-section-count">{count}</span>}
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

function ExploreCard({
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
    <button className="home-explore-card" disabled={disabled} onClick={onClick} type="button">
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
