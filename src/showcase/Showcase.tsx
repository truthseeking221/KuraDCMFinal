import { useEffect, useState } from "react";
import { REGISTRY } from "./registry";
import "./Showcase.css";

export function Showcase() {
  const [active, setActive] = useState(REGISTRY[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    REGISTRY.forEach((entry) => {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const groups = ["Foundations", "Components", "Compositions"] as const;

  return (
    <div className="sc-app">
      <aside className="sc-sidebar">
        <div className="sc-brand">
          <span className="sc-brand__mark">K</span>
          <div>
            <div className="sc-brand__name text-14-semibold">Kura UI</div>
            <div className="sc-brand__sub text-12-regular">Component library</div>
          </div>
        </div>
        <nav className="sc-nav">
          {groups.map((group) => {
            const items = REGISTRY.filter((e) => e.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="sc-nav__group">
                <div className="sc-nav__group-title text-11-semibold">{group}</div>
                {items.map((entry) => (
                  <a
                    key={entry.id}
                    href={`#${entry.id}`}
                    className={`sc-nav__link text-13-medium${
                      active === entry.id ? " is-active" : ""
                    }`}
                  >
                    {entry.label}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="sc-main">
        <header className="sc-header">
          <h1 className="sc-header__title text-32-bold">Kura UI</h1>
          <p className="sc-header__sub text-14-regular">
            Built 1:1 from the <strong>00 Kura Brand</strong> Figma library —
            tokens, text styles and components.
          </p>
        </header>
        <div className="sc-content">
          {REGISTRY.map((entry) => (
            <div key={entry.id}>{entry.element}</div>
          ))}
        </div>
      </main>
    </div>
  );
}
