import {buildFocusedWorkout} from './focused-workouts.js';
import {buildCustomWorkout, MAX_CUSTOM_MOVEMENTS, MAX_CUSTOM_SETS, MAX_REST_SECONDS, MAX_SET_COUNT, normalizeCustomPlan} from './custom-workouts.js';

// Every transition returns a new snapshot so saving a set and its timer is atomic.
export {MAX_SET_COUNT};
export const MAX_SET_WEIGHT = 500;

export function sessionWorkout(session) {
  if (session.customPlan) return buildCustomWorkout(session.customPlan);
  return buildFocusedWorkout({...session.settings, experience:session.experience});
}

export function createWorkoutSession({id,settings,experience,customPlan}, now) {
  const session = {id,settings,experience,startedAt:now,finishedAt:null,blockIndex:0,setIndex:0,sets:[],rest:null};
  if (customPlan) session.customPlan = customPlan;
  return session;
}

export function normalizeSetHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(set => set && typeof set.name === 'string' && set.name.trim() &&
    Object.hasOwn(MAX_SET_COUNT,set.unit) && Number.isInteger(set.count) &&
    set.count >= 1 && set.count <= MAX_SET_COUNT[set.unit] &&
    (set.weightKg === null || Number.isFinite(set.weightKg) && set.weightKg >= 0 && set.weightKg <= MAX_SET_WEIGHT))
    .slice(-(MAX_CUSTOM_MOVEMENTS*MAX_CUSTOM_SETS)).map(({name,unit,count,weightKg}) => ({name:name.slice(0,120),unit,count,weightKg}));
}

export function normalizeWorkoutSession(raw) {
  if (!raw || typeof raw.id !== 'string' || !raw.id || !Number.isFinite(raw.startedAt) ||
      !Number.isInteger(raw.blockIndex) || !Number.isInteger(raw.setIndex)) return null;
  const customPlan = normalizeCustomPlan(raw.customPlan);
  if (raw.customPlan ? !customPlan : !raw.settings) return null;
  const {region,goal,equipment} = raw.settings ?? {};
  const session = {...createWorkoutSession({
    id:raw.id, settings:customPlan?null:{region,goal,equipment}, experience:raw.experience,customPlan
  },raw.startedAt), blockIndex:raw.blockIndex,setIndex:raw.setIndex,sets:normalizeSetHistory(raw.sets)};
  const workout = sessionWorkout(session);
  if (!workout || session.blockIndex < 0 || session.blockIndex > workout.blocks.length) return null;
  const block = workout.blocks[session.blockIndex];
  if (session.setIndex < 0 || session.setIndex >= (block?.sets ?? 1)) return null;
  if (!block) session.finishedAt = Number.isFinite(raw.finishedAt) ? raw.finishedAt : raw.startedAt;
  const rest = raw.rest;
  if (block?.sets && rest && Number.isFinite(rest.durationMs) && rest.durationMs > 0 && rest.durationMs <= MAX_REST_SECONDS*1000 &&
      Number.isFinite(rest.remainingMs) && rest.remainingMs > 0 && rest.remainingMs <= rest.durationMs &&
      (rest.endsAt === null || Number.isFinite(rest.endsAt))) {
    session.rest = {durationMs:rest.durationMs,remainingMs:rest.remainingMs,endsAt:rest.endsAt};
  }
  return session;
}

function nextBlock(session, workout, now) {
  const blockIndex = session.blockIndex + 1;
  return {...session,blockIndex,setIndex:0,rest:null,finishedAt:blockIndex===workout.blocks.length?now:null};
}

export function completeWorkoutBlock(session, now) {
  const workout = sessionWorkout(session);
  const block = workout?.blocks[session.blockIndex];
  if (!block || block.sets || session.rest) return null;
  return nextBlock(session,workout,now);
}

export function recordSessionSet(session,count,weightKg,now) {
  const workout = sessionWorkout(session);
  const block = workout?.blocks[session.blockIndex];
  if (session.rest || !block?.sets || !Number.isInteger(count) || count < 1 ||
      count > MAX_SET_COUNT[block.unit] || (weightKg !== null &&
      (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > MAX_SET_WEIGHT))) return null;

  const next = session.setIndex + 1 < block.sets ?
    {...session,setIndex:session.setIndex+1} : nextBlock(session,workout,now);
  next.sets = [...session.sets,{name:block.name,unit:block.unit,count,weightKg}];
  if (block.restSeconds > 0 && workout.blocks[next.blockIndex]?.sets) {
    const durationMs = block.restSeconds * 1000;
    next.rest = {durationMs,remainingMs:durationMs,endsAt:now+durationMs};
  }
  return next;
}

export function restRemaining(rest, now) {
  return rest.endsAt === null ? rest.remainingMs : Math.max(0,Math.min(rest.durationMs,rest.endsAt-now));
}

export function toggleSessionRest(session, now) {
  const rest = session.rest;
  if (!rest) return null;
  const remainingMs = restRemaining(rest,now);
  if (remainingMs === 0) return {...session,rest:null};
  const endsAt = rest.endsAt === null ? now+remainingMs : null;
  return {...session,rest:{...rest,remainingMs,endsAt}};
}
