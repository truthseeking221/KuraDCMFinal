"use client";

/* SettingsSection(sectionId) — one vertical mobile form per settings section,
   mirroring the desktop SettingsView content in mobile-native shapes (hairline
   form rows, inline editors, SegmentedToggle/Chip lists, toggle switches). It
   is a pushed view; the shell supplies the back-header. No click is a no-op:
   inline edits commit to local state, files run a real picker, exports build a
   Blob download, and every action confirms with a toast.

   Account is P1 (full identity + verification). The remaining sections are
   lighter but complete: each surfaces its real desktop fields and one obvious
   action. Prototype — no backend; Preferences persist to localStorage. */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { CheckShield, Close, Plus, Share, Upload } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { Pill, type Tone } from "@/components/DoctorMobile/components/primitives";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useKyd } from "@/components/DoctorMobile/data/kyd";
import styles from "./More.module.css";

/* ------------------------------- section index ------------------------------ */

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

export const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  detail: string;
  group: "Workspace" | "Operations" | "Trust";
}> = [
  { id: "overview", label: "Overview", detail: "Status and next actions", group: "Workspace" },
  { id: "account", label: "Account & verification", detail: "Identity and license", group: "Workspace" },
  { id: "cabinet", label: "Cabinet", detail: "Clinic and logistics", group: "Workspace" },
  { id: "members", label: "Team access", detail: "Roles and invites", group: "Workspace" },
  { id: "preferences", label: "Preferences", detail: "Local display defaults", group: "Workspace" },
  { id: "communications", label: "Patient messages", detail: "Channels and templates", group: "Operations" },
  { id: "billing", label: "Payments", detail: "Bank, KHQR, insurers", group: "Operations" },
  { id: "directory", label: "Directory profile", detail: "Public patient listing", group: "Operations" },
  { id: "esign", label: "Signed documents", detail: "Certificate and signed PDFs", group: "Trust" },
  { id: "security", label: "Security", detail: "Sessions and PHI log", group: "Trust" },
];

const SECTION_BY_ID = Object.fromEntries(SETTINGS_SECTIONS.map((s) => [s.id, s])) as Record<
  SettingsSectionId,
  (typeof SETTINGS_SECTIONS)[number]
>;

/* --------------------------------- fixtures -------------------------------- */

const ME = {
  name: "Dr. Phong Tuy",
  khmerName: "វេជ្ជបណ្ឌិត ភុង ទុយ",
  email: "leon@kura.med",
  license: "CMC 048-2019",
  licenseExpiry: "Jul 20, 2026",
  licenseExpiryIso: "2026-07-20",
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
  currency: "USD · KHR at NBC rate",
};

const MEMBERS = [
  { name: "Phong Tuy", role: "Owner · Doctor", you: true },
  { name: "Sophea Lim", role: "Doctor" },
  { name: "Ratha Kim", role: "Care coordinator" },
  { name: "Dara Sok", role: "Phlebotomist" },
  { name: "Mealea Chan", role: "Reception" },
];

const CHANNELS = [
  { name: "Telegram", note: "Default for 92% of reachable patients", state: "active" as const },
  { name: "SMS", note: "Fallback after 30 min unread", state: "fallback" as const },
  { name: "Email", note: "Fallback for receipts and documents", state: "fallback" as const },
];

const TEMPLATES = ["Results ready", "Follow up reminder", "Booking confirmation"];

const TEMPLATE_COPY: Record<string, string> = {
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

/* --------------------------------- helpers --------------------------------- */

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

/* ----------------------------- reusable form bits -------------------------- */

function FormRow({
  label,
  value,
  sub,
  aside,
  locked,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className={styles.formRow}>
      <span className={styles.formMain}>
        <span className={styles.formLabel}>
          {label}
          {locked ? <CheckShield size={11} variant="stroke" aria-label="Verified by Kura" /> : null}
        </span>
        <span className={styles.formValue}>{value}</span>
        {sub != null ? <span className={styles.formSub}>{sub}</span> : null}
      </span>
      {aside != null ? <span className={styles.formAside}>{aside}</span> : null}
    </div>
  );
}

function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={base.textButton} onClick={onClick}>
      {children}
    </button>
  );
}

/* inline edit — flips a value into a field with Save / Cancel; commits to local
   state and toasts. multiline + numeric variants. */
