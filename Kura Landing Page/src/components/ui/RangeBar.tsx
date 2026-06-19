import { cx } from "@/lib/cx";

export type RangeStatus = "optimal" | "borderline" | "out";

const DOT: Record<RangeStatus, string> = {
  optimal: "bg-success-500",
  borderline: "bg-warn-500",
  out: "bg-danger-500",
};
const RING: Record<RangeStatus, string> = {
  optimal: "ring-success-500/25",
  borderline: "ring-warn-500/25",
  out: "ring-danger-500/25",
};

/**
 * Superpower-style reference-range track: a faint full track, a shaded green
 * "optimal" band, and a status-colored marker dot at the patient's value.
 * `value` and `optimal` are percentages (0–100) along the track.
 */
export function RangeBar({
  value,
  optimal = [38, 70],
  status,
  className,
}: {
  value: number;
  optimal?: [number, number];
  status: RangeStatus;
  className?: string;
}) {
  const v = Math.max(2, Math.min(98, value));
  const [lo, hi] = optimal;
  return (
    <div className={cx("relative h-1.5 w-full", className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-ink-100" />
      <div
        className="absolute inset-y-0 rounded-full bg-success-200/70"
        style={{ left: `${lo}%`, width: `${Math.max(0, hi - lo)}%` }}
      />
      <span
        className={cx(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4",
          DOT[status],
          RING[status],
        )}
        style={{ left: `${v}%` }}
      />
    </div>
  );
}

/** The proportional Total/Optimal/Borderline/Out roll-up bar. */
export function SegmentBar({
  optimal,
  borderline,
  out,
  className,
}: {
  optimal: number;
  borderline: number;
  out: number;
  className?: string;
}) {
  const total = Math.max(1, optimal + borderline + out);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className={cx("flex h-2 w-full overflow-hidden rounded-full", className)} aria-hidden>
      <span className="bg-success-500" style={{ width: seg(optimal) }} />
      <span className="bg-warn-500" style={{ width: seg(borderline) }} />
      <span className="bg-danger-500" style={{ width: seg(out) }} />
    </div>
  );
}
