"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Book,
  CheckShield,
  ChevronRight,
  Corporate,
  CreditCard,
  Download,
  Home,
  IDCard,
  Lock,
  Note,
  Setting,
  Upload,
  Users,
} from "@/icons";
import { KYD_STATE_META, VerificationStatusBanner, openVerification, useKyd } from "@/components/Verification";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Drawer } from "../ui/Drawer";
import { Chip } from "../ui/Chip";
import { SegmentedToggle } from "../ui/SegmentedToggle";
import "./SettingsView.css";

/* Settings is a frontend prototype with no backend — every action resolves
   locally: inline edits commit to component state, files run through a real
   picker, exports build a Blob download, and a toast confirms each one. No
   click is left as a no-op. */
type SettingsActions = { notify: (message: string) => void };
const SettingsActionsContext = createContext<SettingsActions | null>(null);
function useSettingsActions(): SettingsActions {
  return useContext(SettingsActionsContext) ?? { notify: () => {} };
}

function downloadTextFile(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Verification status is owned by /verification (the single source of truth).
   These two helpers mirror it here so Settings never contradicts the gate. */
function KydStatusBadge() {
  const { uiState } = useKyd();
  const meta = KYD_STATE_META[uiState];
  const Icon = meta.Icon;
  return (
    <Badge tone={meta.tone} icon={<Icon size={13} variant="stroke" />}>
      {meta.label}
    </Badge>
  );
}

function OpenVerificationButton() {
  return (
    <Button intent="outline" size="sm" onClick={openVerification}>
      Verify license
    </Button>
  );
}

/* =================================================================================
   Kura DCM — Settings
   One canonical surface for low-frequency configuration: identity, cabinet,
   team, money, documents, and security. Internal left rail + dense sections;
   no hero, no decorative dashboard — status rows and one obvious action each.
   Frontend prototype: everything below is mock data except Preferences, which
   persist to localStorage (kura.preferences.v1).
   ================================================================================= */

export type SettingsSectionId =
  | "overview"
  | "account"
  | "cabinet"
  | "members"
  | "preferences"
  | "communications"
  | "billing"
  | "directory"
  | "esign"
  | "security";

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  detail?: string;
  group: string;
  Icon: typeof Home;
}> = [
  {
    id: "overview",
    label: "Overview",
    group: "Workspace",
    Icon: Home,
  },
  {
    id: "account",
    label: "Account & verification",
    group: "Workspace",
    Icon: IDCard,
  },
  {
    id: "cabinet",
    label: "Cabinet",
    group: "Workspace",
    Icon: Corporate,
  },
  {
    id: "members",
    label: "Team access",
    group: "Workspace",
    Icon: Users,
  },
  {
    id: "preferences",
    label: "Preferences",
    group: "Workspace",
    Icon: Setting,
  },
  {
    id: "communications",
    label: "Patient messages",
    group: "Operations",
    Icon: Bell,
  },
  {
    id: "billing",
    label: "Payments",
    group: "Operations",
    Icon: CreditCard,
  },
  {
    id: "directory",
    label: "Directory profile",
    group: "Operations",
    Icon: Book,
  },
  {
    id: "esign",
    label: "Signed documents",
    group: "Trust",
    Icon: Note,
  },
  {
    id: "security",
    label: "Security",
    group: "Trust",
    Icon: Lock,
  },
];

/* ------------------------------- mock data --------------------------------- */

const ME = {
  name: "Dr. Phong Tuy",
  khmerName: "វេជ្ជបណ្ឌិត ភុង ទុយ",
  initials: "PT",
  email: "leon@kura.med",
  license: "CMC 048-2019",
  licenseExpiry: "Jul 20, 2026",
  licenseExpiryIso: "2026-07-20",
  tier: "Verified clinician",
};

const SETTINGS_TODAY_ISO = "2026-06-22";
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(isoDate: string) {
  const today = new Date(`${SETTINGS_TODAY_ISO}T00:00:00+07:00`);
  const target = new Date(`${isoDate}T00:00:00+07:00`);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / DAY_MS));
}

const LICENSE_RENEWAL_DAYS = daysUntil(ME.licenseExpiryIso);
const LICENSE_RENEWAL_TEXT = `${LICENSE_RENEWAL_DAYS} days`;

const CABINET = {
  name: "Kura Cabinet, Toul Kork",
  address: "St. 315, Boeung Kak 2, Toul Kork, Phnom Penh",
  specialty: "Endocrinology · internal medicine",
  clinicType: "Private cabinet",
  country: "Cambodia",
  timezone: "Asia/Phnom_Penh · GMT+7",
  currency: "USD · KHR displayed at NBC rate",
};

const COURIER_ROUTES = [
  { id: "PP-02", label: "Route PP-02", detail: "BKK / Daun Penh" },
  { id: "PP-04", label: "Route PP-04", detail: "Toul Kork loop" },
  { id: "PP-07", label: "Route PP-07", detail: "Sen Sok / airport" },
] as const;

const COURIER_DAYS = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
  { id: "Sat", label: "Sat" },
] as const;

const COURIER_TIMES = ["10:00", "12:00", "14:00", "16:00", "18:00"] as const;

type CourierRouteId = (typeof COURIER_ROUTES)[number]["id"];
type CourierDayId = (typeof COURIER_DAYS)[number]["id"];

type CourierPickup = {
  routeId: CourierRouteId;
  days: CourierDayId[];
  time: (typeof COURIER_TIMES)[number];
};

const DEFAULT_COURIER_PICKUP: CourierPickup = {
  routeId: "PP-04",
  days: ["Mon", "Wed", "Fri"],
  time: "16:00",
};

function formatCourierPickup(pickup: CourierPickup) {
  const route = COURIER_ROUTES.find((option) => option.id === pickup.routeId) ?? COURIER_ROUTES[0];
  return `${route.label} · ${pickup.days.join(" / ")} · ${pickup.time} pickup`;
}

/* Directory display hours — structured per day, not free text. These describe
   what patients see in the directory; they do not drive calendar availability. */
const WEEK_DAYS = [
  { id: "Mon", label: "Monday" },
  { id: "Tue", label: "Tuesday" },
  { id: "Wed", label: "Wednesday" },
  { id: "Thu", label: "Thursday" },
  { id: "Fri", label: "Friday" },
  { id: "Sat", label: "Saturday" },
  { id: "Sun", label: "Sunday" },
] as const;
type WeekDayId = (typeof WEEK_DAYS)[number]["id"];

/* 30-min steps across a clinic day, stored 24h as "HH:MM" */
const HOUR_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

type DayHours = { open: boolean; from: string; to: string };
type WeekHours = Record<WeekDayId, DayHours>;

const DEFAULT_HOURS: WeekHours = {
  Mon: { open: true, from: "08:00", to: "17:30" },
  Tue: { open: true, from: "08:00", to: "17:30" },
  Wed: { open: true, from: "08:00", to: "17:30" },
  Thu: { open: true, from: "08:00", to: "17:30" },
  Fri: { open: true, from: "08:00", to: "17:30" },
  Sat: { open: true, from: "08:00", to: "17:30" },
  Sun: { open: false, from: "08:00", to: "12:00" },
};

