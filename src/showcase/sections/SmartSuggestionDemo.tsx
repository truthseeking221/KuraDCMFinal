import { useState } from "react";
import { SmartSuggestionRow, Button } from "@/components/ui";
import { toast } from "sonner";
import { Section, Subsection, Demo, Stack } from "../DemoKit";

function NeutralHarness() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <Button intent="secondary" size="sm" onClick={() => setDismissed(false)}>
        Restore suggestion
      </Button>
    );
  }
  return (
    <div style={{ width: 440, maxWidth: "100%" }}>
      <SmartSuggestionRow
        title="Looks like your usual diabetes follow-up set"
        actionLabel="Save as Quick Set"
        onAction={() => toast.success("Saved as Quick Set")}
        onDismiss={() => setDismissed(true)}
        onNever={() => {
          toast("We won't suggest this set again");
          setDismissed(true);
        }}
      />
    </div>
  );
}

function AiHarness() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <Button intent="secondary" size="sm" onClick={() => setDismissed(false)}>
        Restore suggestion
      </Button>
    );
  }
  return (
    <div style={{ width: 440, maxWidth: "100%" }}>
      <SmartSuggestionRow
        tone="ai"
        title="These tests often go together for CKD monitoring"
        actionLabel="Add suggested tests"
        onAction={() => toast.success("Suggested tests added")}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
}

export function SmartSuggestionSection() {
  return (
    <Section
      id="smartsuggestion"
      title="Smart suggestion row"
      description="A quiet inline nudge — not a banner or modal. A small leading glyph, the suggestion text, a text-button action, and a dismiss. The neutral tone is the default; the AI tone uses the reserved purple surface and is only for genuine AI suggestions."
    >
      <Subsection title="States">
        <Stack gap={20}>
          <Demo label="Neutral · with Never affordance">
            <NeutralHarness />
          </Demo>
          <Demo label="AI tone">
            <AiHarness />
          </Demo>
          <Demo label="Dismissed (click ✕ above to reach this state)">
            <span className="text-13-regular" style={{ color: "var(--color-text-tertiary)" }}>
              Once dismissed, the row collapses out of the flow and leaves no residue.
            </span>
          </Demo>
        </Stack>
      </Subsection>
    </Section>
  );
}
