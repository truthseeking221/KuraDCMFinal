"use client";

/* Bookings action sheets — the manage-booking action machine in mobile bottom-
   sheet form. The action picker fans out to focused confirm / edit sheets; lock
   policy (bookingEditsLocked / bookingCancelLocked) gates which actions appear.
   All write paths go through the SHARED order-draft api so edit / cancel /
   resend / restore / reorder behave identically with the desktop. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cx } from "@/lib/cx";
import {
  Bell as BellIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import {
  bookingCancelLocked,
  bookingEditsLocked,
  formatMoney,
  orderItems,
  useOrderDraft,
} from "@/components/OrderDraft";
import type { OrderDraftLine, PlacedOrderSummary } from "@/components/OrderDraft/types";
import {
  canOrderAgain,
  getBookingAnchor,
  getLockReason,
} from "@/components/OrderDraft/bookingShared";
import { Sheet } from "@/components/DoctorMobile/components/Sheet";
import { ListRow, Money } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./BookingDetail.module.css";

/* ---------------------------------------------------------------- helpers --- */

type Close = () => void;

function actionLabel(order: PlacedOrderSummary): string {
  return order.bookingCode ?? order.code;
}

/* ----------------------------------------------------------- action sheet --- */

/* The fan-out action picker. Each row pushes a focused sheet over this one
   (sheet-over-sheet), so the picker stays in the stack underneath. */
