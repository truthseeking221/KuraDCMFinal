"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Book,
  CheckShield,
  Corporate,
  CreditCard,
  Download,
  Edit,
  Home,
  IDCard,
  Lock,
  Note,
  Setting,
  Upload,
  Users,
} from "@/icons";
import { KYD_STATE_META, VERIFICATION_HREF, useKyd } from "@/components/Verification";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Chip } from "../ui/Chip";
import { ChoiceList } from "../ui/ChoiceList";
import { SegmentedToggle } from "../ui/SegmentedToggle";
import "./SettingsView.css";

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
  courier: "Route PP-04 · Mon / Wed / Fri · 16:00 pickup",
};

const MEMBERS = [
  { name: "Phong Tuy", role: "Owner · Doctor", you: true },
  { name: "Sophea Lim", role: "Doctor" },
  { name: "Ratha Kim", role: "Care coordinator" },
  { name: "Dara Sok", role: "Phlebotomist" },
  { name: "Mealea Chan", role: "Reception" },
];

const PENDING_INVITE = { name: "Visal Nuon", role: "Accountant", sent: "invited 2 days ago" };

const CHANNELS = [
  { name: "Telegram", note: "Default — 92% of patients reachable", state: "active" as const },
  { name: "SMS", note: "Fallback after 30 min unread", state: "fallback" as const },
  { name: "Email", note: "Fallback — receipts and documents", state: "fallback" as const },
  { name: "Zalo", note: "Not yet available in Cambodia", state: "soon" as const },
  { name: "WhatsApp", note: "Not yet available in Cambodia", state: "soon" as const },
  { name: "Viber", note: "Not yet available in Cambodia", state: "soon" as const },
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
          action={
            <Button intent="outline" size="sm" leadingIcon={<Upload size={14} variant="stroke" />}>
              Upload renewal
            </Button>
          }
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
        <Row
          action={
            <Button intent="ghost" size="sm">
              Change route
            </Button>
          }
          label="Courier pickup"
          value={CABINET.courier}
        />
      </div>
      <Banner title="Country is locked after registration" tone="info">
        Billing rails, insurer contracts, and lab logistics are provisioned per country. Contact
        Kura support to migrate a cabinet across borders.
      </Banner>
    </Section>
  );
}

