"use client";

/* ReferEarnView — Doctor-ACQUISITION referral ("Refer & earn").
   ---------------------------------------------------------------------------
   Implements the mastersource doctor-acquisition referral scheme, NOT clinical
   patient origination. Sections cited:
     §26.2 — reward design: $20 total per referred doctor = $5 when the referred
             doctor connects an ABA Account on File + $15 when their FIRST
             booking reaches paid-plus-served. Rewards are claimable ONLY by
             enrolling your own ABA account — the strategic point is pulling
             doctors onto the Doctor Banking rail (we say this plainly).
     §21   — doctor share only exists from authenticated, doctor-originated
             booking. The $15 milestone fires only on the referred doctor's
             OWN authenticated first booking; reception/walk-ins never count.
     §22   — paid-plus-served: the $15 milestone freezes only when the line is
             both paid AND the service performed. Paid-not-served = pending.
     §25   — Doctor Banking: ABA Account on File via QR / ABA Mobile + PIN. The
             claim gate (you can't withdraw without your own ABA connected) and
             the mock connect flow (drawer + staged steps + toast) live here.
     §26 / §38.3 — the two meanings of "referral" are different businesses; we
             carry an explicit disambiguation note near the top so growth and
             clinical referral are never conflated.

   Self-contained prototype: local fixtures, local state, no backend. Money is
   displayed as explicit strings; no floating-point arithmetic on currency. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Banner, Button, Drawer } from "@/components/ui";
import {
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Cash as CashIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  CheckShield as ShieldIcon,
  Clock as ClockIcon,
  CreditCard as CardIcon,
  Info as InfoIcon,
  Share as ShareIcon,
  User as UserIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./ReferEarnView.css";

/* ---- domain model ------------------------------------------------------- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";

/* The per-doctor reward state machine. Order is load-bearing: each later stage
   implies every earlier one is satisfied. §26.2 milestones map onto two of the
   transitions (aba_connected → +$5, served → +$15). */
type Stage = "invited" | "joined" | "aba_connected" | "served" | "paid_out";

const STAGE_ORDER: Stage[] = ["invited", "joined", "aba_connected", "served", "paid_out"];

/* Dollar amounts as integer minor units (cents) so totals never touch floats. */
const ABA_REWARD_CENTS = 500; // $5  — referred doctor connects ABA (§26.2)
const SERVED_REWARD_CENTS = 1500; // $15 — first booking paid-plus-served (§26.2)
const TOTAL_PER_DOCTOR_CENTS = ABA_REWARD_CENTS + SERVED_REWARD_CENTS; // $20

type Referral = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  stage: Stage;
  invitedOn: string;
  /* cents already settled or queued for settlement; stage still tracks progress */
  paidOutCents?: number;
  /* short human line describing where this doctor is, in their words */
  stageNote: string;
};

/* Info tone uses a forward-progress glyph so doctor acquisition is not confused
   with clinical referral. */
const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: ArrowRightIcon,
  success: CheckCircleIcon,
  neutral: UserIcon,
};

const STAGE_META: Record<Stage, { label: string; tone: Tone }> = {
  invited: {
    label: "Invited",
    tone: "neutral",
  },
  joined: {
    label: "Joined",
    tone: "info",
  },
  aba_connected: {
    label: "ABA connected",
    tone: "info",
  },
  served: {
    label: "Ready to claim",
    tone: "success",
  },
  paid_out: {
    label: "Paid out",
    tone: "success",
  },
};

/* earned-so-far for a stage, in cents. Pure function of the stage. */
function earnedCents(stage: Stage): number {
  const i = STAGE_ORDER.indexOf(stage);
  let total = 0;
  if (i >= STAGE_ORDER.indexOf("aba_connected")) total += ABA_REWARD_CENTS;
  if (i >= STAGE_ORDER.indexOf("served")) total += SERVED_REWARD_CENTS;
  return total;
}

function paidOutCentsFor(referral: Referral): number {
  const earned = earnedCents(referral.stage);
  if (referral.stage === "paid_out") return earned;
  return Math.min(referral.paidOutCents ?? 0, earned);
}

