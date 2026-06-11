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
  const { draft } = useOrderDraft();
  const ref = useRef<HTMLDivElement>(null);
  const placed = draft.status === "placed";

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
    <div aria-label="Order draft preview" className="odr-popover" ref={ref} role="dialog">
      {placed ? (
        <OrderDraftPlacedBlock />
      ) : (
        <>
          {draft.status === "preparing" && (
            <div className="odr-prep-banner">
              Preparing order · <strong>Not yet placed</strong>
            </div>
          )}
          <OrderDraftLines compact emptyHint="Add tests from Labs or the catalog." limit={4} />
          <OrderDraftSubtotal />
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
          Open Orders tab
        </Button>
        <Button intent="ghost" onClick={onClose} size="sm">
          Close
        </Button>
      </div>
    </div>
  );
}
