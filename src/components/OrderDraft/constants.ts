/* Order-draft constants, split out so seed data can share them without a cycle
   through OrderDraftContext (which imports the seeds). */

/* STAT on the clinic route dispatches a courier immediately — fee applies.
   STAT on the PSC route is an URGENT SMS; the patient transports themselves. */
export const STAT_CLINIC_FEE = 15;

export const SWEEP_WINDOW = "14:15–14:30 · Sok S.";
export const NEAREST_PSC = "Kura PSC · BKK1 · 1.2 km";
export const PATIENT_PHONE_MASKED = "070 ••• 496";
