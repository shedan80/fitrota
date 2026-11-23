import test from 'node:test';
import assert from 'node:assert/strict';
import {completeWorkoutBlock, createWorkoutSession, normalizeWorkoutSession, normalizeSetHistory, recordSessionSet,
  restRemaining, sessionWorkout, toggleSessionRest} from '../public/workout-session.js';

function startSession() {
  return createWorkoutSession({id:'session-test',settings:{region:'legs',goal:'muscle',equipment:'dumbbells'},
    experience:'baslangic'},1000);
}

test('sets are saved before rest and the next step follows the current movement', () => {
  const first = startSession();
  assert.equal(recordSessionSet(first,10,12,1000),null);
  const lifting = completeWorkoutBlock(first,6000);
  assert.equal(lifting.blockIndex,1);
  const rest = recordSessionSet(lifting,10,12.5,9000);
  assert.equal(rest.setIndex,1);
  assert.equal(lifting.sets.length,0);
  assert.equal(rest.rest.endsAt,84000);
  assert.deepEqual(rest.sets,[{name:'Dambılla goblet squat',unit:'reps',count:10,weightKg:12.5}]);
  assert.equal(recordSessionSet(rest,10,12,10000),null);
  const nextMove = recordSessionSet({...rest,rest:null},9,12.5,85000);
  assert.equal(nextMove.blockIndex,2);
  assert.equal(nextMove.setIndex,0);
  assert.ok(nextMove.rest);
});

test('paused rest keeps its milliseconds and resumed deadlines survive a restored snapshot', () => {
  const first = completeWorkoutBlock(startSession(),6000);
  const running = recordSessionSet(first,10,null,9000);
  const paused = toggleSessionRest(running,14000);
  assert.equal(restRemaining(paused.rest,100000),70000);
  const resumed = toggleSessionRest(paused,100000);
  const restored = normalizeWorkoutSession(JSON.parse(JSON.stringify(resumed)));
  assert.equal(restored.rest.endsAt,170000);
  assert.equal(restRemaining(restored.rest,105000),65000);
  assert.equal(restRemaining(restored.rest,180000),0);
  assert.equal(toggleSessionRest(restored,180000).rest,null);
});

test('the final set proceeds to cooldown and time-based movements measure seconds', () => {
  const data = startSession();
  const finalMove = {...data,blockIndex:3,setIndex:1};
  const cooldown = recordSessionSet(finalMove,10,8,20000);
  assert.equal(cooldown.rest,null);
  assert.equal(sessionWorkout(cooldown).blocks[cooldown.blockIndex].name,'Soğuma');
  const completed = completeWorkoutBlock(cooldown,24000);
  assert.equal(completed.finishedAt,24000);
  assert.equal(normalizeWorkoutSession(completed).finishedAt,24000);
  const hold = {...data,settings:{region:'core',goal:'muscle',equipment:'none'},blockIndex:2};
  const result = recordSessionSet(hold,20,null,30000);
  assert.deepEqual(normalizeSetHistory(result.sets),[{name:'Diz destekli yan plank',unit:'seconds',count:20,weightKg:null}]);
});