function EditRow({
  label,
  initialValue,
  sub,
  actionLabel = "Edit",
  multiline = false,
  numeric = false,
}: {
  label: string;
  initialValue: string;
  sub?: ReactNode;
  actionLabel?: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
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
    toast.success(`${label} updated`);
  };
  const cancel = () => {
    setDraft(value);
    setError("");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={styles.stackRow}>
        <span className={styles.formLabel}>{label}</span>
        <span className={styles.editField}>
          {multiline ? (
            <textarea
              autoFocus
              aria-invalid={Boolean(error)}
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                if (error) setError("");
              }}
            />
          ) : (
            <input
              autoFocus
              aria-invalid={Boolean(error)}
              inputMode={numeric ? "numeric" : undefined}
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
                if (event.key === "Escape") cancel();
              }}
            />
          )}
          {error ? <span className={styles.formSub}>{error}</span> : null}
          <span className={styles.editActions}>
            <button type="button" className={base.primaryButton} onClick={save} disabled={!draft.trim()}>
              Save
            </button>
            <button type="button" className={base.secondaryButton} onClick={cancel}>
              Cancel
            </button>
          </span>
        </span>
      </div>
    );
  }

  return (
    <FormRow
      label={label}
      value={value}
      sub={sub}
      aside={
        <LinkButton
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {actionLabel}
        </LinkButton>
      }
    />
  );
}

/* toggle switch row */
function ToggleRow({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string;
  detail?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleBody}>
        <strong>{title}</strong>
        {detail ? <span>{detail}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={cx(styles.switch, checked && styles.switchOn)}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchKnob} aria-hidden="true" />
      </button>
    </div>
  );
}

/* removable chip list with an inline add field */
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
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const remove = (item: string) => {
    setItems((list) => list.filter((value) => value !== item));
    toast.success(`${item} removed`);
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
    toast.success(`${next} added`);
    cancel();
  };

  return (
    <div className={styles.stackRow}>
      <span className={styles.formLabel}>{label}</span>
      <span className={styles.chipWrap}>
        {items.map((item) => (
          <span key={item} className={styles.tagChip}>
            {item}
            <button
              type="button"
              className={styles.tagRemove}
              aria-label={`Remove ${item}`}
              onClick={() => remove(item)}
            >
              <Close size={13} variant="stroke" aria-hidden="true" />
            </button>
          </span>
        ))}
        {adding ? (
          <span className={styles.editField} style={{ width: "100%" }}>
            <input
              autoFocus
              aria-invalid={Boolean(error)}
              placeholder={placeholder}
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") add();
                if (event.key === "Escape") cancel();
              }}
            />
            <span className={styles.editActions}>
              <button type="button" className={base.primaryButton} onClick={add}>
                Add
              </button>
              <button type="button" className={base.secondaryButton} onClick={cancel}>
                Cancel
              </button>
            </span>
            {error ? <span className={styles.formSub}>{error}</span> : null}
          </span>
        ) : (
          <button type="button" className={styles.addTag} onClick={() => setAdding(true)}>
            <Plus size={13} variant="stroke" aria-hidden="true" />
            {addLabel}
          </button>
        )}
      </span>
    </div>
  );
}

/* real file picker — no upload endpoint, so it acknowledges locally + toasts */
function FileButton({
  label,
  accept,
  onSelected,
}: {
  label: string;
  accept?: string;
  onSelected?: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.hiddenInput}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            onSelected?.(file);
            toast.success(`${file.name} selected`);
          }
          event.currentTarget.value = "";
        }}
      />
      <button type="button" className={base.secondaryButton} onClick={() => inputRef.current?.click()}>
        <Upload size={14} variant="stroke" aria-hidden="true" />
        {label}
      </button>
    </>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className={styles.groupLabel}>{children}</p>;
}

function Callout({ tone, title, children }: { tone: Tone; title: string; children: ReactNode }) {
  return (
    <div className={cx(base.banner, calloutTone(tone))}>
      <span className={styles.calloutBody}>
        <strong className={styles.calloutTitle}>{title}</strong>
        <span>{children}</span>
      </span>
    </div>
  );
}

function calloutTone(tone: Tone): string {
  switch (tone) {
    case "info":
    case "brand":
      return base.reflexCard;
    case "success":
      return base.noteStatus;
    default:
      return "";
  }
}

/* --------------------------------- sections -------------------------------- */

