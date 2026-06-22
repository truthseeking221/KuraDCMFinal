"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, CarePlanDestinationPicker, Counter, SmartSuggestionRow } from "@/components/ui";
import { CheckCircle as CheckCircleIcon, Close as CloseIcon, Delete as DeleteIcon } from "@/icons/components";
import { OPEN_STATUSES, useCarePlans } from "@/components/CarePlan/carePlanModel";
import { cx } from "@/lib/cx";
import { toast } from "sonner";
import { formatKhr, formatMoney } from "./catalog";
import { detectQuickSetSuggestion, NEAREST_PSC, PATIENT_PHONE_MASKED, SWEEP_WINDOW, useOrderDraft } from "./OrderDraftContext";
import { useUserBundles } from "./userBundles";
import { OrderDraftLines } from "./OrderDraftLines";
import { OrderDraftTubePrep } from "./OrderDraftTubePrep";
import { draftSavedAgo } from "./timeAgo";
import type { OrderDraftLine } from "./types";
import "./OrderDraft.css";

/* Per-context suppression of the Smart Order-Set nudge — two dismisses in the
   same cart context silence it; "Never" silences it outright (and is also
   handled by saving, which removes the suggestion via detectQuickSetSuggestion).
   Keyed by suggestion id so a different set can still surface. Module-scoped so
   it survives the rail unmount/mount across dock open/close in one session. */
const SUGGESTION_DISMISS_LIMIT = 2;
const suggestionDismissCounts = new Map<string, number>();
const suggestionSilenced = new Set<string>();

function cloneDraftLines(lines: OrderDraftLine[]): OrderDraftLine[] {
  return lines.map((line) => ({
    ...line,
    labRefs: line.labRefs.map((ref) => ({ ...ref })),
  }));
}

/* Boarding-pass-style receipt: status moment → ticket (anchor zone + dashed
   tear + label/value rows) → action. The success tint is a single line, not
   a container; the booking code owns the anchor, internal ref is demoted. */
export function OrderDraftPlacedBlock() {
  const { draft, startNewDraft } = useOrderDraft();
  const placed = draft.lastPlaced;
  if (!placed) return null;

  return (
    <div className="odr-placed">
      <div className="odr-placed-status">
        <CheckCircleIcon size={16} variant="stroke" />
        <span>Order placed</span>
      </div>

      <div className="odr-ticket">
        {placed.route === "psc" && placed.bookingCode ? (
          <div className="odr-ticket-code">
            <strong>{placed.bookingCode}</strong>
            <span>{placed.stat ? "URGENT — patient heading to the PSC now" : "Show at any Kura PSC"}</span>
          </div>
        ) : placed.handoverCode ? (
          <div className="odr-ticket-code">
            <strong>{placed.handoverCode}</strong>
            <span>Read this code to the courier · ~30 min</span>
          </div>
        ) : (
          <div className="odr-ticket-code">
            <strong className="odr-ticket-code-sm">{placed.sweep ?? SWEEP_WINDOW}</strong>
            <span>Next sweep — leave the tube bag at reception</span>
          </div>
        )}

        <div className="odr-ticket-rows">
          {placed.route === "psc" && (
            <>
              <div className="odr-ticket-row">
                <span>Sent via</span>
                <span className="odr-ticket-value">Telegram + SMS · {PATIENT_PHONE_MASKED}</span>
              </div>
              <div className="odr-ticket-row">
                <span>Nearest PSC</span>
                <span className="odr-ticket-value">{NEAREST_PSC.replace("Kura PSC · ", "")} · open now</span>
              </div>
            </>
          )}
          <div className="odr-ticket-row">
            <span>Order</span>
            <span className="odr-ticket-value">
              {placed.stat ? "STAT" : "Routine"} · {placed.lines.length}{" "}
              {placed.lines.length === 1 ? "item" : "items"} · {formatMoney(placed.total)}
              {placed.statFee > 0 ? ` (incl. ${formatMoney(placed.statFee)} STAT)` : ""}
              {placed.unpricedCount > 0 ? ` · +${placed.unpricedCount} unpriced` : ""} ·{" "}
              <span className="odr-ticket-ref">{placed.code}</span>
            </span>
          </div>
        </div>
      </div>

      <Button fullWidth intent="outline" onClick={startNewDraft} size="sm">
        Start new order
      </Button>
    </div>
  );
}

