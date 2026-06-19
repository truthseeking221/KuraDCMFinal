import { useState } from "react";
import {
  Banner,
  Card,
  CardSection,
  CalloutCard,
  Button,
  Badge,
} from "@/components/ui";
import type { BannerTone } from "@/components/ui";
import { Section, Subsection, Stack } from "../DemoKit";

const TONES: BannerTone[] = ["info", "success", "warning", "danger", "ai"];

export function BannerSection() {
  const [open, setOpen] = useState(true);
  return (
    <Section
      id="banner"
      title="Banner"
      description="Inline notice for important or persistent conditions. Five tones, a colored header band with title + dismiss, message with link, and optional footer actions."
    >
      <Subsection title="Tones">
        <Stack gap={12}>
          {TONES.map((tone) => (
            <div key={tone} style={{ width: 520, maxWidth: "100%" }}>
              <Banner
                tone={tone}
                title={tone[0].toUpperCase() + tone.slice(1)}
                onDismiss={() => {}}
              >
                Message body for a {tone} banner.{" "}
                <a href="#banner">Link text</a>
              </Banner>
            </div>
          ))}
        </Stack>
      </Subsection>
      <Subsection title="With actions · dismissible">
        <div style={{ width: 520, maxWidth: "100%" }}>
          {open ? (
            <Banner
              tone="danger"
              title="Your account has been deactivated"
              onDismiss={() => setOpen(false)}
              actions={
                <>
                  <Button size="sm" intent="destructive">
                    Contact support
                  </Button>
                  <Button size="sm" intent="ghost">
                    Learn more
                  </Button>
                </>
              }
            >
              Due to inactivity, your account has been deactivated. Funds are
              still accessible.
            </Banner>
          ) : (
            <Button intent="secondary" onClick={() => setOpen(true)}>
              Restore banner
            </Button>
          )}
        </div>
      </Subsection>
    </Section>
  );
}

export function CardSectionDemo() {
  return (
    <Section
      id="card"
      title="Card"
      description="Surface container with an optional header (title + actions) and divided sections."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card
          title="Patient summary"
          actions={
            <Button size="sm" intent="ghost">
              Edit
            </Button>
          }
        >
          <p className="text-14-regular" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            A simple card with a header, body content and a ghost action in the
            top-right.
          </p>
        </Card>

        <Card title="Order" padded={false}>
          <CardSection title="Items">
            <div className="text-14-regular" style={{ color: "var(--color-text-secondary)" }}>
              3 lab tests · 1 consult
            </div>
          </CardSection>
          <CardSection title="Status">
            <Badge tone="success" dot>
              Completed
            </Badge>
          </CardSection>
        </Card>
      </div>
    </Section>
  );
}

export function CalloutCardSection() {
  return (
    <Section
      id="calloutcard"
      title="CalloutCard"
      description="Promotional card pairing a title, supporting text and a primary action with an optional illustration."
    >
      <div style={{ maxWidth: 640 }}>
        <CalloutCard
          title="Connect your lab"
          primaryAction={<Button intent="primary">Connect lab</Button>}
          onDismiss={() => {}}
          illustration={
            <div
              style={{
                width: 120,
                height: 84,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, var(--color-brand-100), var(--color-brand-50))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-brand-600)",
                fontWeight: 500,
              }}
            >
              LAB
            </div>
          }
        >
          Sync results automatically and cut manual entry. Takes about two
          minutes to set up.
        </CalloutCard>
      </div>
    </Section>
  );
}