function KydPill() {
  const { meta } = useKyd();
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

function OverviewSection() {
  const { openSettings, openVerification } = useMobileApp();
  return (
    <>
      <Callout tone="neutral" title={`Medical license renews in ${LICENSE_RENEWAL_TEXT}`}>
        {ME.license} expires {ME.licenseExpiry}. Upload the renewed license before expiry to keep
        prescribing active.
      </Callout>
      <div className={base.cardGroup}>
        <FormRow
          label="Signed in as"
          value={ME.name}
          sub={ME.email}
          aside={<LinkButton onClick={() => openSettings("account")}>Edit account</LinkButton>}
        />
        <FormRow
          label="Verification"
          value={<KydPill />}
          sub="Medical license and identity review"
          aside={<LinkButton onClick={openVerification}>Verify license</LinkButton>}
        />
        <FormRow
          label="Cabinet"
          value={CABINET.name}
          sub="Phnom Penh · GMT+7"
          aside={<LinkButton onClick={() => openSettings("cabinet")}>Edit clinic</LinkButton>}
        />
        <FormRow
          label="Team"
          value="5 active members"
          sub="1 invite pending approval"
          aside={<LinkButton onClick={() => openSettings("members")}>Review team</LinkButton>}
        />
        <FormRow
          label="Payments"
          value={<span>Bank verified <Pill tone="success">ABA ···· 4102</Pill></span>}
          sub="KHQR active · next netting Jul 1"
          aside={<LinkButton onClick={() => openSettings("billing")}>View payments</LinkButton>}
        />
      </div>
    </>
  );
}

function AccountSection() {
  const { meta } = useKyd();
  const { openVerification } = useMobileApp();
  const [renewalFile, setRenewalFile] = useState<string | null>(null);
  const VerIcon = meta.Icon;
  return (
    <>
      <div className={base.statusPanel}>
        <span className={base.statusPanelHead}>
          <span className={cx(base.statusPanelIcon, statusTile(meta.tone))} aria-hidden="true">
            <VerIcon size={18} variant="stroke" />
          </span>
          <span>
            <h2>{meta.headline}</h2>
            <p>{meta.body}</p>
          </span>
        </span>
        <button type="button" className={base.primaryButton} onClick={openVerification}>
          {meta.cta ?? "Verify license"}
        </button>
      </div>

      <GroupLabel>Identity</GroupLabel>
      <div className={base.cardGroup}>
        <EditRow label="Email" initialValue={ME.email} sub="Used for sign-in and statements" />
        <FormRow label="Clinician name" value={ME.name} sub={ME.khmerName} locked />
        <FormRow
          label="Medical license"
          value={
            <span>
              {ME.license}{" "}
              <Pill tone={renewalFile ? "info" : "warning"}>
                {renewalFile ? "File selected" : `Renews in ${LICENSE_RENEWAL_TEXT}`}
              </Pill>
            </span>
          }
          sub={renewalFile ? `${renewalFile} selected` : `Expires ${ME.licenseExpiry}`}
          aside={
            <FileButton
              label="Select renewal"
              accept=".pdf,.jpg,.jpeg,.png"
              onSelected={(file) => setRenewalFile(file.name)}
            />
          }
          locked
        />
      </div>

      <GroupLabel>Verification</GroupLabel>
      <div className={base.cardGroup}>
        <FormRow
          label="License verification"
          value={<KydPill />}
          sub="Required for lab orders and payments"
          aside={<LinkButton onClick={openVerification}>Verify license</LinkButton>}
        />
        <FormRow label="Verification check" value="Not required" sub="Last verified Mar 14, 2026" />
        <FormRow
          label="Signature & certificate"
          value={<span><CheckShield size={13} variant="stroke" aria-hidden="true" /> Ready to sign</span>}
          sub="Managed under Signed documents"
        />
      </div>
    </>
  );
}

function CabinetSection() {
  return (
    <>
      <div className={base.cardGroup}>
        <FormRow label="Cabinet name" value={CABINET.name} />
        <FormRow label="Address" value={CABINET.address} />
        <FormRow label="Specialty" value={CABINET.specialty} />
        <FormRow label="Clinic type" value={CABINET.clinicType} />
        <FormRow label="Country" value={CABINET.country} sub="Determines insurer panel and currency" locked />
        <FormRow label="Timezone" value={CABINET.timezone} />
        <FormRow label="Currency" value={CABINET.currency} />
        <EditRow label="Courier pickup" initialValue="Route PP-04 · Mon / Wed / Fri · 16:00 pickup" actionLabel="Change" />
      </div>
      <Callout tone="info" title="Country is locked after registration">
        Billing rails, insurer contracts, and lab logistics are provisioned per country. Contact
        Kura support to migrate a cabinet across borders.
      </Callout>
    </>
  );
}

function MembersSection() {
  const pending = [{ name: "Visal Nuon", role: "Accountant", sent: "invited 2 days ago" }];

  return (
    <>
      <GroupLabel>{MEMBERS.length} active members</GroupLabel>
      <div className={base.cardGroup}>
        {MEMBERS.map((member) => (
          <FormRow
            key={member.name}
            label={member.you ? "You · Owner" : "Member"}
            value={member.name}
            sub={member.role}
          />
        ))}
      </div>

      {pending.length > 0 ? (
        <>
          <GroupLabel>Pending invites</GroupLabel>
          <div className={base.cardGroup}>
            {pending.map((invite) => (
              <FormRow
                key={invite.name}
                label={<span>{invite.role} · Pending</span>}
                value={invite.name}
                sub={invite.sent}
              />
            ))}
          </div>
        </>
      ) : null}

      <Callout tone="info" title="You are the sole owner">
        Transfer ownership to another verified doctor before leaving this cabinet. A cabinet cannot
        operate without an owner of record.
      </Callout>
      <p className={styles.footNote}>Open Kura on desktop to invite members, approve invites, or change roles.</p>
    </>
  );
}

type Prefs = {
  units: "conventional" | "si";
  theme: "light" | "dark" | "system";
  language: "en" | "km";
  inlineRef: boolean;
  collapseNormal: boolean;
  clock24: boolean;
};

const DEFAULT_PREFS: Prefs = {
  units: "conventional",
  theme: "light",
  language: "en",
  inlineRef: true,
  collapseNormal: false,
  clock24: true,
};

const PREFS_KEY = "kura.preferences.v1";

function PreferencesSection() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const loadedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) });
      }
    } catch {
      /* storage unavailable — defaults stand */
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode — stays in-memory */
    }
  }, [prefs]);

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    toast.success("Preferences saved on this device");
  };

  return (
    <>
      <GroupLabel>Display</GroupLabel>
      <div className={base.cardGroup}>
        <div className={styles.stackRow}>
          <span className={styles.formLabel}>Lab units</span>
          <SegmentedToggle<Prefs["units"]>
            value={prefs.units}
            onChange={(value) => set("units", value)}
            options={[
              { label: "Conventional", value: "conventional" },
              { label: "SI", value: "si" },
            ]}
          />
          <span className={styles.formSub}>
            {prefs.units === "si" ? "SI (mmol/L)" : "Conventional (mg/dL)"}. Used in lab history and printouts.
          </span>
        </div>
        <div className={styles.stackRow}>
          <span className={styles.formLabel}>Theme</span>
          <SegmentedToggle<Prefs["theme"]>
            value={prefs.theme}
            onChange={(value) => set("theme", value)}
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "System", value: "system" },
            ]}
          />
        </div>
        <div className={styles.stackRow}>
          <span className={styles.formLabel}>Language</span>
          <SegmentedToggle<Prefs["language"]>
            value={prefs.language}
            onChange={(value) => set("language", value)}
            options={[
              { label: "English", value: "en" },
              { label: "ភាសាខ្មែរ", value: "km" },
            ]}
          />
          <span className={styles.formSub}>Clinical terms, drug names, and lab codes stay in English</span>
        </div>
      </div>

      <GroupLabel>Clinical display</GroupLabel>
      <div className={base.cardGroup}>
        <ToggleRow
          title="Show reference ranges inline"
          checked={prefs.inlineRef}
          onChange={(next) => set("inlineRef", next)}
        />
        <ToggleRow
          title="Collapse normal results by default"
          detail="Abnormal results always stay expanded"
          checked={prefs.collapseNormal}
          onChange={(next) => set("collapseNormal", next)}
        />
        <ToggleRow
          title="Use 24-hour time"
          checked={prefs.clock24}
          onChange={(next) => set("clock24", next)}
        />
      </div>
      <p className={styles.footNote}>Saved on this device.</p>
    </>
  );
}

