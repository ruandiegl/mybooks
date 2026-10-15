export const MOBILE_MAX_WIDTH = 1024;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;
export function isAllowedWebWidth(width: number): boolean {
  return Number.isFinite(width) && width > 0 && width <= MOBILE_MAX_WIDTH;
}
