export { DoctorMobileApp } from "./DoctorMobileApp";
export type { DoctorMobileAppProps } from "./DoctorMobileApp";

/* The foundation layer (state/components/data) is imported by screens via
   relative paths — it is intentionally NOT re-exported here. The barrel is the
   server-reachable entry used by the /m route pages; re-exporting client-coupled
   data modules (e.g. data/clinical, which calls the client-only
   getLabHistoryPreview) would pull them into the server graph and break the
   build during page-data collection. */
