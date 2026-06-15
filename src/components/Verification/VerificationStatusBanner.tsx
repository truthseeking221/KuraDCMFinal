"use client";

import { useRouter } from "next/navigation";
import { Banner, Button } from "@/components/ui";
import type { BannerTone } from "@/components/ui";
import { VERIFICATION_HREF, useKyd, type KydStatus } from "./kydStatus";

/*
 * Persistent context for an unapproved doctor inside the clinic shell. Renders
 * nothing once verified (or while status is loading / a runtime error is up —
 * the shell shouldn't nag on a transient error). Every variant routes to the
 * single /verification surface.
 */
const COPY: Record<
  Exclude<KydStatus, "approved">,
  { tone: BannerTone; title: string; body: string; cta: string }
> = {
  not_started: {
    tone: "info",
    title: "Verify your medical licence to create lab orders",
    body: "Kura needs to verify your licence before you can place real lab orders.",
    cta: "Verify licence",
  },
  under_review: {
    tone: "info",
    title: "Your medical licence is under review",
    body: "Lab orders unlock as soon as your licence is verified — usually within 24 hours.",
    cta: "View status",
  },
  needs_resubmission: {
    tone: "warning",
    title: "We could not verify your medical licence",
    body: "Upload a clearer or updated licence to continue creating lab orders.",
    cta: "Fix verification",
  },
  expired: {
    tone: "warning",
    title: "Your medical licence has expired",
    body: "Upload an updated licence to keep creating lab orders.",
    cta: "Update licence",
  },
};

export function VerificationStatusBanner() {
  const router = useRouter();
  const { status, runtime, loading } = useKyd();

  // Don't nag while loading, when verified, or on a transient runtime error.
  if (loading || runtime !== "ok") return null;
  if (status === "approved") return null;
  const copy = COPY[status];

  return (
    <Banner
      tone={copy.tone}
      title={copy.title}
      actions={
        <Button intent="outline" size="sm" onClick={() => router.push(VERIFICATION_HREF)}>
          {copy.cta}
        </Button>
      }
    >
      {copy.body}
    </Banner>
  );
}
