import { expect, it } from 'vitest';
import { suggestGuidePlatform } from '../installGuideContent';
it.each([
  [{ userAgent: 'Mozilla iPhone', platform: 'iPhone', maxTouchPoints: 5 }, 'ios'],
  [{ userAgent: 'Mozilla Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }, 'ios'],
  [{ userAgent: 'Mozilla Macintosh', platform: 'MacIntel', maxTouchPoints: 0 }, 'other'],
  [{ userAgent: 'Mozilla Android', platform: 'Linux', maxTouchPoints: 5 }, 'android'],
])('suggests an editable guide without using the hint for viewport access (%j)', (device, guide) => {
  expect(suggestGuidePlatform(device)).toBe(guide);
});
