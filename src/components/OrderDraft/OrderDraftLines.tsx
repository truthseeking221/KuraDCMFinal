"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Check as CheckIcon, Delete as DeleteIcon, Flask as FlaskIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { orderBundleById, formatMoney } from "./catalog";
import { useOrderDraft } from "./OrderDraftContext";
import type { OrderDraftLine } from "./types";

/* Explicit added-state control for a cart row. Shows a persistent "Added" pill
   (check + label, always visible — never hover-only, adequate hit area). Clicking
   it opens a tiny inline menu whose only item removes the test, so re-engaging an
   added item offers removal without a hover-revealed ✕. The menu sits to the LEFT
   of the trigger and never overlaps the trigger itself, so nothing covers the
   row-action control. */
function AddedControl({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="odr-added" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${name} added — remove`}
        className={cx("odr-added-chip", open && "is-open")}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <CheckIcon size={13} variant="stroke" />
        <span>Added</span>
      </button>
      {open && (
        <span className="odr-added-menu" role="menu">
          <button
            className="odr-added-menu-item"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <DeleteIcon size={14} variant="stroke" />
            <span>Remove from order</span>
          </button>
        </span>
      )}
    </span>
  );
}

const GROUPS: Array<{ id: "labs" | "bundles" | "catalog"; label: string }> = [
  { id: "labs", label: "From lab review" },
  { id: "bundles", label: "Order Sets" },
  { id: "catalog", label: "Catalog" },
];

function groupOf(line: OrderDraftLine): "labs" | "bundles" | "catalog" {
  if (line.labRefs.length > 0) return "labs";
  if (line.kind === "bundle") return "bundles";
  return "catalog";
}

function LineRow({
  line,
  compact,
  readOnly,
  onRemove,
}: {
  line: OrderDraftLine;
  compact?: boolean;
  readOnly?: boolean;
  onRemove: () => void;
}) {
  const bundle = line.kind === "bundle" && line.itemId ? orderBundleById.get(line.itemId) : null;
  const refs = compact ? line.labRefs.slice(0, 1) : line.labRefs;

  return (
    <div className={cx("odr-line", compact && "odr-line--compact")}>
      <div className="odr-line-copy">
        <span className="odr-line-name">{line.displayName}</span>
        {refs.map((ref) => (
          <span key={ref.labKey} className="odr-line-reason">
            {ref.severityTone && (
              <span aria-hidden className={cx("odr-line-dot", `tone-${ref.severityTone}`)} />
            )}
            <span className="odr-line-reason-text">
              {ref.labName !== line.displayName ? `${ref.labName} · ` : ""}
              {ref.reasonText || "Follow-up"}
            </span>
          </span>
        ))}
        {bundle && !compact && <span className="odr-line-children">{bundle.tags.join(" · ")}</span>}
      </div>
      <span className="odr-line-price">
        {line.price === null ? <span className="odr-line-frontdesk">Front desk</span> : formatMoney(line.price)}
      </span>
      <span className="odr-line-remove">
        {!readOnly && !compact && <AddedControl name={line.displayName} onRemove={onRemove} />}
      </span>
    </div>
  );
}

export function OrderDraftLines({
  compact = false,
  emptyHint,
  limit,
  readOnly = false,
}: {
  compact?: boolean;
  /* contextual second line under the empty-state text */
  emptyHint?: string;
  limit?: number;
  readOnly?: boolean;
}) {
  const { lines, removeLine } = useOrderDraft();

  if (lines.length === 0) {
    return (
      <div className={compact ? "odr-empty odr-empty--compact" : "odr-empty"}>
        {!compact && (
          <span className="odr-empty-badge" aria-hidden="true">
            <FlaskIcon size={18} variant="stroke" />
          </span>
        )}
        <div className="odr-empty-copy">
          <span>No tests yet</span>
          <span>{emptyHint ?? "Select tests from the catalog to build the order."}</span>
        </div>
      </div>
    );
  }

  const ordered = [...lines].sort((a, b) => a.addedAt - b.addedAt);
  const shown = limit ? ordered.slice(0, limit) : ordered;
  const hiddenCount = ordered.length - shown.length;

  if (compact) {
    return (
      <div className="odr-lines">
        {shown.map((line) => (
          <LineRow compact key={line.lineId} line={line} onRemove={() => removeLine(line.lineId)} readOnly={readOnly} />
        ))}
        {hiddenCount > 0 && <span className="odr-lines-more">+{hiddenCount} more</span>}
      </div>
    );
  }

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    lines: shown.filter((line) => groupOf(line) === group.id),
  })).filter((group) => group.lines.length > 0);

  return (
    <div className="odr-lines">
      {visibleGroups.map((group, groupIndex) => (
        <Fragment key={group.id}>
          {groupIndex > 0 && <span aria-hidden className="odr-group-divider" />}
          <span className="odr-group-label">{group.label}</span>
          {group.lines.map((line) => (
            <LineRow key={line.lineId} line={line} onRemove={() => removeLine(line.lineId)} readOnly={readOnly} />
          ))}
        </Fragment>
      ))}
      {hiddenCount > 0 && <span className="odr-lines-more">+{hiddenCount} more</span>}
    </div>
  );
}