function CommunicationsSection() {
  return (
    <>
      <GroupLabel>Channel order</GroupLabel>
      <div className={base.cardGroup}>
        {CHANNELS.map((channel, index) => (
          <FormRow
            key={channel.name}
            label={`Priority ${index + 1}`}
            value={
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className={styles.rankBadge}>{index + 1}</span>
                {channel.name}
              </span>
            }
            sub={channel.note}
            aside={
              channel.state === "active" ? (
                <Pill tone="success">Default</Pill>
              ) : (
                <Pill tone="neutral">Fallback</Pill>
              )
            }
          />
        ))}
      </div>

      <GroupLabel>Templates</GroupLabel>
      <div className={base.cardGroup}>
        {TEMPLATES.map((template) => (
          <EditRow
            key={template}
            label={template}
            initialValue={TEMPLATE_COPY[template]}
            sub="Sent through the active channel"
            multiline
          />
        ))}
      </div>

      <div className={styles.shareRow}>
        <span className={styles.shareMark} aria-hidden="true">
          <Share size={20} variant="stroke" />
        </span>
        <span className={styles.shareBody}>
          <strong>Doctor intro QR</strong>
          <span>Patients scan to connect on Telegram and receive results there.</span>
        </span>
        <button
          type="button"
          className={base.secondaryButton}
          onClick={() => {
            downloadTextFile("kura-doctor-intro-qr.txt", "Kura cabinet Telegram intro link", "text/plain");
            toast.success("Doctor intro QR downloaded");
          }}
        >
          Download
        </button>
      </div>
    </>
  );
}

