import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weeklyProgress} from '../public/weekly-progress.js';
import {mealType,previousMeals} from '../public/food-diary.js';
import {findFood,normalizePersonalFoods,suggestFoods} from '../public/food.js';

test('meal history preserves portions and includes only prior dated meal groups', () => {
  const yogurt = {meal:'breakfast',grams:200,kcal:122};
  const oatmeal = {meal:'breakfast',grams:90,kcal:330};
  const recipe = {meal:'dinner',recipePortion:true,kcal:300};
  const foodLogs = {
    '2026-11-22': [recipe],
    '2026-11-24': [yogurt,oatmeal,{kcal:100}],
    '2026-11-25': [yogurt],
    '2026-11-26': [recipe]
  };
  assert.deepEqual(previousMeals(foodLogs,'2026-11-25'),[
    {date:'2026-11-24',meal:'breakfast',entries:[yogurt,oatmeal]},
    {date:'2026-11-22',meal:'dinner',entries:[recipe]}
  ]);
  assert.equal(mealType('constructor'),'');
});

test('personal food names rank in Turkish searches and repeat saves keep the latest rate', () => {
  const personal = normalizePersonalFoods([
    {name:'Annemin Pilavı',kcalPer100g:180},
    {name:'Annemin pilavı',kcalPer100g:195},
    {name:'Hatalı değer',kcalPer100g:901}
  ]);
  assert.equal(personal.length,1);
  assert.equal(findFood('annemin pilavi',personal).kcalPer100g,195);
  assert.equal(suggestFoods('pil anne',personal)[0].name,'Annemin pilavı');
  assert.ok(findFood('yoğurt',personal));
});

const set = (count,weightKg,unit = 'reps') => ({name:'Goblet squat',unit,count,weightKg});
const log = (date,...sets) => ({date,sets});
const week = '2026-11-23';
const today = '2026-11-25';

test('weekly summary counts real logged days and compares against the strongest comparable set', () => {
  const workouts = [
    log('2026-11-22',set(6,12),set(10,12)), log('2026-11-23'),
    log('2026-11-25',set(9,12),set(12,12)), log('2026-11-26',set(18,12))
  ];
  const foodLogs = {'2026-11-22':[{}],'2026-11-23':[{},{}],'2026-11-24':[],'2026-11-25':[{}],'2026-11-26':[{}]};
  assert.deepEqual(weeklyProgress(workouts,foodLogs,week,today),{
    workouts:2,foodDays:2,improvement:{...set(12,12),moreCount:2}
  });
});

test('weekly summary suppresses changes when no comparable set exists or performance did not improve', () => {
  const strength = [log(week,set(10,12),set(8,10)),log(today,set(8,11))];
  assert.equal(weeklyProgress(strength,{},week,today).improvement,null);
  const noCommonUnits = [log(week,set(10,12)),log(today,set(15,12,'seconds'))];
  assert.equal(weeklyProgress(noCommonUnits,{},week,today).improvement,null);
  const weightIncrease = [log(week,set(10,12)),log(today,set(10,13.5))];
  assert.deepEqual(weeklyProgress(weightIncrease,{},week,today).improvement,{...set(10,13.5),moreWeight:1.5});
});
