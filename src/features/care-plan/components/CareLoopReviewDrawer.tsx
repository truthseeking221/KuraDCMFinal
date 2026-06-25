"use client";

/* CareLoopReviewDrawer — "Review results".

   The AI-suggestion surface. A result came back abnormal; Kura groups the analytes
   into ONE clinical issue and drafts a plan. The doctor reviews the evidence + the
   visibly-DRAFT plan, optionally trims it ("Edit draft"), and signs ONCE with
   "Start cholesterol plan". Signing calls startCholesterolLoop, which is idempotent
   (a second sign adds nothing). The AI never commits anything on its own.

   Pre-commit only: the draft is pure content; the single write happens on sign. */

import { useMemo, useState } from "react";

import { Button, Drawer } from "@/components/ui";
import {
  loopIncludeFromKept,
  startCholesterolLoop,
  type CareLoopDraft,
  type CareLoopProposalKind,
} from "@/features/care-plan/domain";
import { CheckShield as ShieldIcon, Delete as DeleteIcon, Plus as PlusIcon } from "@/icons/components";
import { cx } from "@/lib/cx";

import "@/components/CarePlan/CarePlan.css";

const KIND_LABEL: Record<CareLoopProposalKind, string> = {
  diagnosis: "Diagnosis",
  medication: "Medication",
  goal: "Goal",
  repeat_lab: "Repeat lab",
  follow_up: "Follow-up",
  reminder: "Reminder",
};

export function CareLoopReviewDrawer({
  open,
  onClose,
  draft,
  onSigned,
}: {
  open: boolean;
  onClose: () => void;
  draft: CareLoopDraft;
  /* fired after a successful sign with the new/just-confirmed focus id, so the
     caller can close the result loop and deep-link to the care plan focus. */
  onSigned: (focusId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [signing, setSigning] = useState(false);

  const kept = useMemo(
    () => new Set(draft.proposals.filter((p) => !removed.has(p.id)).map((p) => p.id)),
    [draft.proposals, removed],
  );

  const reset = () => {
    setEditing(false);
    setRemoved(new Set());
    setFailed(false);
    setSigning(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const toggle = (id: string, optional: boolean) => {
    if (!optional) return;
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sign = () => {
    setSigning(true);
    setFailed(false);
    try {
      const result = startCholesterolLoop(draft.patientId, { include: loopIncludeFromKept(kept, draft) });
      onSigned(result.focusId);
      close();
    } catch {
      /* Failed save → recovery, not a dead end. */
      setFailed(true);
      setSigning(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Review results"
      subtitle={draft.issueTitle}
      width={460}
      footer={
        <div className="cp-drawer-footer">
          <Button intent="ghost" onClick={() => setEditing((value) => !value)}>
            {editing ? "Done editing" : "Edit draft"}
          </Button>
          <Button
            intent="primary"
            leadingIcon={<ShieldIcon size={16} variant="stroke" />}
            disabled={signing}
            onClick={sign}
          >
            {draft.primaryActionLabel}
          </Button>
        </div>
      }
    >
      <div className="cp-loop">
      {/* Grouped clinical issue — one problem, not loose lab rows. */}
      <div className="cp-drawer-section cp-rr">
        <div className="cp-loop-issue">
          <p className="cp-rr-changed">{draft.issueTitle}</p>
          <span className={cx("cp-status-chip", `tone-${draft.statusTone}`)}>{draft.statusLabel}</span>
        </div>
        <ul className="cp-loop-evidence">
          {draft.evidence.map((item) => (
            <li key={item.label}>
              <span className="cp-loop-ev-main">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </span>
              <span className="cp-loop-ev-meta">
                <span className="cp-loop-ev-ref">Ref {item.reference}</span>
                <span className={cx("cp-loop-ev-flag", `tone-${item.flagTone}`)}>{item.flagLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI draft — visibly a draft until signed. */}
      <div className="cp-drawer-section">
        <div className="cp-loop-ai-head">
          <p className="cp-drawer-label">AI draft</p>
          <span className="cp-loop-ai-note">AI drafted this plan. Review before signing.</span>
        </div>
        <ul className="cp-loop-proposals">
          {draft.proposals.map((proposal) => {
            const isRemoved = removed.has(proposal.id);
            return (
              <li key={proposal.id} className={cx("cp-loop-proposal", isRemoved && "is-removed")}>
                <span className="cp-loop-proposal-body">
                  <span className="cp-loop-proposal-kind">{KIND_LABEL[proposal.kind]}</span>
                  <span className="cp-loop-proposal-label">
                    {proposal.label}
                    {proposal.detail ? <small> · {proposal.detail}</small> : null}
                  </span>
                </span>
                {editing && proposal.optional ? (
                  <button
                    type="button"
                    className="cp-change-remove"
                    aria-label={isRemoved ? `Add ${proposal.label}` : `Remove ${proposal.label}`}
                    onClick={() => toggle(proposal.id, proposal.optional)}
                  >
                    {isRemoved ? <PlusIcon size={15} variant="stroke" /> : <DeleteIcon size={15} variant="stroke" />}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {failed ? (
        <div className="cp-drawer-section">
          <p className="cp-loop-error" role="alert">
            Could not update plan. Try again.
          </p>
        </div>
      ) : null}

      <div className="cp-drawer-section cp-drawer-section--note">
        <p className="cp-review-warn">
          <ShieldIcon size={15} variant="stroke" />
          Signing creates the plan under your name.
        </p>
      </div>
      </div>
    </Drawer>
  );
}
