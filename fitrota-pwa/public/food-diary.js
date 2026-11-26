export const MEAL_LABELS = {
  breakfast: 'Kahvaltı', lunch: 'Öğle', dinner: 'Akşam', snack: 'Ara öğün'
};

export function mealType(value) {
  return Object.hasOwn(MEAL_LABELS,value) ? value : '';
}

export function previousMeals(foodLogs,today) {
  const meals = [];
  for (const date of Object.keys(foodLogs).sort().reverse()) {
    if (date >= today) continue;
    for (const meal of Object.keys(MEAL_LABELS)) {
      const entries = foodLogs[date].filter(entry => entry.meal === meal);
      if (entries.length) meals.push({date,meal,entries});
    }
    if (meals.length >= 12) break;
  }
  return meals.slice(0,12);
}