function usd(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100);
  return `$${whole}.${frac.toString().padStart(2, "0")}`;
}

/* ---- fixtures ----------------------------------------------------------- */

const ME = {
  name: "Dr. Phong Tuy",
  code: "PHONG-7K2",
  link: "https://kura.med/r/PHONG-7K2",
};

const SEED_REFERRALS: Referral[] = [
  {
    id: "vanna",
    name: "Dr. Vanna Sok",
    initials: "VS",
    specialty: "Cardiology · Phnom Penh",
    stage: "paid_out",
    invitedOn: "Mar 4, 2026",
    stageNote: "$20 settled to your ABA.",
  },
  {
    id: "sreypov",
    name: "Dr. Sreypov Chea",
    initials: "SC",
    specialty: "Pediatrics · Siem Reap",
    stage: "served",
    invitedOn: "Apr 18, 2026",
    stageNote: "$20 earned. Pays at the next settlement.",
  },
  {
    id: "rithy",
    name: "Dr. Rithy Meas",
    initials: "RM",
    specialty: "Endocrinology · Phnom Penh",
    stage: "aba_connected",
    invitedOn: "May 2, 2026",
    stageNote: "$5 earned. $15 unlocks after the first paid and served booking.",
  },
  {
    id: "channary",
    name: "Dr. Channary Pich",
    initials: "CP",
    specialty: "Internal medicine · Battambang",
    stage: "joined",
    invitedOn: "May 28, 2026",
    stageNote: "Joined Jun 1. ABA not connected yet.",
  },
  {
    id: "borey",
    name: "Dr. Borey Nuon",
    initials: "BN",
    specialty: "Nephrology · Phnom Penh",
    stage: "invited",
    invitedOn: "Jun 14, 2026",
    stageNote: "Invite sent Jun 14.",
  },
];

/* ---- ABA connect flow (mock, §25) --------------------------------------- */

type AbaStep = "scan" | "confirm" | "done";

const ABA_STEPS: { id: AbaStep; label: string }[] = [
  { id: "scan", label: "Scan" },
  { id: "confirm", label: "Confirm" },
];

/* ---- component ---------------------------------------------------------- */