/* drop the leading zero so 08:00 reads as 8:00 */
function labelTime(t: string) {
  const [h, m] = t.split(":");
  return `${Number(h)}:${m}`;
}

/* Collapse consecutive open days sharing the same window into ranges, e.g.
   "Mon to Sat · 8:00 to 17:30". Closed days break a run and are dropped. */
function formatHours(week: WeekHours): string {
  const groups: string[] = [];
  let runStart: WeekDayId | null = null;
  let runEnd: WeekDayId | null = null;
  let runKey = "";

  const flush = () => {
    if (!runStart || !runEnd) return;
    const { from, to } = week[runStart];
    const span = runStart === runEnd ? runStart : `${runStart} to ${runEnd}`;
    groups.push(`${span} · ${labelTime(from)} to ${labelTime(to)}`);
    runStart = null;
    runEnd = null;
    runKey = "";
  };

  for (const day of WEEK_DAYS) {
    const h = week[day.id];
    const key = h.open ? `${h.from}-${h.to}` : "";
    if (h.open && key === runKey) {
      runEnd = day.id;
    } else {
      flush();
      if (h.open) {
        runStart = day.id;
        runEnd = day.id;
        runKey = key;
      }
    }
  }
  flush();
  return groups.length > 0 ? groups.join(", ") : "Closed";
}

const MEMBERS = [
  { name: "Phong Tuy", role: "Owner · Doctor", you: true },
  { name: "Sophea Lim", role: "Doctor" },
  { name: "Ratha Kim", role: "Care coordinator" },
  { name: "Dara Sok", role: "Phlebotomist" },
  { name: "Mealea Chan", role: "Reception" },
];

const PENDING_INVITE = { name: "Visal Nuon", role: "Accountant", sent: "invited 2 days ago" };

type PatientChannel = {
  name: string;
  note: string;
  state: "active" | "fallback" | "soon";
};

const CHANNELS: PatientChannel[] = [
  { name: "Telegram", note: "Default for 92% of reachable patients", state: "active" },
  { name: "SMS", note: "Fallback after 30 min unread", state: "fallback" },
  { name: "Email", note: "Fallback for receipts and documents", state: "fallback" },
];

const TEMPLATES = ["Results ready", "Follow up reminder", "Booking confirmation"];

const TEMPLATE_COPY: Record<(typeof TEMPLATES)[number], string> = {
  "Results ready": "Your results are ready in Kura.",
  "Follow up reminder": "Your follow up is due soon. Please book a time.",
  "Booking confirmation": "Your booking is confirmed. We will remind you before the visit.",
};

const SIGNATURES = [
  { doc: "e-Prescription #2841", when: "Jun 10, 2026 · 14:32" },
  { doc: "Lab requisition FZ-38245", when: "Jun 9, 2026 · 09:18" },
  { doc: "Dx letter for Sokha Chan", when: "Jun 2, 2026 · 16:05" },
];

const AUDIT_EVENTS = [
  { what: "Exported lab history PDF (watermarked)", who: "You", when: "Today · 09:12" },
  { what: "Viewed Sokha Chan record", who: "Ratha Kim", when: "Yesterday · 17:40" },
  { what: "Invite sent to Visal Nuon (Accountant)", who: "You", when: "2 days ago" },
  { what: "Bank account verified, ABA ···· 4102", who: "Kura", when: "May 28, 2026" },
];

/* ------------------------- preferences (persisted) -------------------------- */

type Prefs = {
  units: "conventional" | "si";
  language: "en" | "km";
  theme: "light" | "dark" | "system";
  inlineRef: boolean;
  collapseNormal: boolean;
  clock24: boolean;
};

const DEFAULT_PREFS: Prefs = {
  units: "conventional",
  language: "en",
  theme: "light",
  inlineRef: true,
  collapseNormal: false,
  clock24: true,
};

const PREFS_KEY = "kura.preferences.v1";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/* ------------------------------ shared pieces ------------------------------- */

function Section({
  id,
  title,
  chip,
  sub,
  children,
}: {
  id: string;
  title: string;
  chip?: ReactNode;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`sv-h-${id}`} className="sv-section">
      <header className="sv-section-h">
        <div className="sv-section-trow">
          <h2 id={`sv-h-${id}`}>{title}</h2>
          {chip}
        </div>
        {sub ? <p className="sv-section-sub">{sub}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  sub,
  action,
  locked,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="sv-row">
      <span className="sv-row-label">
        {label}
        {locked ? (
          <span className="sv-lock" title="Verified by Kura. Not editable">
            <Lock size={12} variant="stroke" />
          </span>
        ) : null}
      </span>
      <span className="sv-row-value">
        <span className="sv-row-main">{value}</span>
        {sub ? <span className="sv-row-sub">{sub}</span> : null}
      </span>
      {action ? <span className="sv-row-action">{action}</span> : null}
    </div>
  );
}

function JumpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="sv-jump" onClick={onClick} type="button">
      {label}
    </button>
  );
}

/* Inline editor behind every "Edit / Change" row — flips the value into a
   field with Save / Cancel and commits to local component state. */
function EditRow({
  label,
  sub,
  initialValue,
  actionLabel = "Edit",
  actionClassName = "sv-link-action",
  multiline = false,
  numeric = false,
}: {
  label: string;
  sub?: ReactNode;
  initialValue: string;
  actionLabel?: string;
  actionClassName?: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  const { notify } = useSettingsActions();
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState("");

  const save = () => {
    const next = draft.trim();
    if (!next) {
      setError(`${label} is required.`);
      return;
    }
    setValue(next);
    setEditing(false);
    setError("");
    notify(`${label} updated`);
  };
  const cancel = () => {
    setDraft(value);
    setError("");
    setEditing(false);
  };

  if (editing) {
    return (
      <Row
        action={
          <span className="sv-inline">
            <Button disabled={!draft.trim()} intent="primary" onClick={save} size="sm">
              Save
            </Button>
            <Button intent="ghost" onClick={cancel} size="sm">
              Cancel
            </Button>
          </span>
        }
        label={label}
        value={
          multiline ? (
            <textarea
              autoFocus
              aria-invalid={Boolean(error)}
              className="sv-edit-input sv-edit-area"
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError("");
              }}
              rows={3}
              value={draft}
            />
          ) : (
            <input
              autoFocus
              aria-invalid={Boolean(error)}
              className="sv-edit-input"
              inputMode={numeric ? "numeric" : undefined}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              value={draft}
            />
          )
        }
        sub={error || sub}
      />
    );
  }

  return (
    <Row
      action={
        <Button
          className={actionClassName}
          intent="ghost"
          onClick={() => {
            setDraft(value);
            setError("");
            setEditing(true);
          }}
          size="sm"
        >
          {actionLabel}
        </Button>
      }
      label={label}
      sub={sub}
      value={value}
    />
  );
}

