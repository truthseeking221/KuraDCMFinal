"use client";

/* CartScreen — the expanded order draft (opened by the dock / openCart()).
   Covers the shared cart + placement + receipt:
     • lines from useOrderDraft().lines (name + category/specimen + price/Front
       desk, remove ✕)
     • subtotal USD + KHR + unpriced-count warning
     • patient slot + identity badge (active chart patient)
     • route (clinic / PSC) + STAT + payment (cash / KHQR / pay-at-PSC)
     • Place → placeOrder(); clinic route holds at "preparing" → TubePrepSheet
     • boarding-pass receipt once placed (status → code → rows → actions),
       with Mark received for KHQR-waiting payments
     • Clear draft + undo banner
   The shell mounts <OrderCartDock/>; this is its expanded surface. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectQuickSetSuggestion,
  formatKhr,
  formatMoney,
  orderItemById,
  orderCategories,
  specimenFilters,
  useOrderDraft,
  NEAREST_PSC,
  PATIENT_PHONE_MASKED,
  SWEEP_WINDOW,
} from "@/components/OrderDraft";
import { useUserBundles } from "@/components/OrderDraft/userBundles";
import { useCarePlans, OPEN_STATUSES } from "@/components/CarePlan/carePlanModel";
import { CarePlanDestinationPicker, SmartSuggestionRow } from "@/components/ui";
import { toast } from "sonner";
import type {
  OrderDraftLine,
  OrderRouteId,
  PaymentStatus,
  PlacedOrderSummary,
  PscPayChoice,
} from "@/components/OrderDraft/types";
import {
  Cart,
  Cash,
  Check,
  CheckCircle,
  Close,
  CreditCard,
  Pin,
  Tube,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { getChartHeader } from "../../data/clinical";
import { useMobileApp } from "../../state/MobileAppContext";
import { useSheets } from "../../components/Sheet";
import { Pill, SegmentTabs, StickyCtaDock, type Tone } from "../../components/primitives";
import { TubePrepSheet } from "./TubePrepSheet";
import base from "../../DoctorMobileApp.module.css";
import styles from "./CartScreen.module.css";

const CATEGORY_LABEL = new Map(orderCategories.map((cat) => [cat.id, cat.label]));
const SPECIMEN_LABEL = new Map(specimenFilters.map((spec) => [spec.id, spec.label]));

/* Line sub-label: catalog category + first specimen, falling back to the
   provenance reason (unlisted lines added from a lab row). */
function lineMeta(line: OrderDraftLine): string {
  const item = line.itemId ? orderItemById.get(line.itemId) : undefined;
  if (item) {
    const parts = [CATEGORY_LABEL.get(item.categoryId)];
    const specimen = item.specimens[0];
    if (specimen) parts.push(SPECIMEN_LABEL.get(specimen) ?? specimen);
    return parts.filter(Boolean).join(" · ");
  }
  if (line.kind === "bundle") return "Panel";
  const ref = line.labRefs[0];
  if (ref?.reasonText) return ref.reasonText;
  return "Priced at front desk";
}

const PAYMENT_TONE: Record<PaymentStatus, { tone: Tone; label: string }> = {
  pending: { tone: "neutral", label: "Settles at draw" },
  collected: { tone: "success", label: "Collected" },
  waiting: { tone: "warning", label: "Awaiting KHQR" },
  deferred: { tone: "info", label: "At PSC counter" },
  "pending-claim": { tone: "info", label: "Insurer billed" },
  claimed: { tone: "success", label: "Claimed" },
  refunded: { tone: "neutral", label: "Refunded" },
  voided: { tone: "neutral", label: "Voided" },
};

const ROUTES: Array<{ id: OrderRouteId; title: string; sub: string; Icon: typeof Tube }> = [
  { id: "clinic", title: "Clinic draw", sub: "Sample taken in clinic", Icon: Tube },
  { id: "psc", title: "PSC walk-in", sub: "Patient visits a collection point", Icon: Pin },
];

const PAY_CHOICES: Array<{ id: PscPayChoice; title: string; sub: string; Icon: typeof Cash }> = [
  { id: "cash", title: "Cash now", sub: "Collected in clinic", Icon: Cash },
  { id: "khqr", title: "KHQR now", sub: "Sent via Telegram", Icon: CreditCard },
  { id: "later", title: "Pay at PSC", sub: "Collected at counter", Icon: Pin },
];

