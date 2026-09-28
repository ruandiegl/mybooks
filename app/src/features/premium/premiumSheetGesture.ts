const DISMISS_DISTANCE = 120;
const FLICK_DISTANCE = 24;
const FLICK_VELOCITY = 1.1;

export function shouldDismissPremiumSheet(translationY: number, velocityY: number) {
  if (translationY < 0) return false;
  return translationY >= DISMISS_DISTANCE
    || (translationY >= FLICK_DISTANCE && velocityY >= FLICK_VELOCITY);
}
