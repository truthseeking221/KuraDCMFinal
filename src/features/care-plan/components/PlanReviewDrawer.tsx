"use client";

/* PlanReviewDrawer — "Review and update plan".

   Replaces the old free-text "Record review". The doctor assembles a STRUCTURED set
   of changes (medication / repeat lab / follow-up / lifestyle / instruction), sees
   the list of what will change, and signs ONCE. Sign calls commitPlanChangeSet,
   which appends the deltas and bumps the plan version — a single auditable event.

   Each change is built locally (no store write) until the doctor signs, so the set
   is fully reviewable and cancellable. The signing button carries the warning that
   it is an attributed clinical action AT the action (not a persistent page banner).

   PR5 — the drawer also fronts the RESULT→PLAN loop. When opened from a result it
   takes a SEEDED change-set (deriveResultReviewChangeSet) plus a result-review
   summary ("what changed / why it matters / required action"). The doctor reviews
   the seeded changes, can trim or add, and signs ONCE; on commit the caller closes
   the result loop (markResultReviewed/closeResultLoop) — no second trip to record. */

import { useMemo, useState } from "react";

import { Button, Drawer, Input, Select } from "@/components/ui";
import {
  commitPlanChangeSet,
  proposePlanChange,
  type ClinicalFocus,
  type PlanChange,
  type ResultReviewSummary,
} from "@/features/care-plan/domain";
import { CheckShield as ShieldIcon, Delete as DeleteIcon } from "@/icons/components";

import "@/components/CarePlan/CarePlan.css";

type ChangeKind = "med" | "lab" | "follow_up" | "lifestyle" | "instruction";

const KIND_LABEL: Record<ChangeKind, string> = {
  med: "Medication",
  lab: "Repeat lab",
  follow_up: "Follow-up",
  lifestyle: "Lifestyle",
  instruction: "Instruction",
};

/* A staged change keeps the human label for the review list + the domain payload. */
type StagedChange = { id: string; kind: ChangeKind; label: string; change: PlanChange };

/* Map a seeded domain PlanChange back to the drawer's display kind + label so a
   result-derived set renders in the SAME review list a hand-built one does. */
function describeSeededChange(change: PlanChange): { kind: ChangeKind; label: string } {
  switch (change.kind) {
    case "med_add":
      return { kind: "med", label: change.dose ? `${change.drug} ${change.dose}` : change.drug };
    case "med_stop":
      return { kind: "med", label: "Stop medication" };
    case "intervention_add":
      return { kind: change.intervention.kind === "lab" ? "lab" : "lifestyle", label: change.intervention.label };
    case "goal_update":
      return { kind: "follow_up", label: "Update goal from this result" };
    case "follow_up":
      return { kind: "follow_up", label: change.label };
    case "instruction":
      return { kind: "instruction", label: change.label };
    default: {
      const _exhaustive: never = change;
      void _exhaustive;
      return { kind: "follow_up", label: "Plan change" };
    }
  }
}

const REQUIRED_ACTION_TONE: Record<NonNullable<ResultReviewSummary["whyTone"]>, string> = {
  danger: "tone-danger",
  warning: "tone-warning",
  info: "tone-info",
  success: "tone-success",
  neutral: "tone-neutral",
};

const SECONDARY_CONFIG: Record<ChangeKind, { label: string; placeholder: string } | null> = {
  med: { label: "Dose", placeholder: "1000 mg twice daily" },
  lab: { label: "Due", placeholder: "in 3 months" },
  follow_up: { label: "When", placeholder: "after results" },
  lifestyle: null,
  instruction: { label: "When to contact us", placeholder: "if symptoms worsen" },
};

const PRIMARY_CONFIG: Record<ChangeKind, { label: string; placeholder: string }> = {
  med: { label: "Medication", placeholder: "Medication name" },
  lab: { label: "Lab", placeholder: "HbA1c" },
  follow_up: { label: "Follow-up", placeholder: "Reason or visit type" },
  lifestyle: { label: "Lifestyle change", placeholder: "Reduce salt" },
  instruction: { label: "Patient instruction", placeholder: "What to tell the patient" },
};