export function CartScreen() {
  const {
    draft,
    lines,
    lineCount,
    totals,
    removeLine,
    clearDraft,
    restoreLines,
    setRoute,
    setStat,
    setPscPay,
    placeOrder,
    markKhqrReceived,
    startNewDraft,
    setCarePlanDestination,
    quickSetSuggestion,
  } = useOrderDraft();
  const { activePatientId, back } = useMobileApp();
  const sheets = useSheets();
  const { plans } = useCarePlans(activePatientId);
  const { bundles, createBundle } = useUserBundles();

  /* active patient's open/active care plans → picker options {id,title} */
  const planOptions = useMemo(
    () =>
      plans
        .filter((plan) => OPEN_STATUSES.includes(plan.status))
        .map((plan) => ({ id: plan.id, title: plan.title })),
    [plans],
  );

  /* Smart Order-Set suggestion, suppressed once the matching set is already
     saved as a Quick Set (re-run detection against the live saved list). Hidden
     in this context after 2 dismisses. */
  const [setDismissals, setSetDismissals] = useState(0);
  const [neverSuggest, setNeverSuggest] = useState(false);
  const liveSuggestion = useMemo(
    () => (quickSetSuggestion ? detectQuickSetSuggestion(lines, bundles) : null),
    [quickSetSuggestion, lines, bundles],
  );
  const showSuggestion = !!liveSuggestion && !neverSuggest && setDismissals < 2;

  const [undoLines, setUndoLines] = useState<OrderDraftLine[] | null>(null);
  /* track whether we entered tube-prep from this screen so we auto-present the
     sheet once placeOrder() flips the draft to "preparing" */
  const wantsPrep = useRef(false);

  const placed = draft.status === "placed" ? draft.lastPlaced : null;
  const preparing = draft.status === "preparing";

  /* present the tube-prep sheet whenever the draft is in "preparing" and the
     place came from here */
  useEffect(() => {
    if (preparing && wantsPrep.current) {
      wantsPrep.current = false;
      sheets.open((close) => <TubePrepSheet onClose={close} />);
    }
  }, [preparing, sheets]);

  const header = getChartHeader(activePatientId);
  const identityFlag = header.flags.find((flag) => flag.icon === "verified") ?? header.flags[0];

  const { route, stat, pscPay } = draft.checkout;
  const needsPay = route === "psc" && !pscPay;
  const placeDisabled = lineCount === 0 || !route || needsPay;

  const placeLabel = !route
    ? "Choose a route"
    : needsPay
      ? "Pick payment to place"
      : route === "clinic"
        ? stat
          ? "Place STAT order · prepare tubes"
          : "Place order · prepare tubes"
        : stat
          ? "Place STAT order"
          : "Place order";

  const handlePlace = () => {
    if (placeDisabled) return;
    if (route === "clinic") wantsPrep.current = true;
    placeOrder();
    /* Only the PSC route COMMITS in placeOrder(); the clinic route just flips
       to tube prep and is not placed until confirmTubesReady() in the
       TubePrepSheet. Confirm the destination (care-plan strand vs standalone
       lab order) immediately only for PSC — for the clinic route the
       destination toast is deferred to the tube-prep confirm so it can't lie if
       the doctor backs out of prep. */
    const noun = lineCount === 1 ? "test" : "tests";
    if (route !== "psc") {
      toast.success(`Preparing ${lineCount} ${noun}…`);
      return;
    }
    const destination = draft.carePlanTitle
      ? `${lineCount} ${noun} linked to ${draft.carePlanTitle}`
      : `${lineCount} ${noun} ordered as a standalone lab order`;
    toast.success(destination);
  };

  const handleClear = () => {
    setUndoLines(lines.map((line) => ({ ...line, labRefs: line.labRefs.map((ref) => ({ ...ref })) })));
    clearDraft();
  };

  const handleUndo = () => {
    if (undoLines) restoreLines(undoLines);
    setUndoLines(null);
  };

  /* ---------------------------------------------------------------- placed -- */
  if (placed) {
    return <PlacedReceipt placed={placed} onMarkKhqr={markKhqrReceived} onNew={startNewDraft} onClose={back} />;
  }

  /* ----------------------------------------------------------------- empty -- */
  if (lineCount === 0 && !undoLines) {
    return (
      <div className={base.sectionStack}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Cart size={20} variant="stroke" />
          </span>
          <strong>No tests in this order</strong>
          <span>Add tests from a patient chart or the catalog and they will collect here.</span>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- building -- */
  return (
    <div className={base.sectionStack}>
      {/* lines */}
      <section className={base.sectionStack}>
        <div className={base.sectionHeader}>
          <h2>Order draft</h2>
          <span>
            {lineCount} {lineCount === 1 ? "test" : "tests"}
          </span>
        </div>

        {lineCount > 0 && (
          <div className={styles.lines} role="list">
            {lines.map((line) => (
              <div className={styles.line} key={line.lineId} role="listitem">
                <span className={styles.lineCopy}>
                  <strong>{line.displayName}</strong>
                  <span>{lineMeta(line)}</span>
                </span>
                <span className={styles.linePrice}>
                  {line.price === null ? <span className={styles.lineUnpriced}>Front desk</span> : formatMoney(line.price)}
                </span>
                <button
                  className={styles.remove}
                  type="button"
                  aria-label={`Remove ${line.displayName}`}
                  onClick={() => removeLine(line.lineId)}
                >
                  <Close size={15} variant="stroke" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Smart Order Set — quiet nudge below the selected tests */}
        {lineCount > 0 && showSuggestion && liveSuggestion && (
          <SmartSuggestionRow
            title={`Looks like your ${liveSuggestion.title} set`}
            actionLabel="Save as Quick Set"
            tone="neutral"
            onAction={() => {
              createBundle(liveSuggestion.title, liveSuggestion.itemIds);
              toast.success(`Saved “${liveSuggestion.title}” as a Quick Set`);
            }}
            onDismiss={() => setSetDismissals((count) => count + 1)}
            onNever={() => setNeverSuggest(true)}
          />
        )}

        {undoLines && lineCount === 0 && (
          <div className={styles.undoBanner}>
            <span>Order cleared.</span>
            <button className={styles.undoBtn} type="button" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </section>

      {lineCount > 0 && (
        <>
          {/* subtotal */}
          <div className={styles.subtotal}>
            <div className={styles.subtotalRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(totals.known)}</strong>
            </div>
            {totals.statFee > 0 && (
              <>
                <div className={styles.subtotalRow}>
                  <span>STAT dispatch</span>
                  <span>+{formatMoney(totals.statFee)}</span>
                </div>
                <div className={styles.subtotalRow}>
                  <span>Total due</span>
                  <strong>{formatMoney(totals.due)}</strong>
                </div>
              </>
            )}
            <div className={styles.subtotalSub}>
              <span>≈ {formatKhr(totals.due)}</span>
              {totals.unpricedCount > 0 && (
                <span className={styles.unpriced}>
                  +{totals.unpricedCount} priced at front desk
                </span>
              )}
            </div>
          </div>

          {/* patient slot */}
          <div className={styles.patientSlot}>
            <span className={base.avatar} aria-hidden="true">
              {header.initials}
            </span>
            <span className={styles.patientCopy}>
              <strong>{header.name}</strong>
              <span>{header.identity}</span>
            </span>
            {identityFlag && (
              <Pill tone={(identityFlag.tone as Tone) ?? "neutral"}>{identityFlag.label}</Pill>
            )}
          </div>

          {/* care-plan destination — link the order to a plan or keep standalone */}
          {planOptions.length > 0 && (
            <div className={styles.destination}>
              <CarePlanDestinationPicker
                plans={planOptions}
                value={draft.carePlanId ?? null}
                onChange={(planId) =>
                  setCarePlanDestination(
                    planId,
                    planId ? planOptions.find((p) => p.id === planId)?.title : undefined,
                  )
                }
                testCount={lineCount}
              />
            </div>
          )}

          {/* route */}
          <section className={base.sectionStack}>
            <div className={base.sectionHeader}>
              <h2>Sample routing</h2>
            </div>
            <div className={styles.choices} role="radiogroup" aria-label="Sample routing">
              {ROUTES.map(({ id, title, sub, Icon }) => {
                const selected = route === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cx(styles.choice, selected && styles.choiceSelected)}
                    onClick={() => setRoute(id)}
                  >
                    <span className={styles.choiceIcon} aria-hidden="true">
                      <Icon size={16} variant="stroke" />
                    </span>
                    <span className={styles.choiceCopy}>
                      <strong>{title}</strong>
                      <span>{sub}</span>
                    </span>
                    {selected && (
                      <span className={styles.choiceTick} aria-hidden="true">
                        <Check size={16} variant="stroke" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* urgency + payment — appear once a route exists */}
          {route && (
            <section className={base.sectionStack}>
              <div className={base.sectionHeader}>
                <h2>Urgency</h2>
              </div>
              <SegmentTabs
                items={[
                  { id: "routine", label: "Routine" },
                  { id: "stat", label: "STAT" },
                ]}
                activeId={stat ? "stat" : "routine"}
                onSelect={(id) => setStat(id === "stat")}
              />
              {stat && route === "clinic" && (
                <div className={base.safetyStrip}>
                  <Tube size={15} variant="stroke" aria-hidden="true" />
                  <div>
                    <strong>Courier dispatched now (~30 min)</strong>
                    <span>+{formatMoney(totals.statFee || 15)} STAT fee · 2h TAT</span>
                  </div>
                </div>
              )}
              {stat && route === "psc" && (
                <div className={base.safetyStrip}>
                  <Pin size={15} variant="stroke" aria-hidden="true" />
                  <div>
                    <strong>Urgent SMS will be sent</strong>
                    <span>Patient heads to the PSC now · no STAT fee</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {route === "psc" && (
            <section className={base.sectionStack}>
              <div className={base.sectionHeader}>
                <h2>Payment</h2>
              </div>
              <div className={styles.choices} role="radiogroup" aria-label="Payment">
                {PAY_CHOICES.map(({ id, title, sub, Icon }) => {
                  const selected = pscPay === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cx(styles.choice, selected && styles.choiceSelected)}
                      onClick={() => setPscPay(id)}
                    >
                      <span className={styles.choiceIcon} aria-hidden="true">
                        <Icon size={16} variant="stroke" />
                      </span>
                      <span className={styles.choiceCopy}>
                        <strong>{title}</strong>
                        <span>{sub}</span>
                      </span>
                      {selected && (
                        <span className={styles.choiceTick} aria-hidden="true">
                          <Check size={16} variant="stroke" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* place + clear */}
          <StickyCtaDock>
            <button
              className={base.primaryButton}
              type="button"
              style={{ width: "100%" }}
              disabled={placeDisabled}
              onClick={handlePlace}
            >
              {route === "clinic" && !placeDisabled && <Tube size={14} variant="stroke" aria-hidden="true" />}
              {placeLabel}
            </button>
            <button className={base.secondaryButton} type="button" onClick={handleClear}>
              Clear
            </button>
          </StickyCtaDock>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------- boarding-pass receipt -- */

function PlacedReceipt({
  placed,
  onMarkKhqr,
  onNew,
  onClose,
}: {
  placed: PlacedOrderSummary;
  onMarkKhqr: () => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const paymentTone = PAYMENT_TONE[placed.payment.status];

  let codeBlock: { value: string; caption: string; small?: boolean };
  if (placed.route === "psc" && placed.bookingCode) {
    codeBlock = {
      value: placed.bookingCode,
      caption: placed.stat ? "URGENT — patient heading to the PSC now" : "Show at any Kura PSC",
    };
  } else if (placed.handoverCode) {
    codeBlock = { value: placed.handoverCode, caption: "Read this code to the courier · ~30 min" };
  } else {
    codeBlock = { value: placed.sweep ?? SWEEP_WINDOW, caption: "Next sweep — leave the tube bag at reception", small: true };
  }

  return (
    <div className={base.sectionStack}>
      <div className={base.successPanel}>
        <CheckCircle size={20} variant="stroke" aria-hidden="true" />
        <strong>Order placed</strong>
      </div>

      <div className={styles.ticket}>
        <div className={cx(styles.ticketCode, codeBlock.small && styles.ticketCodeSm)}>
          {codeBlock.small ? (
            <strong>{codeBlock.value}</strong>
          ) : (
            <span className={base.bookingCode}>{codeBlock.value}</span>
          )}
          <small>{codeBlock.caption}</small>
        </div>

        <div className={styles.ticketRows}>
          {placed.route === "psc" && (
            <>
              <div className={styles.ticketRow}>
                <span>Sent via</span>
                <span className={styles.ticketValue}>Telegram + SMS · {PATIENT_PHONE_MASKED}</span>
              </div>
              <div className={styles.ticketRow}>
                <span>Nearest PSC</span>
                <span className={styles.ticketValue}>{NEAREST_PSC.replace("Kura PSC · ", "")} · open now</span>
              </div>
            </>
          )}
          <div className={styles.ticketRow}>
            <span>Payment</span>
            <span className={styles.ticketValue}>
              {placed.payment.label}
              <Pill tone={paymentTone.tone}>{paymentTone.label}</Pill>
              {placed.payment.status === "waiting" && (
                <button className={styles.markBtn} type="button" onClick={onMarkKhqr}>
                  Mark received
                </button>
              )}
            </span>
          </div>
          <div className={styles.ticketRow}>
            <span>Order</span>
            <span className={styles.ticketValue}>
              {placed.stat ? "STAT" : "Routine"} · {placed.lines.length} {placed.lines.length === 1 ? "item" : "items"} ·{" "}
              {formatMoney(placed.total)}
              {placed.statFee > 0 ? ` (incl. ${formatMoney(placed.statFee)} STAT)` : ""}
              {placed.unpricedCount > 0 ? ` · +${placed.unpricedCount} unpriced` : ""}{" "}
              <span className={styles.ticketRef}>{placed.code}</span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.receiptActions}>
        <button className={base.secondaryButton} type="button" style={{ width: "100%" }} onClick={onNew}>
          Start new order
        </button>
        <button className={base.textButton} type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
