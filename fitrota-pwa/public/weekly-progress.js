export function weeklyProgress(workoutLogs,foodLogs,week,today) {
  const workouts = workoutLogs.filter(log => log.date >= week && log.date <= today).length;
  const foodDays = Object.keys(foodLogs).filter(date => date >= week && date <= today && foodLogs[date].length).length;
  // Stable sorting keeps the original save order for multiple sessions on one day.
  const logs = workoutLogs.filter(log => log.date <= today).slice().reverse()
    .sort((a,b) => b.date.localeCompare(a.date));
  const latest = new Map();
  for (const log of logs) {
    const movements = new Map();
    for (const set of log.sets ?? []) {
      const key = JSON.stringify([set.name,set.unit]);
      const sets = movements.get(key) ?? [];
      sets.push(set);
      movements.set(key,sets);
    }
    for (const [key,sets] of movements) {
      if (latest.has(key)) {
        const movement = latest.get(key);
        if (movement.previous === null) movement.previous = sets;
      } else if (log.date >= week) {
        latest.set(key,{current:sets,previous:null});
      }
    }
  }
  for (const {current,previous} of latest.values()) {
    if (!previous) continue;
    const improvement = compareSets(current,previous);
    if (improvement) return {workouts,foodDays,improvement};
  }
  return {workouts,foodDays,improvement:null};
}

function compareSets(current,previous) {
  for (const set of current.slice().sort((a,b) => b.count - a.count)) {
    const comparable = previous.filter(past => past.weightKg === set.weightKg);
    if (!comparable.length) continue;
    const count = Math.max(...comparable.map(past => past.count));
    if (set.count > count) return {...set,moreCount:set.count - count};
  }
  for (const set of current.slice().sort((a,b) => b.weightKg - a.weightKg)) {
    if (set.weightKg === null) continue;
    const comparable = previous.filter(past => past.count >= set.count && past.weightKg !== null);
    if (!comparable.length) continue;
    const weight = Math.max(...comparable.map(past => past.weightKg));
    if (set.weightKg > weight) return {...set,moreWeight:set.weightKg - weight};
  }
  return null;
}
