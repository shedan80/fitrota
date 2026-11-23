import test from 'node:test';
import assert from 'node:assert/strict';
import {FOCUS_REGIONS, FOCUS_GOALS, buildFocusedWorkout, estimateFocusedWorkout} from '../public/focused-workouts.js';
import {EQUIPMENT} from '../public/workouts.js';

test('each region, goal and equipment combination has three named exercises', () => {
  for (const region of Object.keys(FOCUS_REGIONS)) {
    for (const goal of Object.keys(FOCUS_GOALS)) {
      for (const equipment of Object.keys(EQUIPMENT)) {
        for (const experience of ['baslangic','orta']) {
          const workout = buildFocusedWorkout({region,goal,equipment,experience});
          const resistance = workout.blocks.filter(block => block.cue);
          assert.equal(new Set(resistance.map(block => block.name)).size,3);
          const sets = experience==='orta' ? 3 : 2;
          assert.ok(resistance.every(block => block.detail.startsWith(sets+' set') &&
            block.detail.includes('Set arası')));
          assert.equal(workout.blocks.some(block => block.activity==='walking'),goal==='fatLoss');
          assert.equal(workout.minutes,workout.blocks.reduce((sum,block)=>sum+block.minutes,0));
        }
      }
    }
  }
  assert.equal(buildFocusedWorkout({region:'constructor',goal:'muscle',equipment:'gym'}),null);
});

test('chest, legs and equipment have distinct movement selections', () => {
  const program = (region,equipment) => buildFocusedWorkout({region,equipment,goal:'muscle'}).blocks[1].name;
  assert.equal(program('chest','gym'),'Makinede göğüs press');
  assert.equal(program('legs','gym'),'Bacak presi');
  assert.equal(program('chest','none'),'Duvar şınavı');
});

test('focus calorie totals weight the blocks and track real session length', () => {
  const base = {region:'chest',equipment:'gym'};
  const muscle = buildFocusedWorkout({...base,goal:'muscle'});
  const fat = buildFocusedWorkout({...base,goal:'fatLoss'});
  assert.equal(muscle.minutes,23);
  assert.equal(fat.minutes,32);
  assert.equal(estimateFocusedWorkout(muscle,23,75).kcal,68);
  const estimate = estimateFocusedWorkout(fat,32,75);
  assert.equal(estimate.kcal,102);
  assert.equal(estimate.blocks[4].kcal,44.1);
  assert.equal(estimateFocusedWorkout(fat,64,75).kcal,205);
  assert.equal(estimateFocusedWorkout(fat,32,150).kcal,205);
  assert.equal(estimateFocusedWorkout(fat,32,null),null);
  assert.equal(estimateFocusedWorkout(fat,0,75),null);
});
