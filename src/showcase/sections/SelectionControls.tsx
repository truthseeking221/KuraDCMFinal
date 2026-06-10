import { useState } from "react";
import { Checkbox, ChoiceList, SegmentedToggle } from "@/components/ui";
import { Section, Subsection, Row, Stack } from "../DemoKit";

export function CheckboxSection() {
  const [checked, setChecked] = useState(true);
  return (
    <Section
      id="checkbox"
      title="Checkbox"
      description="Zero / one / many selection. Unselected, indeterminate and selected; rest / hover / focus / disabled / error; default and AI tone; optional label + help text."
    >
      <Subsection title="Checked state">
        <Row gap={28}>
          <Checkbox label="Unselected" />
          <Checkbox label="Indeterminate" indeterminate />
          <Checkbox label="Selected" defaultChecked />
        </Row>
      </Subsection>
      <Subsection title="Tone · disabled · error">
        <Row gap={28}>
          <Checkbox label="Default" defaultChecked />
          <Checkbox label="AI" tone="ai" defaultChecked />
          <Checkbox label="Disabled" defaultChecked disabled />
          <Checkbox label="Accept terms" error="This field is required" />
        </Row>
      </Subsection>
      <Subsection title="Label + help text">
        <Checkbox
          label="Email receipts"
          helpText="Sent after each completed visit."
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      </Subsection>
    </Section>
  );
}

export function ChoiceListSection() {
  const [single, setSingle] = useState<string>("review");
  const [multi, setMulti] = useState<string[]>(["diabetes"]);
  return (
    <Section
      id="choicelist"
      title="ChoiceList"
      description="A titled group of radios (single-select) or checkboxes (multi-select), each with an optional help line."
    >
      <Row gap={64}>
        <ChoiceList
          title="Triage status"
          value={single}
          onChange={setSingle}
          options={[
            { label: "All patients", value: "all" },
            { label: "Needs review", value: "review", helpText: "Flagged by the system." },
            { label: "Stable", value: "stable" },
          ]}
        />
        <ChoiceList
          title="Conditions"
          multiple
          value={multi}
          onChange={setMulti}
          options={[
            { label: "Diabetes", value: "diabetes" },
            { label: "Hypertension", value: "hypertension" },
            { label: "Anemia", value: "anemia", helpText: "Hb below threshold." },
          ]}
        />
      </Row>
    </Section>
  );
}

export function SegmentedSection() {
  const [match, setMatch] = useState("any");
  const [range, setRange] = useState("week");
  return (
    <Section
      id="segmented"
      title="Segmented toggle"
      description="Inline single-select on a sunken track; the active segment lifts to a white pill. Two or three segments."
    >
      <Stack gap={20}>
        <SegmentedToggle
          aria-label="Match mode"
          value={match}
          onChange={setMatch}
          options={[
            { label: "Match any", value: "any" },
            { label: "Match all", value: "all" },
          ]}
        />
        <SegmentedToggle
          aria-label="Range"
          value={range}
          onChange={setRange}
          options={[
            { label: "Day", value: "day" },
            { label: "Week", value: "week" },
            { label: "Month", value: "month" },
          ]}
        />
      </Stack>
    </Section>
  );
}
