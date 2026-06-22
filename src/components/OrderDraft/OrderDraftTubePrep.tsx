"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Check as CheckIcon } from "@/icons/components";
import { toast } from "sonner";
import { SWEEP_WINDOW, useOrderDraft } from "./OrderDraftContext";
import type { TubeSpec } from "./types";

/* In-clinic draw: label + scan (or print) each tube, then confirm to commit
   the order. Until confirmation the order is deliberately "Not yet placed" —
   Bookings never shows samples that don't physically exist.

   TubePrepPanel is the presentational flow — it owns only the local UI state
   (scan method, the brief "Scanning…" beat, printer link) and takes the tube
   set + scan callbacks as props, so it can be driven either by the order-draft
   context (OrderDraftTubePrep, below) or by a host with its own placement flow
   (the Lab catalog OrderCart). */
export function TubePrepPanel({
  tubes,
  scanned,
  onScan,
  onUnscan,
  onConfirm,
  onBack,
  stat = false,
  shipLine,
}: {
  tubes: TubeSpec[];
  scanned: Record<string, string>;
  onScan: (tubeId: string) => void;
  onUnscan: (tubeId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  stat?: boolean;
  /* override the logistics line under the confirm button */
  shipLine?: string;
}) {
  const [method, setMethod] = useState<"scan" | "print">("scan");
  /* brief "Scanning…" micro-state between tap and linked ✓ */
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [printerLinked, setPrinterLinked] = useState(false);

  /* clear a stuck "Scanning…" beat if the panel unmounts mid-scan */
  useEffect(() => () => setScanningId(null), []);

  const total = tubes.length;
  const scannedCount = tubes.filter((tube) => scanned[tube.id]).length;
  const remaining = total - scannedCount;

  const startScan = (tubeId: string) => {
    if (scanningId) return;
    setScanningId(tubeId);
    window.setTimeout(() => {
      onScan(tubeId);
      setScanningId(null);
    }, 520);
  };

  const printAll = () => {
    tubes.filter((tube) => !scanned[tube.id]).forEach((tube) => onScan(tube.id));
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
        {tubes.map((tube) => {
          const sampleId = scanned[tube.id];
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
                  <button className="odr-tube-undo" onClick={() => onUnscan(tube.id)} type="button">
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

      <Button disabled={remaining > 0} fullWidth intent="primary" onClick={onConfirm}>
        {remaining > 0
          ? `${scannedCount} of ${total} ${method === "scan" ? "scanned" : "labelled"}`
          : stat
            ? "Confirm — dispatch courier"
            : "Confirm — tubes ready"}
      </Button>
      <span className="odr-prep-ship">
        {shipLine ?? (stat ? "Confirming dispatches a courier now (~30 min)." : `Sweep ${SWEEP_WINDOW} · leave bag at reception`)}
      </span>

      <div className="odr-prep-links">
        <button
          className="odr-prep-link"
          onClick={() => setMethod(method === "scan" ? "print" : "scan")}
          type="button"
        >
          {method === "scan" ? "Use printer instead" : "Scan with handheld instead"}
        </button>
        <button className="odr-prep-link" onClick={onBack} type="button">
          Back to draft
        </button>
      </div>
    </div>
  );
}

/* Order-draft-context binding: drives TubePrepPanel from the live draft prep
   state (used by the Orders-tab rail, where placement = confirmTubesReady). */
export function OrderDraftTubePrep() {
  const { cancelPrep, confirmTubesReady, draft, scanTube, unscanTube } = useOrderDraft();
  const prep = draft.prep;
  if (!prep) return null;

  /* The clinic route commits HERE, not at placeOrder() — so the destination
     confirmation (care-plan strand vs standalone lab order) is acknowledged
     only once the tubes are actually confirmed ready. */
  const confirmAndConfirmDestination = () => {
    const count = draft.lines.length;
    const noun = count === 1 ? "test" : "tests";
    confirmTubesReady();
    if (draft.carePlanTitle) {
      toast.success(`${count} ${noun} linked to ${draft.carePlanTitle}`);
    } else {
      toast.success(`${count} ${noun} ordered as a standalone lab order`);
    }
  };

  return (
    <TubePrepPanel
      tubes={prep.tubes}
      scanned={prep.scanned}
      onScan={scanTube}
      onUnscan={unscanTube}
      onConfirm={confirmAndConfirmDestination}
      onBack={cancelPrep}
      stat={draft.checkout.stat}
    />
  );
}
