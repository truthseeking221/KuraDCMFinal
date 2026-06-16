"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button } from "@/components/ui";
import { useOrderDraft } from "@/components/OrderDraft";
import { DemoStateBar, useKyd, VERIFICATION_HREF, type KydUiState } from "@/components/Verification";
import {
  Booking as BookingIcon,
  CheckShield as ShieldIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import "./HomeView.css";

/* The Home view is a Doctor Work Queue, not a dashboard: it surfaces the day's
   unfinished and high-priority work (results, bookings, drafts, care plans,
   blockers) and routes each item into the right patient + tab to finish it. It
   never repeats a whole tab's content. Data is built in page.tsx from the same
   models the tabs render; this component only renders + wires the live order
   draft and verification state. */

export type HomeTone = "danger" | "warning" | "info" | "neutral" | "success";

export type HomeAttentionItem = {
  id: string;
  initials: string;
  patient: string;
  reason: string;
  detail: string;
  tone: HomeTone;
  actionLabel: string;
  onAction: () => void;
};

export type HomeAttentionPatient = {
  id: string;
  initials: string;
  name: string;
  summary: string;
  tone: HomeTone;
  onAction: () => void;
};

export type HomeLabOp = { id: string; label: string; count: number; onOpen: () => void };

export type HomeCarePlan = {
  id: string;
  patient: string;
  plan: string;
  detail: string;
  tone: HomeTone;
  onOpen: () => void;
};

export type HomeRailItem = {
  id: string;
  label: string;
  detail?: string;
  tone?: HomeTone;
  onAction?: () => void;
};

export type HomeModel = {
  doctorName: string;
  dateLabel: string;
  summary: Array<{ id: string; label: string; count: number; tone?: HomeTone; onClick?: () => void }>;
  attention: HomeAttentionItem[];
  patients: HomeAttentionPatient[];
  labOps: HomeLabOp[];
  carePlans: HomeCarePlan[];
  nextActions: HomeRailItem[];
  safety: HomeRailItem[];
};

export type HomeViewProps = {
  model: HomeModel;
  onOrderLabs: () => void;
  onFindPatient: () => void;
  /* Explorer escape hatch — open the demo patient record */
  onOpenDemoPatient: () => void;
};

export function HomeView({ model, onOrderLabs, onFindPatient, onOpenDemoPatient }: HomeViewProps) {
  const router = useRouter();
  const kyd = useKyd();
  const { uiState } = kyd;
  const { lineCount, draft } = useOrderDraft();

  const verified = uiState === "approved";
  const draftNeedsRoute = lineCount > 0 && draft.checkout.route === null;

  if (!verified) {
    return (
      <HomeExplorer
        kyd={kyd}
        dateLabel={model.dateLabel}
        doctorName={model.doctorName}
        uiState={uiState}
        onOpenDemoPatient={onOpenDemoPatient}
        onOrderLabs={onOrderLabs}
        onRetry={kyd.refetch}
        onVerify={() => router.push(VERIFICATION_HREF)}
      />
    );
  }

  /* Fold the live lab order into the queue so an unfinished order is never
     orphaned in the Orders tab. */
  const attention = [...model.attention];
  if (draftNeedsRoute) {
    attention.push({
      id: "att-draft",
      initials: "SC",
      patient: "Lab order",
      reason: `${lineCount} test${lineCount === 1 ? "" : "s"} selected`,
      detail: "Route not chosen — pick PSC walk-in or clinic draw",
      tone: "warning",
      actionLabel: "Continue order",
      onAction: onOrderLabs,
    });
  }

  const labOps = [...model.labOps];
  if (draftNeedsRoute) {
    labOps.push({ id: "drafts", label: "Lab order · route needed", count: 1, onOpen: onOrderLabs });
  }

  const noWork = attention.length === 0 && model.patients.length === 0 && model.carePlans.length === 0;
  /* Patient-first work queue: every patient surfaces once, with their open
     work (attention items + care plan + at-risk reason) folded into a single
     group, so the same name never stacks down the feed. The unfinished lab
     order rides along as a standalone non-patient group. */
  const groups = buildPatientGroups(attention, model.patients, model.carePlans);

  return (
    <div className="home" aria-label="Today's clinical work">
      <DemoStateBar kyd={kyd} />
      <header className="home-header">
        <div className="home-greeting">
          <p className="home-date">{model.dateLabel}</p>
          <h2>Good morning, {model.doctorName}</h2>
          <p className="home-focus-sub">Here&apos;s your focus for today.</p>
        </div>
        <div className="home-cta">
          <Button intent="primary" leadingIcon={<FlaskIcon size={16} variant="stroke" />} onClick={onOrderLabs}>
            Order labs
          </Button>
          <Button intent="outline" leadingIcon={<SearchIcon size={16} variant="stroke" />} onClick={onFindPatient}>
            Find patient
          </Button>
        </div>
      </header>

      {!noWork && (
        <section className="home-summary" aria-label="Queue summary">
          {model.summary.map((s, i) => {
            const onClick =
              s.onClick ??
              (i === 0
                ? () => document.querySelector(".home-patient-work")?.scrollIntoView({ behavior: "smooth", block: "start" })
                : undefined);
            return (
              <button
                aria-label={`${s.count} ${s.label}`}
                className={cx("home-summary-item", s.tone && `tone-${s.tone}`)}
                key={s.id}
                onClick={onClick}
                type="button"
              >
                <span className="home-summary-top">
                  <strong className="home-summary-count">{s.count}</strong>
                  <ChevronRightIcon aria-hidden className="home-summary-go" size={16} variant="stroke" />
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </section>
      )}

      {noWork ? (
        <HomeEmpty onFindPatient={onFindPatient} onOrderLabs={onOrderLabs} />
      ) : (
        <div className="home-layout">
          <main className="home-main">
            <section className="home-patient-work" aria-label="Today's focus">
              <div className="home-block-head">
                <h3>Today&apos;s focus</h3>
                <span className="home-block-count">{groups.length}</span>
              </div>
              <ul className="home-group-list">
                {groups.map((group, i) => (
                  <li key={group.key}>
                    <PatientWorkCard group={group} lead={i === 0} />
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <aside className="home-rail" aria-label="Situational awareness">
            <div className="home-rail-card">
              <div className="home-rail-title">
                <span>Situational awareness</span>
              </div>

              <RailSection icon={<FlaskIcon size={14} variant="stroke" />} title="Lab operations">
                <div className="home-rail-ops">
                  {labOps.map((op) => (
                    <button className="home-rail-op" key={op.id} onClick={op.onOpen} type="button">
                      <strong>{op.count}</strong>
                      <span>{op.label}</span>
                    </button>
                  ))}
                </div>
              </RailSection>

              <RailSection icon={<ShieldIcon size={14} variant="stroke" />} title="Safety watch">
                {model.safety.map((s) => (
                  <RailRow key={s.id} item={s} />
                ))}
              </RailSection>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ---- Patient-first grouping --------------------------------------------
   The model arrives as parallel lists (attention items, at-risk patients,
   care plans). The queue reads patient-first, so we fold all three into one
   group per patient: a name appears once, with its open work listed inside. */

type HomeTask = {
  id: string;
  label: string;
  detail: string;
  tone: HomeTone;
  onAction: () => void;
};

type HomeGroup = {
  key: string;
  name: string;
  initials: string;
  isOrder: boolean;
  tone: HomeTone;
  tasks: HomeTask[];
};

const TONE_RANK: Record<HomeTone, number> = { danger: 4, warning: 3, info: 2, neutral: 1, success: 0 };

const ORDER_GROUP_KEY = "lab order";

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildPatientGroups(
  attention: HomeAttentionItem[],
  patients: HomeAttentionPatient[],
  carePlans: HomeCarePlan[],
): HomeGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, HomeGroup>();

  const ensureGroup = (name: string, initials: string, isOrder: boolean) => {
    const key = normalizeName(name);
    let group = byKey.get(key);
    if (!group) {
      group = { key, name, initials, isOrder, tone: "success", tasks: [] };
      byKey.set(key, group);
      order.push(key);
    }
    return group;
  };

  /* 1 — attention items become tasks under their patient (or the lab-order group) */
  for (const item of attention) {
    const isOrder = normalizeName(item.patient) === ORDER_GROUP_KEY;
    ensureGroup(item.patient, item.initials, isOrder).tasks.push({
      id: item.id,
      label: item.actionLabel,
      detail: item.detail,
      tone: item.tone,
      onAction: item.onAction,
    });
  }

  /* a patient whose attention item already covers their care plan shouldn't pick
     up a second "Review <plan>" task for the same thing */
  const carePlanCovered = new Set(
    attention
      .filter((item) => /care plan/i.test(item.reason) || /\bplan\b/i.test(item.actionLabel))
      .map((item) => normalizeName(item.patient)),
  );

  /* 2 — care plans fold in as a review task, skipping the covered duplicates */
  for (const plan of carePlans) {
    if (carePlanCovered.has(normalizeName(plan.patient))) continue;
    ensureGroup(plan.patient, initialsOf(plan.patient), false).tasks.push({
      id: plan.id,
      label: `Review ${plan.plan}`,
      detail: plan.detail,
      tone: plan.tone,
      onAction: plan.onOpen,
    });
  }

  /* 3 — at-risk patients add a task only when nothing else surfaced them, so a
     patient already in the queue is never repeated as a bare row */
  for (const patient of patients) {
    const existing = byKey.get(normalizeName(patient.name));
    if (existing && existing.tasks.length > 0) continue;
    ensureGroup(patient.name, patient.initials, false).tasks.push({
      id: patient.id,
      label: "Open patient",
      detail: patient.summary,
      tone: patient.tone,
      onAction: patient.onAction,
    });
  }

  /* highest-severity task leads each group and sets the group tone */
  const groups = order.map((key) => byKey.get(key) as HomeGroup);
  for (const group of groups) {
    group.tasks.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone]);
    group.tone = group.tasks.reduce<HomeTone>(
      (acc, task) => (TONE_RANK[task.tone] > TONE_RANK[acc] ? task.tone : acc),
      "success",
    );
  }
  return groups;
}

/* One patient group: identity once (avatar + name + lead-task detail), a status
   chip + action count, then every open task as its own button — primary filled,
   the rest quiet. A semantic container, never a button wrapping buttons. */
function PatientWorkCard({ group, lead = false }: { group: HomeGroup; lead?: boolean }) {
  const [primary, ...secondary] = group.tasks;
  if (!primary) return null;
  const status = statusLabelFor(group.tone);
  const count = group.tasks.length;

  return (
    <div className={cx("home-patient-card", lead && "is-lead")}>
      <span aria-hidden className={cx("home-patient-bar", `tone-${group.tone}`)} />
      <div className="home-patient-head">
        {group.isOrder ? (
          <span aria-hidden className="home-patient-ic">
            <FlaskIcon size={16} variant="stroke" />
          </span>
        ) : (
          <Avatar
            initials={group.initials}
            name={group.name}
            size={lead ? "md" : "sm"}
            tone={group.tone === "danger" ? "danger" : group.tone === "warning" ? "warning" : undefined}
          />
        )}
        <span className="home-patient-id">
          <span className="home-patient-name">{group.name}</span>
          <span className="home-patient-detail">{primary.detail}</span>
        </span>
        <span className="home-patient-meta">
          {status && (
            <Badge appearance="subtle" tone={badgeToneFor(group.tone)}>
              {status}
            </Badge>
          )}
          <span className="home-patient-count">
            {count} action{count === 1 ? "" : "s"}
          </span>
        </span>
      </div>
      <div className="home-task-list">
        <button className="home-task-button is-primary" onClick={primary.onAction} type="button">
          <span>{primary.label}</span>
          <ChevronRightIcon size={14} variant="stroke" />
        </button>
        {secondary.map((task) => (
          <button className="home-task-button" key={task.id} onClick={task.onAction} type="button">
            <span>{task.label}</span>
            <ChevronRightIcon size={14} variant="stroke" />
          </button>
        ))}
      </div>
    </div>
  );
}

function badgeToneFor(tone: HomeTone): "neutral" | "info" | "success" | "warning" | "danger" {
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "info") return "info";
  if (tone === "success") return "success";
  return "neutral";
}

function statusLabelFor(tone: HomeTone): string | null {
  if (tone === "danger") return "Due now";
  if (tone === "warning") return "Watch";
  if (tone === "info") return "Verify";
  return null;
}

function RailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="home-rail-section" aria-label={title}>
      <div className="home-rail-head">
        <span aria-hidden className="home-rail-ic">
          {icon}
        </span>
        {title}
      </div>
      <div className="home-rail-rows">{children}</div>
    </section>
  );
}

function RailRow({ item }: { item: HomeRailItem }) {
  const content = (
    <>
      <span aria-hidden className={cx("home-rail-dot", `tone-${item.tone ?? "neutral"}`)} />
      <span className="home-rail-copy">
        <span className="home-rail-label">{item.label}</span>
        {item.detail && <span className="home-rail-detail">{item.detail}</span>}
      </span>
    </>
  );
  if (item.onAction) {
    return (
      <button className="home-rail-row is-action" onClick={item.onAction} type="button">
        {content}
        <ChevronRightIcon aria-hidden size={14} variant="stroke" />
      </button>
    );
  }
  return <div className="home-rail-row">{content}</div>;
}

/* The welcome/explorer screen adapts to the real KYD state so a doctor always
   sees where their licence stands — while keeping the same calm "explore the
   catalog and a demo patient meanwhile" escape hatches in every state. */
type ExplorerBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
type ExplorerContent = {
  badge: { label: string; tone: ExplorerBadgeTone; Icon: typeof WarningIcon };
  heading: string;
  body: string;
  action?: { label: string; kind: "verify" | "retry"; intent?: "primary" | "outline" };
};

const EXPLORER_CONTENT: Record<KydUiState, ExplorerContent> = {
  not_started: {
    badge: { label: "Licence not verified", tone: "warning", Icon: WarningIcon },
    heading: "Verify your licence to create real lab orders",
    body: "You can explore the catalog and a demo patient while your medical licence is reviewed.",
    action: { label: "Verify licence", kind: "verify", intent: "primary" },
  },
  draft: {
    badge: { label: "Draft saved", tone: "neutral", Icon: UploadIcon },
    heading: "Finish verifying your licence",
    body: "You started licence verification but haven’t submitted it yet. Pick up where you left off.",
    action: { label: "Continue verification", kind: "verify", intent: "primary" },
  },
  uploading: {
    badge: { label: "Uploading", tone: "info", Icon: UploadIcon },
    heading: "Submitting your licence",
    body: "Hang tight — we’re uploading your medical licence document.",
  },
  upload_failed: {
    badge: { label: "Upload failed", tone: "danger", Icon: WarningIcon },
    heading: "Licence upload didn’t go through",
    body: "Something interrupted the upload. Try submitting your medical licence again.",
    action: { label: "Retry upload", kind: "verify", intent: "primary" },
  },
  submitted: {
    badge: { label: "Under review", tone: "info", Icon: ClockIcon },
    heading: "Licence submitted for review",
    body: "Thanks — we’ve got your licence. We’ll unlock real lab orders once it’s approved.",
    action: { label: "View status", kind: "verify", intent: "outline" },
  },
  under_review: {
    badge: { label: "Under review", tone: "info", Icon: ClockIcon },
    heading: "Your licence is under review",
    body: "No action needed — reviews usually finish within 24 hours. Explore the catalog and a demo patient meanwhile.",
    action: { label: "View status", kind: "verify", intent: "outline" },
  },
  approved: {
    badge: { label: "Verified", tone: "success", Icon: ShieldIcon },
    heading: "Your licence is verified",
    body: "You can now create real lab orders for this clinic.",
  },
  needs_resubmission: {
    badge: { label: "Action needed", tone: "warning", Icon: WarningIcon },
    heading: "Your licence needs another look",
    body: "We couldn’t approve your licence as submitted. Re-upload a clearer or updated document to continue.",
    action: { label: "Resubmit licence", kind: "verify", intent: "primary" },
  },
  expired: {
    badge: { label: "Licence expired", tone: "warning", Icon: ClockIcon },
    heading: "Renew your licence to keep ordering",
    body: "Your verified licence has expired. Renew it to place real lab orders again.",
    action: { label: "Renew licence", kind: "verify", intent: "primary" },
  },
  permission_denied: {
    badge: { label: "No access", tone: "neutral", Icon: LockIcon },
    heading: "You don’t have access to verification",
    body: "Your clinic role can’t manage licence verification. Ask a clinic admin to update your access.",
  },
  offline: {
    badge: { label: "Offline", tone: "neutral", Icon: RefreshIcon },
    heading: "You’re offline",
    body: "We can’t check your licence status right now. Reconnect, then retry to verify.",
    action: { label: "Retry", kind: "retry", intent: "primary" },
  },
  unknown_error: {
    badge: { label: "Status unavailable", tone: "neutral", Icon: WarningIcon },
    heading: "Licence status unavailable",
    body: "We couldn’t load your verification status. Try again in a moment.",
    action: { label: "Retry", kind: "retry", intent: "primary" },
  },
};

function HomeExplorer({
  kyd,
  doctorName,
  dateLabel,
  uiState,
  onVerify,
  onRetry,
  onOpenDemoPatient,
  onOrderLabs,
}: {
  kyd: ReturnType<typeof useKyd>;
  doctorName: string;
  dateLabel: string;
  uiState: KydUiState;
  onVerify: () => void;
  onRetry: () => void;
  onOpenDemoPatient: () => void;
  onOrderLabs: () => void;
}) {
  const content = EXPLORER_CONTENT[uiState] ?? EXPLORER_CONTENT.not_started;
  const { badge, heading, body, action } = content;
  const BadgeIcon = badge.Icon;
  const onAction = action?.kind === "retry" ? onRetry : onVerify;
  return (
    <div className="home home--explorer" aria-label="Welcome to Kura">
      <DemoStateBar kyd={kyd} />
      <div aria-hidden className="home-explorer-illustration home-explorer-illustration--licence" />
      <div aria-hidden className="home-explorer-illustration home-explorer-illustration--labs" />
      <div className="home-explorer-stage">
        <header className="home-header">
          <div className="home-greeting">
            <p className="home-date">{dateLabel}</p>
            <h2>Welcome to Kura, {doctorName}</h2>
          </div>
        </header>

        <section className="home-explorer">
          <div className="home-explorer-lead">
            <Badge appearance="subtle" icon={<BadgeIcon size={12} variant="bulk" />} tone={badge.tone}>
              {badge.label}
            </Badge>
            <h3>{heading}</h3>
            <p>{body}</p>
            {action && (
              <Button intent={action.intent ?? "primary"} onClick={onAction}>
                {action.label}
              </Button>
            )}
          </div>

          <ul className="home-explorer-list">
            <li>
              <button className="home-row" onClick={onOpenDemoPatient} type="button">
                <span aria-hidden className="home-row-ic">
                  <Image
                    alt=""
                    className="home-row-illustration"
                    height={96}
                    src="/assets/home-explorer-demo-patient.png"
                    width={96}
                  />
                </span>
                <span className="home-row-copy">
                  <span className="home-row-lead">Explore the demo patient</span>
                  <span className="home-row-detail">Meet Sokha Chann and review a sample care plan.</span>
                </span>
                <span aria-hidden className="home-row-chev">
                  <ChevronRightIcon size={16} variant="stroke" />
                </span>
              </button>
            </li>
            <li>
              <button className="home-row" onClick={onOrderLabs} type="button">
                <span aria-hidden className="home-row-ic">
                  <Image
                    alt=""
                    className="home-row-illustration"
                    height={96}
                    src="/assets/home-explorer-lab-catalog.png"
                    width={96}
                  />
                </span>
                <span className="home-row-copy">
                  <span className="home-row-lead">Explore the lab catalog</span>
                  <span className="home-row-detail">See tests, turnaround time and coverage.</span>
                </span>
                <span aria-hidden className="home-row-chev">
                  <ChevronRightIcon size={16} variant="stroke" />
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function HomeEmpty({ onFindPatient, onOrderLabs }: { onFindPatient: () => void; onOrderLabs: () => void }) {
  return (
    <div className="home-empty">
      <span aria-hidden className="home-empty-ic">
        <BookingIcon size={24} variant="stroke" />
      </span>
      <strong>No work in the queue today</strong>
      <span>Start by ordering a lab or finding a patient.</span>
      <div className="home-cta">
        <Button intent="primary" onClick={onOrderLabs}>
          Order labs
        </Button>
        <Button intent="outline" onClick={onFindPatient}>
          Find patient
        </Button>
      </div>
    </div>
  );
}
