"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Booking as BookingIcon,
  Catalog as CatalogIcon,
  CheckShield as ClaimIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Receipt as ReceiptIcon,
  Share as ShareIcon,
  Tube as TubeIcon,
} from "@/icons";
import type { IconProps } from "@/icons/components/types";
import { cx } from "@/lib/cx";
import { seedDemoPatientActivity, usePatientActivity } from "@/components/OrderDraft/patientActivity";
import type { ActivityEntry, ActivityType } from "@/components/OrderDraft/patientActivity";
import { Counter } from "@/components/ui/Counter";
import "./PatientActivityTab.css";

type Tone = "brand" | "success" | "warning" | "info" | "neutral";

const TYPE_META: Record<
  ActivityType,
  { label: string; noun: string; nounPlural: string; tone: Tone; Icon: (p: IconProps) => React.ReactElement }
> = {
  order: { label: "Orders", noun: "order", nounPlural: "orders", tone: "brand", Icon: FlaskIcon },
  tube: { label: "Tubes", noun: "tube", nounPlural: "tubes", tone: "brand", Icon: TubeIcon },
  payment: { label: "Payments", noun: "payment", nounPlural: "payments", tone: "success", Icon: ReceiptIcon },
  booking: { label: "Bookings", noun: "booking", nounPlural: "bookings", tone: "brand", Icon: BookingIcon },
  note: { label: "Notes", noun: "note", nounPlural: "notes", tone: "neutral", Icon: NoteIcon },
  rx: { label: "Rx", noun: "Rx", nounPlural: "Rx", tone: "info", Icon: PillIcon },
  referral: { label: "Referrals", noun: "referral", nounPlural: "referrals", tone: "info", Icon: ShareIcon },
  followup: { label: "Follow-ups", noun: "follow-up", nounPlural: "follow-ups", tone: "warning", Icon: ClockIcon },
  icd: { label: "Diagnoses", noun: "diagnosis", nounPlural: "diagnoses", tone: "neutral", Icon: CatalogIcon },
  claim: { label: "Claims", noun: "claim", nounPlural: "claims", tone: "success", Icon: ClaimIcon },
  identity: { label: "Identity", noun: "identity update", nounPlural: "identity updates", tone: "neutral", Icon: PatientIcon },
  careplan: { label: "Care plan", noun: "care plan", nounPlural: "care plans", tone: "brand", Icon: HeartIcon },
  result: { label: "Results", noun: "result", nounPlural: "results", tone: "warning", Icon: FlaskIcon },
};

/* Lens chips, in a stable display order — only the kinds present this session
   are offered, so the filter never lists empty buckets. */
const TYPE_ORDER: ActivityType[] = [
  "order", "tube", "payment", "booking", "result", "note", "rx", "referral", "followup", "icd", "claim", "careplan", "identity",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(at: number): string {
  const dt = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(dt, today)) return "Today";
  if (sameDay(dt, yesterday)) return "Yesterday";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: dt.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function relTime(at: number): string {
  const diff = Date.now() - at;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function PatientActivityTab({ patientId }: { patientId: string }) {
  const entries = usePatientActivity(patientId);
  const [activeType, setActiveType] = useState<ActivityType | "all">("all");

  /* demo chart arrives with a believable history (client-only, idempotent) */
  useEffect(() => {
    seedDemoPatientActivity(patientId);
  }, [patientId]);

  /* which lens chips to show — only types that actually occurred */
  const presentTypes = useMemo(() => {
    const set = new Set(entries.map((e) => e.type));
    return TYPE_ORDER.filter((t) => set.has(t));
  }, [entries]);

  const typeCounts = useMemo(() => {
    const counts = new Map<ActivityType, number>();
    entries.forEach((entry) => {
      counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
    });
    return counts;
  }, [entries]);

  const filtered = useMemo(
    () => (activeType === "all" ? entries : entries.filter((e) => e.type === activeType)),
    [entries, activeType],
  );

  /* group newest-first into day buckets, preserving order */
  const groups = useMemo(() => {
    const out: Array<{ day: string; items: ActivityEntry[] }> = [];
    for (const entry of filtered) {
      const day = dayLabel(entry.at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(entry);
      else out.push({ day, items: [entry] });
    }
    return out;
  }, [filtered]);

  if (entries.length === 0) {
    return (
      <div className="pact-empty">
        <strong>No activity yet</strong>
        <span>New chart activity will appear here.</span>
      </div>
    );
  }

  return (
    <section className="pact" aria-label="Patient activity">
      <div className="pact-filter-bar">
        <div className="pact-filters" role="tablist" aria-label="Filter activity">
          <button
            type="button"
            role="tab"
            aria-selected={activeType === "all"}
            className={cx("pact-chip", activeType === "all" && "is-active")}
            onClick={() => setActiveType("all")}
          >
            All <Counter className="pact-chip-count" count={entries.length} tone={activeType === "all" ? "brand" : "neutral"} />
          </button>
          {presentTypes.map((type) => {
            const active = activeType === type;
            const count = typeCounts.get(type) ?? 0;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                className={cx("pact-chip", active && "is-active")}
                onClick={() => setActiveType(type)}
              >
                {TYPE_META[type].label} <Counter className="pact-chip-count" count={count} tone={active ? "brand" : "neutral"} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="pact-timeline">
        {groups.map((group) => (
          <div className="pact-day" key={group.day}>
            <div className="pact-day-head">{group.day}</div>
            <ol className="pact-list">
              {group.items.map((entry) => {
                const meta = TYPE_META[entry.type];
                const Icon = meta.Icon;
                return (
                  <li className={cx("pact-row", `tone-${meta.tone}`)} key={entry.id}>
                    <span aria-hidden className="pact-node">
                      <Icon size={14} variant="stroke" />
                    </span>
                    <div className="pact-body">
                      <div className="pact-line">
                        <strong>{entry.title}</strong>
                        <span className="pact-time">{relTime(entry.at)}</span>
                      </div>
                      {(entry.detail || entry.actor) && (
                        <p className="pact-meta">
                          {entry.detail}
                          {entry.detail && entry.actor ? " · " : ""}
                          {entry.actor && <span className="pact-actor">{entry.actor}</span>}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
