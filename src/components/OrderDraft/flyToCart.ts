/* A small dot arcs from the tapped test to the floating cart pill — the
   "it landed" beat that makes adding a test feel physical. Purely cosmetic,
   coordinates read at call time, and a no-op under reduced-motion or when the
   cart pill isn't on screen. */
export function flyToCart(sourceEl: HTMLElement | null): void {
  if (typeof document === "undefined" || !sourceEl) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const target = document.querySelector<HTMLElement>(".odr-dock-pill");
  if (!target) return;

  const s = sourceEl.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const startX = s.left + s.width / 2;
  const startY = s.top + s.height / 2;
  const dx = t.left + t.width / 2 - startX;
  const dy = t.top + t.height / 2 - startY;

  const dot = document.createElement("div");
  dot.className = "odr-fly";
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  dot.style.transform = "translate(0, 0) scale(1)";
  document.body.appendChild(dot);

  /* force a frame so the transition has a from-state to animate from */
  requestAnimationFrame(() => {
    dot.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
    dot.style.opacity = "0.2";
  });

  const cleanup = () => dot.remove();
  dot.addEventListener("transitionend", cleanup, { once: true });
  window.setTimeout(cleanup, 800);
}
