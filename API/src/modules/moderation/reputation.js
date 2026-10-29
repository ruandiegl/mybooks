export function reputationStars(reportCount, activeBlockCount) {
  const raw = Math.max(1, 5 - reportCount * 0.5 - activeBlockCount * 0.25);
  return Math.round(raw * 10) / 10;
}
