import { useState } from "react";
import { Badge, Chip, Counter } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Check, AlertTriangle, Sparkles } from "@/icons";
import { Section, Subsection, Row } from "../DemoKit";

const TONES: BadgeTone[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "ai",
  "brand",
];

export function BadgeSection() {
  return (
    <Section
      id="badge"
      title="Badge"
      description="Status / tone indicator. Seven tones bound to Status tokens, subtle or strong appearance, optional leading dot or icon."
    >
      <Subsection title="Tone — subtle">
        <Row>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone[0].toUpperCase() + tone.slice(1)}
            </Badge>
          ))}
        </Row>
      </Subsection>
      <Subsection title="Tone — strong">
        <Row>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} appearance="strong">
              {tone[0].toUpperCase() + tone.slice(1)}
            </Badge>
          ))}
        </Row>
      </Subsection>
      <Subsection title="Leading dot / icon · sizes">
        <Row>
          <Badge tone="success" dot>
            Active
          </Badge>
          <Badge tone="warning" icon={<AlertTriangle />}>
            Pending
          </Badge>
          <Badge tone="success" icon={<Check />}>
            Verified
          </Badge>
          <Badge tone="ai" icon={<Sparkles />}>
            AI
          </Badge>
          <Badge tone="brand" size="large" dot>
            Large
          </Badge>
        </Row>
      </Subsection>
    </Section>
  );
}

export function ChipSection() {
  const [selected, setSelected] = useState<Record<string, boolean>>({
    all: true,
    review: false,
  });
  const [filters, setFilters] = useState(["Diabetes", "Hypertension"]);

  return (
    <Section
      id="chip"
      title="Chip"
      description="Compact pill for filters & selections. Choice chips toggle a quick-filter (with optional count); removable chips show applied filters with a clear (x)."
    >
      <Subsection title="Choice (toggle + count)">
        <Row>
          <Chip
            selected={selected.all}
            count={12}
            onClick={() => setSelected((s) => ({ ...s, all: !s.all }))}
          >
            All patients
          </Chip>
          <Chip
            selected={selected.review}
            count={19}
            onClick={() => setSelected((s) => ({ ...s, review: !s.review }))}
          >
            Needs review
          </Chip>
        </Row>
      </Subsection>
      <Subsection title="Removable (applied filters)">
        <Row>
          {filters.map((f) => (
            <Chip
              key={f}
              variant="removable"
              selected
              onRemove={() => setFilters((xs) => xs.filter((x) => x !== f))}
            >
              {f}
            </Chip>
          ))}
          {filters.length === 0 && (
            <span className="text-13-regular" style={{ color: "var(--color-text-tertiary)" }}>
              All filters cleared.
            </span>
          )}
        </Row>
      </Subsection>
    </Section>
  );
}

export function CounterSection() {
  return (
    <Section
      id="counter"
      title="Counter"
      description="Compact numeric pill for counts — filter rows, tabs, nav badges. Tone matches the parent context; 99+ then 1.2k truncation."
    >
      <Subsection title="Tone">
        <Row>
          <Counter count={12} tone="neutral" />
          <Counter count={12} tone="brand" />
          <Counter count={12} tone="success" />
          <Counter count={12} tone="danger" />
        </Row>
      </Subsection>
      <Subsection title="Count formatting">
        <Row>
          <Counter count={1} />
          <Counter count={12} />
          <Counter count={120} />
          <Counter count={3} tone="brand" />
          <Counter count={1200} tone="danger" />
        </Row>
      </Subsection>
    </Section>
  );
}
