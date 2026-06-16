"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Book,
  CheckShield,
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
import { KYD_STATE_META, VERIFICATION_HREF, VerificationStatusBanner, useKyd } from "@/components/Verification";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Chip } from "../ui/Chip";
import { ChoiceList } from "../ui/ChoiceList";
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
  const router = useRouter();
  return (
    <Button intent="outline" size="sm" onClick={() => router.push(VERIFICATION_HREF)}>
      Open verification
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

type SectionTone = "neutral" | "info" | "success" | "warning";

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  detail: string;
  group: string;
  Icon: typeof Home;
}> = [
  {
    id: "overview",
    label: "Overview",
    detail: "Status and next actions",
    group: "Workspace",
    Icon: Home,
  },
  {
    id: "account",
    label: "Account & verification",
    detail: "Identity and license",
    group: "Workspace",
    Icon: IDCard,
  },
  {
    id: "cabinet",
    label: "Cabinet",
    detail: "Clinic and logistics",
    group: "Workspace",
    Icon: Corporate,
  },
  {
    id: "members",
    label: "Members & access",
    detail: "Roles and invites",
    group: "Workspace",
    Icon: Users,
  },
  {
    id: "preferences",
    label: "Preferences",
    detail: "Local display defaults",
    group: "Workspace",
    Icon: Setting,
  },
  {
    id: "communications",
    label: "Patient communications",
    detail: "Channels and templates",
    group: "Operations",
    Icon: Bell,
  },
  {
    id: "billing",
    label: "Billing & settlement",
    detail: "Bank, KHQR, insurers",
    group: "Operations",
    Icon: CreditCard,
  },
  {
    id: "directory",
    label: "Directory profile",
    detail: "Public patient listing",
    group: "Operations",
    Icon: Book,
  },
  {
    id: "esign",
    label: "e-Signature",
    detail: "Certificate and PDFs",
    group: "Trust",
    Icon: Note,
  },
  {
    id: "security",
    label: "Security & audit",
    detail: "Sessions and PHI log",
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
  tier: "Verified clinician",
};

const CABINET = {
  name: "Kura Cabinet — Toul Kork",
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
  { name: "Telegram", note: "Default — 92% of patients reachable", state: "active" },
  { name: "SMS", note: "Fallback after 30 min unread", state: "fallback" },
  { name: "Email", note: "Fallback — receipts and documents", state: "fallback" },
];

const TEMPLATES = ["Results ready", "Follow-up reminder", "Booking confirmation"];

const SIGNATURES = [
  { doc: "e-Prescription #2841", when: "Jun 10, 2026 · 14:32" },
  { doc: "Lab requisition FZ-38245", when: "Jun 9, 2026 · 09:18" },
  { doc: "Dx letter — Sokha Chan", when: "Jun 2, 2026 · 16:05" },
];

const AUDIT_EVENTS = [
  { what: "Exported lab history PDF (watermarked)", who: "You", when: "Today · 09:12" },
  { what: "Viewed Sokha Chan record", who: "Ratha Kim", when: "Yesterday · 17:40" },
  { what: "Invite sent to Visal Nuon (Accountant)", who: "You", when: "2 days ago" },
  { what: "Bank account verified — ABA ···· 4102", who: "Kura", when: "May 28, 2026" },
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
          <span className="sv-lock" title="Verified by Kura — not editable">
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

function JumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="sv-jump" onClick={onClick} type="button">
      Manage
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

  const save = () => {
    const next = draft.trim();
    if (next) setValue(next);
    setEditing(false);
    notify(`${label} updated`);
  };

  if (editing) {
    return (
      <Row
        action={
          <span className="sv-inline">
            <Button intent="primary" onClick={save} size="sm">
              Save
            </Button>
            <Button intent="ghost" onClick={() => setEditing(false)} size="sm">
              Cancel
            </Button>
          </span>
        }
        label={label}
        sub={sub}
        value={
          multiline ? (
            <textarea
              autoFocus
              className="sv-edit-input sv-edit-area"
              onChange={(e) => setDraft(e.currentTarget.value)}
              rows={3}
              value={draft}
            />
          ) : (
            <input
              autoFocus
              className="sv-edit-input"
              inputMode={numeric ? "numeric" : undefined}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              value={draft}
            />
          )
        }
      />
    );
  }

  return (
    <Row
      action={
        <Button className={actionClassName} intent="ghost" onClick={() => { setDraft(value); setEditing(true); }} size="sm">
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
                      {route.label} - {route.detail}
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

/* Real file picker. No upload endpoint exists in the prototype, so it
   acknowledges the choice locally (filename + toast) the way an upload would. */
function FileButton({
  label,
  accept,
  intent = "outline",
  icon,
  className,
}: {
  label: string;
  accept?: string;
  intent?: "outline" | "ghost";
  icon?: ReactNode;
  className?: string;
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
          if (file) notify(`${file.name} selected`);
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

  const remove = (item: string) => {
    setItems((list) => list.filter((x) => x !== item));
    notify(`${item} removed`);
  };
  const cancel = () => {
    setAdding(false);
    setDraft("");
  };
  const add = () => {
    const next = draft.trim();
    if (next && !items.includes(next)) {
      setItems((list) => [...list, next]);
      notify(`${next} added`);
    }
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
            <Chip key={item} onClick={() => remove(item)} onRemove={() => remove(item)} variant="removable">
              {item}
            </Chip>
          ))}
          {items.length === 0 ? <span className="sv-row-sub">None listed</span> : null}
          {adding ? (
            <span className="sv-chip-add">
              <input
                autoFocus
                className="sv-edit-input"
                onChange={(e) => setDraft(e.currentTarget.value)}
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
            </span>
          ) : null}
        </span>
      }
    />
  );
}

function OverviewTile({
  Icon,
  label,
  meta,
  tone = "neutral",
  value,
}: {
  Icon: typeof Home;
  label: string;
  meta: string;
  tone?: SectionTone;
  value: string;
}) {
  return (
    <article className={`sv-overview-tile sv-overview-tile--${tone}`}>
      <span className="sv-overview-ic" aria-hidden="true">
        <Icon size={17} variant="stroke" />
      </span>
      <span className="sv-overview-label">{label}</span>
      <strong>{value}</strong>
      <span className="sv-overview-meta">{meta}</span>
    </article>
  );
}

/* --------------------------------- sections --------------------------------- */

function OverviewSection({ go }: { go: (s: SettingsSectionId) => void }) {
  return (
    <Section
      id="overview"
      sub="Who you are, where you practice, and what still needs attention."
      title="Overview"
    >
      <Banner
        actions={
          <Button intent="outline" size="sm" onClick={() => go("account")}>
            Review license
          </Button>
        }
        title="Medical license renews in 38 days"
        tone="warning"
      >
        CMC 048-2019 expires {ME.licenseExpiry}. Upload the renewed license before expiry to keep
        e-prescribing active.
      </Banner>
      <div aria-label="Settings status summary" className="sv-overview-grid">
        <OverviewTile
          Icon={IDCard}
          label="License renewal"
          meta={`${ME.license} · ${ME.licenseExpiry}`}
          tone="warning"
          value="38 days"
        />
        <OverviewTile
          Icon={Users}
          label="Cabinet access"
          meta="1 invite pending"
          tone="info"
          value="5 members"
        />
        <OverviewTile
          Icon={CreditCard}
          label="Next settlement"
          meta="Netting run · Jul 1"
          tone="success"
          value="+$236.00"
        />
        <OverviewTile
          Icon={CheckShield}
          label="Signing certificate"
          meta="CamDX root · PAdES-B-LT"
          tone="success"
          value="Active"
        />
      </div>
      <div className="sv-rows">
        <Row
          action={<JumpButton onClick={() => go("account")} />}
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
          sub="Medical licence — manage on the verification page"
        />
        <Row
          action={<JumpButton onClick={() => go("cabinet")} />}
          label="Cabinet"
          sub="Phnom Penh · GMT+7"
          value={CABINET.name}
        />
        <Row
          action={<JumpButton onClick={() => go("members")} />}
          label="Members"
          sub="1 invite pending approval"
          value="5 active members"
        />
        <Row
          action={<JumpButton onClick={() => go("billing")} />}
          label="Billing"
          sub="KHQR active · next netting Jul 1"
          value={
            <span className="sv-inline">
              Bank verified <Badge tone="success">ABA ···· 4102</Badge>
            </span>
          }
        />
        <Row
          action={<JumpButton onClick={() => go("esign")} />}
          label="e-Signature"
          sub="PAdES-B-LT · CamDX root"
          value={<span className="sv-inline">Certificate active until Mar 2027</span>}
        />
      </div>
    </Section>
  );
}

function AccountSection() {
  return (
    <Section
      chip={<KydStatusBadge />}
      id="account"
      sub="Identity, license, and verification tier. Kura verifies these against the CMC register."
      title="Account & verification"
    >
      <div className="sv-rows">
        <Row label="Email" value={ME.email} sub="Used for sign-in and statements" />
        <Row label="Clinician name" value={ME.name} sub={ME.khmerName} locked />
        <Row
          action={<FileButton accept=".pdf,.jpg,.jpeg,.png" icon={<Upload size={14} variant="stroke" />} label="Upload renewal" />}
          label="Medical license"
          sub={`Expires ${ME.licenseExpiry}`}
          value={
            <span className="sv-inline">
              {ME.license} <Badge tone="warning">Renews in 38 days</Badge>
            </span>
          }
          locked
        />
        <Row
          action={<OpenVerificationButton />}
          label="Medical licence verification"
          sub="Explorer → Verified clinician → Billing-enabled"
          value={<KydStatusBadge />}
        />
        <Row
          label="Re-verification"
          sub="Last verified Mar 14, 2026"
          value={<span className="sv-inline">Not required</span>}
        />
        <Row
          label="Signature & certificate"
          sub="Managed under e-Signature & documents"
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
  const [inviting, setInviting] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES[0]);

  const saveRole = (name: string) => {
    setMembers((list) => list.map((m) => (m.name === name ? { ...m, role: roleDraft } : m)));
    setEditingName(null);
    notify(`${name}'s role updated`);
  };
  const approve = (invite: PendingInvite) => {
    setPending((list) => list.filter((p) => p.name !== invite.name));
    setMembers((list) => [...list, { name: invite.name, role: invite.role }]);
    notify(`${invite.name} approved as ${invite.role}`);
  };
  const revoke = (name: string) => {
    setPending((list) => list.filter((p) => p.name !== name));
    notify(`Invite to ${name} revoked`);
  };
  const sendInvite = () => {
    const name = inviteName.trim();
    if (!name) return;
    setPending((list) => [...list, { name, role: inviteRole, sent: "invited just now" }]);
    setInviting(false);
    setInviteName("");
    setInviteRole(ROLES[0]);
    notify(`Invite sent to ${name}`);
  };

  return (
    <Section
      chip={<Badge tone="neutral">{members.length} active</Badge>}
      id="members"
      sub="Roles scope what each member can see and do. All PHI access is logged."
      title="Members & access"
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
                  <Button intent="primary" onClick={() => saveRole(m.name)} size="sm">
                    Save
                  </Button>
                  <Button intent="ghost" onClick={() => setEditingName(null)} size="sm">
                    Cancel
                  </Button>
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
              <Button intent="outline" onClick={() => approve(invite)} size="sm">
                Approve
              </Button>
              <Button className="sv-link-action" intent="ghost" onClick={() => revoke(invite.name)} size="sm">
                Revoke
              </Button>
            </span>
          </div>
        ))}
      </div>
      <Banner title="You are the sole owner" tone="info">
        Transfer ownership to another verified doctor before leaving this cabinet — a cabinet
        cannot operate without an owner of record.
      </Banner>
      <div className="sv-section-foot">
        {inviting ? (
          <div className="sv-invite-form">
            <input
              autoFocus
              className="sv-edit-input"
              onChange={(e) => setInviteName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendInvite();
                if (e.key === "Escape") setInviting(false);
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
            <Button intent="ghost" onClick={() => setInviting(false)} size="md">
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setInviting(true)} size="sm">
            Invite member
          </Button>
        )}
      </div>
    </Section>
  );
}

