export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[];

/** Tiny classnames joiner. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (Array.isArray(v)) {
      const inner = cx(...v);
      if (inner) out.push(inner);
    } else {
      out.push(String(v));
    }
  }
  return out.join(" ");
}
