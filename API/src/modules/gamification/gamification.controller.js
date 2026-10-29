import { getSaoPauloDayKey } from './gamification.service.js';
import { gamificationRepository } from './gamification.repository.js';
import { checkInSchema } from './gamification.schemas.js';

function serializeCheckIn(result) {
  return {
    dayKey: result.dayKey,
    currentStreak: result.currentStreak,
    checkedInToday: result.checkedInToday
  };
}

function serializeLeaderboard(result) {
  return {
    currentUser: {
      currentStreak: result.currentUser.currentStreak,
      rank: result.currentUser.rank
    },
    entries: result.entries.map((entry) => ({
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      avatarUrlExpiresAt: entry.avatarUrlExpiresAt,
      avatarVersion: entry.avatarVersion,
      currentStreak: entry.currentStreak,
      rank: entry.rank
    }))
  };
}

export async function checkIn(req, res) {
  checkInSchema.parse(req.body ?? {});
  const result = await gamificationRepository.recordCheckIn(req.currentUser.id);
  return res.status(200).json({ data: serializeCheckIn(result) });
}

export async function getLeaderboard(req, res) {
  const today = getSaoPauloDayKey(new Date());
  const result = await gamificationRepository.listLeaderboard({ currentUserId: req.currentUser.id, today });
  return res.status(200).json({ data: serializeLeaderboard(result) });
}
