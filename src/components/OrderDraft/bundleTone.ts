const BUNDLE_TONE_CLASSES = [
  "tone-brand",
  "tone-ink",
  "tone-success",
  "tone-warn",
  "tone-danger",
] as const;

type BundleToneClass = (typeof BUNDLE_TONE_CLASSES)[number];

export function getBundleToneClassName(seed: string): BundleToneClass {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return BUNDLE_TONE_CLASSES[hash % BUNDLE_TONE_CLASSES.length] ?? "tone-brand";
}
