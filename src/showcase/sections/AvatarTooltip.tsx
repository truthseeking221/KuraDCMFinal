import { Avatar, Tooltip, Button, IconButton } from "@/components/ui";
import type { AvatarSize } from "@/components/ui";
import { Info, Bell } from "@/icons";
import { Section, Subsection, Row, Demo } from "../DemoKit";

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
export function AvatarSection() {
  return (
    <Section
      id="avatar"
      title="Avatar"
      description="Squircle tile — one neutral avatar tone across the app, five sizes (20/28/36/44/56), with a person icon or initials. Image and status dot are practical extensions."
    >
      <Subsection title="Sizes — icon">
        <Row gap={16}>
          {SIZES.map((size) => (
            <Avatar key={size} size={size} content="icon" />
          ))}
        </Row>
      </Subsection>
      <Subsection title="Sizes — initials">
        <Row gap={16}>
          {SIZES.map((size) => (
            <Avatar key={size} size={size} initials="FL" />
          ))}
        </Row>
      </Subsection>
      <Subsection title="Image · status">
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
