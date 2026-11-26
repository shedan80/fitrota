import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWeightHistory,upsertWeight,validWeightMeasurement,weightTrend} from '../public/weight-history.js';

test('weight history keeps one valid record per date and replaces measurements without modifying the original', () => {
  const history = normalizeWeightHistory([
    {date:'2026-11-25',kg:78.2}, {date:'2026-11-01',kg:79.4},
    {date:'2026-11-25',kg:78.3}, {date:'2026-02-30',kg:80},
    {date:'2026-11-20',kg:301}, {date:'2026-11-21',kg:'77'}
  ]);
  assert.deepEqual(history,[{date:'2026-11-01',kg:79.4},{date:'2026-11-25',kg:78.3}]);
  const corrected = upsertWeight(history,'2026-11-25',78.1);
  assert.equal(corrected.length,2);
  assert.equal(corrected.at(-1).kg,78.1);
  assert.equal(history.at(-1).kg,78.3);
  assert.equal(validWeightMeasurement('2024-02-29',35),true);
  assert.equal(validWeightMeasurement('2026-02-29',35),false);
});

test('weight trend uses available measurements in the prior seven calendar days including the point date', () => {
  const history = normalizeWeightHistory([
    {date:'2026-10-24',kg:83},{date:'2026-10-26',kg:80},
    {date:'2026-10-28',kg:78},{date:'2026-11-03',kg:76},
    {date:'2026-11-25',kg:75},{date:'2026-11-26',kg:90}
  ]);
  assert.deepEqual(weightTrend(history,30,'2026-11-25'),[
    {date:'2026-10-28',kg:78,average:(83+80+78)/3},
    {date:'2026-11-03',kg:76,average:77},
    {date:'2026-11-25',kg:75,average:75}
  ]);
  assert.equal(weightTrend(history,90,'2026-11-25').length,5);
  assert.equal(weightTrend(history,0,'2026-11-25').length,5);
});
