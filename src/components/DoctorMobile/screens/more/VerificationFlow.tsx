"use client";

/* Verification flow (KYD — Know Your Doctor). A full-screen pushed view opened
   via openVerification(). Mirrors the desktop VerificationGate states:
   not-started (checklist + what-unlocks) · upload (file input + validation +
   progress + replace/remove) · under-review · needs-resubmission · expired ·
   approved (reduced-motion-safe success). KYD never blocks ordering — the
   <OrderBlockBanner/> is informational, surfaced on the cart/composer to warn.
   Mobile-local state via useKyd(); reuses base classes, adds only the dropzone /
   progress / verified-mark styles. */

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowLeft, Check, Close, Flask, Info, Refresh, Upload } from "@/icons/components";
import { cx } from "@/lib/cx";
import { useKyd } from "@/components/DoctorMobile/data/kyd";
import type { KydUiState } from "@/components/DoctorMobile/data/kyd";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { Pill, SectionHeader } from "@/components/DoctorMobile/components/primitives";
import { toneClass } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./VerificationFlow.module.css";
import { toast } from "sonner";

/* What an approved doctor unlocks — concrete, calm. */
const UNLOCKS = [
  "Orders and claims attributed to you",
  "Results sent to patients on Telegram",
  "Your verified profile in the Kura directory",
];

/* Have-ready checklist for the not-started state. */
const CHECKLIST = [
  "Medical licence photo or PDF",
  "Government photo ID",
  "Your name is clearly visible",
  "Licence number is readable",
];

/* States that allow a fresh upload. */
const UPLOADABLE = new Set<KydUiState>(["not-started", "needs-resubmission", "expired"]);

const ACCEPT = "image/png,image/jpeg,application/pdf";
const ACCEPT_LABEL = "PDF, JPG, or PNG · up to 10 MB";
const MAX_BYTES = 10 * 1024 * 1024;

type UploadPhase = "idle" | "uploading" | "uploaded" | "error";
type UploadState = { phase: UploadPhase; fileName: string | null; progress: number; error?: string };
const IDLE_UPLOAD: UploadState = { phase: "idle", fileName: null, progress: 0 };

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "That file is over 10 MB. Upload a smaller PDF, JPG, or PNG.";
  if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type)) {
    return "Unsupported file type. Upload a PDF, JPG, or PNG.";
  }
  return null;
}

/* ---------------------------------------------------------------- unlocks -- */

