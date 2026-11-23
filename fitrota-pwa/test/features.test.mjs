import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateFoodCalories, findFood, suggestFoods, parseFoodText} from '../public/food.js';
import {weeklyMenu, WEEKDAYS, MEAL_KEYS, validMealPortion} from '../public/menus.js';
import {buildWorkouts, estimateActiveCalories, workoutMinutes} from '../public/workouts.js';

test('food estimates use the chosen portion and require a known preparation', () => {
  const soup = findFood('MERCIMEK CORBASI');
  assert.equal(estimateFoodCalories(soup, soup.portion), 175);
  assert.equal(estimateFoodCalories(soup, 300), 210);
  assert.equal(estimateFoodCalories(soup, 0), null);
  assert.equal(estimateFoodCalories(findFood('Evdeki karışık tabak'), 150), null);
  assert.equal(findFood('tavuk'), undefined);
  assert.ok(suggestFoods('tavuk').some(food => food.name.includes('derisiz')));
});

test('gram amounts in the food name and per-100g package labels support portion calculation', () => {
  for (const text of ['200 g yoğurt','yoğurt 200 gram']) {
    const {name, grams} = parseFoodText(text);
    assert.equal(estimateFoodCalories(findFood(name),grams),122);
  }
  assert.equal(estimateFoodCalories({kcalPer100g:420.5},55),231);
  assert.equal(estimateFoodCalories({kcalPer100g:0},55),0);
  assert.equal(estimateFoodCalories({kcalPer100g:901},55),null);
});

test('three weekly menus rotate without repeating a meal for either diet', () => {
  for (const diet of ['karisik', 'vejetaryen']) {
    const weeks = [0, 1, 2].map(week => weeklyMenu(diet, week));
    for (const menu of weeks) assert.deepEqual(menu.map(day => day.day), WEEKDAYS);
    for (const type of MEAL_KEYS) {
      assert.equal(new Set(weeks.flat().map(day => day[type])).size, 21);
      assert.ok(weeks.flat().every(day => validMealPortion(day.portions[type])));
    }
    assert.deepEqual(weeklyMenu(diet, 0, 1), weeks[1]);
  }
  assert.ok(weeklyMenu('karisik', 0).some(day => day.lunch.includes('tavuk')));
  assert.ok(weeklyMenu('vejetaryen', 0).every(day => !day.lunch.includes('tavuk')));
  assert.deepEqual(weeklyMenu('karisik', 1).at(-1).portions.lunch, {grams:300,kcal:420});
  assert.deepEqual(weeklyMenu('vejetaryen', 1).at(-1).portions.lunch, {grams:300,kcal:350});
  assert.equal(validMealPortion({grams:25,kcal:400}),false);
});

test('training templates use the chosen goal, schedule, equipment and experience', () => {
  const profile = {days:5, goal:'denge', equipment:'none', experience:'baslangic'};
  const home = buildWorkouts(profile);
  assert.equal(home.length, 5);
  assert.equal(new Set(home.map(workout => workout.day)).size, 5);
  assert.ok(new Set(home.map(workout => workout.activity)).size > 2);
  assert.match(home[0].exercises.join(' '), /Sandalyeye otur-kalk · 2/);
  const gym = buildWorkouts({...profile, equipment:'gym', experience:'orta'});
  assert.match(gym[0].exercises.join(' '), /Bacak presi · 3/);
  assert.ok(gym[0].minutes > home[0].minutes);
  assert.equal(buildWorkouts({...profile, days:2, goal:'form'})[0].activity,'walking');
});

test('active calorie calculation subtracts resting expenditure and uses duration and weight', () => {
  assert.equal(estimateActiveCalories('walking',30,75), 110);
  assert.equal(estimateActiveCalories('walking',60,75), 221);
  assert.equal(estimateActiveCalories('walking',30,null), null);
  assert.equal(estimateActiveCalories('constructor',30,75), null);
  assert.equal(estimateActiveCalories('walking',241,75), null);
  assert.equal(workoutMinutes({duration:'30–40 dk'}),35);
  assert.equal(workoutMinutes({duration:'Esnek süre'}),null);
});

test('expanded food search ranks partial Turkish words even in another order', () => {
  assert.equal(suggestFoods('pilav tavuk')[0].name,'Tavuklu pilav (örnek tarif)');
  assert.equal(suggestFoods('borek su')[0].name,'Peynirli su böreği (örnek tarif)');
  assert.equal(suggestFoods('merc corb')[0].name,'Mercimek çorbası (örnek tarif)');
  assert.deepEqual(suggestFoods('bilinmeyen marka corba'),[]);
  assert.equal(findFood('pilav tavuk'),undefined);
  assert.equal(estimateFoodCalories(findFood('yaprak sarması'),150),240);
});

test('recipe calories are totaled before rounding and divided by the serving count', async () => {
  const {summarizeRecipe} = await import('../public/recipes.js');
  const ingredients = [
    {...findFood('haşlanmış makarna'),grams:300},
    {...findFood('ızgara tavuk göğsü'),grams:200},
    {name:'Zeytinyağı',grams:20,kcalPer100g:884},
  ];
  assert.deepEqual(summarizeRecipe(ingredients,3),{totalKcal:981,servingKcal:327});
  assert.deepEqual(summarizeRecipe([
    {name:'A',grams:1,kcalPer100g:40},{name:'B',grams:1,kcalPer100g:40},
  ],1),{totalKcal:1,servingKcal:1});
  assert.equal(summarizeRecipe(ingredients,0),null);
  assert.equal(summarizeRecipe([{name:'Eksik',grams:200}],2),null);
});

test('saved recipes retain ingredient energy snapshots and ignore unusable stored entries', async () => {
  const {normalizeRecipes} = await import('../public/recipes.js');
  const ingredient = {name:' Ev yoğurdu ',grams:200,kcalPer100g:75};
  const saved = {id:'recipe-1',name:' Ara öğün ',ingredients:[ingredient],servings:2};
  assert.deepEqual(normalizeRecipes([null,{...saved,servings:1.5},saved]),[
    {id:'recipe-1',name:'Ara öğün',ingredients:[{...ingredient,name:'Ev yoğurdu'}],servings:2},
  ]);
  assert.deepEqual(normalizeRecipes(undefined),[]);
});

test('weight goals track gain and loss without counting movement in the wrong direction', async () => {
  const {weightGoalProgress} = await import('../public/body-goals.js');
  assert.deepEqual(weightGoalProgress(77.5,75,80),{difference:2.5,percent:50});
  assert.deepEqual(weightGoalProgress(72.5,75,70),{difference:2.5,percent:50});
  assert.deepEqual(weightGoalProgress(81,75,80),{difference:6,percent:0});
  assert.deepEqual(weightGoalProgress(74,75,80),{difference:1,percent:100});
  assert.deepEqual(weightGoalProgress(75,75,80),{difference:0,percent:100});
  assert.deepEqual(weightGoalProgress(76,75,75),{difference:1,percent:null});
  assert.equal(weightGoalProgress(null,75,null),null);
  assert.equal(weightGoalProgress(75,null,null),null);
});

test('expanded catalog keeps dry and cooked quantities distinct', () => {
  assert.equal(estimateFoodCalories(findFood('kuru pirinç'),100),365);
  assert.equal(estimateFoodCalories(findFood('haşlanmış pirinç'),100),130);
  assert.equal(estimateFoodCalories(findFood('sızma zeytinyağı'),20),177);
  assert.match(suggestFoods('coban sal')[0].name,/Çoban salatası/);
});
