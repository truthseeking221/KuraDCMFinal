"use client";

import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { ArrowRight, Warning } from "@/icons";
import { KYD_STATE_META, VERIFICATION_HREF, useKyd } from "./kydStatus";
import "./VerificationGate.css";

/*
 * Shown in place of the "Place order" action when an unapproved doctor reaches
 * the end of the order builder. The order is never silently blocked — the
 * doctor sees why, their current status, and one action to recover.
 */
export function OrderVerificationGate() {
  const router = useRouter();
  const { uiState } = useKyd();
  const meta = KYD_STATE_META[uiState];
  const StatusIcon = meta.Icon;

  return (
    <div className="kyd-order-gate" role="group" aria-label="Medical licence verification required">
      <div className="kyd-order-gate__head">
        <span aria-hidden className="kyd-order-gate__icon">
          <Warning size={16} variant="stroke" />
        </span>
        <p className="kyd-order-gate__title">Medical licence verification required</p>
        <Badge tone={meta.tone} icon={<StatusIcon size={13} variant="stroke" />} style={{ marginLeft: "auto" }}>
          {meta.label}
        </Badge>
      </div>
      <p className="kyd-order-gate__body">
        You need an approved medical licence before creating lab orders.
      </p>
      <div className="kyd-order-gate__action">
        <Button
          intent="primary"
          fullWidth
          trailingIcon={<ArrowRight size={14} variant="stroke" />}
          onClick={() => router.push(VERIFICATION_HREF)}
        >
          Go to verification
        </Button>
      </div>
    </div>
  );
}
