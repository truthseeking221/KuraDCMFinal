import { Button, IconButton } from "@/components/ui";
import type { ButtonIntent, ButtonSize } from "@/components/ui";
import { Plus, ArrowRight, Search, Trash, Bell, Download } from "@/icons";
import { Section, Subsection, Demo, Row } from "../DemoKit";

const INTENTS: ButtonIntent[] = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];

export function Buttons() {
  return (
    <Section
      id="button"
      title="Button"
      description="Five intents x three sizes x interactive states, with optional leading/trailing icons, a disclosure chevron and a loading state."
    >
      <Subsection title="Intent">
        <Row>
          {INTENTS.map((intent) => (
            <Button key={intent} intent={intent}>
              {intent[0].toUpperCase() + intent.slice(1)}
            </Button>
          ))}
        </Row>
      </Subsection>

      <Subsection title="Size">
        <Row>
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              Button {size.toUpperCase()}
            </Button>
          ))}
        </Row>
      </Subsection>

      <Subsection title="State">
        <Row>
          <Demo label="default">
            <Button>Button</Button>
          </Demo>
          <Demo label="disabled">
            <Button disabled>Button</Button>
          </Demo>
          <Demo label="loading">
            <Button loading>Button</Button>
          </Demo>
          <Demo label="focus / hover (interactive)">
            <Button intent="secondary">Hover me</Button>
          </Demo>
        </Row>
      </Subsection>

      <Subsection title="Icon & disclosure">
        <Row>
          <Button leadingIcon={<Plus />}>Add product</Button>
          <Button intent="secondary" trailingIcon={<ArrowRight />}>
            Continue
          </Button>
          <Button intent="outline" leadingIcon={<Search />} trailingIcon={<ArrowRight />}>
            Search
          </Button>
          <Button intent="secondary" disclosure>
            Sort by
          </Button>
        </Row>
      </Subsection>

      <Subsection title="Icon Button — variant x tone x size">
        <Row gap={24}>
          <Demo label="default">
            <IconButton aria-label="Notifications" icon={<Bell />} />
          </Demo>
          <Demo label="primary">
            <IconButton aria-label="Add" variant="primary" icon={<Plus />} />
          </Demo>
          <Demo label="primary / critical">
            <IconButton
              aria-label="Delete"
              variant="primary"
              tone="critical"
              icon={<Trash />}
            />
          </Demo>
          <Demo label="tertiary">
            <IconButton aria-label="Download" variant="tertiary" icon={<Download />} />
          </Demo>
          <Demo label="sizes">
            <Row gap={8}>
              <IconButton aria-label="micro" size="micro" icon={<Bell />} />
              <IconButton aria-label="default" size="default" icon={<Bell />} />
              <IconButton aria-label="large" size="large" icon={<Bell />} />
            </Row>
          </Demo>
        </Row>
      </Subsection>
    </Section>
  );
}
