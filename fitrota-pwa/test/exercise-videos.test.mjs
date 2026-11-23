import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseVideos} from '../public/exercise-videos.js';
import {buildFocusedWorkout,FOCUS_REGIONS} from '../public/focused-workouts.js';
import {buildWorkouts,EQUIPMENT} from '../public/workouts.js';

test('every focused and weekly movement offers a well-formed YouTube link', () => {
  const focused = new Set();
  for (const equipment of Object.keys(EQUIPMENT)) {
    for (const region of Object.keys(FOCUS_REGIONS)) {
      const workout = buildFocusedWorkout({equipment,region,goal:'fatLoss'});
      for (const block of workout.blocks) focused.add(block.name);
    }
    for (const goal of ['denge','yag','form','kas']) {
      for (const workout of buildWorkouts({equipment,days:5,goal})) {
        for (const exercise of workout.exercises) {
          if (!exercise.startsWith('Set aralarında')) assert.ok(exerciseVideos(exercise).length,exercise);
        }
      }
    }
  }

  for (const movement of focused) {
    const [video] = exerciseVideos(movement);
    const url = new URL(video.url);
    assert.equal(url.origin,'https://www.youtube.com');
    if (video.direct) assert.match(url.searchParams.get('v'),/^[\w-]{11}$/);
    else assert.ok(url.pathname === '/results' && url.searchParams.get('search_query'));
  }
  assert.equal([...focused].filter(move => exerciseVideos(move)[0].direct).length,62);
});

test('known variations stay separate and weekly combined entries open each exercise', () => {
  assert.equal(exerciseVideos('Yerde dambıl göğüs press')[0].url,'https://www.youtube.com/watch?v=jjlekYs1cfQ');
  assert.notEqual(exerciseVideos('Duvar şınavı')[0].url,exerciseVideos('Yüksek destekli şınav')[0].url);
  assert.deepEqual(exerciseVideos('Dead bug ve bird dog · 2 × 8').map(video => video.name),['Dead bug','Bird dog']);
  assert.deepEqual(exerciseVideos('Set aralarında 60–90 sn dinlen'),[]);
  const [fallback] = exerciseVideos('Bir yeni hareket & <zor>');
  assert.equal(fallback.direct,false);
  assert.equal(new URL(fallback.url).searchParams.get('search_query'),'Bir yeni hareket & <zor> hareketi nasıl yapılır');
});
