import type { ReactNode } from "react";
import "./DemoKit.css";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="dk-section">
      <header className="dk-section__head">
        <h2 className="dk-section__title text-24-semibold">{title}</h2>
        {description && (
          <p className="dk-section__desc text-14-regular">{description}</p>
        )}
      </header>
      <div className="dk-section__body">{children}</div>
    </section>
  );
}

export function Subsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="dk-sub">
      <h3 className="dk-sub__title text-12-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function Demo({
  label,
  children,
  fill,
}: {
  label?: string;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div className={`dk-demo${fill ? " dk-demo--fill" : ""}`}>
      <div className="dk-demo__stage">{children}</div>
      {label && <div className="dk-demo__label text-12-regular">{label}</div>}
    </div>
  );
}

export function Row({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return (
    <div className="dk-row" style={{ gap }}>
      {children}
    </div>
  );
}

export function Stack({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return (
    <div className="dk-stack" style={{ gap }}>
      {children}
    </div>
  );
}

export function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="dk-swatch">
      <span className="dk-swatch__chip" style={{ background: `var(${value})` }} />
      <span className="dk-swatch__name text-12-medium">{name}</span>
      <code className="dk-swatch__var">{value}</code>
    </div>
  );
}