/* Care-plan destination picker fed by the active patient's open/active plans.
   Recording a destination is a reference only (setCarePlanDestination) — no
   care-plan store mutation happens here. Hidden when the patient has no open
   plan, so a standalone-only patient never sees an empty picker. */
function OrderDraftCarePlanPicker() {
  const { draft, lineCount, setCarePlanDestination } = useOrderDraft();
  const { plans } = useCarePlans(draft.patientId);

  const options = useMemo(
    () =>
      plans
        .filter((plan) => plan.kind !== "episode" && OPEN_STATUSES.includes(plan.status))
        .map((plan) => ({ id: plan.id, title: plan.title })),
    [plans],
  );

  if (options.length === 0 || lineCount === 0) return null;

  return (
    <div className="odr-careplan">
      <CarePlanDestinationPicker
        onChange={(planId) => {
          if (planId === null) {
            setCarePlanDestination(null);
            return;
          }
          const chosen = options.find((option) => option.id === planId);
          setCarePlanDestination(planId, chosen?.title);
        }}
        plans={options}
        testCount={lineCount}
        value={draft.carePlanId ?? null}
      />
    </div>
  );
}

/* Smart Order-Set nudge: quiet inline row offered when the live draft is a
   superset of a seeded frequent set the doctor hasn't already saved. Save reuses
   the userBundles path (one Quick Set per set). Re-runs detection against the
   live saved bundles so a just-saved set drops out, and self-suppresses after two
   dismisses (or "Never") in the same cart context. */
function OrderDraftSmartSet() {
  const { lines } = useOrderDraft();
  const { bundles, createBundle } = useUserBundles();

  const suggestion = useMemo(() => detectQuickSetSuggestion(lines, bundles), [lines, bundles]);
  /* re-render so suppression edits land without a draft change */
  const [, setTick] = useState(0);

  if (!suggestion) return null;
  if (suggestionSilenced.has(suggestion.id)) return null;
  if ((suggestionDismissCounts.get(suggestion.id) ?? 0) >= SUGGESTION_DISMISS_LIMIT) return null;

  const dismiss = () => {
    suggestionDismissCounts.set(suggestion.id, (suggestionDismissCounts.get(suggestion.id) ?? 0) + 1);
    setTick((value) => value + 1);
  };

  return (
    <div className="odr-smartset">
      <SmartSuggestionRow
        actionLabel="Save as Quick Set"
        onAction={() => {
          createBundle(suggestion.title, suggestion.itemIds);
          toast.success(`Saved “${suggestion.title}” as a Quick Set`);
        }}
        onDismiss={dismiss}
        onNever={() => {
          suggestionSilenced.add(suggestion.id);
          setTick((value) => value + 1);
        }}
        title={`Looks like your ${suggestion.title} set — save it as a Quick Set?`}
      />
    </div>
  );
}

export function OrderDraftSubtotal() {
  const { totals } = useOrderDraft();
  const visibleTotal = totals.known + totals.statFee;

  return (
    <div className="odr-subtotal">
      <div className="odr-subtotal-row">
        <span>Subtotal</span>
        <span className={cx(totals.statFee === 0 && "odr-subtotal-usd")}>{formatMoney(totals.known)}</span>
      </div>
      {totals.statFee > 0 && (
        <>
          <div className="odr-subtotal-row">
            <span>STAT dispatch</span>
            <span>+{formatMoney(totals.statFee)}</span>
          </div>
        </>
      )}
      {totals.statFee > 0 && (
        <div className="odr-subtotal-row">
          <span>Total</span>
          <span className="odr-subtotal-usd">{formatMoney(visibleTotal)}</span>
        </div>
      )}
      <div className="odr-subtotal-sub">
        <span className="odr-subtotal-khr">≈ {formatKhr(visibleTotal)}</span>
        {totals.unpricedCount > 0 && (
          <span className="odr-subtotal-unpriced">+{totals.unpricedCount} unpriced</span>
        )}
      </div>
    </div>
  );
}

