import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journalWeeks,weekEnd,weekStart,weeklyWorkoutLog} from '../public/workout-journal.js';

test('workout journal uses local Monday–Sunday boundaries across years and clock changes', () => {
  assert.equal(weekStart(new Date(2026,0,4,23,58)),'2025-12-29');
  assert.equal(weekEnd('2025-12-29'),'2026-01-04');
  assert.equal(weekStart(new Date(2026,0,5,0,1)),'2026-01-05');
  assert.equal(weekEnd('2026-03-23'),'2026-03-29');
});

test('journal includes available weeks and only totals actual sessions within the selected week', () => {
  const old = {date:'2026-11-15',minutes:25,kcal:80};
  const walk = {date:'2026-11-16',minutes:30,kcal:110};
  const weights = {date:'2026-11-18',minutes:22,kcal:null,sets:[{name:'Squat'}]};
  const bike = {date:'2026-11-18',minutes:15,kcal:55};
  const future = {date:'2026-11-20',minutes:20,kcal:72};
  const logs = [old,walk,weights,bike,future];
  assert.deepEqual(journalWeeks(logs,'2026-11-24'),['2026-11-23','2026-11-16','2026-11-09']);
  assert.deepEqual(journalWeeks([future],'2026-11-18'),['2026-11-16']);
  assert.deepEqual(weeklyWorkoutLog(logs,'2026-11-16','2026-11-18'),{
    days:[['2026-11-18',[weights,bike]],['2026-11-16',[walk]]],
    workouts:3,minutes:67,kcal:165,estimated:2
  });
  assert.equal(weeklyWorkoutLog(logs,'2026-11-23','2026-11-24').workouts,0);
});
