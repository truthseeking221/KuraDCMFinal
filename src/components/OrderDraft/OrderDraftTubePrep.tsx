"use client";

import { useState } from "react";
import { Badge, Button, SegmentedToggle } from "@/components/ui";
import { Scan as ScanIcon } from "@/icons/components";
import { SWEEP_WINDOW, useOrderDraft } from "./OrderDraftContext";

/* In-clinic draw: label + scan (or print) each tube, then confirm to commit
   the order. Until confirmation the order is deliberately "Not yet placed" —
   Bookings never shows samples that don't physically exist. */
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
      <div className="odr-prep-banner">
        Preparing order · <strong>Not yet placed</strong>
      </div>
      <SegmentedToggle
        aria-label="Labelling method"
        onChange={setMethod}
        options={[
          { label: "Scan", value: "scan" },
          { label: "Print", value: "print" },
        ]}
        value={method}
      />
      <span className="odr-prep-hint">
        {method === "scan"
          ? `Peel ${total} ${total === 1 ? "label" : "labels"} from the Kura roll, stick one per tube, scan each to assign its sample ID.`
          : "Link a thermal printer, print one label per tube, then apply."}
      </span>

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
          return (
            <div className="odr-tube" key={tube.id}>
              <span aria-hidden className={`odr-tube-dot odr-tube-dot-${tube.kind}`} />
              <span className="odr-tube-copy">
                <strong>{tube.name}</strong>
                <span>{tube.tests.join(" · ")}</span>
                {sampleId && (
                  <span className="odr-tube-sample">
                    {method === "print" && <span aria-hidden className="odr-barcode" />}
                    {sampleId}
                  </span>
                )}
              </span>
              {sampleId ? (
                <span className="odr-tube-done">
                  <Badge tone="success">{method === "print" ? "Labelled" : "Scanned"}</Badge>
                  <button className="odr-tube-undo" onClick={() => unscanTube(tube.id)} type="button">
                    Undo
                  </button>
                </span>
              ) : scanningId === tube.id ? (
                <span className="odr-tube-scanning">Scanning…</span>
              ) : method === "scan" ? (
                <Button
                  intent="outline"
                  leadingIcon={<ScanIcon size={14} variant="stroke" />}
                  onClick={() => startScan(tube.id)}
                  size="sm"
                >
                  Scan
                </Button>
              ) : (
                <span className="odr-tube-scanning">—</span>
              )}
            </div>
          );
        })}
      </div>
      <span className="odr-prep-ship">
        {stat
          ? "Confirming dispatches a courier now (~30 min)."
          : `Next sweep · ${SWEEP_WINDOW} — leave the tube bag at reception.`}
      </span>
      <Button disabled={remaining > 0} fullWidth intent="primary" onClick={confirmTubesReady}>
        {remaining > 0
          ? `${method === "scan" ? "Scan" : "Label"} ${remaining} more ${remaining === 1 ? "tube" : "tubes"} first`
          : stat
            ? "Confirm — dispatch courier"
            : "Confirm — tubes ready"}
      </Button>
      <button className="odr-prep-cancel" onClick={cancelPrep} type="button">
        Back to draft
      </button>
    </div>
  );
}