export function ReferEarnView() {
  /* Stateful so invites can land (lift-state) and the empty state is reachable
     via the demo control below — neither was true before. */
  const [referrals, setReferrals] = useState<Referral[]>(SEED_REFERRALS);

  /* YOUR own ABA enrolment (§25, §26.2). Starts disconnected so the connect
     flow is demonstrable. */
  const [abaConnected, setAbaConnected] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  /* Withdraw is an async round-trip (settlement queue). `claiming` drives the
     button spinner; `claimed` is the terminal state once funds are queued. */
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  /* Monotonic id source for invites — deterministic, never Date.now/random. */
  const [inviteSeq, setInviteSeq] = useState(0);

  /* Derived payout totals across the pipeline, in cents (§22, §24 cadence).
     "unlocked" (Ready to claim) counts every FROZEN milestone that hasn't yet
     settled — the $5 ABA-connect bonus is independently claimable (§22/§23),
     so a paid-not-served doctor contributes their $5 here while the locked $15
     sits in "pending". "paid" is what has already settled to ABA. */
  const totals = useMemo(() => {
    let unlocked = 0; // earned & frozen, awaiting settlement (not yet paid_out)
    let paid = 0; // already settled to ABA
    let pending = 0; // milestones not yet reached (still locked)
    let lifetime = 0; // everything earned so far across all states

    for (const r of referrals) {
      const earned = earnedCents(r.stage);
      const paidForReferral = paidOutCentsFor(r);
      lifetime += earned;
      paid += paidForReferral;
      unlocked += earned - paidForReferral;
      pending += TOTAL_PER_DOCTOR_CENTS - earned;
    }
    return { unlocked, paid, pending, lifetime };
  }, [referrals]);

  const activeCount = referrals.filter((r) => r.stage !== "paid_out").length;
  const withdrawable = totals.unlocked;
  const claimLabel = abaConnected
    ? withdrawable === 0
      ? "Claim queued"
      : `Claim ${usd(withdrawable)}`
    : withdrawable > 0
      ? `Connect ABA to claim ${usd(withdrawable)}`
      : "Connect ABA to claim";
  const claimDisabled = claimed || (abaConnected && withdrawable === 0);
  const claimIsPrimary = withdrawable > 0;
  const showClaimAction = withdrawable > 0 || claimed;

  const copyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(ME.link);
      }
      toast.success("Invite link copied", {
        description: ME.link,
      });
    } catch {
      toast.success("Invite link ready", { description: ME.link });
    }
  };

  /* Lift invite creation here so a named invite is a real SUCCESS: a new row
     appears at the top of the pipeline as "Invited", the count + in-progress
     totals increment. Dedupe against names already in the pipeline. Returns
     false when the name is a duplicate so the drawer can flag it. */
  const addInvite = (rawName: string): boolean => {
    const name = rawName.trim();
    if (!name) return false;
    const exists = referrals.some(
      (r) => r.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) return false;
    const seq = inviteSeq + 1;
    setInviteSeq(seq);
    const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
    const initials =
      (parts[0]?.[0] ?? name[0] ?? "?").toUpperCase() +
      (parts[1]?.[0] ?? "").toUpperCase();
    const fresh: Referral = {
      id: `invite-${seq}`,
      name,
      initials,
      specialty: "Pending profile",
      stage: "invited",
      invitedOn: "Just now",
      stageNote: "Invite just sent.",
    };
    setReferrals((list) => [fresh, ...list]);
    return true;
  };

  const onAbaConnected = (masked: string) => {
    setAbaConnected(true);
    setConnectOpen(false);
    toast.success("ABA account connected", {
      description: `${masked} is now your payout account on file.`,
    });
  };

  /* Settle only earned milestones. A doctor can have the $5 ABA reward paid
     while the $15 first-booking reward remains locked, so paid cents are stored
     separately from the progress stage. Reversible via the Undo toast action. */
  const settleClaim = () => {
    const before = referrals;
    setReferrals((list) =>
      list.map((r) => {
        const earned = earnedCents(r.stage);
        const paidForReferral = paidOutCentsFor(r);
        if (earned <= paidForReferral) return r;

        const nextPaid = earned;
        const fullyEarned = nextPaid === TOTAL_PER_DOCTOR_CENTS;
        return {
          ...r,
          paidOutCents: nextPaid,
          stage: fullyEarned ? "paid_out" : r.stage,
          stageNote: fullyEarned
            ? `${usd(TOTAL_PER_DOCTOR_CENTS)} queued for Jul 1 settlement.`
            : `${usd(nextPaid)} queued for Jul 1. ${usd(TOTAL_PER_DOCTOR_CENTS - nextPaid)} still locked.`,
        };
      }),
    );
    setClaimed(true);
    toast.success("Claim queued for settlement", {
      description: "Pays out to your ABA account on the next settlement, Jul 1.",
      action: {
        label: "Undo",
        onClick: () => {
          setReferrals(before);
          setClaimed(false);
        },
      },
    });
  };

  const withdraw = () => {
    if (!abaConnected) {
      setConnectOpen(true);
      return;
    }
    /* Guard the empty / already-claimed cases so no "$0.00 queued" toast can
       fire — the hero and the payout-section claim button agree on this. */
    if (withdrawable === 0 || claiming || claimed) return;
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      settleClaim();
    }, 900);
  };

  return (
    <div className="refer" aria-label="Refer and earn">
      <section className="refer-hero" aria-label="Your referral earnings">
        <div className="refer-hero-lede">
          <p className="refer-eyebrow">Earned</p>
          <h2 className="refer-hero-amount">{usd(totals.lifetime)}</h2>
          <p className="refer-hero-sub">
            $5 when a doctor connects ABA. $15 after their first paid and served booking. Only that doctor&apos;s paid, served bookings count.
            Walk-ins and undrawn bookings do not.
          </p>
          <dl className="refer-hero-stats" aria-label="Referral payout status">
            <div className="refer-hero-stat">
              <dt>Ready to claim</dt>
              <dd>
                {usd(totals.unlocked)}
                <small>{claimed ? "Queued" : abaConnected ? "Next settlement" : "ABA required"}</small>
              </dd>
            </div>
            <div className="refer-hero-stat">
              <dt>Claimed</dt>
              <dd>
                {usd(totals.paid)}
                <small>Paid or queued</small>
              </dd>
            </div>
            <div className="refer-hero-stat">
              <dt>Pending</dt>
              <dd>
                {usd(totals.pending)}
                <small>Still locked</small>
              </dd>
            </div>
          </dl>
        </div>

        <div className="refer-share" aria-label="Your invite link">
          <div className="refer-qr" aria-hidden>
            <QrMock />
          </div>
          <div className="refer-share-body">
            <span className="refer-share-label">Your invite link</span>
            <code className="refer-share-link">{ME.link}</code>
            <span className="refer-share-meta">
              Referral code <strong>{ME.code}</strong>
            </span>
            <div className="refer-share-buttons">
              <Button intent="secondary" size="sm" leadingIcon={<ShareIcon size={14} variant="stroke" />} onClick={copyLink}>
                Copy link
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="refer-section" aria-label="Referred doctors">
        <div className="refer-section-toolbar">
          <div className="refer-section-head">
            <h3>Referred doctors</h3>
            <Badge appearance="subtle" tone="neutral" className="refer-count">
              {referrals.length}
            </Badge>
            <span className="refer-section-hint">{activeCount} active</span>
          </div>
          <div className="refer-section-actions">
            {showClaimAction ? (
              <Button
                intent={claimIsPrimary ? "primary" : "outline"}
                size="sm"
                leadingIcon={<CashIcon size={14} variant="stroke" />}
                loading={claiming}
                disabled={claimDisabled}
                onClick={withdraw}
              >
                {claimLabel}
              </Button>
            ) : null}
            <Button
              intent="secondary"
              size="sm"
              leadingIcon={<ShareIcon size={14} variant="stroke" />}
              onClick={() => setInviteOpen(true)}
            >
              Invite a doctor
            </Button>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="refer-empty">
            <span aria-hidden className="refer-empty-ic">
              <UserIcon size={22} variant="stroke" />
            </span>
            <p className="refer-empty-line">
              No doctors referred yet — share your link to start earning.
            </p>
            <Button
              intent="primary"
              size="sm"
              leadingIcon={<ShareIcon size={14} variant="stroke" />}
              onClick={() => setInviteOpen(true)}
            >
              Invite a doctor
            </Button>
          </div>
        ) : (
          <ul className="refer-pipeline">
            {referrals.map((r) => (
              <PipelineRow key={r.id} referral={r} />
            ))}
          </ul>
        )}
      </section>

      <InviteDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCopy={copyLink}
        onInvite={addInvite}
      />
      <AbaConnectDrawer
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={onAbaConnected}
      />
    </div>
  );
}