const SETTLEMENT_CSV = [
  "Date,Description,Amount (USD)",
  "2026-06-01,Forte claim batch,+412.00",
  "2026-06-01,Lab costs netted,-176.00",
  "2026-07-01,Net settlement (estimated),+236.00",
].join("\n");

function BillingSection() {
  return (
    <>
      <div className={base.cardGroup}>
        <FormRow
          label="Bank account"
          value={<span>ABA ···· 4102 <Pill tone="success">Verified</Pill></span>}
          sub="Linked in ABA Mobile on May 28, 2026"
        />
        <FormRow
          label="KHQR"
          value={<span>Active <Pill tone="success">Bakong</Pill></span>}
          sub="Patients pay by scan at the cabinet"
        />
        <FormRow
          label="Insurer panels"
          value={
            <span className={styles.chipWrap}>
              <Pill tone="success">Forte · Active</Pill>
              <Pill tone="warning">Sovannaphum · Pending</Pill>
            </span>
          }
          sub="Panel status is managed by each insurer"
        />
        <FormRow label="Monthly netting" value="Next run Jul 1 · est. +$236.00" sub="Claims minus lab costs, settled monthly" />
        <EditRow label="Auto pay cap" initialValue="$500.00 per order" actionLabel="Change cap" numeric sub="Orders above the cap need manual confirmation" />
      </div>
      <button
        type="button"
        className={base.secondaryButton}
        onClick={() => {
          downloadTextFile("kura-settlement.csv", SETTLEMENT_CSV, "text/csv");
          toast.success("Settlement CSV exported");
        }}
      >
        Export settlement CSV
      </button>
    </>
  );
}

function DirectorySection() {
  return (
    <>
      <div className={base.cardGroup}>
        <FormRow
          label="Photo"
          value="Shown on your public profile"
          aside={<FileButton label="Change photo" accept="image/*" />}
        />
        <FormRow label="Public name & credentials" value={`${ME.name} · ${ME.license}`} sub="From the CMC register" locked />
        <EditRow label="Hours" initialValue="Mon to Sat · 8:00 to 17:30" actionLabel="Edit hours" />
        <ChipListRow label="Languages" initial={["ភាសាខ្មែរ", "English"]} addLabel="Add language" placeholder="Language name" />
        <ChipListRow
          label="Services"
          initial={["Diabetes care", "CKD management", "Hypertension"]}
          addLabel="Add service"
          placeholder="Service name"
        />
        <EditRow
          label="Bio"
          initialValue="Endocrinologist focused on long-term diabetes and kidney care in Phnom Penh."
          actionLabel="Edit bio"
          multiline
        />
        <FormRow label="Reviews" value="4.8 ★ · 32 reviews" sub="Collected after completed visits" locked />
      </div>
    </>
  );
}

