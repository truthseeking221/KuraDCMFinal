"use client";

/* TasksView — the doctor's WORKLIST: open obligations the doctor must DO, each
   with an open → terminal lifecycle. This is distinct from the Inbox (which only
   informs): every row here is an actionable obligation that can be completed,
   acknowledged, snoozed, or filtered, and the page is "all clear" only when
   nothing is open and nothing is parked.

   Mastersource grounding:
   - §29 result product boundary — result review & release authorization;
     abnormal / critical value handling needs an explicit doctor action.
     A critical-value ACK only records who-saw-it-and-when; it does not close
     the clinical obligation, so it lands in an "Acknowledged" terminal state,
     not a struck-through "Done".
   - §15.1 / §38.5 identity-assurance gate — result release is gated on patient
     assurance + phone control; the release task is BLOCKED until the identity
     work clears, and that reason must be perceivable without a mouse.
   - §22 / §38.6 paid-plus-served invariant — a line that is paid-not-served or
     served-not-paid cannot freeze its split. This page only POINTS at the gap;
     it never edits the ledger, so settlement work routes OUT to the booking
     surface (a toast acknowledging the jump) rather than completing to Done.
   - §15 provisional → verified identity — NID collision / merge-queue items and
     provisional → verified follow-ups land here as identity work.
   - §27 insurance & claims — claim readiness: an order line missing evidence
     (ICD, signed note, lab evidence, identity tier) before a claim can proceed.
   Economic invariants (§19-26, §41): the page never edits economic history. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Drawer } from "@/components/ui";
import {
  Booking as BookingIcon,
  Cash as CashIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Filter as FilterIcon,
  Flask as FlaskIcon,
  IDCard as IdCardIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./TasksView.css";

/* --------------------------------- model ---------------------------------- */

type Priority = "urgent" | "soon" | "later";
type Status = "open" | "done" | "snoozed" | "acknowledged";
type Category =
  | "results"
  | "identity"
  | "settlement"
  | "claims"
  | "license";
type Tone = "danger" | "warning" | "info" | "success" | "neutral";

/* what completing the task actually DOES — the page can't treat every action
   as "tick → Done". A close-kind task genuinely closes here (result release,
   identity confirm, licence upload). An acknowledge-kind task only records who
   saw it (critical value, §29) and lands in an Acknowledged state with the
   obligation still alive. An external-kind task can't be closed from this page
   at all (settlement, §22) — its action routes out to the owning surface. */
type Kind = "close" | "acknowledge" | "external";

type Task = {
  id: string;
  title: string;
  /* one calm line that explains the obligation and cites its evidence */
  why: string;
  category: Category;
  priority: Priority;
  status: Status;
  kind: Kind;
  due: string;
  /* who / what the work is about */
  patient?: string;
  initials?: string;
  linkCode?: string;
  /* result-release tasks can be held by the identity gate (§15.1 / §38.5) */
  blockedBy?: string;
  /* irreversible, patient-facing effect → confirm before firing (PHI release,
     critical-value acknowledgement). */
  confirm?: string;
  /* where an external-kind action routes to */
  routeTo?: string;
  /* the verb on the row's primary action */
  actionLabel: string;
  /* what the doctor reviews inside the drawer before completing */
  detail: string[];
};

/* priority → tone. Urgent reads danger, soon warning, later neutral. */
const PRIORITY_TONE: Record<Priority, Tone> = {
  urgent: "danger",
  soon: "warning",
  later: "neutral",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  soon: "Soon",
  later: "Later",
};

const PRIORITY_ORDER: Priority[] = ["urgent", "soon", "later"];

const CATEGORY_META: Record<
  Category,
  { label: string; icon: (p: IconProps) => React.ReactElement }
> = {
  results: { label: "Results", icon: FlaskIcon },
  identity: { label: "Identity", icon: IdCardIcon },
  settlement: { label: "Paid & served", icon: CashIcon },
  claims: { label: "Claims", icon: ReceiptIcon },
  license: { label: "Licence", icon: WarningIcon },
};

const CATEGORY_ORDER: Category[] = [
  "results",
  "identity",
  "settlement",
  "claims",
  "license",
];

/* status is never colour alone — every tone carries a matching icon */
const TONE_ICON: Record<Tone, (p: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: FlaskIcon,
  success: CheckCircleIcon,
  neutral: BookingIcon,
};

