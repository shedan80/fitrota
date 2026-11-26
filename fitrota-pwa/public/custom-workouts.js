import {FOCUS_REGIONS, regionalExercises} from './focused-workouts.js';
import {EQUIPMENT} from './workouts.js';

export const MAX_CUSTOM_MOVEMENTS = 12;
export const MAX_CUSTOM_SETS = 10;
export const MAX_REST_SECONDS = 300;
export const MAX_SET_COUNT = {reps:120,seconds:600};

function between(value,min,max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function normalizeCustomPlan(raw) {
  if (!raw || !Object.hasOwn(FOCUS_REGIONS,raw.region) || !Object.hasOwn(EQUIPMENT,raw.equipment) ||
      !Array.isArray(raw.exercises) || !between(raw.exercises.length,1,MAX_CUSTOM_MOVEMENTS)) return null;
  const exercises = [];
  for (const entry of raw.exercises) {
    const name = typeof entry?.name === 'string' ? entry.name.trim().slice(0,100) : '';
    if (!name || !Object.hasOwn(EQUIPMENT,entry.equipment) || !Object.hasOwn(MAX_SET_COUNT,entry.unit) ||
        !between(entry.sets,1,MAX_CUSTOM_SETS) || !between(entry.count,1,MAX_SET_COUNT[entry.unit]) ||
        !between(entry.restSeconds,0,MAX_REST_SECONDS)) return null;
    const {equipment,unit,sets,count,restSeconds} = entry;
    exercises.push({name,equipment,unit,sets,count,restSeconds});
  }
  return {region:raw.region,equipment:raw.equipment,exercises};
}

export function normalizeCustomPlans(raw) {
  const plans = {};
  for (const region of Object.keys(FOCUS_REGIONS)) {
    const plan = normalizeCustomPlan(raw?.[region]);
    if (plan?.region === region) plans[region] = plan;
  }
  return plans;
}

export function buildCustomWorkout(plan) {
  const blocks = [{name:'Dinamik ısınma',detail:'Rahat yürüyüş ve eklem hareketleri',activity:'core',minutes:5}];
  for (const [index,exercise] of plan.exercises.entries()) {
    const {name,sets,count,unit,restSeconds,equipment} = exercise;
    const match = regionalExercises(plan.region,equipment).find(item => item.name === name && item.unit === unit);
    const side = match?.quantity?.split(' / ')[1] ?? (unit==='reps'?match?.quantity:'');
    const dose = `${count} ${unit==='seconds'?'sn':'tekrar'}${side?` / ${side}`:''}`;
    const work = sets * count * (unit==='seconds'?1:3) * (side?2:1);
    const breaks = sets - 1 + Number(index < plan.exercises.length - 1);
    const activity = equipment==='none' ? (plan.region==='core'?'core':'bodyweight') : 'strength';
    blocks.push({name,sets,count,unit,restSeconds,activity,minutes:(work+breaks*restSeconds)/60,cue:match?.cue,
      detail:`${sets} set × ${dose} · ${restSeconds ? `${restSeconds} sn dinlenme` : 'Dinlenme yok'}`});
  }
  blocks.push({name:'Soğuma',detail:'Yavaş adımlar ve rahat eklem hareketleri',activity:'core',minutes:3});
  return {title:`${FOCUS_REGIONS[plan.region]} · Kendi planın`,blocks,
    minutes:blocks.reduce((sum,block) => sum + block.minutes,0)};
}
