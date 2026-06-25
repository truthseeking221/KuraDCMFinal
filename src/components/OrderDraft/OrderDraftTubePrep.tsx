"use client";

import { useEffect, useState } from "react";
import { Button, SegmentedToggle } from "@/components/ui";
import { ArrowLeft as ArrowLeftIcon, Check as CheckIcon } from "@/icons/components";
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
  const progressVerb = method === "scan" ? "scanned" : "labelled";
  const progressLabel = `${scannedCount}/${total} ${progressVerb}`;
  const progressAriaLabel = `${scannedCount} of ${total} tubes ${progressVerb}`;
  const prepTitle = (() => {
    if (remaining === 0) return "Ready to confirm";
    if (method === "print") return total === 1 ? "Print label" : "Print labels";
    return total === 1 ? "Scan tube" : "Scan tubes";
  })();
  const printerState =
    remaining === 0
      ? { tone: "connected", label: "Labels printed", detail: null }
      : printerLinked
        ? { tone: "connected", label: "Printer connected", detail: "Zebra ZT411" }
        : { tone: "idle", label: "No printer connected", detail: null };

  return (
    <div className="odr-prep">
      <div className="odr-prep-top">
        <button aria-label="Back to order draft" className="odr-prep-back" onClick={onBack} title="Back to order draft" type="button">
          <ArrowLeftIcon aria-hidden size={14} variant="stroke" />
          <span>Back to draft</span>
        </button>
        <SegmentedToggle
          aria-label="Label method"
          className="odr-prep-method"
          options={[
            { label: "Scan", value: "scan" },
            { label: "Print", value: "print" },
          ]}
          value={method}
          onChange={(value) => setMethod(value === "print" ? "print" : "scan")}
        />
      </div>

      <div className="odr-prep-summary">
        <strong>{prepTitle}</strong>
        <span
          aria-label={progressAriaLabel}
          className="odr-prep-summary-progress"
          role="status"
          aria-live="polite"
        >
          {progressLabel}
        </span>
      </div>

      {method === "print" && (
        <div className="odr-printer-row">
          <span className={`odr-printer-status is-${printerState.tone}`}>
            {printerState.tone === "connected" && (
              <span aria-hidden className="odr-printer-status-icon">
                <CheckIcon size={11} variant="stroke" />
              </span>
            )}
            <span className="odr-printer-status-copy">
              <strong>{printerState.label}</strong>
              {printerState.detail && <small>{printerState.detail}</small>}
            </span>
          </span>
          {remaining === 0 ? null : printerLinked ? (
            <button className="odr-printer-link" onClick={printAll} type="button">
              Print {remaining} {remaining === 1 ? "label" : "labels"}
            </button>
          ) : (
            <button className="odr-printer-link" onClick={() => setPrinterLinked(true)} type="button">
              Link printer
            </button>
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

      {remaining === 0 && (
        <Button fullWidth intent="primary" onClick={onConfirm}>
          {stat ? "Dispatch courier" : "Confirm tubes ready"}
        </Button>
      )}
      {remaining === 0 && (
        <span className="odr-prep-ship">
          {shipLine ?? (stat ? "Confirming dispatches a courier now (~30 min)." : `Sweep ${SWEEP_WINDOW} · leave bag at reception`)}
        </span>
      )}
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