function MembersSection() {
  const [invitePending, setInvitePending] = useState(true);
  return (
    <Section
      chip={<Badge tone="neutral">5 active</Badge>}
      id="members"
      sub="Roles scope what each member can see and do. All PHI access is logged."
      title="Members & access"
    >
      <div className="sv-rows">
        {MEMBERS.map((m) => (
          <div className="sv-row sv-member" key={m.name}>
            <span className="sv-row-label sv-member-id">
              <Avatar name={m.name} size="xs" tone={m.you ? "success" : "neutral"} />
              {m.name}
              {m.you ? <span className="sv-you">you</span> : null}
            </span>
            <span className="sv-row-value">
              <span className="sv-row-main">{m.role}</span>
            </span>
            <span className="sv-row-action">
              <Button disabled={m.you} intent="ghost" size="sm">
                Edit role
              </Button>
            </span>
          </div>
        ))}
        {invitePending ? (
          <div className="sv-row sv-member sv-member-pending">
            <span className="sv-row-label sv-member-id">
              <Avatar name={PENDING_INVITE.name} size="xs" tone="warning" />
              {PENDING_INVITE.name}
            </span>
            <span className="sv-row-value">
              <span className="sv-row-main sv-inline">
                {PENDING_INVITE.role} <Badge tone="warning">Pending</Badge>
              </span>
              <span className="sv-row-sub">{PENDING_INVITE.sent}</span>
            </span>
            <span className="sv-row-action sv-inline">
              <Button intent="outline" size="sm" onClick={() => setInvitePending(false)}>
                Approve
              </Button>
              <Button intent="ghost" size="sm" onClick={() => setInvitePending(false)}>
                Revoke
              </Button>
            </span>
          </div>
        ) : null}
      </div>
      <Banner title="You are the sole owner" tone="info">
        Transfer ownership to another verified doctor before leaving this cabinet — a cabinet
        cannot operate without an owner of record.
      </Banner>
      <div className="sv-section-foot">
        <Button size="sm">Invite member</Button>
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

function CommunicationsSection() {
  return (
    <Section
      id="communications"
      sub={`Channel order follows the cabinet country (${CABINET.country}). Patients can opt out per channel.`}
      title="Patient communications"
    >
      <div className="sv-rows">
        {CHANNELS.map((c, i) => (
          <div className={`sv-row sv-channel${c.state === "soon" ? " is-soon" : ""}`} key={c.name}>
            <span className="sv-row-label sv-channel-rank">
              {c.state === "soon" ? <span className="sv-rank sv-rank-soon">·</span> : <span className="sv-rank">{i + 1}</span>}
              {c.name}
            </span>
            <span className="sv-row-value">
              <span className="sv-row-sub">{c.note}</span>
            </span>
            <span className="sv-row-action">
              {c.state === "active" ? (
                <Badge tone="success">Default</Badge>
              ) : c.state === "fallback" ? (
                <Badge tone="neutral">Fallback</Badge>
              ) : (
                <Badge tone="neutral">Soon</Badge>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="sv-block">
        <p className="sv-block-title">Notification templates</p>
        <div className="sv-rows">
          {TEMPLATES.map((t) => (
            <Row
              action={
                <Button intent="ghost" size="sm" leadingIcon={<Edit size={14} variant="stroke" />}>
                  Edit
                </Button>
              }
              key={t}
              label={t}
              value={<span className="sv-row-sub">Khmer + English · sent via the active channel</span>}
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
        <Button intent="outline" size="sm" leadingIcon={<Download size={14} variant="stroke" />}>
          Download
        </Button>
      </div>
    </Section>
  );
}

function BillingSection() {
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
        <Row
          action={
            <Button intent="ghost" size="sm">
              Change cap
            </Button>
          }
          label="Auto-pay cap"
          sub="Lab orders above the cap need manual confirmation"
          value="$500.00 per order"
        />
      </div>
      <div className="sv-section-foot">
        <Button intent="outline" size="sm" leadingIcon={<Download size={14} variant="stroke" />}>
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
          action={
            <Button intent="ghost" size="sm">
              Change photo
            </Button>
          }
          label="Photo"
          value={
            <span className="sv-id">
              <Avatar name="Phong Tuy" size="md" tone="success" />
              Shown on your public profile
            </span>
          }
        />
        <Row label="Public name & credentials" locked sub="From the CMC register" value={`${ME.name} · ${ME.license}`} />
        <Row
          action={
            <Button intent="ghost" size="sm">
              Edit hours
            </Button>
          }
          label="Hours"
          value="Mon – Sat · 8:00 – 17:30"
        />
        <Row
          label="Languages"
          value={
            <span className="sv-inline sv-wrap">
              <Chip>ភាសាខ្មែរ</Chip>
              <Chip>English</Chip>
            </span>
          }
        />
        <Row
          label="Services"
          value={
            <span className="sv-inline sv-wrap">
              <Chip>Diabetes care</Chip>
              <Chip>CKD management</Chip>
              <Chip>Hypertension</Chip>
            </span>
          }
        />
        <Row
          action={
            <Button intent="ghost" size="sm">
              Edit bio
            </Button>
          }
          label="Bio"
          value="Endocrinologist focused on long-term diabetes and kidney care in Phnom Penh."
        />
        <Row label="Reviews" locked sub="Collected after completed visits" value="4.8 ★ · 32 reviews" />
      </div>
    </Section>
  );
}

function ESignSection() {
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
          action={
            <Button intent="ghost" size="sm">
              Replace
            </Button>
          }
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
        <Button intent="outline" size="sm">
          Open signing log
        </Button>
      </div>
    </Section>
  );
}

function SecuritySection() {
  const [stepUp, setStepUp] = useState(true);
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
          <Row
            action={
              <Button intent="ghost" size="sm">
                Revoke
              </Button>
            }
            label="iPhone 15 · Telegram linked"
            sub="Last active today · 08:55"
            value={<span className="sv-row-sub">Mobile companion</span>}
          />
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
        <Button intent="outline" size="sm">
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

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    bodyRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const go = (s: SettingsSectionId) => onSectionChange?.(s);

  return (
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
    </div>
  );
}
