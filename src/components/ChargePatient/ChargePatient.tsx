"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Chip, Drawer, Input, SegmentedToggle, Textarea } from "@/components/ui";
import { DOCTOR_COMMISSION_RATE } from "@/components/OrderDraft/ledger";
import {
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Plus as PlusIcon,
  Share as ShareIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import "./ChargePatient.css";

/* Send payment link — a standalone "charge the patient" flow.
   It reuses the order-draft money model (Kura takes DOCTOR_COMMISSION_RATE) and
   the results-loop status grammar (one state, one action per state). The doctor
   sets a fee and sees what they net BEFORE sending — the whole point of the
   feature is clarity of money + status, not the link itself.

   Frontend prototype: the gateway is mocked. Send advances sent → viewed → paid
   on timers, the same way the app mocks lab results coming back. No real money
   moves — collecting card details happens off-app on the payment link. */

type Currency = "USD" | "VND";
export type ChargeReason = "Consultation" | "Follow-up" | "Care plan" | "Other";
type Reason = ChargeReason;
type Phase = "config" | "sent" | "viewed" | "paid";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "VND", label: "VND" },
];
const REASONS: Reason[] = ["Consultation", "Follow-up", "Care plan", "Other"];
const STEP: Record<Currency, number> = { USD: 5, VND: 50000 };
const SYMBOL: Record<Currency, string> = { USD: "$", VND: "₫" };
const MOCK_LINK = "kura.med/pay/9F3K2A";

function money(value: number, ccy: Currency): string {
  const v = Math.max(0, value);
  return ccy === "VND" ? `₫${Math.round(v).toLocaleString("en-US")}` : `$${v.toFixed(2)}`;
}

function roundFor(value: number, ccy: Currency): number {
  return ccy === "VND" ? Math.round(value) : Math.round(value * 100) / 100;
}

