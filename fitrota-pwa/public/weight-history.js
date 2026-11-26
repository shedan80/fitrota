const DAY_MS = 86_400_000;
export const MIN_WEIGHT_KG = 35;
export const MAX_WEIGHT_KG = 300;

export function validWeightMeasurement(date,kg) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(kg) || kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
}

export function normalizeWeightHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map();
  for (const entry of raw) {
    if (validWeightMeasurement(entry?.date,entry?.kg)) {
      byDate.set(entry.date,{date:entry.date,kg:entry.kg});
    }
  }
  return [...byDate.values()].sort((a,b) => a.date.localeCompare(b.date));
}

export function upsertWeight(history,date,kg) {
  return normalizeWeightHistory([...history,{date,kg}]);
}

export function weightTrend(history,days,today) {
  const dates = history.map(entry => Date.parse(entry.date));
  const cutoff = days ? Date.parse(today) - (days - 1) * DAY_MS : -Infinity;
  const points = [];
  let first = 0;
  let total = 0;
  for (const [index,entry] of history.entries()) {
    if (entry.date > today) break;
    while (dates[index] - dates[first] > 6 * DAY_MS) {
      total -= history[first].kg;
      first += 1;
    }
    total += entry.kg;
    if (dates[index] >= cutoff) points.push({...entry,average:total / (index + 1 - first)});
  }
  return points;
}
