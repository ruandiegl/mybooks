const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDayKey(dayKey) {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const timestamp = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== dayKey) return null;
  return timestamp;
}

export function getSaoPauloDayKey(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateCheckIn({ lastActiveDay, currentActiveStreak }, today) {
  const todayTimestamp = parseDayKey(today);
  if (todayTimestamp === null) throw new RangeError('today must be a valid YYYY-MM-DD day key.');

  const lastTimestamp = parseDayKey(lastActiveDay);
  const streak = Number.isInteger(currentActiveStreak) && currentActiveStreak > 0
    ? currentActiveStreak
    : 0;

  if (lastActiveDay === today) {
    return {
      lastActiveDay: today,
      currentActiveStreak: Math.max(streak, 1),
      checkedInToday: false
    };
  }

  const isConsecutiveDay = lastTimestamp !== null
    && todayTimestamp - lastTimestamp === DAY_IN_MILLISECONDS;

  return {
    lastActiveDay: today,
    currentActiveStreak: isConsecutiveDay && streak > 0 ? streak + 1 : 1,
    checkedInToday: true
  };
}

export function isStreakActive({ lastActiveDay, currentActiveStreak }, today) {
  if (!Number.isInteger(currentActiveStreak) || currentActiveStreak <= 0) return false;

  const todayTimestamp = parseDayKey(today);
  const lastTimestamp = parseDayKey(lastActiveDay);
  if (todayTimestamp === null || lastTimestamp === null) return false;

  const ageInDays = (todayTimestamp - lastTimestamp) / DAY_IN_MILLISECONDS;
  return ageInDays === 0 || ageInDays === 1;
}