function CourierPickupRow() {
  const { notify } = useSettingsActions();
  const [pickup, setPickup] = useState<CourierPickup>(DEFAULT_COURIER_PICKUP);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CourierPickup>(DEFAULT_COURIER_PICKUP);
  const canSave = draft.days.length > 0;

  const toggleDay = (day: CourierDayId) => {
    setDraft((current) => {
      const selected = new Set(current.days);
      if (selected.has(day)) {
        selected.delete(day);
      } else {
        selected.add(day);
      }
      const days = COURIER_DAYS.map((option) => option.id).filter((id) => selected.has(id));
      return { ...current, days };
    });
  };

  const save = () => {
    if (!canSave) return;
    setPickup(draft);
    setEditing(false);
    notify("Courier pickup updated");
  };

  if (editing) {
    return (
      <Row
        action={
          <span className="sv-inline">
            <Button disabled={!canSave} intent="primary" onClick={save} size="sm">
              Save
            </Button>
            <Button intent="ghost" onClick={() => setEditing(false)} size="sm">
              Cancel
            </Button>
          </span>
        }
        label="Courier pickup"
        value={
          <span
            className="sv-pickup-editor"
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
          >
            <span className="sv-pickup-selects">
              <label className="sv-pickup-field sv-pickup-route">
                <span className="sv-pickup-label">Route</span>
                <select
                  autoFocus
                  className="sv-edit-input"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, routeId: event.currentTarget.value as CourierRouteId }))
                  }
                  value={draft.routeId}
                >
                  {COURIER_ROUTES.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.label}, {route.detail}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sv-pickup-field sv-pickup-time">
                <span className="sv-pickup-label">Pickup time</span>
                <select
                  className="sv-edit-input"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, time: event.currentTarget.value as CourierPickup["time"] }))
                  }
                  value={draft.time}
                >
                  {COURIER_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
            </span>
            <span aria-labelledby="sv-pickup-days-label" className="sv-pickup-days" role="group">
              <span className="sv-pickup-label" id="sv-pickup-days-label">
                Pickup days
              </span>
              <span className="sv-pickup-day-list">
                {COURIER_DAYS.map((day) => (
                  <Checkbox
                    checked={draft.days.includes(day.id)}
                    className="sv-pickup-day"
                    key={day.id}
                    label={day.label}
                    onChange={() => toggleDay(day.id)}
                  />
                ))}
              </span>
            </span>
            {!canSave ? (
              <span aria-live="polite" className="sv-pickup-error">
                Select at least one pickup day.
              </span>
            ) : null}
          </span>
        }
      />
    );
  }

  return (
    <Row
      action={
        <Button
          className="sv-link-action"
          intent="ghost"
          onClick={() => {
            setDraft(pickup);
            setEditing(true);
          }}
          size="sm"
        >
          Change route
        </Button>
      }
      label="Courier pickup"
      value={formatCourierPickup(pickup)}
    />
  );
}

/* Directory hours editor — a row per weekday: open/closed toggle plus an
   open and close time. The collapsed value summarises it as a day range. */
function HoursRow() {
  const { notify } = useSettingsActions();
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeekHours>(DEFAULT_HOURS);
  const [showCustom, setShowCustom] = useState(false);

  const invalid = WEEK_DAYS.some((day) => draft[day.id].open && draft[day.id].from >= draft[day.id].to);
  const canSave = !invalid;

  const setDay = (id: WeekDayId, patch: Partial<DayHours>) =>
    setDraft((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const applyPreset = (openDays: WeekDayId[], from = "08:00", to = "17:30") => {
    const open = new Set(openDays);
    setDraft(
      WEEK_DAYS.reduce((next, day) => {
        next[day.id] = { open: open.has(day.id), from, to };
        return next;
      }, {} as WeekHours),
    );
    setShowCustom(false);
  };

  const save = () => {
    if (!canSave) return;
    setHours(draft);
    setEditing(false);
    setShowCustom(false);
    notify("Hours updated");
  };
  const cancel = () => {
    setDraft(hours);
    setShowCustom(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <Row
        action={
          <span className="sv-inline">
            <Button disabled={!canSave} intent="primary" onClick={save} size="sm">
              Save
            </Button>
            <Button intent="ghost" onClick={cancel} size="sm">
              Cancel
            </Button>
          </span>
        }
        label="Hours"
        value={
          <span
            className="sv-hours-editor"
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
          >
            <span className="sv-hours-presets" aria-label="Hours presets" role="group">
              <button
                className="sv-hours-preset"
                onClick={() => applyPreset(["Mon", "Tue", "Wed", "Thu", "Fri"])}
                type="button"
              >
                <strong>Weekdays</strong>
                <span>Mon to Fri, 8:00 to 17:30</span>
              </button>
              <button
                className="sv-hours-preset"
                onClick={() => applyPreset(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])}
                type="button"
              >
                <strong>Mon to Sat</strong>
                <span>8:00 to 17:30</span>
              </button>
              <button
                className="sv-hours-preset"
                onClick={() => setShowCustom((current) => !current)}
                type="button"
              >
                <strong>Custom days</strong>
                <span>{showCustom ? "Hide day detail" : "Edit each day"}</span>
              </button>
            </span>
            {showCustom ? (
              WEEK_DAYS.map((day) => {
                const h = draft[day.id];
                return (
                  <span className="sv-hours-day" key={day.id}>
                    <Checkbox
                      checked={h.open}
                      className="sv-hours-toggle"
                      label={day.label}
                      onChange={(event) => setDay(day.id, { open: event.currentTarget.checked })}
                    />
                    {h.open ? (
                      <span className="sv-hours-times">
                        <select
                          aria-label={`${day.label} opening time`}
                          className="sv-edit-input"
                          onChange={(event) => setDay(day.id, { from: event.currentTarget.value })}
                          value={h.from}
                        >
                          {HOUR_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {labelTime(t)}
                            </option>
                          ))}
                        </select>
                        <span aria-hidden className="sv-hours-sep">
                          to
                        </span>
                        <select
                          aria-label={`${day.label} closing time`}
                          className="sv-edit-input"
                          onChange={(event) => setDay(day.id, { to: event.currentTarget.value })}
                          value={h.to}
                        >
                          {HOUR_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {labelTime(t)}
                            </option>
                          ))}
                        </select>
                      </span>
                    ) : (
                      <span className="sv-hours-closed">Closed</span>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="sv-row-sub">Use a preset or edit each day.</span>
            )}
            {invalid ? (
              <span aria-live="polite" className="sv-hours-error">
                Closing time must be after opening time.
              </span>
            ) : null}
          </span>
        }
      />
    );
  }

  return (
    <Row
      action={
        <Button
          className="sv-link-action"
          intent="ghost"
          onClick={() => {
            setDraft(hours);
            setShowCustom(false);
            setEditing(true);
          }}
          size="sm"
        >
          Edit hours
        </Button>
      }
      label="Hours"
      value={formatHours(hours)}
    />
  );
}

/* Real file picker. No upload endpoint exists in the prototype, so it
   acknowledges the choice locally (filename + toast) the way an upload would. */
function FileButton({
  label,
  accept,
  intent = "outline",
  icon,
  className,
  onSelected,
}: {
  label: string;
  accept?: string;
  intent?: "outline" | "ghost";
  icon?: ReactNode;
  className?: string;
  onSelected?: (file: File) => void;
}) {
  const { notify } = useSettingsActions();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        accept={accept}
        className="sv-file-input"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) {
            onSelected?.(file);
            notify(`${file.name} selected`);
          }
          e.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <Button className={className} intent={intent} leadingIcon={icon} onClick={() => inputRef.current?.click()} size="sm">
        {label}
      </Button>
    </>
  );
}

