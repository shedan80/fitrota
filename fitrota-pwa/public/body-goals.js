export function weightGoalProgress(currentKg, targetKg, startKg) {
  if (!Number.isFinite(currentKg) || !Number.isFinite(targetKg)) return null;

  const difference = Math.round(Math.abs(targetKg - currentKg) * 10) / 10;
  if (difference === 0) return {difference, percent:100};

  if (!Number.isFinite(startKg) || startKg === targetKg) return {difference, percent:null};
  const fraction = (currentKg - startKg) / (targetKg - startKg);
  const percent = Math.floor(Math.min(1, Math.max(0, fraction)) * 100);
  return {difference, percent};
}
