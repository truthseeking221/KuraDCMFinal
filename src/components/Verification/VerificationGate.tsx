"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode, Ref } from "react";
import { useRouter } from "next/navigation";
import { Badge, Banner, Button, Input } from "@/components/ui";
import { ArrowRight, Check, Close, Flask, Refresh, Upload } from "@/icons";
import {
  KYD_ACCEPT,
  KYD_ACCEPT_LABEL,
  KYD_STATE_META,
  ORDER_CREATE_HREF,
  WORKSPACE_HREF,
  useKyd,
  validateKydFile,
  type KydStatus,
  type KydUiState,
} from "./kydStatus";
import "./VerificationGate.css";

const SUPPORT_MAILTO = "mailto:support@kura.med?subject=Medical%20licence%20verification";

/* What an approved doctor unlocks — concrete, calm, three items. Answers the
   "what unlocks after approval?" question on every pre-approval screen. */
const UNLOCKS = [
  "Create lab orders for your patients",
  "Order tests on clinic or PSC routes",
  "Send results to patients on Telegram",
];

type UploadPhase = "idle" | "uploading" | "uploaded" | "error";
type UploadState = { phase: UploadPhase; fileName: string | null; progress: number; error?: string };
const IDLE_UPLOAD: UploadState = { phase: "idle", fileName: null, progress: 0 };

const UPLOADABLE: ReadonlySet<KydStatus> = new Set(["not_started", "needs_resubmission", "expired"]);

/* ------------------------------- status pill ------------------------------- */

function StatusPill({ state }: { state: KydUiState }) {
  const meta = KYD_STATE_META[state];
  const Icon = meta.Icon;
  return (
    <Badge tone={meta.tone} icon={<Icon size={13} variant="stroke" />}>
      {meta.label}
    </Badge>
  );
}

function StateIcon({ state, size = 22 }: { state: KydUiState; size?: number }) {
  const Icon = KYD_STATE_META[state].Icon;
  return <Icon size={size} variant="stroke" />;
}

/* ------------------------------- unlock list ------------------------------- */

