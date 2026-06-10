import { LabHistory } from "@/components/ui";
import { Section } from "../DemoKit";

export function LabHistorySection() {
  return (
    <Section
      id="labhistory"
      title="Lab history"
      description="Patient lab history — Overview / All tests / Table views, one-tap status chips, search across every draw, and an inline expansion per test (result-history timeline, full-size trend with reference band, notes, component results). Click any row to expand."
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <LabHistory />
      </div>
    </Section>
  );
}
