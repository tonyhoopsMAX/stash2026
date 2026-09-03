import type { StashItem } from './types';

const day = 86_400_000;

export function resurfacingScore(item: StashItem, now = Date.now()): number {
  if (item.archived || item.deletedAt) return -Infinity;
  const ageDays = Math.max(0, (now - item.createdAt) / day);
  const idleDays = Math.max(0, (now - item.lastInteractedAt) / day);
  const reminderDistance = item.reminderAt ? Math.abs(item.reminderAt - now) / day : Infinity;
  const reminderBoost = reminderDistance <= 1 ? 42 : reminderDistance <= 3 ? 18 : 0;
  const recentResurfacePenalty = item.lastResurfacedAt ? Math.max(0, 36 - (now - item.lastResurfacedAt) / day * 9) : 0;
  return ageDays * 1.4 + idleDays * 2.1 + reminderBoost + (item.pinned ? 13 : 0) + (item.favorite ? 9 : 0) - recentResurfacePenalty;
}

export function rankForResurface(items: StashItem[], now = Date.now(), limit = 6): StashItem[] {
  return items.map((item) => ({ item, score: resurfacingScore(item, now) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score || a.item.createdAt - b.item.createdAt)
    .slice(0, limit)
    .map(({ item }) => item);
}
