import {calculateFoodEnergy} from './food.js';

export const MAX_INGREDIENTS = 24;
export const MAX_SERVINGS = 30;
export const MAX_RECIPES = 50;

export function summarizeRecipe(ingredients, servings) {
  if (!Array.isArray(ingredients) || !ingredients.length || ingredients.length > MAX_INGREDIENTS ||
      !Number.isInteger(servings) || servings < 1 || servings > MAX_SERVINGS) return null;

  let total = 0;
  for (const ingredient of ingredients) {
    if (typeof ingredient?.name !== 'string' || !ingredient.name.trim()) return null;
    const kcal = calculateFoodEnergy(ingredient,ingredient.grams);
    if (kcal === null) return null;
    total += kcal;
  }
  return {totalKcal:Math.round(total), servingKcal:Math.round(total / servings)};
}

export function normalizeRecipes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(recipe => typeof recipe?.id === 'string' && recipe.id &&
    typeof recipe.name === 'string' && recipe.name.trim() && summarizeRecipe(recipe.ingredients,recipe.servings))
    .slice(0,MAX_RECIPES)
    .map(({id,name,servings,ingredients}) => ({
      id, name:name.trim().slice(0,70), servings,
      ingredients:ingredients.map(({name,grams,kcalPer100g}) => ({
        name:name.trim().slice(0,70), grams, kcalPer100g
      }))
    }));
}
