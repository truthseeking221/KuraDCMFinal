"use client";

/* TubePrepSheet — clinic-route draw step. After Place on a clinic order the
   draft holds at "preparing": tubes are derived from the draft lines. The
   doctor labels + scans each tube (the row IS the scan target), then confirms,
   which commits the order (draft → placed) and surfaces the receipt back in the
   CartScreen. Opened as a bottom sheet by the CartScreen; binds useOrderDraft
   for prep state + scanTube/unscanTube/confirmTubesReady/cancelPrep. */

import { useState } from "react";
import { useOrderDraft, SWEEP_WINDOW } from "@/components/OrderDraft";
import type { TubeKind } from "@/components/OrderDraft/types";
import { Check } from "@/icons/components";
import { cx } from "@/lib/cx";
import { Sheet } from "../../components/Sheet";
import base from "../../DoctorMobileApp.module.css";
import styles from "./TubePrepSheet.module.css";

const DOT_CLASS: Record<TubeKind, string> = {
  edta: styles.dotEdta,
  sst: styles.dotSst,
  urine: styles.dotUrine,
};

export function TubePrepSheet({ onClose }: { onClose: () => void }) {
  const { draft, scanTube, unscanTube, confirmTubesReady, cancelPrep } = useOrderDraft();
  /* brief "Scanning…" micro-state between tap and the linked sample id */
  const [scanningId, setScanningId] = useState<string | null>(null);

  const prep = draft.prep;
  /* once tubes are confirmed the draft flips to "placed" and prep clears —
     close so the CartScreen receipt takes over */
  if (!prep) {
    onClose();
    return null;
  }

  const total = prep.tubes.length;
  const scannedCount = prep.tubes.filter((tube) => prep.scanned[tube.id]).length;
  const remaining = total - scannedCount;
  const stat = draft.checkout.stat;

  const startScan = (tubeId: string) => {
    if (scanningId) return;
    setScanningId(tubeId);
    window.setTimeout(() => {
      scanTube(tubeId);
      setScanningId(null);
    }, 600);
  };

  const handleCancel = () => {
    cancelPrep();
    onClose();
  };

  const footer = (
    <div className={cx(base.sectionStack, styles.footerStack)}>
      <button
        className={base.primaryButton}
        type="button"
        disabled={remaining > 0}
        onClick={confirmTubesReady}
      >
        {remaining > 0
          ? `${scannedCount} of ${total} scanned`
          : stat
            ? "Confirm — dispatch courier"
            : "Confirm — tubes ready"}
      </button>
      <span className={styles.ship}>
        {stat ? "Confirming dispatches a courier now (~30 min)." : `Sweep ${SWEEP_WINDOW} · leave bag at reception`}
      </span>
      <button className={base.textButton} type="button" onClick={handleCancel}>
        Back to draft
      </button>
    </div>
  );

  return (
    <Sheet title="Prepare tubes" onClose={onClose} footer={footer}>
      <div className={base.sectionStack}>
        <div className={base.sectionHeader}>
          <h2>
            {total} {total === 1 ? "tube" : "tubes"}
          </h2>
          <span className={styles.prepCount}>
            {scannedCount}/{total}
          </span>
        </div>

        <div className={styles.tubes} role="list">
          {prep.tubes.map((tube) => {
            const sampleId = prep.scanned[tube.id];
            const copy = (
              <span className={styles.copy}>
                <strong>{tube.name}</strong>
                <span>{sampleId ? <span className={styles.sample}>{sampleId}</span> : tube.tests.join(" · ")}</span>
              </span>
            );

            if (sampleId) {
              return (
                <div className={cx(styles.tube, styles.tubeScanned)} key={tube.id} role="listitem">
                  <span aria-hidden="true" className={cx(styles.dot, DOT_CLASS[tube.kind])} />
                  {copy}
                  <span className={styles.state}>
                    <button className={styles.undo} type="button" onClick={() => unscanTube(tube.id)}>
                      Undo
                    </button>
                    <span aria-hidden="true" className={styles.check}>
                      <Check size={12} variant="stroke" />
                    </span>
                  </span>
                </div>
              );
            }

            return (
              <button
                className={styles.tube}
                type="button"
                key={tube.id}
                role="listitem"
                disabled={scanningId !== null}
                onClick={() => startScan(tube.id)}
              >
                <span aria-hidden="true" className={cx(styles.dot, DOT_CLASS[tube.kind])} />
                {copy}
                {scanningId === tube.id ? (
                  <span className={styles.scanning}>Scanning…</span>
                ) : (
                  <span className={styles.state}>
                    <span className={styles.cta}>Scan</span>
                    <span aria-hidden="true" className={styles.ring} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <span className={styles.hint}>Stick a Kura label on each tube, then tap its row to scan.</span>
      </div>
    </Sheet>
  );
}
