import { Section, Subsection, Swatch } from "../DemoKit";

const RAMPS: Array<{ title: string; tokens: Array<[string, string]> }> = [
  {
    title: "Brand",
    tokens: [
      ["brand-50", "--color-brand-50"],
      ["brand-100", "--color-brand-100"],
      ["brand-500", "--color-brand-500"],
      ["brand-600", "--color-brand-600"],
      ["brand-700", "--color-brand-700"],
    ],
  },
  {
    title: "Ink (neutral)",
    tokens: [
      ["ink-0", "--color-ink-0"],
      ["ink-25", "--color-ink-25"],
      ["ink-50", "--color-ink-50"],
      ["ink-100", "--color-ink-100"],
      ["ink-150", "--color-ink-150"],
      ["ink-200", "--color-ink-200"],
      ["ink-400", "--color-ink-400"],
      ["ink-500", "--color-ink-500"],
      ["ink-600", "--color-ink-600"],
      ["ink-700", "--color-ink-700"],
      ["ink-900", "--color-ink-900"],
    ],
  },
  {
    title: "Success",
    tokens: [
      ["success-50", "--color-success-50"],
      ["success-100", "--color-success-100"],
      ["success-500", "--color-success-500"],
      ["success-600", "--color-success-600"],
    ],
  },
  {
    title: "Warning",
    tokens: [
      ["warn-50", "--color-warn-50"],
      ["warn-100", "--color-warn-100"],
      ["warn-500", "--color-warn-500"],
      ["warn-600", "--color-warn-600"],
    ],
  },
  {
    title: "Danger",
    tokens: [
      ["danger-50", "--color-danger-50"],
      ["danger-100", "--color-danger-100"],
      ["danger-500", "--color-danger-500"],
      ["danger-600", "--color-danger-600"],
      ["danger-700", "--color-danger-700"],
    ],
  },
  {
    title: "Info",
    tokens: [
      ["info-100", "--color-info-100"],
      ["info-500", "--color-info-500"],
      ["info-600", "--color-info-600"],
    ],
  },
  {
    title: "Text",
    tokens: [
      ["text-primary", "--color-text-primary"],
      ["text-secondary", "--color-text-secondary"],
      ["text-tertiary", "--color-text-tertiary"],
      ["text-disabled", "--color-text-disabled"],
      ["text-brand", "--color-text-brand"],
      ["text-link", "--color-text-link"],
    ],
  },
  {
    title: "Surface / Border",
    tokens: [
      ["surface", "--color-surface"],
      ["surface-2", "--color-surface-2"],
      ["surface-sunken", "--color-surface-sunken"],
      ["surface-bg", "--color-surface-bg"],
      ["border", "--color-border"],
      ["border-strong", "--color-border-strong"],
      ["border-emphasis", "--color-border-emphasis"],
    ],
  },
];

const TYPE_STYLES = [
  "text-32-medium",
  "text-24-medium",
  "text-20-medium",
  "text-18-medium",
  "text-16-medium",
  "text-15-medium",
  "text-14-medium",
  "text-14-regular",
  "text-13-medium",
  "text-13-regular",
  "text-12-medium",
  "text-12-regular",
  "text-11-medium",
  "text-10-medium",
];

export function Foundations() {
  return (
    <Section
      id="foundations"
      title="Foundations"
      description="Color variables and text styles imported 1:1 from the Kura Brand Figma file. Every value below is a CSS custom property mirroring a Figma variable."
    >
      <Subsection title="Color">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {RAMPS.map((ramp) => (
            <div key={ramp.title}>
              <div
                className="text-13-medium"
                style={{ marginBottom: 8, color: "var(--color-text-secondary)" }}
              >
                {ramp.title}
              </div>
              <div className="dk-grid">
                {ramp.tokens.map(([name, value]) => (
                  <Swatch key={value} name={name} value={value} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Subsection>

      <Subsection title="Typography — Kantumruy Pro">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TYPE_STYLES.map((cls) => (
            <div
              key={cls}
              style={{ display: "flex", alignItems: "baseline", gap: 16 }}
            >
              <code
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  minWidth: 140,
                }}
              >
                .{cls}
              </code>
              <span className={cls} style={{ color: "var(--color-text-primary)" }}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </Subsection>
    </Section>
  );
}