export function PlanReviewDrawer({
  open,
  onClose,
  patientId,
  focus,
  onCommitted,
  seededChanges,
  resultSummary,
  onConfirmNoChange,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  /* the focus being reviewed — scopes new items to it (null = whole plan) */
  focus: ClinicalFocus | null;
  /* called with the new version after a successful commit */
  onCommitted: (version: number) => void;
  /* PR5: a change-set seeded from a result (deriveResultReviewChangeSet). When
     present the drawer pre-stages these so the doctor signs once instead of
     re-deciding from scratch. */
  seededChanges?: PlanChange[];
  /* PR5: result-review header — "what changed / why it matters / required action".
     Its presence flips the drawer into result-review framing. */
  resultSummary?: ResultReviewSummary | null;
  /* PR5: result-review no-change path. On a normal result the seed is empty and
     there is nothing to sign, so the primary action becomes "Confirm and close
     loop" (record review + notify + close). Only used on the result path. */
  onConfirmNoChange?: () => void;
}) {
  const [staged, setStaged] = useState<StagedChange[]>([]);
  const [kind, setKind] = useState<ChangeKind>("med");
  /* one draft per builder; reset on add */
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");

  const focusId = focus?.id;

  /* Seed the staged set from a result-derived change-set when the drawer opens with
     one. Done by adjusting state during render (React's recommended "store the
     previous prop and reset state when it changes" pattern) rather than in an
     effect, so the seed applies before paint and reseeds when a fresh result opens
     the drawer. The applied signature is tracked in state, not a ref. */
  const seedSignature = useMemo(
    () => (open && seededChanges && seededChanges.length > 0 ? JSON.stringify(seededChanges) : ""),
    [open, seededChanges],
  );
  const [appliedSeed, setAppliedSeed] = useState<string>("");
  if (seedSignature && appliedSeed !== seedSignature && seededChanges) {
    setAppliedSeed(seedSignature);
    setStaged(
      seededChanges.map((change, i) => {
        const { kind: k, label } = describeSeededChange(change);
        return { id: `seed-${i + 1}`, kind: k, label, change };
      }),
    );
  }

  const reset = () => {
    setPrimary("");
    setSecondary("");
  };
  const closeAndReset = () => {
    setStaged([]);
    reset();
    setKind("med");
    /* allow the SAME result to reseed if it is reopened after cancelling */
    setAppliedSeed("");
    onClose();
  };

  const addChange = () => {
    const value = primary.trim();
    if (!value) return;
    const id = `stg-${staged.length + 1}`;
    let label = value;
    let change: PlanChange;
    switch (kind) {
      case "med":
        label = secondary.trim() ? `${value} ${secondary.trim()}` : value;
        change = { kind: "med_add", drug: value, dose: secondary.trim() || undefined, focusId };
        break;
      case "lab":
        change = {
          kind: "intervention_add",
          focusId,
          intervention: {
            kind: "lab",
            label: value,
            owner: "Dr Dara",
            due: secondary.trim() || undefined,
            status: "due",
          },
        };
        break;
      case "follow_up":
        change = { kind: "follow_up", label: value, focusId, due: secondary.trim() || undefined };
        break;
      case "lifestyle":
        change = {
          kind: "intervention_add",
          focusId,
          intervention: { kind: "lifestyle", label: value, owner: "Sokha", status: "planned" },
        };
        break;
      case "instruction":
        change = { kind: "instruction", label: value, focusId, whenToContact: secondary.trim() || undefined };
        break;
      default: {
        const _exhaustive: never = kind;
        void _exhaustive;
        return;
      }
    }
    setStaged((s) => [...s, { id, kind, label, change }]);
    reset();
  };

  const removeChange = (id: string) => setStaged((s) => s.filter((c) => c.id !== id));

  const sign = () => {
    if (staged.length === 0) return;
    const set = proposePlanChange(patientId, staged.map((s) => s.change));
    const result = commitPlanChangeSet(set);
    if (result.committed) onCommitted(result.version);
    closeAndReset();
  };

  /* the secondary field's meaning depends on the change kind */
  const sec = SECONDARY_CONFIG[kind];

  const isResultReview = Boolean(resultSummary);
  /* No-change path: a result review with nothing seeded and nothing hand-staged.
     The primary action closes the result loop instead of showing a dead Sign. */
  const noChange = isResultReview && staged.length === 0 && Boolean(onConfirmNoChange);
  const confirmNoChange = () => {
    onConfirmNoChange?.();
    closeAndReset();
  };
  const treatment = resultSummary?.relevantTreatment;
  const hasTreatment =
    !!treatment &&
    (treatment.medications.length > 0 || !!treatment.goalLabel || treatment.openInterventions.length > 0);

  return (
    <Drawer
      open={open}
      onClose={closeAndReset}
      title="Review and update plan"
      subtitle={
        isResultReview
          ? resultSummary?.focusLabel ?? "From result"
          : focus
            ? (focus.shortLabel ?? focus.label)
            : "Whole plan"
      }
      width={460}
      footer={
        <div className="cp-drawer-footer">
          <Button intent="ghost" onClick={closeAndReset}>
            Cancel
          </Button>
          {noChange ? (
            /* normal / no-change result → nothing to sign; one tap closes the loop */
            <Button
              intent="primary"
              leadingIcon={<ShieldIcon size={16} variant="stroke" />}
              onClick={confirmNoChange}
            >
              Close result loop
            </Button>
          ) : (
            <Button
              intent="primary"
              leadingIcon={<ShieldIcon size={16} variant="stroke" />}
              disabled={staged.length === 0}
              onClick={sign}
            >
              Sign {staged.length > 0 ? `${staged.length} change${staged.length === 1 ? "" : "s"}` : "changes"}
            </Button>
          )}
        </div>
      }
    >
      {/* PR5 result-review header — what changed / why it matters / relevant
          treatment. Rendered only on the result path; the manual path skips it. */}
      {resultSummary && (
        <div className="cp-drawer-section cp-rr">
          <div className="cp-rr-block">
            <p className="cp-rr-label">What changed</p>
            <p className="cp-rr-changed">{resultSummary.whatChanged}</p>
          </div>
          <div className={`cp-rr-why ${REQUIRED_ACTION_TONE[resultSummary.whyTone]}`}>
            {resultSummary.whyItMatters}
          </div>
          {hasTreatment && treatment && (
            <div className="cp-rr-block">
              <p className="cp-rr-label">Relevant current treatment</p>
              <ul className="cp-rr-treatment">
                {treatment.medications.map((m) => (
                  <li key={m.drug}>
                    {m.drug}
                    {m.dose ? ` ${m.dose}` : ""}
                    {m.frequency ? ` · ${m.frequency}` : ""}
                  </li>
                ))}
                {treatment.goalLabel && (
                  <li>
                    {treatment.goalLabel}
                    {treatment.goalLatest ? ` ${treatment.goalLatest}` : ""}
                    {treatment.goalTarget ? ` · target ${treatment.goalTarget}` : ""}
                  </li>
                )}
                {treatment.openInterventions.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="cp-drawer-section">
        <p className="cp-drawer-label">
          {isResultReview ? "Required action" : "Plan changes"}
        </p>
        {staged.length === 0 ? (
          <p className="cp-change-empty">
            {noChange
              ? "No plan change needed. Close the loop or add a change."
              : "Add a change to continue."}
          </p>
        ) : (
          <div className="cp-change-list">
            {staged.map((c) => (
              <div className="cp-change" key={c.id}>
                <span className="cp-change-body">
                  <span className="cp-change-kind">{KIND_LABEL[c.kind]}</span>
                  <span className="cp-change-label">{c.label}</span>
                </span>
                <button
                  type="button"
                  className="cp-change-remove"
                  aria-label={`Remove ${c.label}`}
                  onClick={() => removeChange(c.id)}
                >
                  <DeleteIcon size={15} variant="stroke" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cp-drawer-section">
        <p className="cp-drawer-label">New change</p>
        <form
          className="cp-change-form"
          onSubmit={(event) => {
            event.preventDefault();
            addChange();
          }}
        >
          <Select
            label="Type"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ChangeKind);
              reset();
            }}
          >
            {(Object.keys(KIND_LABEL) as ChangeKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
          <div className={sec ? "cp-change-fields" : "cp-change-fields cp-change-fields--single"}>
            <Input
              label={PRIMARY_CONFIG[kind].label}
              value={primary}
              placeholder={PRIMARY_CONFIG[kind].placeholder}
              onChange={(e) => setPrimary(e.target.value)}
            />
            {sec && (
              <Input
                label={sec.label}
                value={secondary}
                placeholder={sec.placeholder}
                onChange={(e) => setSecondary(e.target.value)}
              />
            )}
          </div>
          <div className="cp-change-add">
            <Button intent="secondary" size="sm" disabled={!primary.trim()} type="submit">
              Add change
            </Button>
          </div>
        </form>
      </div>

      <div className="cp-drawer-section cp-drawer-section--note">
        <p className="cp-review-warn">
          <ShieldIcon size={15} variant="stroke" />
          Signed changes are saved under your name.
        </p>
      </div>
    </Drawer>
  );
}
