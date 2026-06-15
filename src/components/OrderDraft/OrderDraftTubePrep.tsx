"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Check as CheckIcon } from "@/icons/components";
import { SWEEP_WINDOW, useOrderDraft } from "./OrderDraftContext";

/* In-clinic draw: label + scan (or print) each tube, then confirm to commit
   the order. Until confirmation the order is deliberately "Not yet placed" —
   Bookings never shows samples that don't physically exist. The rail header
   already badges that state, so this panel carries no banner of its own: one
   caps heading with progress, flat tube rows (the row itself is the scan
   target), and a single logistics line under the confirm button. */
export function OrderDraftTubePrep() {
  const { cancelPrep, confirmTubesReady, draft, scanTube, unscanTube } = useOrderDraft();
  const [method, setMethod] = useState<"scan" | "print">("scan");
  /* brief "Scanning…" micro-state between click and linked ✓ */
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [printerLinked, setPrinterLinked] = useState(false);
  const prep = draft.prep;
  if (!prep) return null;

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

  const printAll = () => {
    prep.tubes.filter((tube) => !prep.scanned[tube.id]).forEach((tube) => scanTube(tube.id));
  };

  return (
    <div className="odr-prep">
      <div className="odr-prep-head">
        <span className="odr-group-label">
          Prepare {total} {total === 1 ? "tube" : "tubes"}
        </span>
        <span className="odr-prep-count">
          {scannedCount}/{total}
        </span>
      </div>

      {method === "print" && (
        <div className="odr-printer-row">
          <span className={`odr-printer-chip${printerLinked ? " is-connected" : ""}`}>
            {printerLinked ? "CONNECTED · Zebra ZT411" : "NO PRINTER"}
          </span>
          {printerLinked ? (
            <Button disabled={remaining === 0} intent="outline" onClick={printAll} size="sm">
              Print {remaining || total} {remaining === 1 ? "label" : "labels"}
            </Button>
          ) : (
            <Button intent="outline" onClick={() => setPrinterLinked(true)} size="sm">
              Link printer
            </Button>
          )}
        </div>
      )}

      <div className="odr-prep-tubes">
        {prep.tubes.map((tube) => {
          const sampleId = prep.scanned[tube.id];
          const copy = (
            <span className="odr-tube-copy">
              <strong>{tube.name}</strong>
              <span>{sampleId ? <span className="odr-tube-sample">{sampleId}</span> : tube.tests.join(" · ")}</span>
            </span>
          );
          if (sampleId) {
            return (
              <div className="odr-tube is-scanned" key={tube.id}>
                <span aria-hidden className={`odr-tube-dot odr-tube-dot-${tube.kind}`} />
                {copy}
                <span className="odr-tube-state">
                  <button className="odr-tube-undo" onClick={() => unscanTube(tube.id)} type="button">
                    Undo
                  </button>
                  <span aria-hidden className="odr-tube-check">
                    <CheckIcon size={12} variant="stroke" />
                  </span>
                </span>
              </div>
            );
          }
          if (method === "print") {
            return (
              <div className="odr-tube" key={tube.id}>
                <span aria-hidden className={`odr-tube-dot odr-tube-dot-${tube.kind}`} />
                {copy}
                <span aria-hidden className="odr-tube-ring" />
              </div>
            );
          }
          return (
            <button
              className="odr-tube odr-tube-scannable"
              disabled={scanningId !== null}
              key={tube.id}
              onClick={() => startScan(tube.id)}
              type="button"
            >
              <span aria-hidden className={`odr-tube-dot odr-tube-dot-${tube.kind}`} />
              {copy}
              {scanningId === tube.id ? (
                <span className="odr-tube-scanning">Scanning…</span>
              ) : (
                <span className="odr-tube-state">
                  <span className="odr-tube-cta">Scan</span>
                  <span aria-hidden className="odr-tube-ring" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <span className="odr-prep-hint">
        {method === "scan"
          ? "Stick a Kura label on each tube, then tap its row to scan."
          : "Print one label per tube, then apply."}
      </span>

      <Button disabled={remaining > 0} fullWidth intent="primary" onClick={confirmTubesReady}>
        {remaining > 0
          ? `${scannedCount} of ${total} ${method === "scan" ? "scanned" : "labelled"}`
          : stat
            ? "Confirm — dispatch courier"
            : "Confirm — tubes ready"}
      </Button>
      <span className="odr-prep-ship">
        {stat ? "Confirming dispatches a courier now (~30 min)." : `Sweep ${SWEEP_WINDOW} · leave bag at reception`}
      </span>

      <div className="odr-prep-links">
        <button
          className="odr-prep-link"
          onClick={() => setMethod(method === "scan" ? "print" : "scan")}
          type="button"
        >
          {method === "scan" ? "Use printer instead" : "Scan with handheld instead"}
        </button>
        <button className="odr-prep-link" onClick={cancelPrep} type="button">
          Back to draft
        </button>
      </div>
    </div>
  );
}
