"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { KuraLogomark } from "@/icons/brand/KuraLogomark";
import {
  Bell,
  Booking,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Flask,
  Heart,
  Home,
  Info,
  MedicalMask,
  More,
  Note,
  Patient,
  Plus,
  Refresh,
  Search,
  Warning,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import { cx } from "@/lib/cx";
import styles from "./DoctorMobileApp.module.css";

type SectionId = "today" | "patients" | "orders" | "results" | "more";
type OrderStep = "chart" | "select" | "review" | "success";
type SheetKind = "policy" | "reminder" | null;
type IconComponent = ComponentType<IconProps>;

export type DoctorMobileAppProps = {
  initialOrderStep?: OrderStep;
  initialSection?: SectionId;
};

type Task = {
  id: string;
  patient: string;
  meta: string;
  signal: string;
  reason: string;
  action: string;
  tone: "danger" | "warning" | "info" | "success";
  Icon: IconComponent;
  target: SectionId;
};

type TestOption = {
  id: string;
  name: string;
  meta: string;
  detail: string;
  price: string;
};

const navItems = [
  { id: "today", label: "Today", Icon: Home },
  { id: "patients", label: "Patients", Icon: Patient },
  { id: "orders", label: "Orders", Icon: Booking },
  { id: "results", label: "Results", Icon: Flask },
  { id: "more", label: "More", Icon: More },
] satisfies Array<{ id: SectionId; label: string; Icon: IconComponent }>;

const patient = {
  name: "Sokha Chann",
  meta: "54F · MRN KUR-10293",
  dob: "DOB 1972",
  phone: "+855 12 ... 4471",
  problems: ["T2DM", "HTN", "CKD risk"],
  identity: "Phone confirmed",
  allergy: "Allergy unknown",
};

const todayTasks: Task[] = [
  {
    id: "a1c",
    patient: "Sokha Chann · 54F",
    meta: "HbA1c resulted 14:30",
    signal: "HbA1c 9.4% · high",
    reason: "Previous 8.7% · worsening trend",
    action: "Review result",
    tone: "danger",
    Icon: Warning,
    target: "results",
  },
  {
    id: "follow-up",
    patient: "Vanna Kim · 61M",
    meta: "Follow-up due today",
    signal: "BP review overdue",
    reason: "Last reading 152/94 · no recent note",
    action: "Open chart",
    tone: "warning",
    Icon: Clock,
    target: "patients",
  },
  {
    id: "psc",
    patient: "Dara Meas · 43M",
    meta: "Order KO-3842",
    signal: "Awaiting PSC visit",
    reason: "Booking sent yesterday · no sample yet",
    action: "Send reminder",
    tone: "info",
    Icon: Booking,
    target: "orders",
  },
  {
    id: "draft",
    patient: "Chanthy Sok · 36F",
    meta: "Draft note",
    signal: "SOAP draft unsigned",
    reason: "Saved locally · needs review before lock",
    action: "Continue note",
    tone: "success",
    Icon: Note,
    target: "more",
  },
];

const testOptions: TestOption[] = [
  {
    id: "hba1c",
    name: "HbA1c",
    meta: "Diabetes monitoring · due",
    detail: "EDTA whole blood · TAT 6h",
    price: "$7.50",
  },
  {
    id: "lipid",
    name: "Lipid panel",
    meta: "Cardiometabolic follow-up",
    detail: "Serum · fasting preferred · TAT 8h",
    price: "$12.00",
  },
  {
    id: "acr",
    name: "Urine microalbumin / creatinine",
    meta: "CKD risk surveillance",
    detail: "Urine · TAT 12h",
    price: "$9.00",
  },
];

const orderCards = [
  {
    code: "KO-3842",
    patient: "Dara Meas",
    tests: "CBC + CMP + TSH",
    status: "Awaiting PSC visit",
    eta: "Patient has not visited yet",
    payment: "Pay at PSC",
  },
  {
    code: "KO-3819",
    patient: "Sokha Chann",
    tests: "HbA1c + Lipid + Microalbumin",
    status: "Results back",
    eta: "1 abnormal needs review",
    payment: "Insurance ready",
  },
];

export function DoctorMobileApp({
  initialOrderStep = "chart",
  initialSection = "today",
}: DoctorMobileAppProps = {}) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [searchOpen, setSearchOpen] = useState(false);
  const [orderStep, setOrderStep] = useState<OrderStep>(initialOrderStep);
  const [selectedTests, setSelectedTests] = useState<string[]>(["hba1c", "lipid"]);
  const [resultReviewed, setResultReviewed] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const selectedTestRows = useMemo(
    () => testOptions.filter((test) => selectedTests.includes(test.id)),
    [selectedTests],
  );
  const activeNav = navItems.find((item) => item.id === activeSection) ?? navItems[0];

  const toggleTest = (testId: string) => {
    setSelectedTests((current) =>
      current.includes(testId)
        ? current.filter((id) => id !== testId)
        : [...current, testId],
    );
  };

  const jumpToSection = (section: SectionId) => {
    setActiveSection(section);
    if (section !== "patients") {
      setOrderStep("chart");
    }
  };

  const startQuickOrder = () => {
    setActiveSection("patients");
    setOrderStep("select");
  };

  return (
    <main className={styles.viewport}>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <div className={styles.brandLockup}>
            <span className={styles.logoBadge} aria-hidden="true">
              <KuraLogomark width={24} height={20} />
            </span>
            <div>
              <p className={styles.eyebrow}>Mekong Clinic · AM session</p>
              <h1>{activeNav.label}</h1>
            </div>
          </div>
          <div className={styles.topActions}>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Open patient search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} variant="stroke" aria-hidden="true" />
            </button>
            <button className={styles.iconButton} type="button" aria-label="Refresh today">
              <Refresh size={20} variant="stroke" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.syncStrip}>
          <span className={styles.liveDot} aria-hidden="true" />
          Synced 2 min ago · cached clinical tasks available offline
        </div>

        <div className={styles.content}>{renderActiveSection()}</div>

        <nav className={styles.bottomNav} aria-label="Doctor mobile navigation">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={cx(styles.navItem, activeSection === id && styles.navItemActive)}
              type="button"
              aria-pressed={activeSection === id}
              onClick={() => jumpToSection(id)}
            >
              <Icon size={22} variant={activeSection === id ? "solid" : "stroke"} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {searchOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Patient search">
          <div className={styles.searchSheet}>
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.eyebrow}>Search-first directory</p>
                <h2>Find patient</h2>
              </div>
              <button className={styles.textButton} type="button" onClick={() => setSearchOpen(false)}>
                Close
              </button>
            </div>
            <label className={styles.searchBox}>
              <Search size={18} variant="stroke" aria-hidden="true" />
              <input placeholder="Name, Khmer name, phone, MRN" autoFocus />
            </label>
            <div className={styles.sectionStack}>
              <PatientResultCard
                name="Sokha Chann"
                meta="54F · KUR-10293 · last seen 3 days ago"
                signal="HbA1c high · identity phone-confirmed"
                onOpen={() => {
                  setSearchOpen(false);
                  setActiveSection("patients");
                }}
              />
              <PatientResultCard
                name="Vanna Kim"
                meta="61M · KUR-09881 · follow-up due"
                signal="BP review overdue · my panel"
                onOpen={() => {
                  setSearchOpen(false);
                  setActiveSection("patients");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Review action">
          <div className={styles.actionSheet}>
            {sheet === "policy" ? (
              <>
                <div className={styles.sheetIcon}>
                  <Info size={22} variant="stroke" aria-hidden="true" />
                </div>
                <h2>Why this action is locked</h2>
                <ul className={styles.cleanList}>
                  <li>Samples already reached the lab.</li>
                  <li>Payment is marked settled.</li>
                  <li>Call Kura ops to amend this order.</li>
                </ul>
              </>
            ) : (
              <>
                <div className={styles.sheetIcon}>
                  <Bell size={22} variant="stroke" aria-hidden="true" />
                </div>
                <h2>Send patient reminder</h2>
                <p className={styles.muted}>
                  KO-3842 reminder will go to +855 12 ... 4471 by Telegram/SMS.
                </p>
              </>
            )}
            <div className={styles.sheetActions}>
              <button className={styles.primaryButton} type="button" onClick={() => setSheet(null)}>
                Confirm
              </button>
              <button className={styles.secondaryButton} type="button" onClick={() => setSheet(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  function renderActiveSection() {
    switch (activeSection) {
      case "today":
        return <TodayView onTaskPress={jumpToSection} />;
      case "patients":
        return orderStep === "chart" ? (
          <PatientChartView onQuickOrder={startQuickOrder} onStartNote={() => setActiveSection("more")} />
        ) : (
          <QuickOrderFlow
            step={orderStep}
            selectedTests={selectedTests}
            selectedTestRows={selectedTestRows}
            onToggleTest={toggleTest}
            onStepChange={setOrderStep}
          />
        );
      case "orders":
        return <OrdersView onPolicy={() => setSheet("policy")} onReminder={() => setSheet("reminder")} />;
      case "results":
        return (
          <ResultsView
            reviewed={resultReviewed}
            onReview={() => setResultReviewed(true)}
            onOrderAgain={startQuickOrder}
          />
        );
      case "more":
        return <MoreView />;
      default:
        return null;
    }
  }
}

function TodayView({ onTaskPress }: { onTaskPress: (section: SectionId) => void }) {
  return (
    <div className={styles.sectionStack}>
      <section className={styles.priorityBand} aria-labelledby="priority-title">
        <div>
          <p className={styles.eyebrow}>Priority</p>
          <h2 id="priority-title">1 abnormal result needs review</h2>
          <p>HbA1c 9.4% for Sokha Chann · same-day action recommended.</p>
        </div>
        <button className={styles.lightButton} type="button" onClick={() => onTaskPress("results")}>
          Review
          <ChevronRight size={16} variant="stroke" aria-hidden="true" />
        </button>
      </section>

      <section className={styles.stateGrid} aria-label="Today states">
        <StatusTile label="New results" value="3" tone="danger" />
        <StatusTile label="Follow-ups due" value="5" tone="warning" />
        <StatusTile label="Awaiting PSC" value="2" tone="info" />
        <StatusTile label="Draft notes" value="1" tone="success" />
      </section>

      <section className={styles.cardGroup} aria-labelledby="tasks-title">
        <SectionHeader title="Task queue" meta="Sorted by clinical risk" />
        {todayTasks.map((task) => (
          <button
            key={task.id}
            className={styles.taskCard}
            type="button"
            onClick={() => onTaskPress(task.target)}
          >
            <span className={cx(styles.taskIcon, styles[`tone_${task.tone}`])}>
              <task.Icon size={20} variant="stroke" aria-hidden="true" />
            </span>
            <span className={styles.taskBody}>
              <span className={styles.taskPatient}>{task.patient}</span>
              <span className={styles.taskSignal}>{task.signal}</span>
              <span className={styles.taskReason}>{task.reason}</span>
              <span className={styles.taskMeta}>{task.meta}</span>
            </span>
            <span className={styles.taskAction}>
              {task.action}
              <ChevronRight size={16} variant="stroke" aria-hidden="true" />
            </span>
          </button>
        ))}
      </section>

      <section className={styles.banner} aria-label="Partial data status">
        <Info size={18} variant="stroke" aria-hidden="true" />
        <span>Results updated. Follow-up feed last checked 09:18.</span>
      </section>
    </div>
  );
}

function PatientChartView({
  onQuickOrder,
  onStartNote,
}: {
  onQuickOrder: () => void;
  onStartNote: () => void;
}) {
  return (
    <div className={styles.sectionStack}>
      <PatientStickyBar />

      <div className={styles.segmented} role="tablist" aria-label="Patient chart sections">
        {["Summary", "Results", "Orders", "Meds", "Notes", "Plan"].map((tab, index) => (
          <button
            key={tab}
            className={cx(styles.segment, index === 0 && styles.segmentActive)}
            type="button"
            role="tab"
            aria-selected={index === 0}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className={styles.safetyStrip}>
        <Warning size={18} variant="stroke" aria-hidden="true" />
        <div>
          <strong>Safety</strong>
          <span>Allergy unknown · identity phone-confirmed · open abnormal A1c.</span>
        </div>
      </section>

      <section className={styles.cardGroup}>
        <SectionHeader title="Next step" meta="One safe action" />
        <div className={styles.nextAction}>
          <div>
            <h2>Review HbA1c result</h2>
            <p>Worsening diabetes control since last quarter.</p>
          </div>
          <button className={styles.secondaryButton} type="button">
            Review
          </button>
        </div>
      </section>

      <section className={styles.cardGroup}>
        <SectionHeader title="Clinical summary" meta="Latest signals" />
        <div className={styles.problemRow}>
          {patient.problems.map((problem) => (
            <span key={problem}>{problem}</span>
          ))}
        </div>
        <div className={styles.metricsGrid}>
          <MetricCard label="HbA1c" value="9.4%" meta="High · today" tone="danger" />
          <MetricCard label="BP" value="146/92" meta="Above target" tone="warning" />
          <MetricCard label="eGFR" value="68" meta="Stable" tone="success" />
          <MetricCard label="Open order" value="KO-3819" meta="Results back" tone="info" />
        </div>
      </section>

      <section className={styles.cardGroup}>
        <SectionHeader title="Timeline" meta="Recent care" />
        <TimelineItem icon={Flask} title="HbA1c 9.4% · high" meta="Today 14:30 · unread" />
        <TimelineItem icon={Booking} title="PSC order completed" meta="Yesterday · KO-3819" />
        <TimelineItem icon={Note} title="Diabetes follow-up note" meta="3 months ago · signed" />
      </section>

      <div className={styles.stickyCta}>
        <button className={styles.primaryButton} type="button" onClick={onQuickOrder}>
          <Plus size={18} variant="stroke" aria-hidden="true" />
          Order labs
        </button>
        <button className={styles.secondaryButton} type="button" onClick={onStartNote}>
          Start note
        </button>
      </div>
    </div>
  );
}

function QuickOrderFlow({
  step,
  selectedTests,
  selectedTestRows,
  onToggleTest,
  onStepChange,
}: {
  step: OrderStep;
  selectedTests: string[];
  selectedTestRows: TestOption[];
  onToggleTest: (testId: string) => void;
  onStepChange: (step: OrderStep) => void;
}) {
  if (step === "success") {
    return (
      <div className={styles.sectionStack}>
        <PatientStickyBar />
        <section className={styles.successPanel}>
          <Check size={26} variant="stroke" aria-hidden="true" />
          <p className={styles.eyebrow}>Order placed</p>
          <h2>Booking KO-4927 sent</h2>
          <p>Sent to +855 12 ... 4471. Patient can show the code at any Kura PSC.</p>
          <div className={styles.bookingCode}>KO-4927</div>
          <button className={styles.primaryButton} type="button" onClick={() => onStepChange("chart")}>
            Back to chart
          </button>
        </section>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className={styles.sectionStack}>
        <PatientStickyBar />
        <SectionHeader title="Review order" meta="PSC send-out" />
        <section className={styles.reviewBlock}>
          <ReviewRow label="Patient" value={`${patient.name} · ${patient.meta}`} />
          <ReviewRow label="Phone" value={patient.phone} />
          <ReviewRow label="Identity" value={patient.identity} />
          <ReviewRow label="Route" value="Send patient to Kura PSC" />
          <ReviewRow label="Payment" value="Patient pays at PSC or linked insurance" />
        </section>
        <section className={styles.cardGroup}>
          <SectionHeader title="Tests" meta={`${selectedTestRows.length} selected`} />
          {selectedTestRows.map((test) => (
            <TestSummaryRow key={test.id} test={test} />
          ))}
        </section>
        <section className={styles.banner}>
          <Info size={18} variant="stroke" aria-hidden="true" />
          <span>Patient receives booking code and PSC instructions by Telegram/SMS.</span>
        </section>
        <div className={styles.stickyCta}>
          <button className={styles.primaryButton} type="button" onClick={() => onStepChange("success")}>
            Place order
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => onStepChange("chart")}>
            Save draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionStack}>
      <PatientStickyBar />
      <SectionHeader title="Select tests" meta="Suggested for this patient" />
      <section className={styles.pickerTabs} aria-label="Test picker groups">
        {["Suggested", "Common", "Favorites", "Search"].map((item, index) => (
          <button
            key={item}
            className={cx(styles.pickerTab, index === 0 && styles.pickerTabActive)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>
      <section className={styles.cardGroup}>
        {testOptions.map((test) => {
          const isSelected = selectedTests.includes(test.id);
          return (
            <button
              key={test.id}
              className={cx(styles.testRow, isSelected && styles.testRowSelected)}
              type="button"
              onClick={() => onToggleTest(test.id)}
            >
              <span>
                <strong>{test.name}</strong>
                <small>{test.meta}</small>
                <small>{test.detail}</small>
              </span>
              <span className={styles.priceStack}>
                <span>{test.price}</span>
                <span className={cx(styles.addChip, isSelected && styles.addChipActive)}>
                  {isSelected ? "Added" : "Add"}
                </span>
              </span>
            </button>
          );
        })}
      </section>
      <div className={styles.stickyCta}>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={selectedTests.length === 0}
          onClick={() => onStepChange("review")}
        >
          Review order
        </button>
      </div>
    </div>
  );
}

function ResultsView({
  reviewed,
  onReview,
  onOrderAgain,
}: {
  reviewed: boolean;
  onReview: () => void;
  onOrderAgain: () => void;
}) {
  return (
    <div className={styles.sectionStack}>
      <PatientStickyBar />
      <section className={styles.cardGroup}>
        <SectionHeader title="Abnormal-first inbox" meta={reviewed ? "All current results reviewed" : "1 unread"} />
        <button className={styles.resultPanel} type="button">
          <span>
            <strong>Diabetes panel</strong>
            <small>Last draw today 14:30 · {reviewed ? "reviewed" : "unread"}</small>
          </span>
          <span className={cx(styles.statusPill, reviewed ? styles.tone_success : styles.tone_danger)}>
            {reviewed ? "Reviewed" : "Abnormal 1"}
          </span>
        </button>
      </section>

      <section className={styles.resultDetail}>
        <div className={styles.resultHeader}>
          <div>
            <p className={styles.eyebrow}>Critical value</p>
            <h2>HbA1c 9.4%</h2>
            <p>Previous 8.7% · worsening over 3 months</p>
          </div>
          <span className={styles.trendBadge}>High</span>
        </div>
        <div className={styles.sparkline} aria-label="HbA1c trend from 7.8 to 9.4 percent">
          <span style={{ height: "34%" }} />
          <span style={{ height: "42%" }} />
          <span style={{ height: "58%" }} />
          <span style={{ height: "78%" }} />
        </div>
        <div className={styles.valueRows}>
          <ReviewRow label="Reference" value="Target under 7.0%" />
          <ReviewRow label="Hidden history" value="Last 12 months shown" />
          <ReviewRow label="Reflex" value="No same-sample reflex needed" />
        </div>
      </section>

      <section className={styles.reflexCard}>
        <div>
          <p className={styles.eyebrow}>Reflex suggestion</p>
          <h2>Urine microalbumin due</h2>
          <p>CKD risk surveillance is overdue. New sample required.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={onOrderAgain}>
          Order
        </button>
      </section>

      <div className={styles.stickyCta}>
        <button className={styles.primaryButton} type="button" onClick={onReview} disabled={reviewed}>
          {reviewed ? "Reviewed" : "Mark reviewed"}
        </button>
        <button className={styles.secondaryButton} type="button" onClick={onOrderAgain}>
          Order again
        </button>
      </div>
    </div>
  );
}

function OrdersView({
  onPolicy,
  onReminder,
}: {
  onPolicy: () => void;
  onReminder: () => void;
}) {
  return (
    <div className={styles.sectionStack}>
      <SectionHeader title="Order tracking" meta="Cards replace booking tables" />
      <section className={styles.cardGroup}>
        {orderCards.map((order) => (
          <article key={order.code} className={styles.orderCard}>
            <div className={styles.orderTopline}>
              <span className={styles.bookingPill}>{order.code}</span>
              <span className={styles.statusPill}>{order.status}</span>
            </div>
            <h2>{order.patient}</h2>
            <p>{order.tests}</p>
            <div className={styles.orderMetaGrid}>
              <span>{order.eta}</span>
              <span>{order.payment}</span>
            </div>
            <div className={styles.cardActions}>
              <button className={styles.primaryButton} type="button" onClick={onReminder}>
                Send reminder
              </button>
              <button className={styles.secondaryButton} type="button" onClick={onPolicy}>
                Locked actions
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.progressPanel}>
        <SectionHeader title="KO-3819 progress" meta="Results back" />
        {["Booking sent", "PSC checked in", "Sample at lab", "Results back"].map((step, index) => (
          <div key={step} className={styles.progressRow}>
            <span className={cx(styles.progressDot, index < 4 && styles.progressDotDone)} />
            <span>{step}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function MoreView() {
  return (
    <div className={styles.sectionStack}>
      <section className={styles.cardGroup}>
        <SectionHeader title="More" meta="Desktop-heavy areas" />
        <MoreRow icon={Flask} title="Lab catalog" meta="Full browse stays outside primary nav" />
        <MoreRow icon={Calendar} title="Calendar" meta="Clinic schedule and follow-ups" />
        <MoreRow icon={MedicalMask} title="Directory profile" meta="Doctor listing and credentials" />
        <MoreRow icon={Heart} title="Care plans" meta="Templates and longitudinal goals" />
      </section>

      <section className={styles.notePanel}>
        <PatientStickyBar />
        <div className={styles.noteStatus}>
          <Note size={20} variant="stroke" aria-hidden="true" />
          <div>
            <strong>Encounter draft</strong>
            <span>Saved locally · needs review before signing</span>
          </div>
        </div>
        <div className={styles.soapGrid}>
          <SoapBlock title="Subjective" body="Fatigue and increased thirst for 2 weeks." />
          <SoapBlock title="Assessment" body="T2DM above target, no acute symptoms reported." />
          <SoapBlock title="Plan" body="Review A1c, repeat urine ACR, schedule follow-up." />
        </div>
        <div className={styles.voiceState}>
          <span className={styles.liveDot} aria-hidden="true" />
          Scribe paused · transcript preserved
        </div>
        <div className={styles.cardActions}>
          <button className={styles.secondaryButton} type="button">
            Save draft
          </button>
          <button className={styles.primaryButton} type="button">
            Sign & lock
          </button>
        </div>
      </section>

        <Link className={styles.desktopLink} href="/">
          Switch to desktop view
          <ChevronRight size={16} variant="stroke" aria-hidden="true" />
        </Link>
    </div>
  );
}

function PatientStickyBar() {
  return (
    <section className={styles.patientBar} aria-label="Patient identity">
      <div>
        <h2>{patient.name}</h2>
        <p>
          {patient.meta} · {patient.dob}
        </p>
      </div>
      <div className={styles.patientTags}>
        <span>{patient.identity}</span>
        <span>{patient.allergy}</span>
      </div>
    </section>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      <span>{meta}</span>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "info" | "success";
}) {
  return (
    <article className={styles.statusTile}>
      <span className={cx(styles.statusValue, styles[`text_${tone}`])}>{value}</span>
      <span>{label}</span>
    </article>
  );
}

function MetricCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  tone: "danger" | "warning" | "info" | "success";
}) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles[`text_${tone}`]}>{value}</strong>
      <span>{meta}</span>
    </article>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  meta,
}: {
  icon: IconComponent;
  title: string;
  meta: string;
}) {
  return (
    <div className={styles.timelineItem}>
      <span className={styles.timelineIcon}>
        <Icon size={18} variant="stroke" aria-hidden="true" />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.reviewRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TestSummaryRow({ test }: { test: TestOption }) {
  return (
    <div className={styles.summaryRow}>
      <span>
        <strong>{test.name}</strong>
        <small>{test.detail}</small>
      </span>
      <strong>{test.price}</strong>
    </div>
  );
}

function PatientResultCard({
  name,
  meta,
  signal,
  onOpen,
}: {
  name: string;
  meta: string;
  signal: string;
  onOpen: () => void;
}) {
  return (
    <button className={styles.patientResult} type="button" onClick={onOpen}>
      <span className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
      <span>
        <strong>{name}</strong>
        <small>{meta}</small>
        <small>{signal}</small>
      </span>
      <ChevronRight size={16} variant="stroke" aria-hidden="true" />
    </button>
  );
}

function MoreRow({
  icon: Icon,
  title,
  meta,
}: {
  icon: IconComponent;
  title: string;
  meta: string;
}) {
  return (
    <button className={styles.moreRow} type="button">
      <span className={styles.timelineIcon}>
        <Icon size={18} variant="stroke" aria-hidden="true" />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <ChevronRight size={16} variant="stroke" aria-hidden="true" />
    </button>
  );
}

function SoapBlock({ title, body }: { title: string; body: string }) {
  return (
    <article className={styles.soapBlock}>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}
