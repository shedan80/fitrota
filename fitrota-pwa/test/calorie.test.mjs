import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEnergy,dateKey} from '../public/calorie.js';

const base = {age:30,heightCm:175,weightKg:75,sex:'male',activity:'moderate',goal:'denge'};
test('Mifflin–St Jeor BMR and TDEE',()=>{
  const c=calculateEnergy(base);
  assert.equal(c.bmr,1699);
  assert.equal(c.maintenance,2630);
  assert.equal(c.target,2630);
  assert.ok(c.protein>0 && c.carbs>0 && c.fat>0);
});
test('safe adjustment for goals',()=>{
  const m=calculateEnergy(base);
  assert.equal(calculateEnergy({...base,goal:'kas'}).target,m.target+200);
  assert.equal(calculateEnergy({...base,goal:'yag'}).target,m.target-300);
});
test('no deficit in underweight BMI range',()=>{
  const c=calculateEnergy({...base,weightKg:48,goal:'yag'});
  assert.equal(c.target,c.maintenance);
  assert.match(c.note,/kalori açığı uygulanmadı/);
});
test('calorie calculator requires valid adult fields',()=>{
  assert.equal(calculateEnergy({...base,age:16}),null);
  assert.equal(calculateEnergy({...base,weightKg:null}),null);
  assert.equal(calculateEnergy({...base,sex:''}),null);
});
test('uses the local calendar day, not UTC',()=>{
  assert.equal(dateKey(new Date(2026,10,20)), '2026-11-20');
});
test('inherited object properties are not accepted as profile choices',()=>{
  assert.equal(calculateEnergy({...base,activity:'constructor'}),null);
  assert.equal(calculateEnergy({...base,goal:'toString'}).target,2630);
});
