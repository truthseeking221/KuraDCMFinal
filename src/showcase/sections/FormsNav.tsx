import { useState } from "react";
import {
  Input,
  Search,
  Button,
  ButtonGroup,
  Breadcrumb,
  Stepper,
  Tabs,
  ActionList,
} from "@/components/ui";
import type { StepperStatus } from "@/components/ui";
import { User, Download, Trash, Star, Bell, Filter } from "@/icons";
import { Section, Subsection, Row, Stack } from "../DemoKit";

export function InputSection() {
  const [q, setQ] = useState("");
  return (
    <Section
      id="input"
      title="Input"
      description="Single-line field — label (+ required), box, helper / error text, leading icon. Rest / hover / focus / error / disabled / read-only states."
    >
      <Subsection title="States">
        <Row gap={16}>
          <div style={{ width: 240 }}>
            <Input label="Full name" required placeholder="Sok Sreymom" helpText="As printed on the ID." />
          </div>
          <div style={{ width: 240 }}>
            <Input label="Email" defaultValue="not-an-email" error="Please enter a valid email address." />
          </div>
          <div style={{ width: 240 }}>
            <Input label="Disabled" placeholder="Placeholder" disabled />
          </div>
          <div style={{ width: 240 }}>
            <Input label="Read-only" defaultValue="BC-9X4-2KQ7" readOnly />
          </div>
          <div style={{ width: 240 }}>
            <Input label="Leading icon" leadingIcon={<User />} placeholder="Assigned clinician" />
          </div>
        </Row>
      </Subsection>
      <Subsection title="Search — density · Kbd · clear">
        <Stack gap={12}>
          <div style={{ width: 380 }}>
            <Search
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onClear={() => setQ("")}
              kbd="⌘K"
              placeholder="Search patient · name, phone, ID"
            />
          </div>
          <div style={{ width: 380 }}>
            <Search density="compact" placeholder="Filter rows…" />
          </div>
          <div style={{ width: 380 }}>
            <Search density="large" kbd="/" placeholder="Search everything" />
          </div>
        </Stack>
      </Subsection>
      <Subsection title="Dark · trigger · trailing action">
        <Stack gap={12}>
          <div
            style={{
              width: 380,
              padding: 12,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-brand-800)",
            }}
          >
            <Search surface="dark" kbd="⌘K" placeholder="Search patients, orders, labs" />
          </div>
          <div style={{ width: 380 }}>
            <Search asTrigger kbd="⌘K" triggerLabel="Search…" onTriggerClick={() => {}} />
          </div>
          <div style={{ width: 380 }}>
            <Search
              placeholder="Search products"
              trailingAction={
                <Button size="sm" intent="ghost" leadingIcon={<Filter />}>
                  Filters
                </Button>
              }
            />
          </div>
        </Stack>
      </Subsection>
    </Section>
  );
}

export function TabsSection() {
  const [tab, setTab] = useState("summary");
  return (
    <Section
      id="tabs"
      title="Tabs"
      description="Split a view into peer sections. Active tab shows a brand label + 2px brand underline. Optional leading icon and trailing count; hug or fill."
    >
      <Stack gap={24}>
        <Tabs
          aria-label="Patient record"
          value={tab}
          onChange={setTab}
          items={[
            { label: "Summary", value: "summary" },
            { label: "Labs", value: "labs", count: 13 },
            { label: "Imaging", value: "imaging" },
            { label: "Medications", value: "meds" },
            { label: "Notes", value: "notes", disabled: true },
          ]}
        />
        <div style={{ width: 480, maxWidth: "100%" }}>
          <Tabs
            aria-label="Filled"
            fit="fill"
            size="sm"
            value={tab}
            onChange={setTab}
            items={[
              { label: "Summary", value: "summary" },
              { label: "Labs", value: "labs" },
              { label: "Imaging", value: "imaging" },
            ]}
          />
        </div>
      </Stack>
    </Section>
  );
}

export function ButtonGroupSection() {
  return (
    <Section
      id="buttongroup"
      title="ButtonGroup"
      description="Connect related buttons into a segmented control with shared borders, or space them with a gap."
    >
      <Row gap={24}>
        <ButtonGroup>
          <Button>Day</Button>
          <Button>Week</Button>
          <Button>Month</Button>
        </ButtonGroup>
        <ButtonGroup segmented={false}>
          <Button intent="secondary">Cancel</Button>
          <Button intent="primary">Save</Button>
        </ButtonGroup>
      </Row>
    </Section>
  );
}

export function BreadcrumbSection() {
  return (
    <Section
      id="breadcrumb"
      title="Breadcrumb"
      description="Path navigation with chevron separators; the last item is the current page."
    >
      <Breadcrumb
        items={[
          { label: "Patients", href: "#" },
          { label: "Sok Sreymom", href: "#" },
          { label: "Lab history" },
        ]}
      />
    </Section>
  );
}

export function StepperSection() {
  const [step, setStep] = useState("patient");
  const steps = [
    { value: "patient", label: "Patient" },
    { value: "tests", label: "Tests" },
    { value: "routing", label: "Sample routing" },
    { value: "confirm", label: "Confirm" },
  ];
  const currentIndex = steps.findIndex((item) => item.value === step);
  const getStepStatus = (index: number): StepperStatus =>
    index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending";

  return (
    <Section
      id="stepper"
      title="Stepper"
      description="Ordered workflow progress. Completed steps can navigate back; current step uses aria-current."
    >
      <div style={{ width: 720, maxWidth: "100%" }}>
        <Stepper
          aria-label="Booking demo steps"
          items={steps.map((item, index) => ({
            ...item,
            status: getStepStatus(index),
          }))}
          onStepClick={setStep}
        />
      </div>
    </Section>
  );
}

export function ActionListSection() {
  return (
    <Section
      id="actionlist"
      title="Action List"
      description="A menu surface of actions, optionally grouped into titled sections, with icons and a destructive treatment."
    >
      <div style={{ width: 240 }}>
        <ActionList
          sections={[
            {
              title: "Record",
              items: [
                { label: "Add to watchlist", icon: <Star /> },
                { label: "Export PDF", icon: <Download /> },
                { label: "Mute alerts", icon: <Bell /> },
              ],
            },
            {
              items: [{ label: "Delete record", icon: <Trash />, destructive: true }],
            },
          ]}
        />
      </div>
    </Section>
  );
}
