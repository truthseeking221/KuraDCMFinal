"use client";

/* PlanShareDrawer — the patient-facing instructions for a focus, in full.

   Patient instructions are NOT a permanent section in the plan. They surface only
   while unshared (a quiet prompt in the column); the full plain-language text +
   safety-netting lines live HERE, and the doctor shares them in one action. After
   sharing, the prompt disappears and the act is recorded in plan activity.

   Presentational: instructions + the share callback come from the tab. */

import { Button, Drawer } from "@/components/ui";
import { type PatientInstruction } from "@/features/care-plan/domain";
import { Share as ShareIcon, Warning as WarningIcon } from "@/icons/components";

export function PlanShareDrawer({
  open,
  onClose,
  focusLabel,
  instructions,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  focusLabel: string;
  instructions: PatientInstruction[];
  onShare: () => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Share with patient"
      subtitle={focusLabel}
      width={460}
      footer={
        <div className="cp-drawer-footer">
          <Button intent="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="primary"
            leadingIcon={<ShareIcon size={16} variant="stroke" />}
            disabled={instructions.length === 0}
            onClick={() => {
              onShare();
              onClose();
            }}
          >
            Share
          </Button>
        </div>
      }
    >
      <div className="cp-drawer-section">
        <p className="cp-drawer-help">
          Sent in plain language. Review before sharing.
        </p>
        {instructions.map((pi) => (
          <div className="cp-instr" key={pi.id}>
            <span className="cp-instr-dot" aria-hidden />
            <span className="cp-instr-body">
              <span className="cp-instr-label">{pi.label}</span>
              {pi.whenToContact && (
                <span className="cp-instr-contact">
                  <WarningIcon size={12} variant="stroke" /> {pi.whenToContact}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