/* ---- pipeline row ------------------------------------------------------- */

function PipelineRow({ referral }: { referral: Referral }) {
  const meta = STAGE_META[referral.stage];
  const StageIcon = TONE_ICON[meta.tone];
  const earned = earnedCents(referral.stage);
  const paidForReferral = paidOutCentsFor(referral);
  const rowNote =
    paidForReferral > 0 && referral.stage !== "paid_out" && paidForReferral < TOTAL_PER_DOCTOR_CENTS
      ? `${usd(paidForReferral)} queued for Jul 1. ${usd(TOTAL_PER_DOCTOR_CENTS - paidForReferral)} still locked.`
      : referral.stageNote;

  return (
    <li className={cx("refer-row", `tone-${meta.tone}`)}>
      <span className="refer-row-doctor">
        <Avatar initials={referral.initials} name={referral.name} size="sm" />
        <span className="refer-row-id">
          <strong>{referral.name}</strong>
          <small>{referral.specialty}</small>
        </span>
      </span>

      <span className="refer-row-status">
        <Badge appearance="subtle" tone={meta.tone} icon={<StageIcon size={12} variant="stroke" />}>
          {meta.label}
        </Badge>
        <span className="refer-row-next">
          <small className="refer-row-note">{rowNote}</small>
        </span>
      </span>

      <span className="refer-row-earned">
        <strong>{usd(earned)}</strong>
        <small>of {usd(TOTAL_PER_DOCTOR_CENTS)}</small>
      </span>
    </li>
  );
}

