import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCustomWorkout,normalizeCustomPlan,normalizeCustomPlans} from '../public/custom-workouts.js';
import {completeWorkoutBlock,createWorkoutSession,normalizeSetHistory,normalizeWorkoutSession,recordSessionSet,sessionWorkout} from '../public/workout-session.js';

const plan = {region:'legs',equipment:'dumbbells',exercises:[
  {name:'Dambılla goblet squat',equipment:'dumbbells',unit:'reps',sets:2,count:8,restSeconds:150},
  {name:'Özel tutuş',equipment:'none',unit:'seconds',sets:2,count:25,restSeconds:0}
]};

test('custom workout uses the selected order, units, dose and equipment', () => {
  const workout = buildCustomWorkout(normalizeCustomPlan(plan));
  assert.deepEqual(workout.blocks.map(block=>block.name),['Dinamik ısınma','Dambılla goblet squat','Özel tutuş','Soğuma']);
  assert.equal(workout.blocks[1].detail,'2 set × 8 tekrar · 150 sn dinlenme');
  assert.match(workout.blocks[1].cue,/Dambılı göğsüne/);
  assert.equal(workout.blocks[2].detail,'2 set × 25 sn · Dinlenme yok');
  assert.equal(workout.blocks[2].activity,'bodyweight');
  assert.equal(normalizeCustomPlan({...plan,exercises:[{...plan.exercises[0],restSeconds:301}]}),null);
  assert.deepEqual(normalizeCustomPlans({legs:plan,chest:plan}),{legs:plan});
});

test('custom session retains chosen rest over a reload and supports skipping a zero-length rest', () => {
  const session = createWorkoutSession({id:'test',settings:null,customPlan:normalizeCustomPlan(plan)},1000);
  const first = completeWorkoutBlock(session,4000);
  const rest = recordSessionSet(first,9,12,6000);
  assert.deepEqual(rest.rest,{durationMs:150000,remainingMs:150000,endsAt:156000});
  const restored = normalizeWorkoutSession(JSON.parse(JSON.stringify(rest)));
  assert.deepEqual(restored.rest,rest.rest);
  assert.equal(sessionWorkout(restored).blocks[1].count,8);
  const next = recordSessionSet({...restored,rest:null},8,12,157000);
  assert.equal(next.rest.durationMs,150000);
  const zeroBreak = recordSessionSet({...next,rest:null},26,null,308000);
  assert.equal(zeroBreak.rest,null);
  assert.equal(zeroBreak.setIndex,1);
  assert.deepEqual(zeroBreak.sets.at(-1),{name:'Özel tutuş',unit:'seconds',count:26,weightKg:null});
});

test('restoring a long routine preserves every permitted set in the journal', () => {
  const sets = Array.from({length:120},()=>({name:'Goblet squat',unit:'reps',count:10,weightKg:12}));
  assert.deepEqual(normalizeSetHistory(sets),sets);
});
