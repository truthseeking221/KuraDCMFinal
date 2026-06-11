import { LabHistory } from "@/components/ui";
import { Section } from "../DemoKit";

export function LabHistorySection() {
  return (
    <Section
      id="labhistory"
      title="Lab history"
      description="Patient lab history — sidebar navigator (views, signals, systems, draws), signal sections built from system cards, per-row severity bar / latest value / sparkline / trend vs prior draw / follow-up action, search across every draw, and an inline expansion per test. Click any row to expand; pick an older draw to re-anchor every signal to that date."
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
