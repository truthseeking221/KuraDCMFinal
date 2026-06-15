"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useOrderDraft } from "./OrderDraftContext";
import { OrderDraftLines } from "./OrderDraftLines";
import { OrderDraftPlacedBlock, OrderDraftSubtotal } from "./OrderDraftRail";
import "./OrderDraft.css";

export function OrderDraftPopover({
  onClose,
  onOpenOrders,
}: {
  onClose: () => void;
  onOpenOrders: () => void;
}) {
  const { draft, lineCount } = useOrderDraft();
  const ref = useRef<HTMLDivElement>(null);
  const placed = draft.status === "placed";
  const empty = !placed && draft.status !== "preparing" && lineCount === 0;

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div aria-label="Lab order preview" className="odr-popover" ref={ref} role="dialog">
      {placed ? (
        <OrderDraftPlacedBlock />
      ) : (
        <>
          {draft.status === "preparing" && (
            <div className="odr-prep-banner">
              Preparing order · <strong>Not yet placed</strong>
            </div>
          )}
          <OrderDraftLines compact emptyHint="Select tests from the catalog to build the order." limit={4} />
          {/* an empty draft has one job — no subtotal until there's content */}
          {lineCount > 0 && <OrderDraftSubtotal />}
        </>
      )}
      <div className="odr-popover-actions">
        <Button
          intent="primary"
          onClick={() => {
            onOpenOrders();
            onClose();
          }}
          size="sm"
        >
          {empty ? "Find tests" : "Open Orders tab"}
        </Button>
        <Button intent="ghost" onClick={onClose} size="sm">
          Close
        </Button>
      </div>
    </div>
  );
}
