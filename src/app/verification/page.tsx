"use client";

import { KuraLogo } from "@/icons";
import { VerificationGate } from "@/components/Verification";

/*
 * /verification — the single source of truth for doctor KYD status.
 *
 * Deliberately rendered in a minimal auth shell, NOT the full clinic shell, and
 * with NO guard in front of it: a rejected, expired, under-review, or
 * not-started doctor can always reach this page and recover. The gate itself
 * resolves which state to show.
 */
export default function VerificationPage() {
  return (
    <div className="kyd-shell">
      <header className="kyd-shell__top">
        <span className="kyd-shell__brand" aria-label="Kura">
          <KuraLogo />
        </span>
        <a className="kyd-shell__support" href="mailto:support@kura.med?subject=Medical%20licence%20verification">
          Contact support
        </a>
      </header>
      <main className="kyd-shell__main">
        <VerificationGate showDemoControls />
      </main>
    </div>
  );
}