/* the "done" scope collects everything terminal: closed + acknowledged */
const TERMINAL: Status[] = ["done", "acknowledged"];

/* --------------------------------- fixtures -------------------------------- */

const SEED_TASKS: Task[] = [
  {
    id: "t-release-sokha",
    title: "Release Sokha Chann's results",
    why: "Validated by the lab. Patient release needs your approval.",
    category: "results",
    priority: "urgent",
    status: "open",
    kind: "close",
    due: "Due today",
    patient: "Sokha Chann",
    initials: "SC",
    linkCode: "FZ-38245",
    confirm: "Releasing notifies the patient and opens the result in their app.",
    actionLabel: "Review results",
    detail: [
      "HbA1c 9.2%. Above target and flagged High by the lab.",
      "Lipid panel within range.",
      "Releasing notifies the patient and opens the result in their app.",
      "Release authorization is yours per result-product boundary (§29).",
    ],
  },
  {
    id: "t-critical-dara",
    title: "Acknowledge Dara Pich's critical result",
    why: "Potassium 6.4 mmol/L is critical. Acknowledge now.",
    category: "results",
    priority: "urgent",
    status: "open",
    kind: "acknowledge",
    due: "Flagged 08:40",
    patient: "Dara Pich",
    initials: "DP",
    linkCode: "FZ-38251",
    confirm:
      "Acknowledging records who saw it and when. The clinical follow-up stays open.",
    actionLabel: "Acknowledge",
    detail: [
      "Serum potassium 6.4 mmol/L. Critical high (§29 critical value handling).",
      "Lab called the cabinet at 08:40; awaiting your acknowledgement.",
      "Acknowledging records who saw it and when. It does not close the case.",
      "The clinical action (treat / recall) follows and stays on your list.",
    ],
  },
  {
    id: "t-release-blocked",
    title: "Resolve Vichea Sok's identity",
    why: "Identity is provisional. Result release is blocked.",
    category: "results",
    priority: "soon",
    status: "open",
    kind: "close",
    due: "Due in 2 days",
    patient: "Vichea Sok",
    initials: "VS",
    linkCode: "FZ-38260",
    blockedBy: "NID not yet captured at PSC",
    actionLabel: "Resolve identity",
    detail: [
      "Thyroid panel validated and ready.",
      "Patient assurance is provisional; phone control unconfirmed.",
      "Result release is gated on identity assurance (§15.1, §38.5).",
      "Clear the gate first. Releasing to the wrong record leaks PHI.",
    ],
  },
  {
    id: "t-release-long",
    title: "Release Chenda Vannak's panel",
    why: "Validated panel is waiting for release.",
    category: "results",
    priority: "soon",
    status: "open",
    kind: "close",
    due: "Due in 1 day",
    patient: "Chenda Sok-Phally Vannak",
    initials: "CV",
    linkCode: "FZ-38271",
    confirm: "Releasing notifies the patient and opens the result in their app.",
    actionLabel: "Review panel",
    detail: [
      "Five-test preventive panel, all validated by the lab.",
      "Fasting glucose 6.0 mmol/L. Borderline; the rest within range.",
      "Releasing notifies the patient and opens the result in their app.",
      "Release authorization is yours per result-product boundary (§29).",
    ],
  },
  {
    id: "t-merge-collision",
    title: "Resolve NID collision",
    why: "New Chan Sopheak record matches an existing NID.",
    category: "identity",
    priority: "urgent",
    status: "open",
    kind: "close",
    due: "In merge queue",
    patient: "Chan Sopheak",
    initials: "CS",
    actionLabel: "Review merge",
    detail: [
      "A new record shares an NID with an existing Kura patient (§15).",
      "Confirm whether these are the same person or a data-entry conflict.",
      "Merging links both histories; keeping them apart needs a steward note.",
    ],
  },
  {
    id: "t-provisional-verify",
    title: "Confirm Lina Hun's identity",
    why: "PSC captured an NID with no collision.",
    category: "identity",
    priority: "soon",
    status: "open",
    kind: "close",
    due: "Due in 3 days",
    patient: "Lina Hun",
    initials: "LH",
    actionLabel: "Confirm identity",
    detail: [
      "Provisional patient appeared at PSC; NID captured cleanly (§15).",
      "No collision. Assurance can move from provisional to NID verified.",
      "Confirming unblocks result release and refunds for this patient.",
    ],
  },
  {
    id: "t-paid-not-served",
    title: "Record sample for FZ-38240",
    why: "Payment exists, but no sample is recorded.",
    category: "settlement",
    priority: "soon",
    status: "open",
    kind: "external",
    due: "Open 4 days",
    patient: "Mealea Chan",
    initials: "MC",
    linkCode: "FZ-38240",
    routeTo: "FZ-38240",
    actionLabel: "Open booking",
    detail: [
      "Line is marked paid, but no collection event is recorded.",
      "Paid-plus-served says the split freezes only when both are true (§22).",
      "Either record the draw or flag the payment. Economic rows are immutable.",
      "This page points at the gap; reconcile it on the booking, not here.",
    ],
  },
  {
    id: "t-served-not-paid",
    title: "Collect payment for FZ-38233",
    why: "Sample processed, but payment is missing.",
    category: "settlement",
    priority: "later",
    status: "open",
    kind: "external",
    due: "Open 6 days",
    patient: "Rithy Chea",
    initials: "RC",
    linkCode: "FZ-38233",
    routeTo: "FZ-38233",
    actionLabel: "Open booking",
    detail: [
      "Service performed; payment rule not yet satisfied (§22).",
      "Split stays unfrozen until the line is both paid and served.",
      "Follow up on office collection or send a payment link on the booking.",
    ],
  },
  {
    id: "t-claim-evidence",
    title: "Complete Forte claim evidence",
    why: "Signed note and ICD code are missing.",
    category: "claims",
    priority: "soon",
    status: "open",
    kind: "close",
    due: "Submit by Jun 24",
    patient: "Sokun Nary",
    initials: "SN",
    linkCode: "FZ-38228",
    actionLabel: "Review checklist",
    detail: [
      "Forte covered lab line. Claim readiness check (§27).",
      "Missing: ICD code, signed encounter note.",
      "Present: lab evidence, identity tier verified.",
      "Coverage and share are per order line, not per booking.",
    ],
  },
  {
    id: "t-license-renew",
    title: "Upload renewed medical licence",
    why: "Expires Jul 20. Real orders block at expiry.",
    category: "license",
    priority: "later",
    status: "open",
    kind: "close",
    due: "Expires Jul 20",
    actionLabel: "Upload renewal",
    detail: [
      "Your licence renews in 29 days.",
      "Upload the renewed document before expiry to keep ordering active.",
      "Verification is handled on the Account page.",
    ],
  },
];

