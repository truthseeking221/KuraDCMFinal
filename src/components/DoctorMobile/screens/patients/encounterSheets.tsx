"use client";

/* Encounter entry-point sheets for the patient chart — note, finish-visit,
   referral, prescribe, follow-up, and ICD search. Each is a render fn returned
   from useSheets().open(render). They bind the mobile-local useEncounter engine
   (NOT the desktop). Self-contained so they can be opened from the chart header
   overflow or from any tab CTA. */

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle,
  Heart,
  Note,
  Pill as PillIcon,
  Search,
  Share,
  Warning,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { Sheet } from "@/components/DoctorMobile/components/Sheet";
import { Pill as TonePill } from "@/components/DoctorMobile/components/primitives";
import type { NoteScaffold } from "@/components/DoctorMobile/data/encounter";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { deriveResultReviewChangeSet, livingPlanOf, useCarePlans } from "@/features/care-plan/domain";
import type { PlanChange, ResultReviewInput } from "@/features/care-plan/domain";
import {
  followUpOptions,
  noteSoapSections,
  referralDestinations,
  referralServices,
  rxFormulary,
  rxFrequencies,
  searchIcd,
} from "@/components/DoctorMobile/data/encounter";
import { icdCandidates } from "@/components/DoctorMobile/data/encounter";
import { toast } from "sonner";
import styles from "./patientChart.module.css";

/* ----------------------------------------------------------- Visit note ---- */

export function NoteSheet({ close }: { close: () => void }) {
  const { note, setNote, noteStatus, saveNoteDraft, signNote } = useEncounter();
  /* Edits stay local until Save draft / Sign — closing with unsaved edits
     asks for confirmation (ported from the richer screens/encounter set). */
  const [draft, setDraft] = useState<NoteScaffold>(note);

  const dirty = useMemo(
    () => (Object.keys(draft) as Array<keyof NoteScaffold>).some((key) => draft[key] !== note[key]),
    [draft, note],
  );

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm("Discard unsaved changes to this note?")) return;
    close();
  }, [dirty, close]);

  const commit = useCallback(
    (mode: "draft" | "sign") => {
      setNote(draft);
      if (mode === "draft") {
        saveNoteDraft();
        toast.success("Note draft saved");
      } else {
        signNote();
        toast.success("Note signed");
      }
      close();
    },
    [draft, setNote, saveNoteDraft, signNote, close],
  );

  const statusTone = noteStatus === "signed" ? "success" : noteStatus === "draft" ? "warning" : "neutral";
  const statusLabel = noteStatus === "signed" ? "Signed" : noteStatus === "draft" ? "Draft · unsigned" : "Not started";

  return (
    <Sheet
      title="Visit note"
      onClose={requestClose}
      size="full"
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={() => commit("draft")}>
            Save draft
          </button>
          <button type="button" className={base.primaryButton} onClick={() => commit("sign")}>
            <Check size={16} variant="stroke" aria-hidden="true" />
            Sign note
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={styles.statusInline}>
          <TonePill tone={statusTone}>{statusLabel}</TonePill>
          <span className={base.muted}>SOAP draft from today&rsquo;s signals</span>
        </div>

        <label className={styles.field}>
          <span className={base.eyebrow}>Reason</span>
          <input
            className={styles.input}
            value={draft.reason}
            onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))}
          />
        </label>

        {noteSoapSections.map((section) => (
          <label key={section.key} className={styles.field}>
            <span className={base.eyebrow}>{section.label}</span>
            <textarea
              className={styles.textarea}
              rows={section.key === "s" || section.key === "o" ? 3 : 2}
              value={draft[section.key]}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [section.key]: event.target.value }))
              }
            />
          </label>
        ))}
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------- Finish visit ---- */