export function OrderDraftRail({
  ctaSlot,
  emptyHint,
  frameless = false,
}: {
  /* host-specific checkout / navigation action, rendered while building */
  ctaSlot?: ReactNode;
  emptyHint?: string;
  frameless?: boolean;
}) {
  const { clearDraft, draft, lineCount, restoreLines } = useOrderDraft();
  const [clearedLines, setClearedLines] = useState<OrderDraftLine[] | null>(null);
  const placed = draft.status === "placed";
  const preparing = draft.status === "preparing";
  const railTitle = placed ? "Placed order" : preparing ? "Prepare tubes" : "Selected tests";
  /* interruption-recovery reassurance — the draft is persisted, so say so */
  const savedAgo = !placed && !preparing && lineCount > 0 ? draftSavedAgo(draft.updatedAt) : null;

  useEffect(() => {
    if (!clearedLines || lineCount === 0) return;
    const timer = window.setTimeout(() => setClearedLines(null), 0);
    return () => window.clearTimeout(timer);
  }, [clearedLines, lineCount]);

  const clearSelectedTests = () => {
    setClearedLines(lineCount > 0 && !placed && !preparing ? cloneDraftLines(draft.lines) : null);
    clearDraft();
  };

  const restoreSelectedTests = () => {
    if (!clearedLines) return;
    restoreLines(clearedLines);
    setClearedLines(null);
  };

  return (
    <aside aria-label={railTitle} className={cx("odr-rail", frameless && "odr-rail-frameless")}>
      <header className="odr-rail-header">
        <h3>{railTitle}</h3>
        {lineCount > 0 && <Counter count={lineCount} tone={placed ? "success" : "brand"} />}
        {placed && <Badge tone="success">Placed</Badge>}
        {preparing && <Badge tone="warning">Not placed yet</Badge>}
        {!placed && !preparing && lineCount > 0 && (
          <button
            aria-label="Clear order draft"
            className="odr-rail-clear"
            onClick={clearSelectedTests}
            title="Clear order draft"
            type="button"
          >
            <DeleteIcon size={14} variant="stroke" />
          </button>
        )}
      </header>
      {savedAgo && <p className="odr-rail-saved">Saved · updated {savedAgo}</p>}
      {/* An empty draft has one job: help the doctor add tests. History,
          subtotal, and routing only appear once there is orderable content
          (booking history lives in the chart and the Bookings views). */}
      <div className="odr-rail-body">
        {!placed && !preparing && lineCount === 0 && clearedLines && (
          <section className="odr-clear-undo" role="status" aria-live="polite" aria-label="Cleared selected tests recovery">
            <span className="odr-clear-undo-copy">
              <strong>
                {clearedLines.length} {clearedLines.length === 1 ? "test" : "tests"} cleared
              </strong>
              <span>Restore if accidental.</span>
            </span>
            <span className="odr-clear-undo-actions">
              <button className="odr-clear-undo-action" onClick={restoreSelectedTests} type="button">
                Undo
              </button>
              <button
                aria-label="Dismiss undo"
                className="odr-clear-undo-dismiss"
                onClick={() => setClearedLines(null)}
                type="button"
              >
                <CloseIcon size={13} variant="stroke" />
              </button>
            </span>
          </section>
        )}
        <OrderDraftLines emptyHint={emptyHint} readOnly={placed || preparing} />
        {/* The Smart Order-Set nudge sits quietly below the selected tests —
            never above the list, so it reads as a suggestion about what's there,
            not a header. Building-only. */}
        {!placed && !preparing && lineCount > 0 && <OrderDraftSmartSet />}
      </div>
      <footer className="odr-rail-footer">
        {!placed && lineCount > 0 && <OrderDraftSubtotal />}
        {/* Destination is chosen just before the commit action, while building. */}
        {!placed && !preparing && lineCount > 0 && <OrderDraftCarePlanPicker />}
        {placed ? <OrderDraftPlacedBlock /> : preparing ? <OrderDraftTubePrep /> : lineCount > 0 ? ctaSlot : null}
      </footer>
    </aside>
  );
}
