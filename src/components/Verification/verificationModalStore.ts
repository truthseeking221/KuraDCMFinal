"use client";

import { useSyncExternalStore } from "react";

/*
 * KYD verification is presented as a modal over the clinic shell — not a separate
 * page. This tiny in-memory store lets any surface (order gate, Home banner,
 * Settings, account menu) open the same modal, with a single <VerificationModal>
 * mounted at the app root reading it. Open-state is intentionally NOT persisted
 * (unlike the KYD record itself) — a modal should never survive a reload.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openVerification() {
  if (open) return;
  open = true;
  emit();
}

export function closeVerification() {
  if (!open) return;
  open = false;
  emit();
}

export function useVerificationModalOpen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => open,
    () => false, // server snapshot — closed during SSR
  );
}