function UnlockList() {
  return (
    <div className="kyd-unlock">
      <p className="kyd-unlock__title">Unlocks after approval</p>
      <ul className="kyd-unlock__list">
        {UNLOCKS.map((item) => (
          <li key={item}>
            <span aria-hidden className="kyd-unlock__icon">
              <Flask size={14} variant="stroke" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- dropzone ---------------------------------- */

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
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    // allow re-selecting the same file after a remove/retry
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="kyd-upload">
      <input
        ref={inputRef}
        type="file"
        accept={KYD_ACCEPT}
        className="kyd-upload__input"
        onChange={handleInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      {state.phase === "uploaded" ? (
        <div className="kyd-file" data-tone="success">
          <span aria-hidden className="kyd-file__icon">
            <Check size={16} variant="stroke" />
          </span>
          <span className="kyd-file__copy">
            <strong>{state.fileName}</strong>
            <span>Uploaded · ready to submit</span>
          </span>
          <span className="kyd-file__actions">
            <Button intent="ghost" size="sm" onClick={openPicker}>
              Replace
            </Button>
            <Button
              intent="ghost"
              size="sm"
              onClick={onRemove}
              leadingIcon={<Close size={14} variant="stroke" />}
            >
              Remove
            </Button>
          </span>
        </div>
      ) : state.phase === "uploading" ? (
        <div className="kyd-file" data-tone="info">
          <span aria-hidden className="kyd-file__icon">
            <Upload size={16} variant="stroke" />
          </span>
          <span className="kyd-file__copy">
            <strong>{state.fileName}</strong>
            <span>Uploading… {state.progress}%</span>
            <span className="kyd-progress" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100}>
              <span className="kyd-progress__bar" style={{ width: `${state.progress}%` }} />
            </span>
          </span>
        </div>
      ) : state.phase === "error" ? (
        <div className="kyd-file" data-tone="danger">
          <span aria-hidden className="kyd-file__icon">
            <Refresh size={16} variant="stroke" />
          </span>
          <span className="kyd-file__copy">
            <strong>Upload failed</strong>
            <span>{state.error}</span>
          </span>
          <span className="kyd-file__actions">
            <Button intent="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={`kyd-dropzone${dragOver ? " is-dragover" : ""}`}
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span aria-hidden className="kyd-dropzone__icon">
            <Upload size={20} variant="stroke" />
          </span>
          <span className="kyd-dropzone__main">Choose a file or drag it here</span>
          <span className="kyd-dropzone__hint">{KYD_ACCEPT_LABEL}</span>
        </button>
      )}
    </div>
  );
}

/* ------------------------------ demo controls ------------------------------ */

const DEMO_STATUSES: Array<{ label: string; status: KydStatus }> = [
  { label: "Not verified", status: "not_started" },
  { label: "Under review", status: "under_review" },
  { label: "Verified", status: "approved" },
  { label: "Action needed", status: "needs_resubmission" },
  { label: "Expired", status: "expired" },
];

function DemoStateBar({ kyd }: { kyd: ReturnType<typeof useKyd> }) {
  return (
    <div className="kyd-demo" aria-label="Prototype — simulate verification state">
      <span className="kyd-demo__label">Prototype · simulate state</span>
      <div className="kyd-demo__chips">
        {DEMO_STATUSES.map((item) => (
          <button
            key={item.status}
            type="button"
            className={`kyd-demo__chip${kyd.runtime === "ok" && kyd.status === item.status ? " is-active" : ""}`}
            onClick={() => {
              kyd.setRuntime("ok");
              kyd.setStatus(item.status);
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={`kyd-demo__chip${kyd.runtime === "permission_denied" ? " is-active" : ""}`}
          onClick={() => kyd.setRuntime("permission_denied")}
        >
          Permission
        </button>
        <button
          type="button"
          className={`kyd-demo__chip${kyd.runtime === "offline" ? " is-active" : ""}`}
          onClick={() => kyd.setRuntime("offline")}
        >
          Offline
        </button>
        <button
          type="button"
          className={`kyd-demo__chip${kyd.runtime === "unknown_error" ? " is-active" : ""}`}
          onClick={() => kyd.setRuntime("unknown_error")}
        >
          Error
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- gate ------------------------------------ */

export function VerificationGate({ showDemoControls = false }: { showDemoControls?: boolean }) {
  const router = useRouter();
  const kyd = useKyd();
  const { loading, status, uiState, runtime } = kyd;

  const [mode, setMode] = useState<"view" | "upload">("view");
  const [upload, setUpload] = useState<UploadState>(IDLE_UPLOAD);
  const [licenceNumber, setLicenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const inUpload = mode === "upload" && runtime === "ok" && UPLOADABLE.has(status);

  /* Major screen identity — drives focus + the aria-live announcement. Upload
     progress ticks intentionally don't change it. */
  const screenKey = loading ? "loading" : inUpload ? "upload" : uiState;

  /* The state the pill reflects: the upload sub-state while uploading, else
     the resolved status. */
  const displayState: KydUiState = loading
    ? "submitted"
    : inUpload
      ? submitting
        ? "submitted"
        : upload.phase === "uploading"
          ? "uploading"
          : upload.phase === "error"
            ? "upload_failed"
            : "draft"
      : uiState;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    /* Move focus to the heading on each major transition so keyboard and
       screen-reader users land on the new state. */
    headingRef.current?.focus();
  }, [screenKey]);

  const startUpload = useCallback(
    (file: File) => {
      clearTimer();
      const error = validateKydFile(file);
      if (error) {
        setUpload({ phase: "error", fileName: file.name, progress: 0, error });
        return;
      }
      setUpload({ phase: "uploading", fileName: file.name, progress: 15, error: undefined });
      /* Simulated progress — this prototype has no upload endpoint. Deterministic
         steps (no Math.random), client-only timers. Swap for real XHR/fetch
         progress events when the upload API exists. */
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

  const resetUpload = useCallback(() => {
    clearTimer();
    setUpload(IDLE_UPLOAD);
  }, [clearTimer]);

  const openUpload = () => {
    resetUpload();
    setLicenceNumber(kyd.record.licenceNumber ?? "");
    setMode("upload");
  };

  const cancelUpload = () => {
    resetUpload();
    setMode("view");
  };

  const handleSubmit = () => {
    if (upload.phase !== "uploaded" || submitting) return;
    setSubmitting(true);
    /* Persist + broadcast after a short beat so "Submitting for review…" is
       visible. The hook's submit() is the refetch seam (it re-reads /me). */
    timerRef.current = window.setTimeout(() => {
      kyd.submit({
        licenceNumber: licenceNumber.trim() || undefined,
        documentName: upload.fileName ?? "medical-licence",
      });
      setSubmitting(false);
      setMode("view");
      resetUpload();
      setLicenceNumber("");
    }, 600);
  };

  const goOrder = () => router.push(ORDER_CREATE_HREF);
  const goWorkspace = () => router.push(WORKSPACE_HREF);
  const contactSupport = () => {
    window.location.href = SUPPORT_MAILTO;
  };

  const liveMessage = loading
    ? "Checking your verification status"
    : inUpload && upload.phase === "error"
      ? `Upload failed. ${upload.error}`
      : KYD_STATE_META[displayState].label;

  return (
    <section className="kyd-gate" aria-labelledby="kyd-heading">
      <p className="kyd-sr-live" role="status" aria-live="polite">
        {liveMessage}
      </p>

      {showDemoControls && <DemoStateBar kyd={kyd} />}

      <div className="kyd-card">
        {loading ? (
          <Screen
            headingRef={headingRef}
            icon={<span className="kyd-spinner" aria-hidden />}
            headline="Checking your verification status"
            body="One moment while we load your medical licence status."
          />
        ) : inUpload ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state={displayState} />}
            icon={<Upload size={22} variant="stroke" />}
            headline="Upload medical licence"
            body="Upload a clear photo or PDF of your MoH or MCC licence."
          >
            <div className="kyd-form">
              <Input
                label="Licence number"
                value={licenceNumber}
                onChange={(event) => setLicenceNumber(event.currentTarget.value)}
                placeholder="e.g. CMC 048-2019"
                helpText="Optional — helps us match your licence faster."
                autoComplete="off"
              />
              <div className="kyd-field">
                <span className="kyd-field__label">Medical licence document</span>
                <LicenceDropzone
                  state={upload}
                  onSelect={startUpload}
                  onRemove={resetUpload}
                  onRetry={resetUpload}
                />
                <p className="kyd-field__help">Make sure the full document is visible and easy to read.</p>
              </div>
            </div>
            <div className="kyd-actions">
              <Button
                intent="primary"
                fullWidth
                loading={submitting}
                disabled={upload.phase !== "uploaded"}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting for review…" : "Submit for review"}
              </Button>
              <Button intent="ghost" fullWidth onClick={cancelUpload}>
                Cancel
              </Button>
            </div>
          </Screen>
        ) : runtime === "permission_denied" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="permission_denied" />}
            icon={<StateIcon state="permission_denied" />}
            headline="You do not have permission to verify this doctor"
            body="Ask the clinic owner or a Kura admin for access."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth onClick={goWorkspace}>
                Back to workspace
              </Button>
            </div>
          </Screen>
        ) : runtime === "offline" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="offline" />}
            icon={<Refresh size={22} variant="stroke" />}
            headline="You appear to be offline"
            body="Check your connection, then try again."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth onClick={kyd.refetch}>
                Retry
              </Button>
            </div>
          </Screen>
        ) : runtime === "unknown_error" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="unknown_error" />}
            icon={<StateIcon state="unknown_error" />}
            headline="We could not load verification status"
            body="Refresh the page or try again in a moment."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth onClick={kyd.refetch}>
                Retry
              </Button>
              <Button intent="ghost" fullWidth onClick={contactSupport}>
                Contact support
              </Button>
            </div>
          </Screen>
        ) : status === "approved" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="approved" />}
            icon={<StateIcon state="approved" />}
            headline="Your medical licence is verified"
            body="You can now create lab orders for this clinic."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth trailingIcon={<ArrowRight size={14} variant="stroke" />} onClick={goOrder}>
                Create first lab order
              </Button>
              <Button intent="ghost" fullWidth onClick={goWorkspace}>
                Go to workspace
              </Button>
            </div>
          </Screen>
        ) : status === "under_review" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="under_review" />}
            icon={<StateIcon state="under_review" />}
            headline="Your licence is under review"
            body="Kura is reviewing your medical licence. Reviews are usually completed within 24 hours."
          >
            <Banner tone="info" title="Lab orders will unlock after approval">
              We’ll let you know as soon as your licence is verified.
            </Banner>
            <UnlockList />
            <div className="kyd-actions">
              <Button intent="outline" fullWidth onClick={goOrder}>
                View lab catalog
              </Button>
              <Button intent="ghost" fullWidth onClick={goWorkspace}>
                Back to workspace
              </Button>
            </div>
          </Screen>
        ) : status === "needs_resubmission" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="needs_resubmission" />}
            icon={<StateIcon state="needs_resubmission" />}
            headline="We could not verify your licence"
            body="Please upload a clearer or updated medical licence. Make sure your name, licence number, and document edges are visible."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth leadingIcon={<Upload size={14} variant="stroke" />} onClick={openUpload}>
                Upload again
              </Button>
              <Button intent="ghost" fullWidth onClick={contactSupport}>
                Contact support
              </Button>
            </div>
          </Screen>
        ) : status === "expired" ? (
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="expired" />}
            icon={<StateIcon state="expired" />}
            headline="Your medical licence has expired"
            body="Upload an updated medical licence to continue creating lab orders."
          >
            <div className="kyd-actions">
              <Button intent="primary" fullWidth leadingIcon={<Upload size={14} variant="stroke" />} onClick={openUpload}>
                Upload updated licence
              </Button>
            </div>
          </Screen>
        ) : (
          /* not_started */
          <Screen
            headingRef={headingRef}
            pill={<StatusPill state="not_started" />}
            icon={<StateIcon state="not_started" />}
            headline="Verify your medical licence"
            body="Before you can create lab orders, Kura needs to verify your medical licence. This protects patients and keeps lab orders tied to a licensed doctor."
          >
            <div className="kyd-checklist">
              <p className="kyd-checklist__title">Have ready</p>
              <ul>
                {[
                  "Medical licence photo or PDF",
                  "Your name is visible",
                  "Licence number is readable",
                  "Expiry date is visible if available",
                ].map((item) => (
                  <li key={item}>
                    <span aria-hidden className="kyd-checklist__icon">
                      <Check size={14} variant="stroke" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <UnlockList />
            <div className="kyd-actions">
              <Button intent="primary" fullWidth leadingIcon={<Upload size={14} variant="stroke" />} onClick={openUpload}>
                Upload medical licence
              </Button>
              <Button intent="ghost" fullWidth onClick={goOrder}>
                View lab catalog
              </Button>
            </div>
          </Screen>
        )}
      </div>
    </section>
  );
}

/* Shared card body: status pill row, icon disc, h1 (focus target), body, slot. */
function Screen({
  headingRef,
  pill,
  icon,
  headline,
  body,
  children,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  pill?: ReactNode;
  icon: ReactNode;
  headline: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <>
      {pill && <div className="kyd-card__status">{pill}</div>}
      <span aria-hidden className="kyd-card__icon">
        {icon}
      </span>
      <h1 id="kyd-heading" className="kyd-card__headline" ref={headingRef} tabIndex={-1}>
        {headline}
      </h1>
      <p className="kyd-card__body">{body}</p>
      {children}
    </>
  );
}
