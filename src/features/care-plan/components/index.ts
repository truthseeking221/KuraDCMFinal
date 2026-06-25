/* Care Plan — presentational components for the desktop Patient Care Plan (PR2).
   Data arrives via props/selectors; commands run via callbacks. */

export { CareFocusNavigation, type FocusSelection } from "./CareFocusNavigation";
export { PlanAttentionList, type AttentionCallbacks } from "./PlanAttentionList";
export { PlanOutcomeRow, goalToOutcome, type OutcomeRowData } from "./PlanOutcomeRow";
export { PlanInterventionRow, PlanMedRow } from "./PlanActionRow";
export { PlanReviewDrawer } from "./PlanReviewDrawer";
export { CareLoopReviewDrawer } from "./CareLoopReviewDrawer";
export { PlanShareDrawer } from "./PlanShareDrawer";
export { PlanDetailsDrawer } from "./PlanDetailsDrawer";
export { CareFocusEnrollDrawer, type CareFocusEnrollDrawerProps } from "./CareFocusEnrollDrawer";
