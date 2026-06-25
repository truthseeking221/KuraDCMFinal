"use client";

/* PlanOutcomeRow — one merged Goal/monitoring outcome.

   Row = label + latest→target + trend/attention. An achievement pill shows ONLY
   when it carries a real signal (at-risk / worsening / not-assessable / achieved /
   partially/not-achieved) — never for on-track / improving / unchanged, which read
   as quiet by default. Baseline, source, provenance, owner, goal type and target
   date are NOT here (they live in the Details drawer). Presentational only. */

import {
  ACHIEVEMENT_LABEL,
  ACHIEVEMENT_TONE,
  type Goal,
  type GoalAchievement,
} from "@/features/care-plan/domain";
import { cx } from "@/lib/cx";

/* The achievements worth a pill — an exception or a closed result, not the
   happy-path "on track". */
const PILL_ACHIEVEMENTS = new Set<GoalAchievement>([
  "at_risk",
  "worsening",
  "not_assessable",
  "achieved",
  "partially_achieved",
  "not_achieved",
]);

/* A monitored measure that isn't already a goal value reuses this shape. */
export type OutcomeRowData = {
  id: string;
  label: string;
  latest?: string;
  target?: string;
  achievement?: GoalAchievement;
};

export function goalToOutcome(goal: Goal): OutcomeRowData {
  return {
    id: goal.id,
    label: goal.label,
    latest: goal.latest,
    target: goal.target,
    achievement: goal.achievement,
  };
}

export function PlanOutcomeRow({ outcome }: { outcome: OutcomeRowData }) {
  const showPill = outcome.achievement ? PILL_ACHIEVEMENTS.has(outcome.achievement) : false;
  return (
    <div className="cp-row">
      <span className="cp-row-body">
        <span className="cp-row-title">
          {outcome.label}
          {(outcome.latest || outcome.target) && (
            <span className="cp-row-value">
              {outcome.latest && <strong>{outcome.latest}</strong>}
              {outcome.latest && outcome.target ? " → " : ""}
              {outcome.target}
            </span>
          )}
        </span>
      </span>
      {showPill && outcome.achievement && (
        <span className="cp-row-side">
          <span className={cx("cp-pill", `tone-${ACHIEVEMENT_TONE[outcome.achievement]}`)}>
            {ACHIEVEMENT_LABEL[outcome.achievement]}
          </span>
        </span>
      )}
    </div>
  );
}
