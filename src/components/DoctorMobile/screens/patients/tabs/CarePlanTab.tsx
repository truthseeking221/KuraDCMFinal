"use client";

/* Care plan tab — the plan-of-action surface. Header (conditions + goal
   progress) + goal rows (carePlanGoals: status, current→target, inline
   LabMiniTrend, next-action button: Order / Review med / Refer) + a safety
   section (allergies + constraints + self-reported decision rows with
   Confirm / Dismiss / Undo via useEncounter, 48px targets) + an after-visit
   block (follow-up status + copyable instructions with toast). */

import { useMemo } from "react";
import { Plus, Warning } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { Pill, SectionHeader, toneTextClass } from "@/components/DoctorMobile/components/primitives";
import { useSheets } from "@/components/DoctorMobile/components/Sheet";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import { useOrderDraft } from "@/components/OrderDraft";
import {
  allergies,
  carePlanGoals,
  summarySections,
  type CarePlanGoal,
} from "@/components/DoctorMobile/data/clinical";
import { LabMiniTrend } from "@/components/ui/LabHistory";
import { toast } from "sonner";
import { FollowUpSheet, PrescribeSheet, ReferralSheet } from "../encounterSheets";
import styles from "../patientChart.module.css";

const GOAL_TONE: Record<CarePlanGoal["status"], "warning" | "info" | "success"> = {
  due: "warning",
  planned: "info",
  met: "success",
};
const GOAL_LABEL: Record<CarePlanGoal["status"], string> = {
  due: "Due",
  planned: "Planned",
  met: "Met",
};

/* Self-reported items that need a clinical decision (drawn from the canonical
   summary sections so the two surfaces never drift). */
function selfReportedItems() {
  return summarySections
    .flatMap((section) => section.items.map((item) => ({ ...item, sectionId: section.id })))
    .filter((item) => item.selfReported)
    .map((item, index) => ({ id: `${item.sectionId}-${index}`, label: item.title, meta: item.meta }));
}

