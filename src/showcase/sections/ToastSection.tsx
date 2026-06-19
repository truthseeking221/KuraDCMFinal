import { Button, toast } from "@/components/ui";
import { Section, Subsection, Row, Stack } from "../DemoKit";

export function ToastSection() {
  return (
    <Section
      id="toast"
      title="Toast"
      description="Transient system feedback for completed, pending, warning, and danger states."
    >
      <Subsection title="Kura tones">
        <Row>
          <Button
            onClick={() =>
              toast.success("Mobile verified", {
                description: "Patient phone number confirmed.",
              })
            }
          >
            Success
          </Button>
          <Button
            intent="outline"
            onClick={() =>
              toast.info("Manual entry saved", {
                description: "Fill collection details in Step 2.",
              })
            }
          >
            Info
          </Button>
          <Button
            intent="outline"
            onClick={() =>
              toast.warning("Verify patient before continuing", {
                description: "Check name and date of birth.",
              })
            }
          >
            Warning
          </Button>
          <Button
            intent="destructive"
            onClick={() =>
              toast.danger("Consent declined", {
                description: "Counter-sign is required before release.",
              })
            }
          >
            Danger
          </Button>
        </Row>
      </Subsection>

      <Subsection title="Workflow feedback">
        <Stack>
          <Row>
            <Button
              intent="secondary"
              onClick={() =>
                toast.success("Sok Sreymom checked in · Q-001", {
                  description: "Visit ready for clinician review.",
                })
              }
            >
              Check-in
            </Button>
            <Button
              intent="outline"
              onClick={() =>
                toast.success("Policy removed", {
                  action: {
                    label: "Undo",
                    onClick: () => toast.success("Policy restored"),
                  },
                })
              }
            >
              With action
            </Button>
            <Button
              intent="outline"
              onClick={() => {
                const id = toast.loading("Syncing lab order", {
                  description: "Keeping the draft available while syncing.",
                });
                window.setTimeout(() => {
                  toast.success("Lab order synced", {
                    id,
                    description: "The draft is ready for checkout.",
                  });
                }, 1400);
              }}
            >
              Loading
            </Button>
          </Row>
        </Stack>
      </Subsection>
    </Section>
  );
}
