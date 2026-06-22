import { useState } from "react";
import { CarePlanDestinationPicker } from "@/components/ui";
import { Section, Subsection, Demo, Stack } from "../DemoKit";

const PLANS = [
  { id: "plan-dm", title: "Diabetes care plan" },
  { id: "plan-ckd", title: "CKD monitoring plan" },
  { id: "plan-cvd", title: "Cardiovascular risk plan" },
];

function PickerHarness({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <CarePlanDestinationPicker plans={PLANS} value={value} onChange={setValue} />
    </div>
  );
}

function PickerWithConfirm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <CarePlanDestinationPicker
        plans={PLANS}
        value={value}
        onChange={setValue}
        testCount={4}
      />
    </div>
  );
}

export function CarePlanDestinationPickerSection() {
  return (
    <Section
      id="careplanpicker"
      title="Care plan destination picker"
      description="A tiny inline 'Add to:' control for the cart. Routes an order into an active care plan or keeps it as a standalone lab order. Brand color marks the selected plan only; the optional confirmation line restates the destination."
    >
      <Subsection title="States">
        <Stack gap={20}>
          <Demo label="Standalone (default)">
            <PickerHarness initial={null} />
          </Demo>
          <Demo label="Plan selected">
            <PickerHarness initial="plan-dm" />
          </Demo>
          <Demo label="With confirmation line — standalone">
            <PickerWithConfirm initial={null} />
          </Demo>
          <Demo label="With confirmation line — plan selected">
            <PickerWithConfirm initial="plan-ckd" />
          </Demo>
        </Stack>
      </Subsection>
    </Section>
  );
}