export function FinishVisitSheet({ close }: { close: () => void }) {
  const { claimChecks, claimReady, signNote, noteStatus } = useEncounter();
  const remaining = claimChecks.filter((check) => !check.done).length;

  return (
    <Sheet
      title="Finish visit"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          {noteStatus !== "signed" ? (
            <button
              type="button"
              className={base.secondaryButton}
              onClick={() => {
                signNote();
                toast.success("Note signed");
              }}
            >
              Sign note
            </button>
          ) : null}
          <button
            type="button"
            className={base.primaryButton}
            disabled={!claimReady}
            onClick={() => {
              toast.success(claimReady ? "Claim packet submitted" : "Resolve remaining items first");
              if (claimReady) close();
            }}
          >
            {claimReady ? "Submit claim" : `${remaining} item${remaining === 1 ? "" : "s"} left`}
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={cx(base.banner, claimReady ? base.tone_success : base.tone_info)}>
          <strong>{claimReady ? "Claim packet ready" : "Almost ready"}</strong>
          <span>
            {claimReady
              ? "ICD, signed note, lab evidence, and therapy plan all present."
              : "Finish the items below to submit the claim."}
          </span>
        </div>

        <div className={base.checklist} role="list">
          {claimChecks.map((check) => (
            <div key={check.id} className={base.checkRow} role="listitem">
              <span className={cx(base.checkMark, check.done && base.checkMarkDone)} aria-hidden="true">
                {check.done ? <Check size={12} variant="stroke" /> : null}
              </span>
              <span>{check.label}</span>
              <TonePill tone={check.done ? "success" : "neutral"}>{check.done ? "Done" : "Pending"}</TonePill>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- Referral ---- */

export function ReferralSheet({
  close,
  presetService,
}: {
  close: () => void;
  presetService?: string;
}) {
  const { sendReferral } = useEncounter();
  const [service, setService] = useState(presetService ?? referralServices[0]);
  const [destination, setDestination] = useState(referralDestinations[0].name);
  const [urgency, setUrgency] = useState("Routine");

  return (
    <Sheet
      title="Refer"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={base.primaryButton}
            onClick={() => {
              sendReferral({ service, destination, urgency });
              toast.success("Referral sent · patient notified");
              close();
            }}
          >
            <Share size={16} variant="stroke" aria-hidden="true" />
            Send referral
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={styles.field}>
          <span className={base.eyebrow}>Service</span>
          <div className={base.filterChips} role="group">
            {referralServices.map((option) => (
              <button
                key={option}
                type="button"
                className={cx(base.filterChip, option === service && base.filterChipActive)}
                aria-pressed={option === service}
                onClick={() => setService(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={base.eyebrow}>Destination</span>
          <div className={base.cardGroup} role="radiogroup">
            {referralDestinations.map((dest) => (
              <button
                key={dest.name}
                type="button"
                role="radio"
                aria-checked={dest.name === destination}
                className={cx(base.testRow, dest.name === destination && base.testRowSelected)}
                onClick={() => setDestination(dest.name)}
              >
                <span className={base.taskBody}>
                  <span className={base.taskPatient}>{dest.name}</span>
                  <span className={base.taskReason}>
                    {dest.distance} · {dest.nextSlot}
                  </span>
                  <span className={base.taskMeta}>
                    {dest.cost} · {dest.insurance}
                  </span>
                </span>
                {dest.name === destination ? <Check size={16} variant="stroke" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={base.eyebrow}>Urgency</span>
          <div className={base.filterChips} role="group">
            {["Routine", "Soon", "Urgent"].map((option) => (
              <button
                key={option}
                type="button"
                className={cx(base.filterChip, option === urgency && base.filterChipActive)}
                aria-pressed={option === urgency}
                onClick={() => setUrgency(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Prescribe ---- */

/* Lightweight demo safety signals keyed by formulary drug class — DDI / allergy
   callouts ported from screens/encounter/RxSheet.tsx. */
const RX_SAFETY: Record<string, { tone: "warning" | "danger"; text: string }> = {
  SGLT2i: { tone: "warning", text: "Hold during acute illness — euglycemic DKA risk. Counsel sick-day rules." },
  "High-intensity statin": { tone: "warning", text: "Baseline LFTs on file. Re-check at 12 weeks." },
  "ACE inhibitor": { tone: "danger", text: "DDI — already on Lisinopril. Avoid duplicate RAAS blockade." },
  ARB: { tone: "danger", text: "DDI — already on an ACE inhibitor. Do not combine RAAS agents." },
  Biguanide: { tone: "warning", text: "Already prescribed. Review renal dosing before increasing." },
};

export function PrescribeSheet({ close }: { close: () => void }) {
  const { prescribe, meds } = useEncounter();
  const { activePatientId } = useMobileApp();
  const onList = useMemo(() => meds.map((med) => med.title), [meds]);
  const isOnList = useCallback(
    (drugName: string) => onList.some((title) => title.startsWith(drugName)),
    [onList],
  );

  /* default to the first drug not already on the med list */
  const firstSelectable = rxFormulary.find((item) => !isOnList(item.drug)) ?? rxFormulary[0];
  const [drug, setDrug] = useState(firstSelectable.drug);
  const selected = rxFormulary.find((item) => item.drug === drug) ?? firstSelectable;
  const [dose, setDose] = useState(selected.dose);
  const [freq, setFreq] = useState(selected.defaultFreq);
  const [duration, setDuration] = useState("90 days");

  const onPickDrug = (next: string) => {
    const formulary = rxFormulary.find((item) => item.drug === next);
    setDrug(next);
    if (formulary) {
      /* use the formulary dose so the dose field stays in sync with the pick */
      setDose(formulary.dose);
      setFreq(formulary.defaultFreq);
    }
  };

  const safety = RX_SAFETY[selected.class];
  const onListNow = isOnList(selected.drug);
  const blocking = safety?.tone === "danger" || onListNow;

  return (
    <Sheet
      title="Prescribe"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          {blocking ? (
            <span className={cx(base.muted, base.text_danger)} style={{ alignSelf: "center", marginRight: "auto" }}>
              {onListNow ? "Already on the med list" : "Safety conflict — resolve before signing"}
            </span>
          ) : (
            <button type="button" className={base.secondaryButton} onClick={close}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className={base.primaryButton}
            disabled={blocking}
            onClick={() => {
              prescribe(activePatientId, drug, dose, freq, duration);
              toast.success(`${drug} ${dose} prescribed`);
              close();
            }}
          >
            <PillIcon size={16} variant="stroke" aria-hidden="true" />
            Sign Rx
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={styles.field}>
          <span className={base.eyebrow}>Drug</span>
          <div className={base.cardGroup} role="radiogroup">
            {rxFormulary.map((item) => {
              const added = isOnList(item.drug);
              return (
                <button
                  key={item.drug}
                  type="button"
                  role="radio"
                  aria-checked={item.drug === drug}
                  disabled={added}
                  className={cx(base.testRow, item.drug === drug && !added && base.testRowSelected)}
                  onClick={() => onPickDrug(item.drug)}
                >
                  <span className={base.taskBody}>
                    <span className={base.taskPatient}>
                      {item.drug} {item.dose}
                    </span>
                    <span className={base.taskReason}>{item.class}</span>
                  </span>
                  {added ? (
                    <TonePill tone="neutral">On list</TonePill>
                  ) : item.drug === drug ? (
                    <Check size={16} variant="stroke" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <label className={styles.field}>
          <span className={base.eyebrow}>Dose</span>
          <input className={styles.input} value={dose} onChange={(event) => setDose(event.target.value)} />
        </label>

        <div className={styles.field}>
          <span className={base.eyebrow}>Frequency</span>
          <div className={base.filterChips} role="group">
            {rxFrequencies.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cx(base.filterChip, option.value === freq && base.filterChipActive)}
                aria-pressed={option.value === freq}
                onClick={() => setFreq(option.value)}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={base.eyebrow}>Duration</span>
          <div className={base.filterChips} role="group">
            {["30 days", "90 days", "6 months"].map((option) => (
              <button
                key={option}
                type="button"
                className={cx(base.filterChip, option === duration && base.filterChipActive)}
                aria-pressed={option === duration}
                onClick={() => setDuration(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {safety ? (
          <div className={cx(base.safetyStrip, safety.tone === "danger" && base.tone_danger)}>
            <Warning size={16} variant="stroke" aria-hidden="true" />
            <div>
              <strong>{safety.tone === "danger" ? "Interaction" : "Safety note"}</strong>
              <span>{safety.text}</span>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------- Result → plan review ---- */

/* One row per seeded plan change — the "required action" the result implies.
   Derived deterministically from the result; the doctor signs the whole set ONCE. */
type ChangeRow = { icon: ReactNode; title: string; detail?: string };

function describeChange(change: PlanChange): ChangeRow {
  switch (change.kind) {
    case "goal_update":
      return {
        icon: <Heart size={16} variant="stroke" aria-hidden="true" />,
        title: "Update goal",
        detail: change.patch.latest ? `New reading ${change.patch.latest}` : "From this result",
      };
    case "follow_up":
      return {
        icon: <Calendar size={16} variant="stroke" aria-hidden="true" />,
        title: change.label,
        detail: change.due ? `Due ${change.due}` : "Follow-up",
      };
    case "instruction":
      return {
        icon: <Bell size={16} variant="stroke" aria-hidden="true" />,
        title: change.label,
        detail: change.whenToContact,
      };
    case "med_add":
      return {
        icon: <PillIcon size={16} variant="stroke" aria-hidden="true" />,
        title: `Start ${change.drug}${change.dose ? ` ${change.dose}` : ""}`,
        detail: change.frequency,
      };
    case "med_stop":
      return { icon: <PillIcon size={16} variant="stroke" aria-hidden="true" />, title: "Stop medication", detail: change.reason };
    case "intervention_add":
      return { icon: <Note size={16} variant="stroke" aria-hidden="true" />, title: change.intervention.label, detail: change.intervention.detail };
    default: {
      const _exhaustive: never = change;
      void _exhaustive;
      return { icon: <Note size={16} variant="stroke" aria-hidden="true" />, title: "Plan change" };
    }
  }
}

/* The seeded plan-review sheet opened from ResultReviewScreen. Shows the required
   action (the change-set deriveResultReviewChangeSet seeds from the result) and a
   SINGLE "Sign and update plan" CTA. The caller's onSigned commits the set ONCE
   (useEncounter().applyResultReview) and closes the booking result loop. */
export function ResultPlanReviewSheet({
  close,
  patientId,
  result,
  focusId,
  onSigned,
}: {
  close: () => void;
  /* the BOOKING's patient — the seed must be derived from THIS patient's plan */
  patientId: string;
  result: ResultReviewInput;
  focusId: string | undefined;
  onSigned: () => void;
}) {
  const { plans } = useCarePlans(patientId);
  const changes = useMemo(() => {
    const living = livingPlanOf(plans);
    if (!living) return [];
    return deriveResultReviewChangeSet(living, focusId, result).changes;
  }, [plans, focusId, result]);

  const rows = useMemo(() => changes.map(describeChange), [changes]);
  const hasChanges = rows.length > 0;

  return (
    <Sheet
      title="Review and update plan"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={base.primaryButton}
            disabled={!hasChanges}
            onClick={() => {
              onSigned();
              close();
            }}
          >
            <Check size={16} variant="stroke" aria-hidden="true" />
            Sign and update plan
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <p className={base.muted}>
          {result.label ?? "Result"} · {result.code}
        </p>

        <span className={base.eyebrow}>What this result changes</span>
        {hasChanges ? (
          <div className={base.cardGroup} role="list">
            {rows.map((row, index) => (
              <div
                key={`${row.title}-${index}`}
                className={base.testRow}
                role="listitem"
                style={{ gridTemplateColumns: "32px minmax(0,1fr)" }}
              >
                <span className={base.taskIcon}>{row.icon}</span>
                <span className={base.taskBody}>
                  <span className={base.taskPatient}>{row.title}</span>
                  {row.detail ? <span className={base.taskReason}>{row.detail}</span> : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={cx(base.banner, base.tone_success)}>
            <CheckCircle size={16} variant="stroke" aria-hidden="true" />
            <span>On target — no change needed.</span>
          </div>
        )}

        <p className={base.muted}>Signing applies every change above and closes the result loop.</p>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Follow-up ---- */

export function FollowUpSheet({ close }: { close: () => void }) {
  const { scheduleFollowUp, followUp } = useEncounter();
  const [picked, setPicked] = useState<string>(followUp ?? "90 days");

  return (
    <Sheet
      title="Schedule follow-up"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={base.primaryButton}
            onClick={() => {
              scheduleFollowUp(picked);
              toast.success(`Follow-up scheduled in ${picked}`);
              close();
            }}
          >
            Schedule
          </button>
        </div>
      }
    >
      <div className={base.cardGroup} role="radiogroup">
        {followUpOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.label === picked}
            className={cx(base.testRow, option.label === picked && base.testRowSelected)}
            onClick={() => setPicked(option.label)}
          >
            <span className={base.taskBody}>
              <span className={base.taskPatient}>
                {option.label}
                {"recommended" in option && option.recommended ? (
                  <>
                    {" "}
                    <TonePill tone="success">Recommended</TonePill>
                  </>
                ) : null}
              </span>
              <span className={base.taskReason}>{option.detail}</span>
            </span>
            {option.label === picked ? <Check size={16} variant="stroke" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ----------------------------------------------------------- ICD search ---- */

export function IcdSearchSheet({ close }: { close: () => void }) {
  const { icdCodes, addIcd } = useEncounter();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return icdCandidates;
    return searchIcd(query);
  }, [query]);

  return (
    <Sheet title="Add ICD-10 code" onClose={close} size="full">
      <div className={base.sectionStack}>
        <div className={base.searchBox}>
          <Search size={18} variant="stroke" aria-hidden="true" />
          <input
            className={styles.searchInput}
            placeholder="Search code or condition"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        {!query.trim() ? <span className={base.eyebrow}>Suggested for this chart</span> : null}

        <div className={base.cardGroup} role="list">
          {results.length === 0 ? (
            <p className={base.muted} style={{ padding: "var(--space-4) 0" }}>
              No matches for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((entry) => {
              const added = icdCodes.includes(entry.code);
              const codable = "codable" in entry ? entry.codable !== false : true;
              return (
                <div key={entry.code} className={cx(base.testRow, added && base.testRowSelected)}>
                  <span className={base.taskBody}>
                    <span className={base.taskPatient}>
                      {entry.code} · {entry.label}
                    </span>
                    <span className={base.taskReason}>{entry.trigger}</span>
                  </span>
                  {added ? (
                    <span className={base.text_success}>
                      <CheckCircle size={18} variant="stroke" aria-hidden="true" />
                    </span>
                  ) : codable ? (
                    <button
                      type="button"
                      className={base.addChip}
                      onClick={() => {
                        addIcd(entry.code);
                        toast.success(`${entry.code} added`);
                      }}
                    >
                      Add
                    </button>
                  ) : (
                    <span className={base.muted} title="WHO category — not directly codable">
                      <Warning size={16} variant="stroke" aria-hidden="true" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* Convenience trigger so any tab can drop a "Visit note" button. */
export function NoteIcon() {
  return <Note size={16} variant="stroke" aria-hidden="true" />;
}
