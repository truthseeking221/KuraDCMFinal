"use client";

import { Fragment } from "react";
import { IconButton } from "@/components/ui";
import { Close as CloseIcon, Flask as FlaskIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { orderBundleById, formatMoney } from "./catalog";
import { useOrderDraft } from "./OrderDraftContext";
import type { OrderDraftLine } from "./types";

const GROUPS: Array<{ id: "labs" | "bundles" | "catalog"; label: string }> = [
  { id: "labs", label: "From lab review" },
  { id: "bundles", label: "Bundles" },
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
        {!readOnly && !compact && (
          <IconButton
            aria-label={`Remove ${line.displayName}`}
            icon={<CloseIcon size={14} variant="stroke" />}
            onClick={onRemove}
            size="micro"
            variant="tertiary"
          />
        )}
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
