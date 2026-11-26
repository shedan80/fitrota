import {dateKey} from './calorie.js';

export function weekStart(date = new Date()) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return dateKey(monday);
}

export function weekEnd(from) {
  const sunday = new Date(from + 'T12:00:00');
  sunday.setDate(sunday.getDate() + 6);
  return dateKey(sunday);
}

export function journalWeeks(logs,today) {
  const weeks = new Set([weekStart(new Date(today + 'T12:00:00'))]);
  for (const log of logs) {
    if (log.date <= today) weeks.add(weekStart(new Date(log.date + 'T12:00:00')));
  }
  return [...weeks].sort().reverse();
}

export function weeklyWorkoutLog(logs,from,today) {
  const end = weekEnd(from);
  const days = new Map();
  let workouts = 0;
  let minutes = 0;
  let kcal = 0;
  let estimated = 0;
  for (const log of logs) {
    if (log.date < from || log.date > end || log.date > today) continue;
    if (!days.has(log.date)) days.set(log.date,[]);
    days.get(log.date).push(log);
    workouts += 1;
    minutes += log.minutes;
    if (log.kcal !== null) {
      kcal += log.kcal;
      estimated += 1;
    }
  }
  return {days:[...days].sort(([a],[b]) => b.localeCompare(a)),workouts,minutes,kcal,estimated};
}
