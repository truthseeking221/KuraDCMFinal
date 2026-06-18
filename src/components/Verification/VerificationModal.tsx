"use client";

import { useEffect } from "react";
import { Close } from "@/icons";
import { VerificationGate } from "./VerificationGate";
import { closeVerification, useVerificationModalOpen } from "./verificationModalStore";
import "./VerificationGate.css";

/*
 * The KYD verification flow as a modal over the clinic shell. Opened from any
 * entry point via openVerification(); mounted once at the app root. The gate
 * itself resolves which state to show; this only frames it (backdrop, close,
 * scroll lock, Escape).
 */
export function VerificationModal() {
  const open = useVerificationModalOpen();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeVerification();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="kyd-modal-backdrop" role="presentation" onClick={closeVerification}>
      <div className="kyd-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="kyd-modal__close" aria-label="Close verification" onClick={closeVerification}>
          <Close size={18} variant="stroke" />
        </button>
        <VerificationGate inModal onClose={closeVerification} />
      </div>
    </div>
  );
}
