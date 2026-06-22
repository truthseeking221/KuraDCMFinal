"use client";

import { useEffect, useState } from "react";
import { Button, SegmentedToggle } from "@/components/ui";
import { OrderVerificationGate, useKyd } from "@/components/Verification";
import { Pin as PinIcon, Scan as ScanIcon, Tube as TubeIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { toast } from "sonner";
import { formatMoney } from "./catalog";
import { STAT_CLINIC_FEE, useOrderDraft } from "./OrderDraftContext";
import type { OrderRouteId } from "./types";

const ROUTES: Array<{
  id: OrderRouteId;
  title: string;
  sub: string;
  Icon: typeof TubeIcon;
}> = [
  { id: "psc", title: "Send patient to PSC", sub: "Patient receives a booking code and goes to a Kura PSC.", Icon: PinIcon },
  { id: "clinic", title: "Send tubes to Kura", sub: "Collect the sample in clinic, then send prepared tubes to Kura.", Icon: TubeIcon },
];

export function OrderDraftCheckout() {
  const { draft, lineCount, placeOrder, setDoctorFee, setRoute, setStat } = useOrderDraft();
  const { isApproved } = useKyd();
  const { doctorFee, route, stat } = draft.checkout;
  const [showSmsPreview, setShowSmsPreview] = useState(false);

  useEffect(() => {
    if (doctorFee > 0) setDoctorFee(0);
  }, [doctorFee, setDoctorFee]);

  const disabled = lineCount === 0 || !route;
  /* CTA names the exact blocker, then the action */
  const label =
    lineCount === 0
      ? "Add at least one test"
      : !route
        ? "Choose fulfillment"
        : route === "psc"
          ? "Send booking code"
          : stat
            ? "Prepare STAT tubes"
            : "Prepare tubes";

  const handlePlace = () => {
    if (disabled) return;
    placeOrder();
    /* Confirm where the tests landed — a real care-plan strand or a standalone
       lab order — so the destination decision is acknowledged, not silent.
       Only the PSC route COMMITS inside placeOrder(); the clinic route merely
       flips to tube prep and is not placed until confirmTubesReady(). Toasting
       a destination now on the clinic route would lie if the doctor backs out
       of prep, so the destination confirmation is deferred to the tube-prep
       confirm (which carries the destination via buildSummary). */
    const noun = lineCount === 1 ? "test" : "tests";
    if (route !== "psc") {
      toast.success(`Preparing ${lineCount} ${noun}…`);
      return;
    }
    if (draft.carePlanTitle) {
      toast.success(`${lineCount} ${noun} linked to ${draft.carePlanTitle}`);
    } else {
      toast.success(`${lineCount} ${noun} ordered as a standalone lab order`);
    }
  };

  /* Progressive disclosure: nothing to route until there is something to
     order. The rail already hides this slot at 0 tests — guard anyway. */
  if (lineCount === 0) return null;

  return (
    <div className="odr-checkout">
      <div aria-label="Fulfillment" className="odr-route-group" role="radiogroup">
        {ROUTES.map(({ id, title, sub, Icon }) => {
          const selected = route === id;
          return (
            <button
              aria-checked={selected}
              className={cx("odr-route-card", selected && "is-selected")}
              key={id}
              onClick={() => {
                setRoute(id);
                setShowSmsPreview(false);
              }}
              role="radio"
              type="button"
            >
              <span aria-hidden className="odr-route-icon">
                <Icon size={16} variant="stroke" />
              </span>
              <span className="odr-route-copy">
                <strong>{title}</strong>
                <span>{sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Urgency only appears once a route exists — STAT consequences
          (fee, courier vs URGENT SMS) depend on the route */}
      {route && (
      <div className="odr-stat-row">
        <SegmentedToggle
          aria-label="Order urgency"
          onChange={(value) => {
            const nextStat = value === "stat";
            setStat(nextStat);
            if (!nextStat) setShowSmsPreview(false);
          }}
          options={[
            { label: "Routine", value: "routine" },
            { label: "STAT", value: "stat" },
          ]}
          value={stat ? "stat" : "routine"}
        />
        {stat && route === "clinic" && (
          <span className="odr-stat-note">
            Courier dispatched now (~30 min) · +{formatMoney(STAT_CLINIC_FEE)} fee · 2h TAT
          </span>
        )}
        {stat && route === "psc" && (
          <div className="odr-stat-callout">
            <span>Urgent SMS will be sent · patient goes to PSC now · no STAT fee</span>
            <button
              aria-expanded={showSmsPreview}
              className="odr-sms-toggle"
              onClick={() => setShowSmsPreview((open) => !open)}
              type="button"
            >
              {showSmsPreview ? "Hide" : "Preview"}
            </button>
            {/* the doctor sees verbatim what the patient will read */}
            {showSmsPreview && (
              <div className="odr-sms-preview">
                <span className="odr-sms-label">SMS the patient receives</span>
                <p>
                  URGENT — Dr. Sophea Lim needs blood work done now. Please walk into Kura PSC · BKK1
                  (1.2 km) today. Your booking code and QR follow right after this message.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {!isApproved ? (
        /* Order never silently fails — explain the block and route to recovery.
           The doctor can still build/route the draft (rehearsal); only the
           final commit is gated until the licence is approved. */
        <OrderVerificationGate />
      ) : (
        <Button
          disabled={disabled}
          fullWidth
          intent={stat && route ? "destructive" : "primary"}
          leadingIcon={route === "clinic" ? <ScanIcon size={14} variant="stroke" /> : undefined}
          onClick={handlePlace}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