/* ---- invite drawer ------------------------------------------------------ */

function InviteDrawer({
  open,
  onClose,
  onCopy,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onCopy: () => void;
  /* Returns false when the name duplicates a doctor already in the pipeline. */
  onInvite: (name: string) => boolean;
}) {
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = () => {
    const name = draft.trim();
    if (!name) {
      setError("Enter the doctor's name first.");
      return;
    }
    /* Local dedupe (this drawer's sent list) — case-insensitive. */
    if (sentTo.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setError(null);
      toast.info(`Already invited ${name}`);
      return;
    }
    /* Pipeline dedupe lives in the parent; a false return means a clash. */
    const added = onInvite(name);
    if (!added) {
      setError(null);
      toast.info(`${name} is already in your pipeline`);
      return;
    }
    setSentTo((list) => [name, ...list]);
    setDraft("");
    setError(null);
    toast.success(`Invite sent to ${name}`, {
      description: "Added to your pipeline as “Invited”.",
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite a doctor"
      subtitle="Share your link, or send a named invite"
    >
      <div className="refer-drawer">
        <div className="refer-drawer-qr" aria-hidden>
          <QrMock />
        </div>

        <div className="refer-field">
          <label className="refer-field-label" htmlFor="refer-link">
            Your invite link
          </label>
          <div className="refer-field-row">
            <input id="refer-link" className="refer-input" readOnly value={ME.link} />
            <Button intent="secondary" size="sm" onClick={onCopy}>
              Copy
            </Button>
          </div>
          <p className="refer-field-hint">Anyone who joins through this link is attributed to you.</p>
        </div>

        <div className="refer-divider" />

        <div className="refer-field">
          <label className="refer-field-label" htmlFor="refer-name">
            Send a named invite
          </label>
          <div className="refer-field-row">
            <input
              id="refer-name"
              className="refer-input"
              placeholder="Dr. full name"
              value={draft}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <Button intent="primary" size="sm" disabled={!draft.trim()} onClick={send}>
              Send
            </Button>
          </div>
          {error && (
            <p className="refer-field-error">
              <WarningIcon size={13} variant="stroke" aria-hidden />
              {error}
            </p>
          )}
        </div>

        {sentTo.length > 0 && (
          <ul className="refer-sent">
            {sentTo.map((name) => (
              <li key={name.toLowerCase()}>
                <CheckCircleIcon size={14} variant="stroke" aria-hidden />
                <span>{name}</span>
                <small>Invited just now</small>
              </li>
            ))}
          </ul>
        )}

        <Banner tone="info" icon={<InfoIcon size={16} variant="stroke" />}>
          Rewards only ever apply to other doctors joining Kura — not to patients you send for
          lab tests.
        </Banner>
      </div>
    </Drawer>
  );
}

/* ---- ABA connect drawer (mock §25) -------------------------------------- */

function AbaConnectDrawer({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (masked: string) => void;
}) {
  const [step, setStep] = useState<AbaStep>("scan");
  /* The approval round-trip: clicking "I confirmed" doesn't flip instantly —
     it pends while ABA Mobile approves, then resolves to "done" (§25). */
  const [pending, setPending] = useState(false);
  const masked = "ABA ···· 4102";

  const close = () => {
    if (pending) return; // don't abandon mid-approval
    onClose();
    /* reset for next open, after the drawer is gone */
    setTimeout(() => {
      setStep("scan");
      setPending(false);
    }, 200);
  };

  const confirmConnection = () => {
    if (pending) return;
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setStep("done");
      onConnected(masked);
    }, 1100);
  };

  const stepIndex = ABA_STEPS.findIndex((s) => s.id === step);

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Connect your ABA account"
      subtitle="Kura pays everything you earn into this one account."
      footer={
        step === "confirm" ? (
          <div className="refer-drawer-footer">
            <Button
              intent="ghost"
              size="md"
              leadingIcon={<ArrowLeftIcon size={16} variant="stroke" />}
              disabled={pending}
              onClick={() => setStep("scan")}
            >
              Back
            </Button>
            <Button
              intent="primary"
              size="md"
              fullWidth
              loading={pending}
              onClick={confirmConnection}
            >
              {pending ? "Waiting for ABA…" : "I confirmed in ABA Mobile"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="refer-drawer">
        {/* mini stepper — hidden on the terminal "done" screen */}
        {step !== "done" && (
          <ol className="refer-aba-steps" aria-label="ABA connection steps">
            {ABA_STEPS.map((s, i) => {
              const state =
                i < stepIndex ? "done" : i === stepIndex ? "current" : "pending";
              return (
                <li key={s.id} className={cx("refer-aba-step", `is-${state}`)}>
                  <span className="refer-aba-step-dot">
                    {state === "done" ? <CheckIcon size={12} variant="stroke" /> : i + 1}
                  </span>
                  <span className="refer-aba-step-label">{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {step === "scan" && (
          <>
            <p className="refer-aba-lede">
              Scan this with ABA Mobile to set the account Kura pays you into. Connect once and every
              payout uses it.
            </p>
            <div className="refer-aba-qr" aria-hidden>
              <QrMock large />
            </div>
            <ul className="refer-aba-points">
              <li>
                <ShieldIcon size={15} variant="stroke" aria-hidden /> Approved in ABA Mobile with your
                PIN. Kura never sees it.
              </li>
              <li>
                <CardIcon size={15} variant="stroke" aria-hidden /> Kura stores only a masked number and
                a payment token, never full details.
              </li>
            </ul>
            <div className="refer-drawer-footer">
              <Button
                intent="primary"
                size="md"
                fullWidth
                trailingIcon={<ArrowRightIcon size={16} variant="stroke" />}
                onClick={() => setStep("confirm")}
              >
                I&apos;ve opened ABA Mobile
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="refer-aba-confirm">
              <span className="refer-aba-confirm-ic" aria-hidden>
                <ClockIcon size={20} variant="stroke" />
              </span>
              <p>
                {pending ? (
                  <>
                    Waiting for ABA Mobile to approve the connection. Keep this open —{" "}
                    <strong>{masked}</strong> will be on file in a moment.
                  </>
                ) : (
                  <>
                    Confirm the connection in ABA Mobile with your banking PIN. Once you approve,{" "}
                    <strong>{masked}</strong> becomes your payout account on file.
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="refer-aba-done">
            <span className="refer-aba-done-ic" aria-hidden>
              <CheckCircleIcon size={24} variant="stroke" />
            </span>
            <strong>Account connected</strong>
            <span>{masked} is now on file. You can close this.</span>
            <Button intent="primary" size="md" fullWidth onClick={close}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ---- small visuals ------------------------------------------------------ */

/* A deterministic QR-looking mark — purely decorative (no real payload). A
   fixed 7x7 bit pattern keeps it stable across renders (no Math.random). */
const QR_BITS = [
  "1111111",
  "1000101",
  "1011101",
  "1010001",
  "1110111",
  "1000010",
  "1101111",
];

function QrMock({ large = false }: { large?: boolean }) {
  return (
    <span className={cx("refer-qrmark", large && "refer-qrmark--lg")}>
      {QR_BITS.map((row, y) =>
        row.split("").map((bit, x) => (
          <span
            key={`${y}-${x}`}
            className={cx("refer-qrcell", bit === "1" && "refer-qrcell--on")}
          />
        )),
      )}
    </span>
  );
}

export default ReferEarnView;
