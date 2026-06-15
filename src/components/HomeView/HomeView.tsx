"use client";

import { useRouter } from "next/navigation";
import { Avatar, Badge, Button } from "@/components/ui";
import { useOrderDraft } from "@/components/OrderDraft";
import { useKyd, VERIFICATION_HREF } from "@/components/Verification";
import {
  Booking as BookingIcon,
  CheckShield as ShieldIcon,
  ChevronRight as ChevronRightIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Note as NoteIcon,
  Search as SearchIcon,
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
  const { status } = useKyd();
  const { lineCount, draft } = useOrderDraft();

  const verified = status === "approved";
  const draftNeedsRoute = lineCount > 0 && draft.checkout.route === null;

  if (!verified) {
    return (
      <HomeExplorer
        dateLabel={model.dateLabel}
        doctorName={model.doctorName}
        onOpenDemoPatient={onOpenDemoPatient}
        onOrderLabs={onOrderLabs}
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

  const nextActions = [...model.nextActions];
  if (draftNeedsRoute) {
    nextActions.push({ id: "na-draft", label: "Choose route for lab order", onAction: onOrderLabs });
  }

  const noWork = attention.length === 0 && model.patients.length === 0 && model.carePlans.length === 0;
  const priorityItem = attention[0] ?? null;
  const queueItems = priorityItem ? attention.slice(1) : attention;
  /* a patient already surfaced by an attention item above isn't repeated as a
     separate at-risk row — avoids the same name stacking down the feed */
  const focusNames = new Set(attention.map((a) => a.patient));
  const riskPatients = model.patients.filter((p) => !focusNames.has(p.name));

  return (
    <div className="home" aria-label="Today's clinical work">
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
                ? () => document.querySelector(".home-focus")?.scrollIntoView({ behavior: "smooth", block: "start" })
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
                {i === 0 && <span className="home-summary-mark">start here</span>}
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
            <section className="home-focus-group" aria-label="Today's focus">
              <div className="home-block-head">
                <h3>Today&apos;s focus</h3>
                <span className="home-block-count">
                  {(priorityItem ? 1 : 0) + queueItems.length + riskPatients.length}
                </span>
              </div>
              <ul className="home-focus">
                {priorityItem && (
                  <li>
                    <FocusRow item={priorityItem} lead />
                  </li>
                )}
                {queueItems.map((item) => (
                  <li key={item.id}>
                    <FocusRow item={item} />
                  </li>
                ))}
                {riskPatients.map((p) => (
                  <li key={p.id}>
                    <PatientFocusRow patient={p} />
                  </li>
                ))}
              </ul>
            </section>

            {model.carePlans.length > 0 && (
              <section className="home-focus-group" aria-label="Care plans">
                <div className="home-block-head">
                  <h3>Care plans</h3>
                  <span className="home-block-count">{model.carePlans.length}</span>
                </div>
                <ul className="home-focus">
                  {model.carePlans.map((cp) => (
                    <li key={cp.id}>
                      <CarePlanFocusRow plan={cp} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </main>

          <aside className="home-rail" aria-label="Situational awareness">
            <div className="home-rail-card">
              <div className="home-rail-title">
                <span>Today&apos;s priorities</span>
                <strong>{nextActions.length} actions</strong>
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

              <RailSection icon={<NoteIcon size={14} variant="stroke" />} title="Next actions">
                {nextActions.map((a) => (
                  <RailRow key={a.id} item={a} />
                ))}
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

/* One Heidi-style focus row: tone bar · avatar/icon · patient + reason / detail ·
   [lead status chip] · trailing action or chevron. The `lead` priority row is
   emphasized (larger avatar, Due-now badge, primary-styled action). */
function FocusRow({ item, lead = false }: { item: HomeAttentionItem; lead?: boolean }) {
  return (
    <button className={cx("home-focus-row", lead && "is-lead")} onClick={item.onAction} type="button">
      <span aria-hidden className={cx("home-focus-bar", `tone-${item.tone}`)} />
      <Avatar
        initials={item.initials}
        name={item.patient}
        size={lead ? "md" : "sm"}
        tone={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : undefined}
      />
      <span className="home-focus-copy">
        <span className="home-focus-lead">
          {item.patient}
          <span className="home-focus-reason"> · {item.reason}</span>
        </span>
        <span className="home-focus-detail">{item.detail}</span>
      </span>
      <span className="home-focus-trail">
        {lead && (
          <Badge appearance="subtle" tone={badgeToneFor(item.tone)}>
            {labelForTone(item.tone)}
          </Badge>
        )}
        <span className={cx("home-focus-action", lead && "is-primary")}>
          {item.actionLabel}
          <ChevronRightIcon size={14} variant="stroke" />
        </span>
      </span>
    </button>
  );
}

function PatientFocusRow({ patient }: { patient: HomeAttentionPatient }) {
  return (
    <button className="home-focus-row" onClick={patient.onAction} type="button">
      <span aria-hidden className={cx("home-focus-bar", `tone-${patient.tone}`)} />
      <Avatar
        initials={patient.initials}
        name={patient.name}
        size="sm"
        tone={patient.tone === "danger" ? "danger" : patient.tone === "warning" ? "warning" : undefined}
      />
      <span className="home-focus-copy">
        <span className="home-focus-lead">{patient.name}</span>
        <span className="home-focus-detail">{patient.summary}</span>
      </span>
      <span aria-hidden className="home-focus-chev">
        <ChevronRightIcon size={16} variant="stroke" />
      </span>
    </button>
  );
}

function CarePlanFocusRow({ plan }: { plan: HomeCarePlan }) {
  return (
    <button className="home-focus-row" onClick={plan.onOpen} type="button">
      <span aria-hidden className={cx("home-focus-bar", `tone-${plan.tone}`)} />
      <span aria-hidden className="home-focus-ic">
        <HeartIcon size={16} variant="stroke" />
      </span>
      <span className="home-focus-copy">
        <span className="home-focus-lead">
          {plan.plan}
          <span className="home-focus-reason"> · {plan.patient}</span>
        </span>
        <span className="home-focus-detail">{plan.detail}</span>
      </span>
      <span aria-hidden className="home-focus-chev">
        <ChevronRightIcon size={16} variant="stroke" />
      </span>
    </button>
  );
}

function badgeToneFor(tone: HomeTone): "neutral" | "info" | "success" | "warning" | "danger" {
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "info") return "info";
  if (tone === "success") return "success";
  return "neutral";
}

function labelForTone(tone: HomeTone) {
  if (tone === "danger") return "Due now";
  if (tone === "warning") return "Watch";
  if (tone === "info") return "Verify";
  if (tone === "success") return "Done";
  return "Review";
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

function HomeExplorer({
  doctorName,
  dateLabel,
  onVerify,
  onOpenDemoPatient,
  onOrderLabs,
}: {
  doctorName: string;
  dateLabel: string;
  onVerify: () => void;
  onOpenDemoPatient: () => void;
  onOrderLabs: () => void;
}) {
  return (
    <div className="home" aria-label="Welcome to Kura">
      <header className="home-header">
        <div className="home-greeting">
          <p className="home-date">{dateLabel}</p>
          <h2>Welcome to Kura, {doctorName}</h2>
        </div>
      </header>

      <section className="home-explorer">
        <div className="home-explorer-lead">
          <Badge appearance="subtle" icon={<WarningIcon size={12} variant="bulk" />} tone="warning">
            Licence not verified
          </Badge>
          <h3>Verify your licence to create real lab orders</h3>
          <p>You can explore the catalog and a demo patient while your medical licence is reviewed.</p>
          <Button intent="primary" onClick={onVerify}>
            Verify licence
          </Button>
        </div>

        <ul className="home-explorer-list">
          <li>
            <button className="home-row" onClick={onOpenDemoPatient} type="button">
              <span aria-hidden className="home-row-ic">
                <HeartIcon size={16} variant="stroke" />
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
                <FlaskIcon size={16} variant="stroke" />
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