function PreferencesSection() {
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

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <Section
      id="preferences"
      sub="Display defaults for this browser. They never change the underlying record."
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
      </div>
      <div className="sv-block">
        <ChoiceList<Prefs["language"]>
          onChange={(v) => set("language", v)}
          options={[
            { label: "English", value: "en" },
            {
              helpText: "Clinical terms, drug names, and lab codes stay in English",
              label: "ភាសាខ្មែរ (Khmer)",
              value: "km",
            },
          ]}
          title="Language"
          value={prefs.language}
        />
      </div>
      <div className="sv-block">
        <p className="sv-block-title">Clinical display</p>
        <Checkbox
          checked={prefs.inlineRef}
          label="Show reference ranges inline"
          onChange={(e) => set("inlineRef", e.currentTarget.checked)}
        />
        <Checkbox
          checked={prefs.collapseNormal}
          helpText="Out-of-range results always stay expanded"
          label="Collapse normal results by default"
          onChange={(e) => set("collapseNormal", e.currentTarget.checked)}
        />
        <Checkbox
          checked={prefs.clock24}
          label="Use 24-hour time"
          onChange={(e) => set("clock24", e.currentTarget.checked)}
        />
      </div>
      <p className="sv-foot-note">Preferences save automatically to this browser.</p>
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
      title="Patient communications"
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
              initialValue="Khmer + English · sent via the active channel"
              key={t}
              label={t}
              multiline
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

function BillingSection() {
  const { notify } = useSettingsActions();
  return (
    <Section
      chip={<Badge tone="success">Settlement active</Badge>}
      id="billing"
      sub="How patient payments and insurer claims settle to your account."
      title="Billing & settlement"
    >
      <div className="sv-rows">
        <Row
          label="Bank account"
          sub="Verified May 28, 2026 via micro-deposit"
          value={
            <span className="sv-inline">
              ABA ···· 4102 <Badge tone="success">Verified</Badge>
            </span>
          }
        />
        <Row
          label="KHQR"
          sub="Patients pay by scan at the cabinet"
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
          sub="Panel status is managed by each insurer"
        />
        <Row
          label="Monthly netting"
          sub="Claims minus lab costs, settled monthly"
          value="Next run Jul 1 · est. +$236.00"
        />
        <EditRow
          actionLabel="Change cap"
          initialValue="$500.00 per order"
          label="Auto-pay cap"
          numeric
          sub="Lab orders above the cap need manual confirmation"
        />
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
        <EditRow actionClassName="sv-link-action" actionLabel="Edit hours" initialValue="Mon – Sat · 8:00 – 17:30" label="Hours" />
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
      title="e-Signature & documents"
    >
      <div className="sv-rows">
        <Row label="Signing provider" value="Kura Sign · CamDX qualified" />
        <Row
          label="Certificate"
          sub="Auto-renews 30 days before expiry"
          value={
            <span className="sv-inline">
              Active until Mar 2027 <Badge tone="success">Valid</Badge>
            </span>
          }
        />
        <Row label="PAdES profile" sub="Long-term validation embedded in each PDF" value="PAdES-B-LT" />
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
          value="Cabinet letterhead v2 — applied to all signed documents"
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
          Open signing log
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
  const revoke = (id: string, label: string) => {
    setSessions((list) => list.filter((s) => s.id !== id));
    notify(`Signed out ${label}`);
  };
  const signOutOthers = () => {
    setSessions([]);
    notify("Signed out all other sessions");
  };
  return (
    <Section
      id="security"
      sub="Sessions, sensitive-action protection, and the audit trail for this cabinet."
      title="Security & audit"
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
                <Button className="sv-link-action" intent="ghost" onClick={() => revoke(s.id, s.label)} size="sm">
                  Revoke
                </Button>
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
          helpText="Re-authentication is required for PHI exports, bank changes, and member role changes"
          label="Step-up auth for sensitive actions"
          onChange={(e) => setStepUp(e.currentTarget.checked)}
        />
      </div>
      <Banner title="PHI exports are watermarked and logged" tone="warning">
        Every export carries your identity and timestamp. Patients can request the access log for
        their record at any time.
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
        <Button disabled={sessions.length === 0} intent="outline" onClick={signOutOthers} size="sm">
          Sign out all other sessions
        </Button>
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
        <div className="sv-rail-profile">
          <Avatar name={ME.name} size="sm" tone="success" />
          <span className="sv-rail-profile-copy">
            <span className="sv-rail-overline">Signed in</span>
            <strong>{ME.name}</strong>
            <span>{CABINET.name}</span>
          </span>
          <span className="sv-rail-profile-badge">
            <KydStatusBadge />
          </span>
        </div>
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
                <span className="sv-rail-detail">{detail}</span>
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