/* ----------------------------------- view ---------------------------------- */

type Grouping = "priority" | "category";
type Scope = "open" | "done";

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [scope, setScope] = useState<Scope>("open");
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [selected, setSelected] = useState<Task | null>(null);
  /* the id of an action currently "resolving" (simulated async authorization) */
  const [pendingId, setPendingId] = useState<string | null>(null);

  /* count of open tasks in a category — used by the auto-fallback so an emptied
     filter can drop back to All as a real effect of an action, not in render */
  const openInCategory = useCallback(
    (list: Task[], cat: Category) =>
      list.filter((t) => t.status === "open" && t.category === cat).length,
    [],
  );

  /* after a task leaves the open list, if it emptied the active category we
     fall back to All — but only inside a handler, never during render */
  const maybeResetFilter = useCallback(
    (nextList: Task[], leftCategory: Category) => {
      setCatFilter((cur) =>
        cur === leftCategory && openInCategory(nextList, leftCategory) === 0
          ? "all"
          : cur,
      );
    },
    [openInCategory],
  );

  /* move a task to a terminal status with a simulated authorization step, then
     fire the right success toast + undo. `close` → Done, `acknowledge` →
     Acknowledged (obligation stays alive, no strikethrough). Identity-gated
     work can never reach here (§15.1/§38.5) — completion routes to the gate. */
  const finish = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      if (task.blockedBy) {
        toast.warning("Blocked. Clear identity first", {
          description: task.blockedBy,
        });
        return;
      }
      const previous = task.status;
      const terminal: Status = task.kind === "acknowledge" ? "acknowledged" : "done";
      setPendingId(id);
      window.setTimeout(() => {
        setPendingId(null);
        setSelected(null);
        let nextList: Task[] = [];
        setTasks((list) => {
          nextList = list.map((t) =>
            t.id === id ? { ...t, status: terminal } : t,
          );
          return nextList;
        });
        maybeResetFilter(nextList, task.category);
        if (terminal === "acknowledged") {
          toast.success(`Acknowledged: ${task.title}`, {
            description: "Recorded who saw it and when. The follow-up stays open.",
            action: {
              label: "Undo",
              onClick: () =>
                setTasks((list) =>
                  list.map((t) => (t.id === id ? { ...t, status: previous } : t)),
                ),
            },
          });
        } else {
          toast.success(`Done: ${task.title}`, {
            action: {
              label: "Undo",
              onClick: () =>
                setTasks((list) =>
                  list.map((t) => (t.id === id ? { ...t, status: previous } : t)),
                ),
            },
          });
        }
      }, 500);
    },
    [tasks, maybeResetFilter],
  );

  const snooze = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      let nextList: Task[] = [];
      setTasks((list) => {
        nextList = list.map((t) =>
          t.id === id ? { ...t, status: "snoozed" } : t,
        );
        return nextList;
      });
      maybeResetFilter(nextList, task.category);
      setSelected(null);
      toast(`Snoozed: ${task.title}`, {
        description: "Hidden from open work. Resume it from the Snoozed strip.",
        action: {
          label: "Resume",
          onClick: () =>
            setTasks((list) =>
              list.map((t) => (t.id === id ? { ...t, status: "open" } : t)),
            ),
        },
      });
    },
    [tasks, maybeResetFilter],
  );

  /* external-kind / identity-gated work routes OUT — the page never edits the
     ledger (§22/§38.6) and identity work lives on the assurance surface
     (§38.5). We acknowledge the jump the same way for both. */
  const route = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      if (task.blockedBy) {
        toast("Opening identity gate", {
          description: task.blockedBy,
        });
        return;
      }
      toast(`Opening booking ${task.routeTo ?? task.linkCode ?? ""}`.trim(), {
        description: "Reconcile the line on the booking. This page never edits the ledger.",
      });
    },
    [tasks],
  );

  const resume = useCallback((id: string) => {
    setTasks((list) =>
      list.map((t) => (t.id === id ? { ...t, status: "open" } : t)),
    );
  }, []);

  const reopen = useCallback((id: string) => {
    setTasks((list) =>
      list.map((t) => (t.id === id ? { ...t, status: "open" } : t)),
    );
    toast("Reopened", { description: "Moved back to your open work." });
  }, []);

  /* Done scope groups neutrally by category — never by priority. Showing
     danger/warning pips on already-finished work reads as false alarm. */
  const effectiveGrouping: Grouping = scope === "done" ? "category" : "priority";

  const openCount = tasks.filter((t) => t.status === "open").length;
  const doneCount = tasks.filter((t) => TERMINAL.includes(t.status)).length;
  const snoozedCount = tasks.filter((t) => t.status === "snoozed").length;

  /* the visible set: scoped, then category-filtered (open scope only) */
  const visible = useMemo(() => {
    if (scope === "done") {
      return tasks.filter((t) => TERMINAL.includes(t.status));
    }
    const scoped = tasks.filter((t) => t.status === "open");
    if (catFilter === "all") return scoped;
    return scoped.filter((t) => t.category === catFilter);
  }, [tasks, scope, catFilter]);

  /* group the visible set by the active grouping, in canonical order */
  const groups = useMemo(() => {
    if (effectiveGrouping === "priority") {
      return PRIORITY_ORDER.map((p) => ({
        key: p,
        label: PRIORITY_LABEL[p],
        tone: PRIORITY_TONE[p],
        items: visible.filter((t) => t.priority === p),
      })).filter((g) => g.items.length > 0);
    }
    return CATEGORY_ORDER.map((c) => ({
      key: c,
      label: CATEGORY_META[c].label,
      tone: "neutral" as Tone,
      items: visible.filter((t) => t.category === c),
    })).filter((g) => g.items.length > 0);
  }, [visible, effectiveGrouping]);

  const urgentOpen = tasks.filter(
    (t) => t.status === "open" && t.priority === "urgent",
  ).length;

  const snoozedTasks = useMemo(
    () => tasks.filter((t) => t.status === "snoozed"),
    [tasks],
  );

  /* keep the open drawer's task object in sync with the live list (e.g. after
     an undo restores status) and close it if the task leaves the open scope */
  const selectedLive = useMemo(
    () => (selected ? tasks.find((t) => t.id === selected.id) ?? null : null),
    [selected, tasks],
  );

  return (
    <div className="tasks" aria-label="Doctor worklist">
      {/* toolbar: scope buttons, category filter, live counts */}
      <div className="tasks-toolbar">
        <div className="tasks-scope" role="group" aria-label="Task scope">
          <ScopeTab
            label="Open"
            count={openCount}
            tone={urgentOpen > 0 ? "danger" : "neutral"}
            active={scope === "open"}
            onClick={() => setScope("open")}
          />
          {(doneCount > 0 || scope === "done") && (
            <ScopeTab
              label="Done"
              count={doneCount}
              tone="success"
              active={scope === "done"}
              onClick={() => setScope("done")}
            />
          )}
        </div>

        {scope === "open" ? (
          <div className="tasks-controls">
            <div className="tasks-filter" aria-label="Filter by category">
              <FilterChip
                label="All"
                active={catFilter === "all"}
                onClick={() => setCatFilter("all")}
              />
              {CATEGORY_ORDER.map((c) => {
                const n = tasks.filter(
                  (t) => t.status === "open" && t.category === c,
                ).length;
                /* keep the active chip visible even at 0 so the filtered-empty
                   state is reachable and the selection isn't silently dropped */
                if (n === 0 && catFilter !== c) return null;
                return (
                  <FilterChip
                    key={c}
                    label={CATEGORY_META[c].label}
                    count={n}
                    active={catFilter === c}
                    onClick={() => setCatFilter(c)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* snoozed strip — quiet, resumable, shown in BOTH scopes so parked work
          is never invisible (e.g. while you're reviewing Done) */}
      {snoozedCount > 0 && (
        <SnoozedStrip tasks={snoozedTasks} onResume={resume} />
      )}

      {/* body */}
      {groups.length === 0 ? (
        <EmptyState
          scope={scope}
          filtered={scope === "open" && catFilter !== "all"}
          filterLabel={
            catFilter !== "all" ? CATEGORY_META[catFilter].label : undefined
          }
          snoozedCount={snoozedCount}
          onClearFilter={() => setCatFilter("all")}
          onResumeFirst={() =>
            snoozedTasks[0] && resume(snoozedTasks[0].id)
          }
        />
      ) : (
        <div className="tasks-groups">
          {groups.map((group) => (
            <section
              key={group.key}
              className="tasks-group"
              aria-label={group.label}
            >
              <div className={cx("tasks-group-head", `tone-${group.tone}`)}>
                {effectiveGrouping === "priority" && (
                  <span className="tasks-group-pip" aria-hidden />
                )}
                <h2>{group.label}</h2>
                <Badge appearance="subtle" tone="neutral" className="tasks-count">
                  {group.items.length}
                </Badge>
              </div>
              <ul className="tasks-list">
                {group.items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    scope={scope}
                    grouping={effectiveGrouping}
                    onOpen={() => setSelected(task)}
                    onRoute={() => route(task.id)}
                    onSnooze={() => snooze(task.id)}
                    onReopen={() => reopen(task.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskDrawer
        key={selectedLive?.id ?? "none"}
        task={selectedLive}
        pending={Boolean(selectedLive) && pendingId === selectedLive?.id}
        onClose={() => setSelected(null)}
        onComplete={finish}
        onRoute={route}
        onSnooze={snooze}
        onReopen={reopen}
      />
    </div>
  );
}

/* ------------------------------- task row --------------------------------- */

function TaskRow({
  task,
  scope,
  grouping,
  onOpen,
  onRoute,
  onSnooze,
  onReopen,
}: {
  task: Task;
  scope: Scope;
  grouping: Grouping;
  onOpen: () => void;
  onRoute: () => void;
  onSnooze: () => void;
  onReopen: () => void;
}) {
  const tone = PRIORITY_TONE[task.priority];
  const CatIcon = CATEGORY_META[task.category].icon;
  const acknowledged = task.status === "acknowledged";
  const blocked = Boolean(task.blockedBy);
  /* external-kind work routes out; it can't be ticked done from a row */
  const external = task.kind === "external";
  const routes = blocked || external;
  /* priority is encoded by the leading bar only when priority is the active
     grouping axis (the group head names it); under category grouping the bar
     has no on-screen referent, so we drop it to neutral and let a priority
     badge carry the tone instead. Tone stays a single signal, never doubled. */
  const priorityIsAxis = scope === "open" && grouping === "priority";
  const showPriorityBadge = scope === "open" && grouping === "category";

  return (
    <li
      className={cx(
        "tasks-row",
        priorityIsAxis ? `tone-${tone}` : "tone-neutral-bar",
        task.status === "done" && "is-done",
        acknowledged && "is-ack",
      )}
    >
      {scope === "open" ? (
        <span
          className={cx(
            "tasks-status",
            blocked ? "is-blocked" : external ? "is-route" : `tone-${tone}`,
          )}
          aria-hidden
        >
          {blocked ? (
            <WarningIcon size={13} variant="stroke" />
          ) : external ? (
            <CashIcon size={13} variant="stroke" />
          ) : (
            <span className="tasks-status-dot" />
          )}
        </span>
      ) : (
        <span
          className={cx("tasks-status", acknowledged ? "is-ack-mark" : "is-done")}
          aria-hidden
        >
          {acknowledged ? (
            <CheckCircleIcon size={14} variant="stroke" />
          ) : (
            <CheckIcon size={14} variant="stroke" />
          )}
        </span>
      )}

      <button type="button" className="tasks-row-main" onClick={onOpen}>
        <span className="tasks-row-top">
          <span className="tasks-cat" aria-hidden>
            <CatIcon size={13} variant="stroke" />
            {CATEGORY_META[task.category].label}
          </span>
          {showPriorityBadge ? (
            <Badge
              appearance="subtle"
              tone={tone}
              icon={
                <span aria-hidden>
                  {(() => {
                    const Ic = TONE_ICON[tone];
                    return <Ic size={11} variant="stroke" />;
                  })()}
                </span>
              }
            >
              {PRIORITY_LABEL[task.priority]}
            </Badge>
          ) : (
            scope === "done" &&
            acknowledged && (
              <Badge appearance="subtle" tone="info">
                Acknowledged
              </Badge>
            )
          )}
        </span>
        <strong className="tasks-title">{task.title}</strong>
        <span className="tasks-why">{task.why}</span>
        <span className="tasks-meta">
          {task.patient && (
            <span className="tasks-meta-patient">
              <Avatar initials={task.initials ?? ""} name={task.patient} size="sm" />
              {task.patient}
            </span>
          )}
          {task.linkCode && <span className="tasks-code">{task.linkCode}</span>}
          <span className="tasks-due">{task.due}</span>
          {scope === "open" && blocked && (
            <span className="tasks-blocked">
              <WarningIcon size={12} variant="stroke" aria-hidden />
              Blocked: {task.blockedBy}
            </span>
          )}
          {scope === "open" && external && (
            <span className="tasks-routes">
              <CashIcon size={12} variant="stroke" aria-hidden />
              Reconcile on the booking. Never edited here
            </span>
          )}
        </span>
      </button>

      <div className="tasks-row-actions">
        {scope === "open" ? (
          <>
            <Button
              intent={routes || task.priority === "urgent" ? "primary" : "secondary"}
              size="sm"
              className="tasks-row-cta"
              trailingIcon={<ChevronRightIcon size={15} variant="stroke" aria-hidden />}
              onClick={routes ? onRoute : onOpen}
            >
              {task.actionLabel}
            </Button>
            <button
              type="button"
              className="tasks-snooze-btn"
              aria-label={`Snooze "${task.title}"`}
              onClick={onSnooze}
            >
              Snooze
            </button>
          </>
        ) : (
          <Button intent="outline" size="sm" onClick={onReopen}>
            Reopen
          </Button>
        )}
      </div>
    </li>
  );
}

/* ------------------------------- detail drawer ----------------------------- */

function TaskDrawer({
  task,
  pending,
  onClose,
  onComplete,
  onRoute,
  onSnooze,
  onReopen,
}: {
  task: Task | null;
  pending: boolean;
  onClose: () => void;
  onComplete: (id: string) => void;
  onRoute: (id: string) => void;
  onSnooze: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  /* confirm gate for irreversible, patient-facing effects (PHI release,
     critical-value acknowledgement). This component is remounted per task
     (key={task.id} at the call site), so local state resets automatically
     when the drawer's task changes — no effect needed. */
  const [confirming, setConfirming] = useState(false);

  if (!task) return null;
  const tone = PRIORITY_TONE[task.priority];
  const ToneIcon = TONE_ICON[tone];
  const blocked = Boolean(task.blockedBy);
  const external = task.kind === "external";
  const routes = blocked || external;
  const terminal = TERMINAL.includes(task.status);
  const needsConfirm = Boolean(task.confirm) && !routes && !terminal;

  const primaryVerb =
    task.kind === "acknowledge" ? "Acknowledge" : "Mark done";
  const confirmVerb =
    task.kind === "acknowledge" ? "Confirm acknowledgement" : "Confirm release";

  let footer: React.ReactNode;
  if (terminal) {
    footer = (
      <div className="tasks-drawer-foot">
        <Button intent="outline" size="md" onClick={() => onReopen(task.id)}>
          Reopen
        </Button>
      </div>
    );
  } else if (routes) {
    /* gated/ledger work routes to the owning surface — it can't be completed
       from here (§15.1/§38.5 identity, §22/§38.6 ledger) */
    footer = (
      <div className="tasks-drawer-foot">
        <Button intent="outline" size="md" onClick={() => onSnooze(task.id)}>
          Snooze
        </Button>
        <Button
          intent="primary"
          size="md"
          trailingIcon={<ChevronRightIcon size={15} variant="stroke" aria-hidden />}
          onClick={() => onRoute(task.id)}
        >
          {task.actionLabel}
        </Button>
      </div>
    );
  } else {
    footer = (
      <div className="tasks-drawer-foot">
        <Button
          intent="outline"
          size="md"
          disabled={pending}
          onClick={() => onSnooze(task.id)}
        >
          Snooze
        </Button>
        {confirming ? (
          <>
            <Button
              intent="ghost"
              size="md"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              intent="primary"
              size="md"
              loading={pending}
              leadingIcon={<CheckIcon size={15} variant="stroke" aria-hidden />}
              onClick={() => onComplete(task.id)}
            >
              {confirmVerb}
            </Button>
          </>
        ) : (
          <Button
            intent="primary"
            size="md"
            loading={pending}
            leadingIcon={<CheckIcon size={15} variant="stroke" aria-hidden />}
            onClick={() =>
              needsConfirm ? setConfirming(true) : onComplete(task.id)
            }
          >
            {primaryVerb}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Drawer
      open={Boolean(task)}
      onClose={onClose}
      title={task.title}
      subtitle={CATEGORY_META[task.category].label}
      footer={footer}
    >
      <div className="tasks-drawer">
        <div className={cx("tasks-drawer-flag", `tone-${tone}`)}>
          <span className="tasks-drawer-flag-ic" aria-hidden>
            <ToneIcon size={16} variant="stroke" />
          </span>
          <span>
            <strong>{PRIORITY_LABEL[task.priority]}</strong>
            <span>{task.due}</span>
          </span>
        </div>

        {(task.patient || task.linkCode) && (
          <div className="tasks-drawer-context">
            {task.patient && (
              <span className="tasks-drawer-patient">
                <Avatar initials={task.initials ?? ""} name={task.patient} size="sm" />
                <span>
                  <strong>{task.patient}</strong>
                  {task.linkCode && <small>{task.linkCode}</small>}
                </span>
              </span>
            )}
          </div>
        )}

        {blocked && (
          <div className="tasks-drawer-block">
            <WarningIcon size={15} variant="stroke" aria-hidden />
            <span>
              <strong>Blocked until identity is assured</strong>
              <span>{task.blockedBy}</span>
            </span>
          </div>
        )}

        {external && !terminal && (
          <div className="tasks-drawer-route">
            <CashIcon size={15} variant="stroke" aria-hidden />
            <span>
              <strong>Reconcile on the booking</strong>
              <span>
                This page points at the gap; it never edits the ledger (§22).
                The split freezes only when the line is both paid and served.
              </span>
            </span>
          </div>
        )}

        <p className="tasks-drawer-why">{task.why}</p>

        <div className="tasks-drawer-section">
          <p className="tasks-drawer-label">What to check</p>
          <ul className="tasks-drawer-checklist">
            {task.detail.map((line) => (
              <li key={line}>
                <ChevronRightIcon size={13} variant="stroke" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {confirming && task.confirm && (
          <div className="tasks-drawer-confirm" role="alert">
            <WarningIcon size={15} variant="stroke" aria-hidden />
            <span>
              <strong>This is irreversible</strong>
              <span>{task.confirm} Confirm below, or cancel.</span>
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ------------------------------- small parts ------------------------------- */

function ScopeTab({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  tone: Tone;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx("tasks-scope-tab", active && "is-active")}
      onClick={onClick}
    >
      {label}
      <Badge
        appearance="subtle"
        tone={count > 0 ? tone : "neutral"}
        className="tasks-scope-count"
      >
        {count}
      </Badge>
    </button>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx("tasks-fchip", active && "is-active")}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      {count !== undefined && <span className="tasks-fchip-n">{count}</span>}
    </button>
  );
}

function SnoozedStrip({
  tasks,
  onResume,
}: {
  tasks: Task[];
  onResume: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listId = "tasks-snoozed-list";

  /* close on Escape / outside click — the menu must be dismissable without
     clicking the toggle again */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  /* derive expansion so a now-empty list can't leave a stale open panel —
     no effect needed (the strip itself unmounts once nothing is parked) */
  const expanded = open && tasks.length > 0;

  return (
    <div className="tasks-snoozed-strip" ref={wrapRef}>
      <div className="tasks-snoozed-head">
        <span className="tasks-snoozed-ic" aria-hidden>
          <ClockIcon size={15} variant="stroke" />
        </span>
        <span className="tasks-snoozed-copy">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} snoozed.
        </span>
        <button
          type="button"
          className="tasks-snoozed-toggle"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          {expanded ? "Hide" : "View"}
          <ChevronRightIcon
            size={13}
            variant="stroke"
            aria-hidden
            className={cx("tasks-snoozed-chev", expanded && "is-open")}
          />
        </button>
      </div>
      {expanded && (
        <ul className="tasks-snoozed-list" id={listId}>
          {tasks.map((t) => (
            <li key={t.id}>
              <span className="tasks-snoozed-title">{t.title}</span>
              <button
                type="button"
                className="tasks-snoozed-resume"
                onClick={() => {
                  onResume(t.id);
                  /* collapse after the last one is resumed handled by effect */
                }}
              >
                Resume
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  scope,
  filtered,
  filterLabel,
  snoozedCount,
  onClearFilter,
  onResumeFirst,
}: {
  scope: Scope;
  filtered: boolean;
  filterLabel?: string;
  snoozedCount: number;
  onClearFilter: () => void;
  onResumeFirst: () => void;
}) {
  if (scope === "done") {
    return (
      <div className="tasks-empty">
        <span className="tasks-empty-ic tone-neutral" aria-hidden>
          <CheckIcon size={22} variant="stroke" />
        </span>
        <strong>Nothing completed yet</strong>
        <span>Tasks you finish or acknowledge will collect here.</span>
      </div>
    );
  }
  if (filtered) {
    return (
      <div className="tasks-empty">
        <span className="tasks-empty-ic tone-neutral" aria-hidden>
          <FilterIcon size={22} variant="stroke" />
        </span>
        <strong>No open tasks in {filterLabel ?? "this category"}</strong>
        <span>Nothing left here. Switch back to All for the rest of your work.</span>
        <Button intent="secondary" size="sm" onClick={onClearFilter}>
          Switch to All
        </Button>
      </div>
    );
  }
  /* boundary: nothing open, but work is merely parked — don't say "all clear" */
  if (snoozedCount > 0) {
    return (
      <div className="tasks-empty">
        <span className="tasks-empty-ic tone-warning" aria-hidden>
          <ClockIcon size={22} variant="stroke" />
        </span>
        <strong>
          Nothing open. {snoozedCount} {snoozedCount === 1 ? "task" : "tasks"} snoozed
        </strong>
        <span>Parked work is waiting in the Snoozed strip above.</span>
        <Button intent="secondary" size="sm" onClick={onResumeFirst}>
          Resume the first
        </Button>
      </div>
    );
  }
  return (
    <div className="tasks-empty">
      <span className="tasks-empty-ic tone-success" aria-hidden>
        <CheckCircleIcon size={24} variant="stroke" />
      </span>
      <strong>All clear</strong>
      <span>No open obligations right now. Have a calm day.</span>
    </div>
  );
}

export default TasksView;