function ESignSection() {
  return (
    <>
      <div className={base.cardGroup}>
        <FormRow label="Signing provider" value="Kura Sign · CamDX qualified" />
        <FormRow
          label="Certificate"
          value={<span>Active until Mar 2027 <Pill tone="success">Valid</Pill></span>}
          sub="Renews automatically 30 days before expiry"
        />
        <FormRow label="PAdES profile" value="PAdES-B-LT" sub="Long term validation embedded in each PDF" />
      </div>

      <GroupLabel>Recent signatures</GroupLabel>
      <div className={base.cardGroup}>
        {SIGNATURES.map((signature) => (
          <FormRow key={signature.doc} label="Signed" value={signature.doc} sub={signature.when} />
        ))}
      </div>
      <button
        type="button"
        className={base.secondaryButton}
        onClick={() => {
          const csv = ["Document,Signed at", ...SIGNATURES.map((s) => `${s.doc},${s.when}`)].join("\n");
          downloadTextFile("kura-signing-log.csv", csv, "text/csv");
          toast.success("Signing log exported");
        }}
      >
        Export signing log
      </button>
    </>
  );
}

function SecuritySection() {
  const [stepUp, setStepUp] = useState(true);
  const [sessions, setSessions] = useState([
    { id: "iphone", label: "iPhone 15 · Telegram linked", sub: "Last active today · 08:55" },
  ]);
  const revoke = (id: string, label: string) => {
    setSessions((list) => list.filter((s) => s.id !== id));
    toast.success(`Signed out ${label}`);
  };
  const signOutOthers = () => {
    setSessions([]);
    toast.success("Signed out all other sessions");
  };

  return (
    <>
      <GroupLabel>Active sessions</GroupLabel>
      <div className={base.cardGroup}>
        <FormRow
          label="This device"
          value={<span>MacBook Pro · Phnom Penh <Pill tone="success">Current</Pill></span>}
          sub="Chrome · signed in 3 days ago"
        />
        {sessions.map((session) => (
          <FormRow
            key={session.id}
            label="Session"
            value={session.label}
            sub={session.sub}
            aside={<LinkButton onClick={() => revoke(session.id, session.label)}>Revoke</LinkButton>}
          />
        ))}
        {sessions.length === 0 ? (
          <FormRow label="Other sessions" value="Only this device is signed in" />
        ) : null}
      </div>

      <div className={base.cardGroup}>
        <ToggleRow
          title="Require sign in for sensitive actions"
          detail="Sign in again before PHI exports, bank changes, and role changes"
          checked={stepUp}
          onChange={setStepUp}
        />
      </div>

      <Callout tone="neutral" title="PHI exports are watermarked and logged">
        Every export carries your identity and timestamp. Patients can request the access log for
        their record at any time.
      </Callout>

      <GroupLabel>Recent activity</GroupLabel>
      <div className={base.cardGroup}>
        {AUDIT_EVENTS.map((event) => (
          <FormRow key={event.what + event.when} label={event.who} value={event.what} sub={event.when} />
        ))}
      </div>

      <button
        type="button"
        className={styles.dangerButton}
        disabled={sessions.length === 0}
        onClick={signOutOthers}
      >
        Sign out all other sessions
      </button>
    </>
  );
}

function statusTile(tone: Tone): string {
  switch (tone) {
    case "danger":
      return base.tone_danger;
    case "warning":
      return base.tone_warning;
    case "success":
      return base.tone_success;
    case "info":
    case "brand":
      return base.tone_info;
    default:
      return base.tone_neutral;
  }
}

/* ----------------------------------- view ---------------------------------- */

const SECTION_RENDER: Record<SettingsSectionId, () => ReactNode> = {
  overview: OverviewSection,
  account: AccountSection,
  cabinet: CabinetSection,
  members: MembersSection,
  preferences: PreferencesSection,
  communications: CommunicationsSection,
  billing: BillingSection,
  directory: DirectorySection,
  esign: ESignSection,
  security: SecuritySection,
};

function isSettingsSectionId(value: string | undefined): value is SettingsSectionId {
  return value != null && value in SECTION_RENDER;
}

export function SettingsSection({ sectionId }: { sectionId?: string }) {
  const resolved: SettingsSectionId = isSettingsSectionId(sectionId) ? sectionId : "overview";
  const section = SECTION_BY_ID[resolved];
  const Render = SECTION_RENDER[resolved];

  return (
    <section className={base.sectionStack} aria-label={section.label}>
      <header className={base.sectionHeader}>
        <h2>{section.label}</h2>
      </header>
      <Render />
    </section>
  );
}