function UnlockList({ done = false }: { done?: boolean }) {
  return (
    <ul className={styles.unlockList}>
      {UNLOCKS.map((item) => (
        <li key={item} className={base.checkRow}>
          <span className={cx(base.checkMark, done && base.checkMarkDone)}>
            {done ? <Check size={12} variant="stroke" aria-hidden="true" /> : <Flask size={12} variant="stroke" aria-hidden="true" />}
          </span>
          <span>{item}</span>
          <span />
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- dropzone -- */

function LicenceDropzone({
  state,
  onSelect,
  onRemove,
  onRetry,
}: {
  state: UploadState;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const openPicker = () => inputRef.current?.click();
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className={styles.hiddenInput}
        onChange={handleInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      {state.phase === "uploaded" ? (
        <div className={styles.fileRow}>
          <span className={cx(styles.fileIcon, base.tone_success)}>
            <Check size={16} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.fileBody}>
            <span className={styles.fileName}>{state.fileName}</span>
            <span className={styles.fileMeta}>Ready to submit</span>
          </span>
          <span className={styles.fileActions}>
            <button type="button" className={base.textButton} onClick={openPicker}>
              Replace
            </button>
            <button type="button" className={base.iconButton} aria-label="Remove file" onClick={onRemove}>
              <Close size={14} variant="stroke" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : state.phase === "uploading" ? (
        <div className={styles.fileRow}>
          <span className={cx(styles.fileIcon, base.tone_info)}>
            <Upload size={16} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.fileBody}>
            <span className={styles.fileName}>{state.fileName}</span>
            <span className={styles.fileMeta}>Uploading… {state.progress}%</span>
            <span
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={state.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className={styles.progressBar} style={{ width: `${state.progress}%` }} />
            </span>
          </span>
          <span />
        </div>
      ) : state.phase === "error" ? (
        <div className={styles.fileRow}>
          <span className={cx(styles.fileIcon, base.tone_danger)}>
            <Refresh size={16} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.fileBody}>
            <span className={styles.fileName}>Upload failed</span>
            <span className={styles.fileMeta}>{state.error}</span>
          </span>
          <span className={styles.fileActions}>
            <button type="button" className={base.secondaryButton} onClick={onRetry}>
              Try again
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={cx(styles.dropzone, over && styles.dropzoneOver)}
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) onSelect(file);
          }}
        >
          <span className={styles.dropzoneIcon}>
            <Upload size={20} variant="stroke" aria-hidden="true" />
          </span>
          <span className={styles.dropzoneMain}>Choose a file or drag it here</span>
          <span className={styles.dropzoneHint}>{ACCEPT_LABEL}</span>
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- the flow -- */

export function VerificationFlow() {
  const kyd = useKyd();
  const { back } = useMobileApp();
  const { uiState, meta } = kyd;

  const [mode, setMode] = useState<"view" | "upload">("view");
  const [upload, setUpload] = useState<UploadState>(IDLE_UPLOAD);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetUpload = useCallback(() => {
    clearTimer();
    setUpload(IDLE_UPLOAD);
  }, [clearTimer]);

  const startUpload = useCallback(
    (file: File) => {
      clearTimer();
      const error = validateFile(file);
      if (error) {
        setUpload({ phase: "error", fileName: file.name, progress: 0, error });
        return;
      }
      setUpload({ phase: "uploading", fileName: file.name, progress: 15 });
      /* deterministic simulated progress — no upload endpoint in this prototype */
      const step = (p: number) => {
        timerRef.current = window.setTimeout(() => {
          if (p >= 100) {
            setUpload((u) => (u.phase === "uploading" ? { ...u, phase: "uploaded", progress: 100 } : u));
            return;
          }
          setUpload((u) => (u.phase === "uploading" ? { ...u, progress: p } : u));
          step(p + 25);
        }, 150);
      };
      step(40);
    },
    [clearTimer],
  );

  const openUpload = () => {
    resetUpload();
    setMode("upload");
  };

  const cancelUpload = () => {
    resetUpload();
    setMode("view");
  };

  /* Submit → under-review (start for not-started, fix for needs/expired). */
  const handleSubmit = () => {
    if (upload.phase !== "uploaded" || submitting) return;
    setSubmitting(true);
    timerRef.current = window.setTimeout(() => {
      if (uiState === "not-started") kyd.start();
      else kyd.fix();
      setSubmitting(false);
      setMode("view");
      resetUpload();
      toast.success("Submitted for review", { description: "Usually verified within one business day." });
    }, 500);
  };

  const inUpload = mode === "upload" && UPLOADABLE.has(uiState);

  /* ----------------------------------------------------------- upload view */
  if (inUpload) {
    return (
      <div className={base.sectionStack}>
        <div className={base.bookingTop}>
          <SectionHeader title="Upload documents" />
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </div>
        <p className={base.muted}>Upload a clear photo or PDF of your medical licence. Make sure the full document is visible.</p>

        <LicenceDropzone
          state={upload}
          onSelect={startUpload}
          onRemove={resetUpload}
          onRetry={resetUpload}
        />

        <div className={base.sectionStack} style={{ gap: "var(--space-2)" }}>
          <button
            type="button"
            className={base.primaryButton}
            style={{ width: "100%" }}
            disabled={upload.phase !== "uploaded" || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting for review…" : "Submit for review"}
          </button>
          <button type="button" className={base.secondaryButton} style={{ width: "100%" }} onClick={cancelUpload}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ approved */
  if (uiState === "approved") {
    return (
      <div className={base.sectionStack}>
        <div className={styles.successStack}>
          <span className={styles.verifiedMark} aria-hidden="true">
            <Check size={28} variant="stroke" />
          </span>
          <Pill tone="success">{meta.label}</Pill>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{meta.headline}</h1>
          <p className={base.muted} style={{ maxWidth: "42ch" }}>
            {meta.body}
          </p>
        </div>
        <div>
          <div className={base.sectionHeader}>
            <h2>Now unlocked</h2>
          </div>
          <UnlockList done />
        </div>
        <button type="button" className={base.secondaryButton} style={{ width: "100%" }} onClick={back}>
          <ArrowLeft size={14} variant="stroke" aria-hidden="true" /> Back to More
        </button>
      </div>
    );
  }

  /* ------------------------------------------------- status panel (header) */
  const StatusIcon = meta.Icon;
  const statusPanel = (
    <div className={base.statusPanel}>
      <div className={base.statusPanelHead}>
        <span className={cx(base.statusPanelIcon, toneClass(meta.tone))}>
          <StatusIcon size={18} variant="stroke" aria-hidden="true" />
        </span>
        <div>
          <h2>{meta.headline}</h2>
          <p>{meta.body}</p>
        </div>
      </div>
      <Pill tone={meta.tone}>{meta.label}</Pill>
    </div>
  );

  /* ------------------------------------------------- per-state body + CTA */
  let body: React.ReactNode = null;
  let cta: React.ReactNode = null;

  if (uiState === "not-started") {
    body = (
      <>
        <div>
          <div className={base.sectionHeader}>
            <h2>Have ready</h2>
          </div>
          <ul className={cx(base.checklist, styles.listReset)}>
            {CHECKLIST.map((item) => (
              <li key={item} className={base.checkRow}>
                <span className={base.checkMark}>
                  <Check size={12} variant="stroke" aria-hidden="true" />
                </span>
                <span>{item}</span>
                <span />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className={base.sectionHeader}>
            <h2>Unlocks after approval</h2>
          </div>
          <UnlockList />
        </div>
      </>
    );
    cta = (
      <button type="button" className={base.primaryButton} style={{ width: "100%" }} onClick={openUpload}>
        <Upload size={16} variant="stroke" aria-hidden="true" /> {meta.cta ?? "Start verification"}
      </button>
    );
  } else if (uiState === "under-review") {
    body = (
      <>
        <div className={cx(base.banner, base.tone_info)}>
          <Info size={16} variant="stroke" aria-hidden="true" />
          <span>Ordering keeps working while we review. We&rsquo;ll notify you the moment your licence is verified.</span>
        </div>
        <div>
          <div className={base.sectionHeader}>
            <h2>Will unlock after approval</h2>
          </div>
          <UnlockList />
        </div>
      </>
    );
    cta = (
      <button type="button" className={base.secondaryButton} style={{ width: "100%" }} onClick={back}>
        Back to More
      </button>
    );
  } else {
    /* needs-resubmission · expired — both re-upload */
    body = (
      <div className={cx(base.banner, base.tone_warning)}>
        <Info size={16} variant="stroke" aria-hidden="true" />
        <span>
          {uiState === "expired"
            ? "Upload an updated medical licence to keep your profile active."
            : "Re-upload a clear copy of your medical licence and a photo ID. Make sure your name and licence number are visible."}
        </span>
      </div>
    );
    cta = (
      <button type="button" className={base.primaryButton} style={{ width: "100%" }} onClick={openUpload}>
        <Upload size={16} variant="stroke" aria-hidden="true" /> {meta.cta ?? "Resubmit documents"}
      </button>
    );
  }

  return (
    <div className={base.sectionStack}>
      <SectionHeader title="Verification" />
      {statusPanel}
      {body}
      <div>{cta}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   OrderBlockBanner — informational warning surfaced on the cart / composer when
   the doctor is NOT verified. Per the product rule, KYD never blocks placement;
   this only nudges. Hidden when approved or under review. Tapping opens the
   verification flow. */
export function OrderBlockBanner() {
  const { uiState, meta } = useKyd();
  const { openVerification } = useMobileApp();

  if (uiState === "approved" || uiState === "under-review") return null;

  return (
    <button
      type="button"
      className={cx(base.banner, base.tone_warning)}
      style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
      onClick={openVerification}
    >
      <Info size={16} variant="stroke" aria-hidden="true" />
      <span>
        <strong style={{ fontWeight: 500 }}>{meta.label}.</strong> Ordering still works — verify your licence so orders
        and claims are attributed to you.
      </span>
    </button>
  );
}

export default VerificationFlow;
