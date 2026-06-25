"use client";

/* CareFocusNavigation — the left focus rail.

   Shown ONLY when there are ≥2 active focuses (the tab opens a single focus
   directly, no rail). Each row is deliberately quiet: focus name + ONE next-state
   line + a single attention icon when one is warranted — never program badge +
   status dot + open count + overdue count + at-risk badge all at once. The single
   signal is picked by focusActionStatus (overdue → at-risk → open-loop → up-to-date).
   An Overview row leads (whole plan). Archived episodes live under "Past care".
   Presentational — selection is owned by the parent. */

import {
  focusActionStatus,
  type CarePlan,
  type ClinicalFocus,
} from "@/features/care-plan/domain";
import {
  Catalog as CatalogIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";

export type FocusSelection = string; // "overview" | "<focusId>" | "ep:<episodeId>"

export function CareFocusNavigation({
  plan,
  focuses,
  episodes,
  selected,
  onSelect,
  onAddFocus,
}: {
  plan: CarePlan;
  focuses: ClinicalFocus[];
  episodes: CarePlan[];
  selected: FocusSelection;
  onSelect: (key: FocusSelection) => void;
  /* Quiet entry to enrol this patient in a program — adds a new focus to the rail. */
  onAddFocus?: () => void;
}) {
  return (
    <nav className="cp-nav" aria-label="Care focus">
      <button
        type="button"
        aria-current={selected === "overview" ? "true" : undefined}
        className={cx("cp-nav-row", selected === "overview" && "is-active")}
        onClick={() => onSelect("overview")}
      >
        <span className="cp-nav-flag" aria-hidden>
          <CatalogIcon size={15} variant="stroke" />
        </span>
        <span className="cp-nav-main">
          <span className="cp-nav-title">Whole plan</span>
          <span className="cp-nav-sub">
            {focuses.length} {focuses.length === 1 ? "focus" : "focuses"}
          </span>
        </span>
      </button>

      {focuses.map((focus) => {
        const status = focusActionStatus(plan, focus.id);
        const attention = status.overdue > 0 || status.atRisk > 0;
        return (
          <button
            key={focus.id}
            type="button"
            aria-current={selected === focus.id ? "true" : undefined}
            className={cx("cp-nav-row", selected === focus.id && "is-active")}
            onClick={() => onSelect(focus.id)}
          >
            <span className="cp-nav-main">
              <span className="cp-nav-title">{focus.shortLabel ?? focus.label}</span>
              <span className="cp-nav-sub">{status.label}</span>
            </span>
            {attention && (
              <span className={cx("cp-nav-flag", `tone-${status.tone}`)} aria-hidden>
                <WarningIcon size={15} variant="stroke" />
              </span>
            )}
          </button>
        );
      })}

      {episodes.length > 0 && (
        <>
          <p className="cp-nav-sep">Past care</p>
          {episodes.map((ep) => (
            <button
              key={ep.id}
              type="button"
              aria-current={selected === `ep:${ep.id}` ? "true" : undefined}
              className={cx("cp-nav-row", selected === `ep:${ep.id}` && "is-active")}
              onClick={() => onSelect(`ep:${ep.id}`)}
            >
              <span className="cp-nav-main">
                <span className="cp-nav-title">{ep.focuses[0]?.shortLabel ?? ep.title}</span>
                <span className="cp-nav-sub">{ep.completionOutcome ?? "Closed"}</span>
              </span>
            </button>
          ))}
        </>
      )}

      {onAddFocus && (
        <button type="button" className="cp-nav-row cp-nav-add" onClick={onAddFocus}>
          <span className="cp-nav-flag" aria-hidden>
            <PlusIcon size={15} variant="stroke" />
          </span>
          <span className="cp-nav-main">
            <span className="cp-nav-title">Add care focus</span>
          </span>
        </button>
      )}
    </nav>
  );
}
