/* Dependency-free confetti burst for the order-placed moment. Spawns DOM
   particles animated with the Web Animations API, then cleans itself up.
   No-ops on the server and when the user prefers reduced motion. */

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];
const COUNT = 80;

export function burstConfetti(origin?: { x: number; y: number }) {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";

  const ox = origin?.x ?? window.innerWidth * 0.5;
  const oy = origin?.y ?? window.innerHeight * 0.3;

  for (let i = 0; i < COUNT; i += 1) {
    const piece = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const velocity = 120 + Math.random() * 220;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - (120 + Math.random() * 140); // bias the burst upward
    const size = 6 + Math.random() * 6;
    const round = Math.random() > 0.5;
    const color = COLORS[i % COLORS.length];
    const spin = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540);
    const duration = 900 + Math.random() * 900;

    piece.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${size}px;height:${size * (round ? 1 : 1.6)}px;background:${color};border-radius:${round ? "50%" : "1px"};will-change:transform,opacity;`;
    piece.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${dx * 1.1}px,${dy + 460 + Math.random() * 180}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(0.2,0.6,0.3,1)", fill: "forwards" },
    );
    root.appendChild(piece);
  }

  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 2000);
}