export function CarePlanTab() {
  const { open } = useSheets();
  const { followUp, selfReported, resolveSelfReported, clearSelfReported } = useEncounter();
  const { addLabTest, plannedLabKeys } = useOrderDraft();

  const reported = useMemo(() => selfReportedItems(), []);
  const metCount = carePlanGoals.filter((goal) => goal.status === "met").length;

  const instructions = useMemo(
    () =>
      [
        "Repeat HbA1c and renal markers as planned; bring fasting if asked.",
        "Continue current medications. Recheck blood pressure in 4 weeks.",
        followUp ? `Next follow-up scheduled in ${followUp}.` : "Follow-up to be scheduled.",
        "Book the ophthalmology retinopathy screen.",
      ].join("\n"),
    [followUp],
  );

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(instructions);
      toast.success("Instructions copied");
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  };

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      {/* header: conditions + progress */}
      <section className={base.sectionStack}>
        <SectionHeader title="Care plan" meta={`${metCount}/${carePlanGoals.length} goals met`} />
        <div className={base.problemRow}>
          {["T2DM", "Hypertension", "CKD stage 3"].map((condition) => (
            <span key={condition}>{condition}</span>
          ))}
        </div>
      </section>

      {/* goals */}
      <section className={base.sectionStack}>
        {carePlanGoals.map((goal) => (
          <div key={goal.id} className={styles.goalRow}>
            <div className={styles.goalHead}>
              <span className={styles.goalTitle}>{goal.title}</span>
              <Pill tone={GOAL_TONE[goal.status]}>{GOAL_LABEL[goal.status]}</Pill>
            </div>
            <span className={styles.goalMeta}>{goal.meta}</span>
            <div className={styles.goalActions}>
              {goal.labKey ? <LabMiniTrend labKey={goal.labKey} /> : null}
              {goal.status !== "met" ? (
                goal.labKey ? (
                  plannedLabKeys.has(goal.labKey) ? (
                    <Pill tone="success">Planned</Pill>
                  ) : (
                    <button
                      type="button"
                      className={base.addChip}
                      onClick={() => {
                        addLabTest(goal.labKey!, {
                          labName: goal.title,
                          reasonText: goal.meta,
                          severityTone: "warning",
                          source: "labs-followup",
                        });
                        toast.success(`${goal.title} added to order`);
                      }}
                    >
                      <Plus size={14} variant="stroke" aria-hidden="true" />
                      Order
                    </button>
                  )
                ) : goal.id === "eye" ? (
                  <button
                    type="button"
                    className={base.addChip}
                    onClick={() => open((close) => <ReferralSheet close={close} presetService="Specialty consult" />)}
                  >
                    Refer
                  </button>
                ) : (
                  <button
                    type="button"
                    className={base.addChip}
                    onClick={() => open((close) => <PrescribeSheet close={close} />)}
                  >
                    Review med
                  </button>
                )
              ) : null}
            </div>
          </div>
        ))}
      </section>

      {/* safety */}
      <section className={base.sectionStack}>
        <SectionHeader title="Safety" />
        <div className={cx(base.safetyStrip, base.tone_warning)}>
          <Warning size={16} variant="stroke" aria-hidden="true" />
          <div>
            {allergies.map((allergy) => (
              <div key={allergy.title}>
                <strong>{allergy.title}</strong> · {allergy.meta}
                {allergy.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
              </div>
            ))}
            <div>
              <strong>Renal dosing</strong> · avoid nephrotoxic agents · eGFR-adjust
            </div>
          </div>
        </div>

        {reported.length > 0 ? (
          <div className={base.sectionStack}>
            <span className={base.eyebrow}>Self-reported · needs a decision</span>
            <div className={base.cardGroup}>
              {reported.map((item) => {
                const resolution = selfReported[item.id];
                return (
                  <div key={item.id} className={styles.decisionRow}>
                    <span className={styles.labMain}>
                      <span className={styles.labName}>{item.label}</span>
                      <span className={styles.labMeta}>
                        {item.meta}
                        {resolution ? (
                          <>
                            {" · "}
                            <span className={toneTextClass(resolution === "confirmed" ? "success" : "neutral")}>
                              {resolution === "confirmed" ? "Confirmed" : "Dismissed"}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className={styles.decisionActions}>
                      {resolution ? (
                        <button
                          type="button"
                          className={styles.decisionBtn}
                          onClick={() => {
                            clearSelfReported(item.id, item.label);
                            toast(`${item.label} reopened`);
                          }}
                        >
                          Undo
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.decisionBtn}
                            onClick={() => {
                              resolveSelfReported(item.id, "confirmed", item.label);
                              toast.success(`${item.label} confirmed`);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className={styles.decisionBtn}
                            onClick={() => {
                              resolveSelfReported(item.id, "dismissed", item.label);
                              toast(`${item.label} dismissed`);
                            }}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* after-visit */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="After visit"
          action={
            <button type="button" className={base.textButton} onClick={() => open((close) => <FollowUpSheet close={close} />)}>
              {followUp ? "Reschedule" : "Schedule"}
            </button>
          }
        />
        <div className={cx(base.banner, followUp ? base.tone_success : base.tone_info)}>
          <strong>{followUp ? `Follow-up in ${followUp}` : "No follow-up scheduled"}</strong>
          <span>
            {followUp
              ? "Telegram reminder will be sent to the patient."
              : "Schedule a follow-up to close the loop on the plan."}
          </span>
        </div>

        <div className={styles.instructions}>
          <span className={base.eyebrow}>Patient instructions</span>
          {instructions.split("\n").map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button type="button" className={base.secondaryButton} onClick={copyInstructions}>
            Copy instructions
          </button>
        </div>
      </section>
    </div>
  );
}

export default CarePlanTab;