export function ChargePatientDrawer({
  open,
  onClose,
  patientName = "this patient",
  initialReason = "Consultation",
}: {
  open: boolean;
  onClose: () => void;
  patientName?: string;
  /* The charge is born from a billable event (visit close, follow-up, care
     plan), so the launcher seeds what it is being charged for. */
  initialReason?: Reason;
}) {
  const [phase, setPhase] = useState<Phase>("config");
  const [reasonOverride, setReasonOverride] = useState<Reason | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);
  const reason = reasonOverride ?? initialReason;

  const reset = () => {
    clearTimers();
    setPhase("config");
    setReasonOverride(null);
    setCurrency("USD");
    setAmount(0);
    setNoteOpen(false);
    setNote("");
    setCopied(false);
  };

  const close = () => {
    onClose();
    window.setTimeout(reset, 220); // reset after the drawer animates out
  };

  const kuraFee = roundFor(amount * DOCTOR_COMMISSION_RATE, currency);
  const youReceive = roundFor(amount - kuraFee, currency);
  const docPct = amount > 0 ? Math.max(3, Math.min(100, Math.round((youReceive / amount) * 100))) : 85;

  /* Mock the gateway: the link advances on its own so the doctor sees the loop
     close. Same pattern the app uses to fake lab-return. */
  const startWaiting = () => {
    setPhase("sent");
    clearTimers();
    timers.current.push(window.setTimeout(() => setPhase("viewed"), 2200));
    timers.current.push(window.setTimeout(() => setPhase("paid"), 4800));
  };
  const send = () => {
    if (amount > 0) startWaiting();
  };
  const cancelLink = () => {
    clearTimers();
    setPhase("config");
  };
  const copyLink = () => {
    try {
      navigator.clipboard?.writeText(`https://${MOCK_LINK}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — non-fatal in the prototype */
    }
  };

  const waiting = phase === "sent" || phase === "viewed";
  const subtitle =
    phase === "paid" ? "Payment received" : waiting ? "Waiting for payment" : patientName;

  const footer =
    phase === "config" ? (
      <div className="cpay-foot">
        <div className="cpay-readback">
          <span>Patient pays</span>
          <strong>{amount > 0 ? money(amount, currency) : "—"}</strong>
        </div>
        <Button
          intent="primary"
          disabled={amount <= 0}
          leadingIcon={<ShareIcon size={15} variant="stroke" />}
          onClick={send}
        >
          Send payment link
        </Button>
      </div>
    ) : waiting ? (
      <div className="cpay-foot is-row">
        <Button intent="secondary" onClick={cancelLink}>
          Cancel link
        </Button>
        <Button intent="secondary" onClick={startWaiting}>
          Resend
        </Button>
      </div>
    ) : (
      <div className="cpay-foot">
        <Button intent="primary" onClick={close}>
          Done
        </Button>
      </div>
    );

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Charge patient"
      subtitle={subtitle}
      footer={footer}
      width={460}
      className="cpay-drawer"
    >
      {phase === "config" && (
        <div className="cpay-body">
          <div className="cpay-field">
            <span className="cpay-label">Reason</span>
            <div className="cpay-chips">
              {REASONS.map((r) => (
                <Chip key={r} selected={reason === r} onClick={() => setReasonOverride(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>

          <div className="cpay-field">
            <span className="cpay-label">Currency</span>
            <SegmentedToggle
              aria-label="Currency"
              options={CURRENCIES}
              value={currency}
              onChange={setCurrency}
            />
          </div>

          <Input
            label="Amount"
            helpText="What the patient pays."
            inputMode="decimal"
            type="number"
            min={0}
            step={STEP[currency]}
            trailing={SYMBOL[currency]}
            value={amount > 0 ? String(amount) : ""}
            onChange={(e) => {
              const v = e.currentTarget.value.trim();
              setAmount(v ? Math.max(0, Number.parseFloat(v) || 0) : 0);
            }}
          />

          <ChargeLedger
            amount={amount}
            currency={currency}
            youReceive={youReceive}
            kuraFee={kuraFee}
            docPct={docPct}
          />

          {noteOpen ? (
            <Textarea
              label="Note to patient (optional)"
              rows={2}
              maxLength={140}
              value={note}
              placeholder="e.g. Consultation on 23 Jun"
              onChange={(e) => setNote(e.currentTarget.value)}
            />
          ) : (
            <button type="button" className="cpay-add-note" onClick={() => setNoteOpen(true)}>
              <PlusIcon size={13} variant="stroke" /> Add a note
            </button>
          )}
        </div>
      )}

      {waiting && (
        <div className="cpay-body">
          <div className={cx("cpay-status", phase === "viewed" && "is-viewed")}>
            <ClockIcon size={16} variant="stroke" />
            <span>{phase === "viewed" ? "Patient opened the link" : "Payment link sent"}</span>
          </div>
          <div className="cpay-link">
            <code>{MOCK_LINK}</code>
            <button type="button" className="cpay-copy" onClick={copyLink}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <ChargeSummary reason={reason} amount={amount} currency={currency} youReceive={youReceive} />
          <p className="cpay-hint">The patient pays by card on the link. Status updates here when they do.</p>
        </div>
      )}

      {phase === "paid" && (
        <div className="cpay-body cpay-paid">
          <span className="cpay-paid-ic" aria-hidden>
            <CheckCircleIcon size={22} variant="stroke" />
          </span>
          <strong className="cpay-paid-amt">You received {money(youReceive, currency)}</strong>
          <span className="cpay-paid-sub">
            {patientName} paid {money(amount, currency)} · {reason}
          </span>
          <p className="cpay-hint">
            Added to your earnings. Settles to your connected account on the next cycle.
          </p>
        </div>
      )}
    </Drawer>
  );
}

function ChargeLedger({
  amount,
  currency,
  youReceive,
  kuraFee,
  docPct,
}: {
  amount: number;
  currency: Currency;
  youReceive: number;
  kuraFee: number;
  docPct: number;
}) {
  return (
    <section className="cpay-ledger" aria-label="What you receive">
      <div className="cpay-ledger-head">
        <span>You receive</span>
        <strong>{amount > 0 ? `+${money(youReceive, currency)}` : "—"}</strong>
      </div>
      <div
        className="cpay-ledger-bar"
        role="img"
        aria-label={`${money(youReceive, currency)} to you, ${money(kuraFee, currency)} to Kura`}
      >
        <span className="cpay-seg is-doctor" style={{ width: `${docPct}%` }} />
        <span className="cpay-seg is-kura" style={{ width: `${100 - docPct}%` }} />
      </div>
      <dl className="cpay-ledger-rows">
        <div className="cpay-ledger-row is-total">
          <dt>Patient pays</dt>
          <dd>{money(amount, currency)}</dd>
        </div>
        <div className="cpay-ledger-row is-doctor">
          <dt>
            <span aria-hidden className="cpay-dot is-doctor" />
            You receive
          </dt>
          <dd>+{money(youReceive, currency)}</dd>
        </div>
        <div className="cpay-ledger-row is-kura">
          <dt>
            <span aria-hidden className="cpay-dot is-kura" />
            Kura fee (15%)
          </dt>
          <dd>{money(kuraFee, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ChargeSummary({
  reason,
  amount,
  currency,
  youReceive,
}: {
  reason: Reason;
  amount: number;
  currency: Currency;
  youReceive: number;
}) {
  return (
    <dl className="cpay-summary">
      <div>
        <dt>For</dt>
        <dd>{reason}</dd>
      </div>
      <div>
        <dt>Patient pays</dt>
        <dd>{money(amount, currency)}</dd>
      </div>
      <div>
        <dt>You receive</dt>
        <dd>+{money(youReceive, currency)}</dd>
      </div>
    </dl>
  );
}
