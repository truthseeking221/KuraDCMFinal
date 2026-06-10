import { Avatar, Tooltip, Button, IconButton } from "@/components/ui";
import type { AvatarSize, AvatarTone } from "@/components/ui";
import { Info, Bell } from "@/icons";
import { Section, Subsection, Row, Demo } from "../DemoKit";

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
const TONES: AvatarTone[] = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
];

export function AvatarSection() {
  return (
    <Section
      id="avatar"
      title="Avatar"
      description="Squircle tile — six tones (tone-100 bg + tone-600 fg) × five sizes (20/28/36/44/56), with a person icon or initials. Image and a status dot are practical extensions; tone is hashed from the name when not set."
    >
      <Subsection title="Tone × size — icon">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TONES.map((tone) => (
            <Row key={tone} gap={16}>
              {SIZES.map((size) => (
                <Avatar key={size} tone={tone} size={size} content="icon" />
              ))}
            </Row>
          ))}
        </div>
      </Subsection>
      <Subsection title="Tone × size — initials">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TONES.map((tone) => (
            <Row key={tone} gap={16}>
              {SIZES.map((size) => (
                <Avatar key={size} tone={tone} size={size} initials="FL" />
              ))}
            </Row>
          ))}
        </div>
      </Subsection>
      <Subsection title="Image · status · auto-tone">
        <Row>
          <Avatar name="Ada Lovelace" size="lg" src="https://i.pravatar.cc/96?img=47" />
          <Avatar name="Maya Chen" size="lg" status="online" />
          <Avatar name="Sam Park" size="lg" status="away" />
          <Avatar name="Rico Diaz" size="lg" status="busy" />
          <Avatar name="Quinn Lee" size="lg" />
        </Row>
      </Subsection>
    </Section>
  );
}

export function TooltipSection() {
  return (
    <Section
      id="tooltip"
      title="Tooltip"
      description="Dark hover / focus popover with an arrow. Four placements. Hover or tab to the targets below."
    >
      <Subsection title="Placements">
        <Row gap={24}>
          <Demo label="top">
            <Tooltip content="Tooltip on top" placement="top">
              <Button intent="secondary">Top</Button>
            </Tooltip>
          </Demo>
          <Demo label="bottom">
            <Tooltip content="Tooltip on bottom" placement="bottom">
              <Button intent="secondary">Bottom</Button>
            </Tooltip>
          </Demo>
          <Demo label="left">
            <Tooltip content="Tooltip on left" placement="left">
              <Button intent="secondary">Left</Button>
            </Tooltip>
          </Demo>
          <Demo label="right">
            <Tooltip content="Tooltip on right" placement="right">
              <Button intent="secondary">Right</Button>
            </Tooltip>
          </Demo>
          <Demo label="on icon button">
            <Tooltip content="Notifications" placement="top">
              <IconButton aria-label="Notifications" icon={<Bell />} />
            </Tooltip>
          </Demo>
          <Demo label="on inline icon">
            <Tooltip content="More information" placement="top">
              <span style={{ display: "inline-flex", color: "var(--color-text-tertiary)" }}>
                <Info />
              </span>
            </Tooltip>
          </Demo>
        </Row>
      </Subsection>
    </Section>
  );
}
