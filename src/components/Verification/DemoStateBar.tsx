"use client";

import type { KydUiState, useKyd } from "./kydStatus";
import "./VerificationGate.css";

/* Prototype-only state simulator. Every KydUiState is a chip so QA can reach
   every gate + home screen — including the transient upload sub-states a real
   backend never stores. Shared by the /verification gate and the Home explorer
   so both surfaces flip together (state persists + broadcasts via useKyd). */
const DEMO_STATES: Array<{ state: KydUiState; label: string }> = [
  { state: "not_started", label: "Not verified" },
  { state: "draft", label: "Draft" },
  { state: "uploading", label: "Uploading" },
  { state: "upload_failed", label: "Upload failed" },
  { state: "submitted", label: "Submitting" },
  { state: "under_review", label: "Under review" },
  { state: "approved", label: "Verified" },
  { state: "needs_resubmission", label: "Action needed" },
  { state: "expired", label: "Expired" },
  { state: "permission_denied", label: "Permission" },
  { state: "offline", label: "Offline" },
  { state: "unknown_error", label: "Error" },
];

export function DemoStateBar({ kyd }: { kyd: ReturnType<typeof useKyd> }) {
  return (
    <div className="kyd-demo" aria-label="Prototype — simulate verification state">
      <span className="kyd-demo__label">Prototype · simulate state</span>
      <div className="kyd-demo__chips">
        {DEMO_STATES.map((item) => (
          <button
            key={item.state}
            type="button"
            className={`kyd-demo__chip${kyd.uiState === item.state ? " is-active" : ""}`}
            onClick={() => kyd.setDemoState(item.state)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