export function BookingActionSheet({
  order,
  close,
  openEdit,
  openCancel,
  openResend,
}: {
  order: PlacedOrderSummary;
  close: Close;
  openEdit: () => void;
  openCancel: () => void;
  openResend: () => void;
}) {
  const { reorder, restoreBooking } = useOrderDraft();

  const editsLocked = bookingEditsLocked(order);
  const cancelLocked = bookingCancelLocked(order);
  const canResend = order.route === "psc" && !order.cancelled && order.bookingStatus !== "results-back";
  const lockReason = getLockReason(order);

  return (
    <Sheet title="Manage booking" onClose={close}>
      <div className={base.sectionStack}>
        <p className={base.muted}>
          {actionLabel(order)} · {order.lines.length} {order.lines.length === 1 ? "test" : "tests"}
        </p>

        <div className={base.cardGroup}>
          {!editsLocked && (
            <ListRow
              leading={<EditIcon size={16} variant="stroke" aria-hidden="true" />}
              tone="info"
              title="Edit tests"
              meta="Add or remove before collection"
              onClick={openEdit}
            />
          )}
          {canResend && (
            <ListRow
              leading={<BellIcon size={16} variant="stroke" aria-hidden="true" />}
              tone="info"
              title="Resend slip"
              meta="Another Telegram + SMS reminder"
              onClick={openResend}
            />
          )}
          {canOrderAgain(order) && (
            <ListRow
              leading={<RefreshIcon size={16} variant="stroke" aria-hidden="true" />}
              tone="neutral"
              title="Order again"
              meta="Re-create this booking for the patient"
              onClick={() => {
                reorder(order.code);
                close();
                toast.success(`Re-ordered ${actionLabel(order)}`);
              }}
            />
          )}
          {order.cancelled ? (
            <ListRow
              leading={<RefreshIcon size={16} variant="stroke" aria-hidden="true" />}
              tone="warning"
              title="Restore booking"
              meta="Bring this cancelled booking back"
              onClick={() => {
                restoreBooking(order.code);
                close();
                toast.success(`Restored ${actionLabel(order)}`);
              }}
            />
          ) : !cancelLocked ? (
            <ListRow
              leading={<DeleteIcon size={16} variant="stroke" aria-hidden="true" />}
              tone="danger"
              title="Cancel booking"
              meta="Void the tests and notify the patient"
              onClick={openCancel}
            />
          ) : null}
        </div>

        {lockReason && (
          <div className={cx(base.banner, base.tone_neutral)}>
            <WarningIcon size={16} variant="stroke" aria-hidden="true" />
            <span>{lockReason}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- cancel sheet - */

export function BookingCancelSheet({ order, close }: { order: PlacedOrderSummary; close: Close }) {
  const { cancelBooking } = useOrderDraft();
  const testWord = order.lines.length === 1 ? "test" : "tests";

  return (
    <Sheet
      title="Cancel this booking?"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Keep booking
          </button>
          <button
            type="button"
            className={cx(base.primaryButton, styles.dangerButton)}
            onClick={() => {
              cancelBooking(order.code);
              close();
              toast.success(`Cancelled ${actionLabel(order)}`);
            }}
          >
            Cancel booking
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={cx(base.safetyStrip, base.tone_danger)}>
          <WarningIcon size={16} variant="stroke" aria-hidden="true" />
          <div>
            <strong>
              Voids {order.lines.length} {testWord}
            </strong>
            <span>
              {order.route === "psc"
                ? "We notify the patient by Telegram and SMS."
                : "The courier dispatch is cancelled."}{" "}
              Refund any collected cash separately.
            </span>
          </div>
        </div>
        <div className={base.cardGroup}>
          {order.lines.map((line) => (
            <ListRow
              key={line.lineId}
              as="div"
              title={line.displayName}
              trailing={<Money usd={line.price} />}
            />
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- resend sheet - */

export function BookingResendSheet({ order, close }: { order: PlacedOrderSummary; close: Close }) {
  return (
    <Sheet
      title="Send the slip again?"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Back
          </button>
          <button
            type="button"
            className={base.primaryButton}
            onClick={() => {
              close();
              toast.success(
                `Slip re-sent to the patient · ${getBookingAnchor(order)} · Telegram + SMS`,
              );
            }}
          >
            Resend slip
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={cx(base.banner, base.tone_info)}>
          <BellIcon size={16} variant="stroke" aria-hidden="true" />
          <span>
            Send another Telegram and SMS reminder only if the patient may have missed the first one.
            The booking code {getBookingAnchor(order)} stays the same.
          </span>
        </div>
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------------- edit sheet - */

/* Edit tests: current lines with remove, search-to-add from the live catalog,
   running price delta, keep >= 1. Save commits through updateBookingLines. */
export function BookingEditSheet({ order, close }: { order: PlacedOrderSummary; close: Close }) {
  const { mintLineForItem, updateBookingLines } = useOrderDraft();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<OrderDraftLine[]>([]);
  const [query, setQuery] = useState("");

  const keptCount = order.lines.length - removedIds.size + added.length;
  const dirty = removedIds.size > 0 || added.length > 0;

  const presentIds = useMemo(
    () =>
      new Set([
        ...order.lines.map((line) => line.itemId).filter(Boolean),
        ...added.map((line) => line.itemId).filter(Boolean),
      ]),
    [added, order.lines],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return orderItems
      .filter(
        (item) =>
          !item.unavailable &&
          !presentIds.has(item.id) &&
          (item.name.toLowerCase().includes(normalized) || item.code.toLowerCase().includes(normalized)),
      )
      .slice(0, 6);
  }, [presentIds, query]);

  const liveTotal =
    order.lines.reduce((sum, line) => sum + (removedIds.has(line.lineId) ? 0 : line.price ?? 0), 0) +
    added.reduce((sum, line) => sum + (line.price ?? 0), 0) +
    order.statFee;
  const priceDelta = liveTotal - order.total;
  const deltaLabel = !dirty
    ? "Current total"
    : priceDelta === 0
      ? "No price change"
      : `${priceDelta > 0 ? "+" : "-"}${formatMoney(Math.abs(priceDelta))} vs current`;

  const removeLine = (lineId: string) =>
    setRemovedIds((current) => {
      const next = new Set(current);
      next.add(lineId);
      return next;
    });
  const undoRemove = (lineId: string) =>
    setRemovedIds((current) => {
      const next = new Set(current);
      next.delete(lineId);
      return next;
    });

  return (
    <Sheet
      title="Edit tests"
      size="full"
      onClose={close}
      footer={
        <div className={styles.editFooter}>
          <div className={styles.editTotal}>
            <Money usd={liveTotal} />
            <small className={base.muted}>{deltaLabel}</small>
          </div>
          <button
            type="button"
            className={base.primaryButton}
            disabled={!dirty || keptCount === 0}
            onClick={() => {
              const lines = [...order.lines.filter((line) => !removedIds.has(line.lineId)), ...added];
              updateBookingLines(order.code, lines);
              close();
              toast.success(`Updated ${actionLabel(order)} · +${added.length} · -${removedIds.size}`);
            }}
          >
            {keptCount === 0 ? "Keep one test" : dirty ? "Save changes" : "No changes"}
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={base.composerStepHead}>
          <span className={base.eyebrow}>In this booking</span>
          <small>
            {keptCount} {keptCount === 1 ? "test" : "tests"} after save
          </small>
        </div>

        <div className={base.cardGroup}>
          {order.lines.map((line) => {
            const removed = removedIds.has(line.lineId);
            return (
              <div key={line.lineId} className={cx(base.testRow, styles.editLine)}>
                <span className={cx(base.taskBody, removed && styles.lineRemoved)}>
                  <span className={base.taskPatient}>{line.displayName}</span>
                  <span className={base.taskMeta}>{removed ? "Will be removed" : "Current"}</span>
                </span>
                <span className={styles.editLineEnd}>
                  <Money usd={line.price} />
                  {removed ? (
                    <button type="button" className={base.textButton} onClick={() => undoRemove(line.lineId)}>
                      Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.removeChip}
                      aria-label={`Remove ${line.displayName}`}
                      onClick={() => removeLine(line.lineId)}
                    >
                      <CloseIcon size={14} variant="stroke" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          {added.map((line) => (
            <div key={line.lineId} className={cx(base.testRow, base.testRowSelected, styles.editLine)}>
              <span className={base.taskBody}>
                <span className={base.taskPatient}>{line.displayName}</span>
                <span className={cx(base.taskMeta, base.text_success)}>Added</span>
              </span>
              <span className={styles.editLineEnd}>
                <Money usd={line.price} />
                <button
                  type="button"
                  className={styles.removeChip}
                  aria-label={`Remove ${line.displayName}`}
                  onClick={() => setAdded((current) => current.filter((entry) => entry.lineId !== line.lineId))}
                >
                  <CloseIcon size={14} variant="stroke" aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
        </div>

        {keptCount === 0 && (
          <div className={cx(base.banner, base.tone_danger)}>
            <WarningIcon size={16} variant="stroke" aria-hidden="true" />
            <span>A booking must keep at least one test.</span>
          </div>
        )}

        <div className={base.composerStepHead}>
          <span className={base.eyebrow}>Add a test</span>
          <small>Active catalog</small>
        </div>

        <div className={base.searchBox}>
          <SearchIcon size={16} variant="stroke" aria-hidden="true" />
          <input
            type="text"
            value={query}
            placeholder="Search the test catalog…"
            aria-label="Search the test catalog"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className={styles.removeChip}
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <CloseIcon size={14} variant="stroke" aria-hidden="true" />
            </button>
          )}
        </div>

        {query.trim() && results.length === 0 && (
          <p className={base.muted}>No active test matches this search.</p>
        )}

        {results.length > 0 && (
          <div className={base.cardGroup}>
            {results.map((item) => (
              <ListRow
                key={item.id}
                leading={<PlusIcon size={16} variant="stroke" aria-hidden="true" />}
                tone="success"
                title={item.name}
                meta={item.code}
                trailing={<Money usd={item.price} />}
                onClick={() => {
                  const line = mintLineForItem(item.id);
                  if (line) setAdded((current) => [...current, line]);
                  setQuery("");
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