/* Editable tag list — removable chips (body or x removes) plus an inline add
   field. Used for the directory's languages and services. */
function ChipListRow({
  label,
  initial,
  addLabel,
  placeholder,
}: {
  label: string;
  initial: string[];
  addLabel: string;
  placeholder: string;
}) {
  const { notify } = useSettingsActions();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [lastRemoved, setLastRemoved] = useState<{ item: string; index: number } | null>(null);

  const remove = (item: string) => {
    setItems((list) => {
      const index = list.indexOf(item);
      setLastRemoved(index >= 0 ? { item, index } : null);
      return list.filter((x) => x !== item);
    });
    setError("");
    notify(`${item} removed. Undo is available.`);
  };
  const undoRemove = () => {
    if (!lastRemoved) return;
    setItems((list) => {
      if (list.includes(lastRemoved.item)) return list;
      const next = [...list];
      next.splice(Math.min(lastRemoved.index, next.length), 0, lastRemoved.item);
      return next;
    });
    notify(`${lastRemoved.item} restored`);
    setLastRemoved(null);
  };
  const cancel = () => {
    setAdding(false);
    setDraft("");
    setError("");
  };
  const add = () => {
    const next = draft.trim();
    if (!next) {
      setError(`${label} is required.`);
      return;
    }
    if (items.includes(next)) {
      setError(`${next} is already listed.`);
      return;
    }
    setItems((list) => [...list, next]);
    setLastRemoved(null);
    notify(`${next} added`);
    cancel();
  };

  return (
    <Row
      action={
        adding ? undefined : (
          <Button className="sv-link-action" intent="ghost" onClick={() => setAdding(true)} size="sm">
            {addLabel}
          </Button>
        )
      }
      label={label}
      value={
        <span className="sv-inline sv-wrap">
          {items.map((item) => (
            <Chip key={item} onRemove={() => remove(item)} variant="removable">
              {item}
            </Chip>
          ))}
          {items.length === 0 ? <span className="sv-row-sub">None listed</span> : null}
          {lastRemoved ? (
            <span className="sv-chip-undo">
              {lastRemoved.item} removed
              <Button intent="ghost" onClick={undoRemove} size="sm">
                Undo
              </Button>
            </span>
          ) : null}
          {adding ? (
            <span className="sv-chip-add">
              <input
                autoFocus
                aria-invalid={Boolean(error)}
                className="sv-edit-input"
                onChange={(e) => {
                  setDraft(e.currentTarget.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                  if (e.key === "Escape") cancel();
                }}
                placeholder={placeholder}
                value={draft}
              />
              <Button intent="primary" onClick={add} size="sm">
                Add
              </Button>
              <Button intent="ghost" onClick={cancel} size="sm">
                Cancel
              </Button>
              {error ? (
                <span aria-live="polite" className="sv-field-error">
                  {error}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      }
    />
  );
}

/* --------------------------------- sections --------------------------------- */

function OverviewSection({ go }: { go: (s: SettingsSectionId) => void }) {
  return (
    <Section
      id="overview"
      sub="Priority settings for this workspace."
      title="Overview"
    >
      <Banner
        actions={
          <Button intent="outline" size="sm" onClick={() => go("account")}>
            Upload renewed license
          </Button>
        }
        title={`Medical license expires in ${LICENSE_RENEWAL_TEXT}`}
        tone="warning"
      >
        CMC 048-2019 expires {ME.licenseExpiry}. Upload the renewed license before expiry to keep
        prescribing active.
      </Banner>
      <div className="sv-rows">
        <Row
          action={<JumpButton label="Edit account" onClick={() => go("account")} />}
          label="Signed in as"
          sub={ME.email}
          value={
            <span className="sv-id">
              <Avatar name="Phong Tuy" size="xs" tone="success" />
              {ME.name}
            </span>
          }
        />
        <Row
          action={<OpenVerificationButton />}
          label="Verification"
          value={<KydStatusBadge />}
          sub="Medical license and identity review"
        />
        <Row
          action={<JumpButton label="Edit clinic" onClick={() => go("cabinet")} />}
          label="Cabinet"
          sub="Phnom Penh · GMT+7"
          value={CABINET.name}
        />
        <Row
          action={<JumpButton label="Review team" onClick={() => go("members")} />}
          label="Team"
          sub="1 invite pending approval"
          value="5 active members"
        />
        <Row
          action={<JumpButton label="View payments" onClick={() => go("billing")} />}
          label="Payments"
          sub="KHQR active · next netting Jul 1"
          value={
            <span className="sv-inline">
              Bank verified <Badge tone="success">ABA ···· 4102</Badge>
            </span>
          }
        />
        <Row
          action={<JumpButton label="View documents" onClick={() => go("esign")} />}
          label="Signed documents"
          sub="PAdES-B-LT · CamDX root"
          value={<span className="sv-inline">Certificate active until Mar 2027</span>}
        />
      </div>
    </Section>
  );
}

function AccountSection() {
  const [renewalFile, setRenewalFile] = useState<string | null>(null);

  return (
    <Section
      chip={<KydStatusBadge />}
      id="account"
      sub="Identity and license details verified against the CMC register."
      title="Account & verification"
    >
      <div className="sv-rows">
        <Row label="Email" value={ME.email} sub="Used for sign-in and statements" />
        <Row label="Clinician name" value={ME.name} sub={ME.khmerName} locked />
        <Row
          action={
            <FileButton
              accept=".pdf,.jpg,.jpeg,.png"
              icon={<Upload size={14} variant="stroke" />}
              label="Upload license"
              onSelected={(file) => setRenewalFile(file.name)}
            />
          }
          label="Medical license"
          sub={renewalFile ? `${renewalFile} selected` : `Expires ${ME.licenseExpiry}`}
          value={
            <span className="sv-inline">
              {ME.license}{" "}
              <Badge tone={renewalFile ? "info" : "warning"}>
                {renewalFile ? "File selected" : `Renews in ${LICENSE_RENEWAL_TEXT}`}
              </Badge>
            </span>
          }
          locked
        />
        <Row
          action={<OpenVerificationButton />}
          label="License verification"
          sub="Required for lab orders and payments"
          value={<KydStatusBadge />}
        />
        <Row
          label="Verification check"
          sub="Last verified Mar 14, 2026"
          value={<span className="sv-inline">Not required</span>}
        />
        <Row
          label="Signature & certificate"
          sub="Managed under Signed documents"
          value={
            <span className="sv-inline">
              <CheckShield size={14} variant="stroke" /> Ready to sign
            </span>
          }
        />
      </div>
      <VerificationStatusBanner />
    </Section>
  );
}

function CabinetSection() {
  return (
    <Section
      id="cabinet"
      sub="The clinic this workspace operates under. Lab routing, billing, and compliance follow these fields."
      title="Cabinet"
    >
      <div className="sv-rows">
        <Row label="Cabinet name" value={CABINET.name} />
        <Row label="Address" value={CABINET.address} />
        <Row label="Specialty" value={CABINET.specialty} />
        <Row label="Clinic type" value={CABINET.clinicType} />
        <Row
          label="Country"
          locked
          sub="Determines insurer panel, currency, and patient channels"
          value={CABINET.country}
        />
        <Row label="Timezone" value={CABINET.timezone} />
        <Row label="Currency" value={CABINET.currency} />
        <CourierPickupRow />
      </div>
      <Banner title="Country is locked after registration" tone="info">
        Billing rails, insurer contracts, and lab logistics are provisioned per country. Contact
        Kura support to migrate a cabinet across borders.
      </Banner>
    </Section>
  );
}

const ROLES = ["Doctor", "Care coordinator", "Phlebotomist", "Reception", "Accountant"];

type Member = { name: string; role: string; you?: boolean };
type PendingInvite = { name: string; role: string; sent: string };

function MembersSection() {
  const { notify } = useSettingsActions();
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [pending, setPending] = useState<PendingInvite[]>([PENDING_INVITE]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [roleConfirmName, setRoleConfirmName] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES[0]);
  const [inviteError, setInviteError] = useState("");
  const [inviteConfirm, setInviteConfirm] = useState<{ kind: "approve" | "revoke"; name: string } | null>(null);

  const saveRole = (name: string) => {
    setMembers((list) => list.map((m) => (m.name === name ? { ...m, role: roleDraft } : m)));
    setEditingName(null);
    setRoleConfirmName(null);
    notify(`${name}'s role updated`);
  };
  const requestRoleSave = (member: Member) => {
    if (member.role === roleDraft) {
      setEditingName(null);
      setRoleConfirmName(null);
      return;
    }
    setRoleConfirmName(member.name);
  };
  const approve = (invite: PendingInvite) => {
    setPending((list) => list.filter((p) => p.name !== invite.name));
    setMembers((list) => [...list, { name: invite.name, role: invite.role }]);
    setInviteConfirm(null);
    notify(`${invite.name} approved as ${invite.role}`);
  };
  const revoke = (name: string) => {
    setPending((list) => list.filter((p) => p.name !== name));
    setInviteConfirm(null);
    notify(`Invite to ${name} revoked`);
  };
  const sendInvite = () => {
    const name = inviteName.trim();
    if (!name) {
      setInviteError("Member name is required.");
      return;
    }
    const exists = members.some((member) => member.name.toLowerCase() === name.toLowerCase()) ||
      pending.some((invite) => invite.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setInviteError(`${name} is already in this workspace.`);
      return;
    }
    setPending((list) => [...list, { name, role: inviteRole, sent: "invited just now" }]);
    setInviting(false);
    setInviteName("");
    setInviteRole(ROLES[0]);
    setInviteError("");
    notify(`Invite sent to ${name}`);
  };

  return (
    <Section
      chip={<Badge tone="neutral">{members.length} active</Badge>}
      id="members"
      sub="Roles scope what each member can see and do. All PHI access is logged."
      title="Team access"
    >
      <div className="sv-rows">
        {members.map((m) => (
          <div className="sv-row sv-member" key={m.name}>
            <span className="sv-row-label sv-member-id">
              <Avatar name={m.name} size="xs" tone={m.you ? "success" : "neutral"} />
              {m.name}
              {m.you ? <span className="sv-you">you</span> : null}
            </span>
            {editingName === m.name ? (
              <>
                <span className="sv-row-value">
                  <select
                    aria-label={`Role for ${m.name}`}
                    className="sv-edit-input"
                    onChange={(e) => setRoleDraft(e.currentTarget.value)}
                    value={roleDraft}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="sv-row-action sv-inline">
                  {roleConfirmName === m.name ? (
                    <span className="sv-confirm-inline">
                      <span>Confirm role change?</span>
                      <Button intent="primary" onClick={() => saveRole(m.name)} size="sm">
                        Confirm
                      </Button>
                      <Button intent="ghost" onClick={() => setRoleConfirmName(null)} size="sm">
                        Back
                      </Button>
                    </span>
                  ) : (
                    <>
                      <Button intent="primary" onClick={() => requestRoleSave(m)} size="sm">
                        Save
                      </Button>
                      <Button
                        intent="ghost"
                        onClick={() => {
                          setEditingName(null);
                          setRoleConfirmName(null);
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="sv-row-value">
                  <span className="sv-row-main">{m.role}</span>
                </span>
                <span className="sv-row-action">
                  <Button
                    className="sv-link-action"
                    disabled={m.you}
                    intent="ghost"
                    onClick={() => {
                      setRoleDraft(m.role);
                      setEditingName(m.name);
                      setRoleConfirmName(null);
                    }}
                    size="sm"
                  >
                    Edit role
                  </Button>
                </span>
              </>
            )}
          </div>
        ))}
        {pending.map((invite) => (
          <div className="sv-row sv-member sv-member-pending" key={invite.name}>
            <span className="sv-row-label sv-member-id">
              <Avatar name={invite.name} size="xs" tone="warning" />
              {invite.name}
            </span>
            <span className="sv-row-value">
              <span className="sv-row-main sv-inline">
                {invite.role} <Badge tone="warning">Pending</Badge>
              </span>
              <span className="sv-row-sub">{invite.sent}</span>
            </span>
            <span className="sv-row-action sv-inline">
              {inviteConfirm?.name === invite.name ? (
                <span className="sv-confirm-inline">
                  <span>{inviteConfirm.kind === "approve" ? "Approve invite?" : "Revoke invite?"}</span>
                  <Button
                    intent={inviteConfirm.kind === "approve" ? "primary" : "outline"}
                    onClick={() => (inviteConfirm.kind === "approve" ? approve(invite) : revoke(invite.name))}
                    size="sm"
                  >
                    Confirm
                  </Button>
                  <Button intent="ghost" onClick={() => setInviteConfirm(null)} size="sm">
                    Cancel
                  </Button>
                </span>
              ) : (
                <>
                  <Button intent="outline" onClick={() => setInviteConfirm({ kind: "approve", name: invite.name })} size="sm">
                    Approve
                  </Button>
                  <Button
                    className="sv-link-action"
                    intent="ghost"
                    onClick={() => setInviteConfirm({ kind: "revoke", name: invite.name })}
                    size="sm"
                  >
                    Revoke
                  </Button>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <Banner title="You are the sole owner" tone="info">
        Transfer ownership to another verified doctor before leaving this cabinet. A cabinet
        cannot operate without an owner of record.
      </Banner>
      <div className="sv-section-foot">
        {inviting ? (
          <div className="sv-invite-form">
            <input
              autoFocus
              aria-invalid={Boolean(inviteError)}
              className="sv-edit-input"
              onChange={(e) => {
                setInviteName(e.currentTarget.value);
                if (inviteError) setInviteError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendInvite();
                if (e.key === "Escape") {
                  setInviting(false);
                  setInviteError("");
                }
              }}
              placeholder="Member name"
              value={inviteName}
            />
            <select
              aria-label="Invite role"
              className="sv-edit-input"
              onChange={(e) => setInviteRole(e.currentTarget.value)}
              value={inviteRole}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button intent="primary" onClick={sendInvite} size="md">
              Send invite
            </Button>
            <Button
              intent="ghost"
              onClick={() => {
                setInviting(false);
                setInviteError("");
              }}
              size="md"
            >
              Cancel
            </Button>
            {inviteError ? (
              <span aria-live="polite" className="sv-field-error">
                {inviteError}
              </span>
            ) : null}
          </div>
        ) : (
          <Button
            onClick={() => {
              setInviteName("");
              setInviteRole(ROLES[0]);
              setInviteError("");
              setInviting(true);
            }}
            size="sm"
          >
            Invite member
          </Button>
        )}
      </div>
    </Section>
  );
}

function PreferencesSection() {
  const { notify } = useSettingsActions();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const loadedRef = useRef(false);

  useEffect(() => {
    /* hydrate once from localStorage after mount — SSR renders the defaults,
       so reading in a lazy initializer would mismatch the server HTML */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable (private mode) — prefs stay in-memory */
    }
  }, [prefs]);

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    notify("Preferences saved on this device");
  };

  return (
    <Section
      id="preferences"
      sub="Display defaults saved on this device. They never change the medical record."
      title="Preferences"
    >
      <div className="sv-rows">
        <Row
          action={
            <SegmentedToggle<Prefs["units"]>
              onChange={(v) => set("units", v)}
              options={[
                { label: "Conventional", value: "conventional" },
                { label: "SI", value: "si" },
              ]}
              value={prefs.units}
            />
          }
          label="Lab units"
          value={prefs.units === "si" ? "SI (mmol/L)" : "Conventional (mg/dL)"}
          sub="Applies to lab history and printouts"
        />
        <Row
          action={
            <SegmentedToggle<Prefs["theme"]>
              onChange={(v) => set("theme", v)}
              options={[
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
                { label: "System", value: "system" },
              ]}
              value={prefs.theme}
            />
          }
          label="Theme"
          value={prefs.theme === "light" ? "Light" : prefs.theme === "dark" ? "Dark" : "Match system"}
        />
        <Row
          action={
            <SegmentedToggle<Prefs["language"]>
              onChange={(v) => set("language", v)}
              options={[
                { label: "English", value: "en" },
                { label: "Khmer", value: "km" },
              ]}
              value={prefs.language}
            />
          }
          label="Language"
          sub="Clinical terms, drug names, and lab codes stay in English."
          value={prefs.language === "km" ? "Khmer" : "English"}
        />
        <Row
          action={
            <Checkbox
              aria-label="Show reference ranges inline"
              checked={prefs.inlineRef}
              onChange={(e) => set("inlineRef", e.currentTarget.checked)}
            />
          }
          label="Reference ranges"
          value={prefs.inlineRef ? "Shown inline" : "Hidden until opened"}
        />
        <Row
          action={
            <Checkbox
              aria-label="Collapse normal results by default"
              checked={prefs.collapseNormal}
              onChange={(e) => set("collapseNormal", e.currentTarget.checked)}
            />
          }
          label="Normal results"
          sub="Abnormal results always stay expanded."
          value={prefs.collapseNormal ? "Collapsed by default" : "Expanded by default"}
        />
        <Row
          action={
            <Checkbox
              aria-label="Use 24-hour time"
              checked={prefs.clock24}
              onChange={(e) => set("clock24", e.currentTarget.checked)}
            />
          }
          label="Time"
          value={prefs.clock24 ? "24-hour" : "12-hour"}
        />
      </div>
      <p className="sv-foot-note">Saved on this device.</p>
    </Section>
  );
}

const DOCTOR_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 44 44"><rect width="44" height="44" fill="#fff"/><rect x="2" y="2" width="12" height="12" fill="none" stroke="#0b1424" stroke-width="2"/><rect x="30" y="2" width="12" height="12" fill="none" stroke="#0b1424" stroke-width="2"/><rect x="2" y="30" width="12" height="12" fill="none" stroke="#0b1424" stroke-width="2"/><path d="M20 20h4v4h-4zM30 30h4v4h-4zM38 30h4M30 38h4M38 38h4v4" fill="none" stroke="#0b1424" stroke-width="2"/></svg>`;

function CommunicationsSection() {
  const { notify } = useSettingsActions();
  return (
    <Section
      id="communications"
      sub={`Channel order follows the cabinet country (${CABINET.country}). Patients can opt out per channel.`}
      title="Patient messages"
    >
      <div className="sv-rows">
        {CHANNELS.map((c, i) => (
          <div className="sv-row sv-channel" key={c.name}>
            <span className="sv-row-label sv-channel-rank">
              <span className="sv-rank">{i + 1}</span>
              {c.name}
            </span>
            <span className="sv-row-value">
              <span className="sv-row-sub">{c.note}</span>
            </span>
            <span className="sv-row-action">
              {c.state === "active" ? (
                <Badge tone="success">Default</Badge>
              ) : (
                <Badge tone="neutral">Fallback</Badge>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="sv-block">
        <p className="sv-block-title">Notification templates</p>
        <div className="sv-rows">
          {TEMPLATES.map((t) => (
            <EditRow
              actionLabel="Edit"
              initialValue={TEMPLATE_COPY[t]}
              key={t}
              label={t}
              multiline
              sub="Sent through the active channel"
            />
          ))}
        </div>
      </div>
      <div className="sv-qr">
        <span aria-hidden className="sv-qr-mark">
          <svg fill="none" height="44" viewBox="0 0 44 44" width="44">
            <rect height="12" stroke="currentColor" strokeWidth="2" width="12" x="2" y="2" />
            <rect height="12" stroke="currentColor" strokeWidth="2" width="12" x="30" y="2" />
            <rect height="12" stroke="currentColor" strokeWidth="2" width="12" x="2" y="30" />
            <path d="M20 20h4v4h-4zM30 30h4v4h-4zM38 30h4M30 38h4M38 38h4v4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <div className="sv-qr-copy">
          <strong>Doctor intro QR</strong>
          <p>Patients scan to connect with your cabinet on Telegram and receive results there.</p>
        </div>
        <Button
          intent="outline"
          leadingIcon={<Download size={14} variant="stroke" />}
          onClick={() => {
            downloadTextFile("kura-doctor-intro-qr.svg", DOCTOR_QR_SVG, "image/svg+xml");
            notify("Doctor intro QR downloaded");
          }}
          size="sm"
        >
          Download
        </Button>
      </div>
    </Section>
  );
}

const SETTLEMENT_CSV = [
  "Date,Description,Amount (USD)",
  "2026-06-01,Forte claim batch,+412.00",
  "2026-06-01,Lab costs netted,-176.00",
  "2026-07-01,Net settlement (estimated),+236.00",
].join("\n");

/* Doctor Banking = ABA Account on File (mastersource §25). The account is linked
   by scanning a QR / tapping a deep link in ABA Mobile and confirming with the
   bank PIN — Kura never takes a typed account number or the PIN, only a payment
   token + masked account. It is a verified-clinician self-service (KYD-gated). */
function BankConnectDrawer({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const steps = [
    "Open ABA Mobile on your phone.",
    "Scan this code, or tap the deep link.",
    "Confirm the link with your bank PIN.",
  ];
  const [confirmed, setConfirmed] = useState(false);
  const close = () => {
    setConfirmed(false);
    onClose();
  };
  const finish = () => {
    setConfirmed(false);
    onConnected();
  };
  return (
    <Drawer
      className="sv-aba-drawer"
      open={open}
      onClose={close}
      width={440}
      title="Connect ABA account"
      subtitle="No manual account number."
      footer={
        <div className="sv-aba-foot">
          <Button intent="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!confirmed} intent="primary" size="sm" onClick={finish}>
            Finish ABA link
          </Button>
        </div>
      }
    >
      <div className="sv-aba">
        <div className="sv-aba-qr" aria-hidden="true">
          <span className="sv-aba-qr-grid" />
          <small>Scan with ABA Mobile</small>
        </div>
        <ol className="sv-aba-steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span className="sv-aba-step-n">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="sv-aba-note">
          <CheckShield size={14} variant="stroke" />
          <span>
            Kura stores only a payment token and the masked account. Never your PIN or full number. Banking stays gated behind
            clinician verification.
          </span>
        </p>
        <Checkbox
          checked={confirmed}
          label="I confirmed this in ABA Mobile"
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
        />
      </div>
    </Drawer>
  );
}

function BillingSection() {
  const { notify } = useSettingsActions();
  const [bankConnected, setBankConnected] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  return (
    <Section
      chip={<Badge tone="success">Settlement active</Badge>}
      id="billing"
      sub="Where payments and claims settle."
      title="Payments"
    >
      <div className="sv-rows sv-payment-rows">
        <Row
          label="Bank account"
          sub={bankConnected ? undefined : "Connect ABA to receive settlements"}
          value={
            bankConnected ? (
              <span className="sv-inline">
                ABA ···· 4102 <Badge tone="success">Verified</Badge>
              </span>
            ) : (
              <span className="sv-inline">
                Not connected <Badge tone="warning">Action needed</Badge>
              </span>
            )
          }
          action={
            <Button intent={bankConnected ? "ghost" : "primary"} size="sm" onClick={() => setConnectOpen(true)}>
              {bankConnected ? "Update link" : "Connect ABA"}
            </Button>
          }
        />
        <Row
          label="KHQR"
          value={
            <span className="sv-inline">
              Active <Badge tone="success">Bakong</Badge>
            </span>
          }
        />
        <Row
          label="Insurer panels"
          value={
            <span className="sv-inline sv-wrap">
              <Badge tone="success">Forte · Active</Badge>
              <Badge tone="warning">Sovannaphum · Pending review</Badge>
            </span>
          }
        />
        <Row
          label="Next settlement"
          sub="Twice monthly"
          value="Jul 1 · est. +$236.00"
        />
        <EditRow
          actionLabel="Change cap"
          initialValue="$500 per order"
          label="Auto pay cap"
          numeric
          sub="Manual confirmation above cap"
        />
      </div>
      <h3 className="sv-subhead">Statements</h3>
      <div className="sv-rows sv-statement-rows">
        <Row
          label="Jun 16 to 30, 2026"
          value={
            <span className="sv-inline">
              est. +$236.00 <Badge tone="warning">Pending</Badge>
            </span>
          }
        />
        {[
          { period: "Jun 1 to 15, 2026", settled: "Settled Jun 16", amount: "+$612.00", file: "kura-statement-2026-06a.csv" },
          { period: "May 16 to 31, 2026", settled: "Settled Jun 1", amount: "+$540.00", file: "kura-statement-2026-05b.csv" },
        ].map((stmt) => (
          <Row
            key={stmt.period}
            label={stmt.period}
            sub={stmt.settled.replace("Settled", "Paid")}
            value={
              <span className="sv-inline">
                {stmt.amount} <Badge tone="success">Settled</Badge>
              </span>
            }
            action={
              <Button
                intent="secondary"
                size="sm"
                leadingIcon={<Download size={14} variant="stroke" />}
                onClick={() => {
                  downloadTextFile(stmt.file, SETTLEMENT_CSV, "text/csv");
                  notify(`${stmt.period} statement downloaded`);
                }}
              >
                Download
              </Button>
            }
          />
        ))}
      </div>
      <div className="sv-section-foot">
        <Button
          intent="outline"
          leadingIcon={<Download size={14} variant="stroke" />}
          onClick={() => {
            downloadTextFile("kura-settlement.csv", SETTLEMENT_CSV, "text/csv");
            notify("Settlement CSV exported");
          }}
          size="sm"
        >
          Export settlement CSV
        </Button>
      </div>
      <BankConnectDrawer
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={() => {
          setBankConnected(true);
          setConnectOpen(false);
          notify("ABA account connected");
        }}
      />
    </Section>
  );
}

function DirectorySection() {
  return (
    <Section
      chip={<Badge tone="info">Public</Badge>}
      id="directory"
      sub="What patients see in the Kura directory. Locked fields are verified by Kura."
      title="Directory profile"
    >
      <div className="sv-rows">
        <Row
          action={<FileButton accept="image/*" className="sv-link-action" intent="ghost" label="Change photo" />}
          label="Photo"
          value={
            <span className="sv-id">
              <Avatar name="Phong Tuy" size="md" tone="success" />
              Shown on your public profile
            </span>
          }
        />
        <Row label="Public name & credentials" locked sub="From the CMC register" value={`${ME.name} · ${ME.license}`} />
        <HoursRow />
        <ChipListRow addLabel="Add language" initial={["ភាសាខ្មែរ", "English"]} label="Languages" placeholder="Language name" />
        <ChipListRow
          addLabel="Add service"
          initial={["Diabetes care", "CKD management", "Hypertension"]}
          label="Services"
          placeholder="Service name"
        />
        <EditRow
          actionClassName="sv-link-action"
          actionLabel="Edit bio"
          initialValue="Endocrinologist focused on long-term diabetes and kidney care in Phnom Penh."
          label="Bio"
          multiline
        />
        <Row label="Reviews" locked sub="Collected after completed visits" value="4.8 ★ · 32 reviews" />
      </div>
    </Section>
  );
}

function ESignSection() {
  const { notify } = useSettingsActions();
  return (
    <Section
      chip={<Badge tone="success">Certificate active</Badge>}
      id="esign"
      sub="Every prescription and report is digitally signed. Certificates chain to the CamDX root."
      title="Signed documents"
    >
      <div className="sv-rows">
        <Row label="Signing provider" value="Kura Sign · CamDX qualified" />
        <Row
          label="Certificate"
          sub="Renews automatically 30 days before expiry"
          value={
            <span className="sv-inline">
              Active until Mar 2027 <Badge tone="success">Valid</Badge>
            </span>
          }
        />
        <Row label="PAdES profile" sub="Long term validation embedded in each PDF" value="PAdES-B-LT" />
      </div>
      <div className="sv-block">
        <p className="sv-block-title">Recent signatures</p>
        <div className="sv-rows">
          {SIGNATURES.map((s) => (
            <Row key={s.doc} label={s.doc} value={<span className="sv-row-sub">{s.when}</span>} />
          ))}
        </div>
      </div>
      <div className="sv-rows">
        <Row
          action={<FileButton accept=".pdf,.png,.jpg" className="sv-link-action" intent="ghost" label="Replace" />}
          label="Rx / Dx letterhead"
          value="Cabinet letterhead v2. Applied to all signed documents"
        />
        <Row
          label="License documents"
          value={
            <span className="sv-inline">
              CMC-license.pdf <Badge tone="success">Verified</Badge>
            </span>
          }
        />
      </div>
      <div className="sv-section-foot">
        <Button
          intent="outline"
          onClick={() => {
            const csv = ["Document,Signed at", ...SIGNATURES.map((s) => `${s.doc},${s.when}`)].join("\n");
            downloadTextFile("kura-signing-log.csv", csv, "text/csv");
            notify("Signing log exported");
          }}
          size="sm"
        >
          Export signing log
        </Button>
      </div>
    </Section>
  );
}

function SecuritySection() {
  const { notify } = useSettingsActions();
  const [stepUp, setStepUp] = useState(true);
  const [sessions, setSessions] = useState([
    { id: "iphone", label: "iPhone 15 · Telegram linked", sub: "Last active today · 08:55", value: "Mobile companion" },
  ]);
  const [sessionConfirm, setSessionConfirm] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const revoke = (id: string, label: string) => {
    setSessions((list) => list.filter((s) => s.id !== id));
    setSessionConfirm(null);
    notify(`Signed out ${label}`);
  };
  const signOutOthers = () => {
    setSessions([]);
    setConfirmAll(false);
    notify("Signed out all other sessions");
  };
  return (
    <Section
      id="security"
      sub="Manage signed-in devices, sensitive changes, and the PHI access log."
      title="Security"
    >
      <div className="sv-block">
        <p className="sv-block-title">Active sessions</p>
        <div className="sv-rows">
          <Row
            label="MacBook Pro · Phnom Penh"
            sub="Chrome · signed in 3 days ago"
            value={
              <span className="sv-inline">
                This device <Badge tone="success">Current</Badge>
              </span>
            }
          />
          {sessions.map((s) => (
            <Row
              action={
                sessionConfirm === s.id ? (
                  <span className="sv-confirm-inline">
                    <span>Sign out this session?</span>
                    <Button intent="outline" onClick={() => revoke(s.id, s.label)} size="sm">
                      Confirm
                    </Button>
                    <Button intent="ghost" onClick={() => setSessionConfirm(null)} size="sm">
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button className="sv-link-action" intent="ghost" onClick={() => setSessionConfirm(s.id)} size="sm">
                    Revoke
                  </Button>
                )
              }
              key={s.id}
              label={s.label}
              sub={s.sub}
              value={<span className="sv-row-sub">{s.value}</span>}
            />
          ))}
          {sessions.length === 0 ? (
            <Row label="No other sessions" value={<span className="sv-row-sub">Only this device is signed in</span>} />
          ) : null}
        </div>
      </div>
      <div className="sv-block">
        <Checkbox
          checked={stepUp}
          helpText="Covers PHI exports, bank details, and role changes."
          label="Require sign-in before sensitive changes"
          onChange={(e) => setStepUp(e.currentTarget.checked)}
        />
      </div>
      <Banner title="PHI exports are watermarked" tone="warning">
        Each export includes user and timestamp. Patients can request the access log.
      </Banner>
      <div className="sv-block">
        <p className="sv-block-title">Recent activity</p>
        <div className="sv-rows">
          {AUDIT_EVENTS.map((e) => (
            <Row key={e.what + e.when} label={e.who} sub={e.when} value={e.what} />
          ))}
        </div>
      </div>
      <div className="sv-section-foot">
        {confirmAll ? (
          <span className="sv-confirm-inline">
            <span>Sign out every other session?</span>
            <Button disabled={sessions.length === 0} intent="outline" onClick={signOutOthers} size="sm">
              Confirm
            </Button>
            <Button intent="ghost" onClick={() => setConfirmAll(false)} size="sm">
              Cancel
            </Button>
          </span>
        ) : (
          <Button disabled={sessions.length === 0} intent="outline" onClick={() => setConfirmAll(true)} size="sm">
            Sign out all other sessions
          </Button>
        )}
      </div>
    </Section>
  );
}

/* ---------------------------------- view ------------------------------------ */

export function SettingsView({
  section = "overview",
  onSectionChange,
}: {
  section?: SettingsSectionId;
  onSectionChange?: (section: SettingsSectionId) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    bodyRef.current?.scrollTo({ top: 0 });
  }, [section]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const go = (s: SettingsSectionId) => onSectionChange?.(s);

  return (
    <SettingsActionsContext.Provider value={{ notify }}>
    <div className="settings-view">
      <nav aria-label="Settings sections" className="sv-rail">
        <button className="sv-rail-profile" onClick={() => go("account")} type="button">
          <Avatar name={ME.name} size="sm" tone="success" />
          <span className="sv-rail-profile-copy">
            <span className="sv-rail-profile-top">
              <span className="sv-rail-overline">Signed in</span>
              <span className="sv-rail-profile-badge">
                <KydStatusBadge />
              </span>
            </span>
            <strong>{ME.name}</strong>
            <span className="sv-rail-profile-meta">{CABINET.name}</span>
          </span>
          <span aria-hidden className="sv-rail-profile-go">
            <ChevronRight size={14} variant="stroke" />
          </span>
        </button>
        {SECTIONS.map(({ detail, group, id, label, Icon }, index) => (
          <Fragment key={id}>
            {index === 0 || SECTIONS[index - 1].group !== group ? (
              <p className="sv-rail-group">{group}</p>
            ) : null}
            <button
              aria-current={section === id ? "page" : undefined}
              className={`sv-rail-item${section === id ? " is-active" : ""}`}
              onClick={() => go(id)}
              type="button"
            >
              <span className="sv-rail-ic">
                <Icon size={15} variant={section === id ? "bulk" : "stroke"} />
              </span>
              <span className="sv-rail-text">
                <span className="sv-rail-label">{label}</span>
                {detail ? <span className="sv-rail-detail">{detail}</span> : null}
              </span>
            </button>
          </Fragment>
        ))}
      </nav>
      <div className="sv-body" ref={bodyRef}>
        {section === "overview" && <OverviewSection go={go} />}
        {section === "account" && <AccountSection />}
        {section === "cabinet" && <CabinetSection />}
        {section === "members" && <MembersSection />}
        {section === "preferences" && <PreferencesSection />}
        {section === "communications" && <CommunicationsSection />}
        {section === "billing" && <BillingSection />}
        {section === "directory" && <DirectorySection />}
        {section === "esign" && <ESignSection />}
        {section === "security" && <SecuritySection />}
      </div>
      {toast ? (
        <div aria-live="polite" className="sv-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
    </SettingsActionsContext.Provider>
  );
}
