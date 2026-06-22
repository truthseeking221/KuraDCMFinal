/* Order Set chip treatment.

   Previously this hashed a seed into one of five decorative tones
   (brand/ink/success/warn/danger), painting saved sets in a rainbow that
   carried no meaning — color discipline reserves status hues for real status.
   Every saved set now reads with ONE restrained, neutral "Order Set" chip
   style. The function is kept (same name + signature) so callers don't churn;
   it is now seed-independent and always returns the single class. */
const ORDER_SET_TONE_CLASS = "tone-set" as const;

export type BundleToneClass = typeof ORDER_SET_TONE_CLASS;

export function getBundleToneClassName(seed: string): BundleToneClass {
  /* seed retained for call-site compatibility; the treatment is now uniform. */
  void seed;
  return ORDER_SET_TONE_CLASS;
}
