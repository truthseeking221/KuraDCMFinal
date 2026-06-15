"use client";

import { Fragment } from "react";
import Image from "next/image";
import { IconButton } from "@/components/ui";
import { Close as CloseIcon, Flask as FlaskIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { orderBundleById, orderItemById, formatMoney } from "./catalog";
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
  const prep = line.kind === "test" && line.itemId ? orderItemById.get(line.itemId)?.prep : undefined;
  const refs = compact ? line.labRefs.slice(0, 1) : line.labRefs;

  return (
    <div className={cx("odr-line", compact && "odr-line--compact")}>
      {!compact && (
        <span className="odr-line-icon" aria-hidden="true">
          <FlaskIcon size={16} variant="stroke" />
        </span>
      )}
      <div className="odr-line-copy">
        <span className="odr-line-name">{line.displayName}</span>
        {refs.map((ref) => (
          <span key={ref.labKey} className={`odr-line-reason${ref.severityTone ? ` tone-${ref.severityTone}` : ""}`}>
            {ref.labName !== line.displayName ? `${ref.labName} · ` : ""}
            {ref.reasonText || "Follow-up"}
          </span>
        ))}
        {line.kind === "unlisted" && !compact && (
          <span className="odr-line-hint">Not in catalog · priced at front desk</span>
        )}
        {prep && !compact && <span className="odr-line-hint">{prep}</span>}
        {bundle && !compact && <span className="odr-line-children">{bundle.tags.join(" · ")}</span>}
      </div>
      <span className="odr-line-price">{line.price === null ? "$—" : formatMoney(line.price)}</span>
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
          <div className="odr-empty-illustration-frame" aria-hidden="true">
            <Image
              alt=""
              className="odr-empty-illustration"
              height={1024}
              src="/assets/kura-order-draft-empty-icon-clean.png"
              width={1024}
            />
          </div>
        )}
        <div className="odr-empty-copy">
          <span>No tests in this draft yet.</span>
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

  return (
    <div className="odr-lines">
      {GROUPS.map((group) => {
        const groupLines = shown.filter((line) => groupOf(line) === group.id);
        if (groupLines.length === 0) return null;
        return (
          <Fragment key={group.id}>
            <span className="odr-group-label">{group.label}</span>
            {groupLines.map((line) => (
              <LineRow key={line.lineId} line={line} onRemove={() => removeLine(line.lineId)} readOnly={readOnly} />
            ))}
          </Fragment>
        );
      })}
      {hiddenCount > 0 && <span className="odr-lines-more">+{hiddenCount} more</span>}
    </div>
  );
}
