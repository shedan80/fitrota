import {calculateEnergy, ACTIVITY_LEVELS, dateKey} from './calorie.js';
import {weightGoalProgress} from './body-goals.js';
import {MAX_WEIGHT_KG, MIN_WEIGHT_KG, normalizeWeightHistory, upsertWeight, validWeightMeasurement, weightTrend} from './weight-history.js';
import {drawWeightTrend} from './weight-chart.js';
import {watchForUpdates} from './pwa-updates.js';
import {exerciseVideos} from './exercise-videos.js';
import {MAX_SET_COUNT, MAX_SET_WEIGHT, completeWorkoutBlock, createWorkoutSession, normalizeSetHistory,
  normalizeWorkoutSession, recordSessionSet, restRemaining, sessionWorkout, toggleSessionRest} from './workout-session.js';
import {enableWorkoutSound, playRestChime} from './workout-sound.js';
import {FOODS, MAX_PERSONAL_FOODS, findFood, suggestFoods, estimateFoodCalories, normalizePersonalFoods, parseFoodText} from './food.js';
import {MEAL_LABELS, mealType, previousMeals} from './food-diary.js';
import {weeklyProgress} from './weekly-progress.js';
import {journalWeeks, weekEnd, weekStart as weekKey, weeklyWorkoutLog} from './workout-journal.js';
import {MAX_INGREDIENTS, MAX_SERVINGS, MAX_RECIPES, summarizeRecipe, normalizeRecipes} from './recipes.js';
import {WEEKDAYS, weeklyMenu, validMealPortion} from './menus.js';
import {ACTIVITIES, EQUIPMENT, MAX_WORKOUT_MINUTES, buildWorkouts, estimateActiveCalories,
  validWorkoutMinutes, workoutMinutes} from './workouts.js';
import {FOCUS_REGIONS, FOCUS_GOALS, buildFocusedWorkout, estimateFocusedWorkout, regionalExercises} from './focused-workouts.js';
import {buildCustomWorkout, MAX_CUSTOM_MOVEMENTS, MAX_CUSTOM_SETS, MAX_REST_SECONDS, normalizeCustomPlan, normalizeCustomPlans} from './custom-workouts.js';

'use strict';
const REFERENCE_WEIGHT_KG = 70;
const MAX_DAILY_FOOD_ENTRIES = 50;
const MAX_ENTRY_KCAL = 2500;
const STORAGE_KEY = 'fitrota-v1'; // Eski kullanıcının yerel verilerini koru.
const SHORT_DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const GOALS = {denge:'Kilomu korumak', yag:'Yağ kaybı', kas:'Kas geliştirme', form:'Kondisyon geliştirme'};
const DIETS = {karisik:'Karışık beslenme', vejetaryen:'Vejetaryen'};
const WEIGHT_RANGES = [{days:30,label:'30 gün'},{days:90,label:'90 gün'},{days:0,label:'Tümü'}];
const TYPES = [
  {key:'breakfast',label:'KAHVALTI',emoji:'🥣'},
  {key:'lunch',label:'ÖĞLE',emoji:'🥗'},
  {key:'dinner',label:'AKŞAM',emoji:'🍲'},
  {key:'snack',label:'ARA ÖĞÜN',emoji:'🍎'}
];
const defaults = {name:'', goal:'denge', days:3, diet:'karisik', experience:'baslangic', allergies:'', age:null, heightCm:null, weightKg:null, targetWeightKg:null, weightGoalStartKg:null, sex:'',activity:'light',equipment:'none'};
let aiAvailable = false;
let installingPrompt = null;
let currentDay = (new Date().getDay()+6)%7;
let busy = false;
let toastTimer;
let renderedTab;
let focusDraft = null;
let customRegion = null;
const customDrafts = new Map();
let journalWeek = null;
let weightRange = 30;
let restDeadline;
let restFrame;
let restRefresh;

function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function finiteRange(value,lo,hi) {
  if(value === null || value === undefined || value === '')return null;
  const n=Number(value);
  return Number.isFinite(n) && n>=lo && n<=hi ? n : null;
}
function normalizeProfile(input) {
  const p = {...defaults};
  p.name = String(input.name ?? '').trim().slice(0,50);
  p.goal = Object.hasOwn(GOALS,input.goal) ? input.goal : defaults.goal;
  p.days = Number.isInteger(+input.days) ? Math.max(2,Math.min(5,+input.days)) : defaults.days;
  p.diet = Object.hasOwn(DIETS,input.diet) ? input.diet : defaults.diet;
  p.experience = ['baslangic','orta'].includes(input.experience) ? input.experience : defaults.experience;
  p.allergies = String(input.allergies ?? '').trim().slice(0,160);
  p.age = finiteRange(input.age,18,85);
  p.heightCm = finiteRange(input.heightCm,130,230);
  p.weightKg = finiteRange(input.weightKg,MIN_WEIGHT_KG,MAX_WEIGHT_KG);
  p.targetWeightKg = finiteRange(input.targetWeightKg,MIN_WEIGHT_KG,MAX_WEIGHT_KG);
  p.weightGoalStartKg = p.targetWeightKg === null ? null : finiteRange(input.weightGoalStartKg,MIN_WEIGHT_KG,MAX_WEIGHT_KG) ?? p.weightKg;
  p.sex = ['male','female'].includes(input.sex) ? input.sex : '';
  p.activity = Object.hasOwn(ACTIVITY_LEVELS,input.activity) ? input.activity : defaults.activity;
  p.equipment = Object.hasOwn(EQUIPMENT,input.equipment) ? input.equipment : defaults.equipment;
  return p;
}
function validPlan(p) {
  return p && typeof p.summary === 'string' && Array.isArray(p.nutrition) && p.nutrition.length === 7 &&
    p.nutrition.every(n=>n && typeof n.breakfast==='string' && typeof n.lunch==='string' && typeof n.dinner==='string' && typeof n.snack==='string') &&
    Array.isArray(p.workouts) && p.workouts.every(w => w && typeof w.title==='string' && Array.isArray(w.exercises));
}
function normalizeFoodLogs(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw))return {};
  const out={};
  for(const [key,items] of Object.entries(raw).slice(-365)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(Date.parse(key+'T12:00:00')) || !Array.isArray(items))continue;
    out[key] = items.slice(-MAX_DAILY_FOOD_ENTRIES).filter(x=>x && typeof x.id==='string' && typeof x.name==='string' &&
      Number.isFinite(x.kcal) && x.kcal>=0 && x.kcal<=MAX_ENTRY_KCAL).map(x=>({
      id:x.id.slice(0,64),name:x.name.slice(0,70),kcal:Math.round(x.kcal),
      grams:finiteRange(x.grams,1,2000), estimated:x.estimated===true, recipePortion:x.recipePortion===true,
      meal:mealType(x.meal)
    }));
  }
  return out;
}
function normalizeWorkoutLogs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(log => log && typeof log.id === 'string' && typeof log.title === 'string' &&
    typeof log.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(log.date) &&
    dateKey(new Date(log.date+'T12:00:00')) === log.date &&
    validWorkoutMinutes(log.minutes) && (log.kcal === null || Number.isFinite(log.kcal) && log.kcal >= 0))
    .map(log => ({id:log.id, date:log.date, title:log.title.slice(0,100), minutes:log.minutes,
      kcal:log.kcal, planId:log.planId, day:log.day, sets:normalizeSetHistory(log.sets)}));
}

function initialState() {
  return {profile:{...defaults}, plan:localPlan(defaults), source:'local', planId:'initial',
    completed:[], foodLogs:{}, personalFoods:[], recipes:[], weightHistory:[], workoutLogs:[], workoutSession:null, workoutSound:true,
    focusSettings:null, customPlans:{}, theme:'green', menuOffset:0};
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && typeof saved==='object'){
      const profile=normalizeProfile(saved.profile||{});
      const legacyCompletion = saved.completedWeek == null && Array.isArray(saved.completed) && saved.completed.length;
      const isAI = saved.source === 'ai' && validPlan(saved.plan);
      const restored = {...initialState(), profile, plan:isAI ? saved.plan : localPlan(profile),
        source:isAI ? 'ai' : 'local', planId:typeof saved.planId==='string'?saved.planId:'initial',
        menuOffset:Number.isInteger(saved.menuOffset) && saved.menuOffset >= 0 ? saved.menuOffset >>> 0 : 0,
        weightHistory:normalizeWeightHistory(saved.weightHistory),
        workoutLogs:normalizeWorkoutLogs(saved.workoutLogs),
        workoutSession:normalizeWorkoutSession(saved.workoutSession),
        workoutSound:saved.workoutSound !== false,
        focusSettings:normalizedFocusSettings(saved.focusSettings),
        customPlans:normalizeCustomPlans(saved.customPlans),
        theme:saved.theme==='pink'?'pink':'green',
        completedWeek:saved.completedWeek ?? weekKey(),
        completed:Array.isArray(saved.completed)?saved.completed.filter(x=>typeof x==='string'):[],
        foodLogs:normalizeFoodLogs(saved.foodLogs), personalFoods:normalizePersonalFoods(saved.personalFoods), recipes:normalizeRecipes(saved.recipes)};
      // Eski, tarihsiz tamamlamaları ilk açılışın haftasına sabitle.
      if (legacyCompletion) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(restored)); } catch (_) {}
      }
      return restored;
    }
  } catch(_) { /* localStorage devre dışı olabilir. */ }
  return initialState();
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    return true;
  } catch (_) {
    notify('Tarayıcı kaydetmeye izin vermedi.');
    return false;
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content = state.theme==='pink'?'#180f19':'#0c1110';
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed',String(button.dataset.themeChoice===state.theme));
  });
  paintWeightChart();
}

function selectTheme(theme) {
  if (!['green','pink'].includes(theme) || state.theme===theme) return;
  const previous = state.theme;
  state.theme = theme;
  if (!save()) { state.theme = previous; return; }
  applyTheme();
}
function completedThisWeek() {
  const week = weekKey();
  const today = dateKey();
  const legacy = state.completedWeek === week ? state.completed : [];
  const days = state.workoutLogs.filter(log => log.planId === state.planId && log.date >= week && log.date <= today)
    .map(log => log.day);
  return [...legacy,...days];
}
function todayEntries(){return state.foodLogs[dateKey()]||[];}
function consumedToday(){return todayEntries().reduce((sum,x)=>sum+x.kcal,0);}
function number(n){return new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}).format(n);}
function todayName(){return new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());}
function dayIndex(){return (new Date().getDay()+6)%7;}
function localPlan(profile) {
  return {workouts:buildWorkouts(profile)};
}

function visibleMenu() {
  if (state.source === 'ai') return state.plan.nutrition;
  const week = weekKey();
  const index = Math.floor(Date.parse(week) / 604800000);
  return weeklyMenu(state.profile.diet, index, state.menuOffset);
}

function uniqueId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function todayWorkoutLogs() {
  return state.workoutLogs.filter(log => log.date === dateKey());
}

function activityTotal(logs) {
  const estimates = logs.filter(log => log.kcal !== null);
  return estimates.length ? estimates.reduce((sum, log) => sum + log.kcal, 0) : null;
}

let state = readState();
function notify(message) {
  const el=document.getElementById('toast');
  el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
}
function sourceNote() {
  return state.source === 'ai'
    ? '<strong>Yapay zekâ tarafından oluşturuldu.</strong> Öğünlerin kalori ve makroları doğrulanmış değildir.'
    : '<strong>FitRota haftalık planı.</strong> Menü porsiyonları ve kalorileri tarife göre değişebilir.';
}
function banner() {return `<div class="source-banner"><span class="sparkle">✦</span><span>${sourceNote()}</span></div>`;}
function installPanel() {
  return `<div class="install-banner"><div><strong>→ FitRota telefonunda da yanında</strong><p>Uygulamayı ana ekranına ekleyerek tam ekran kullan.</p></div><button class="btn btn-secondary btn-sm" data-action="install">Nasıl yüklerim? →</button></div>`;
}
function energyRing(energy,small=false) {
  const used=consumedToday();
  if(!energy || energy.target===null){
    return `<div class="ring ${small?'ring-sm':''} is-empty" style="--progress:0%"><div class="ring-inner"><span class="ring-number">${number(used)}</span><span class="ring-unit">kcal kaydedildi</span></div></div>`;
  }
  const percent=Math.min(100,Math.round(used/energy.target*100));
  return `<div class="ring ${small?'ring-sm':''}" style="--progress:${percent}%" role="progressbar" aria-valuenow="${Math.min(used,energy.target)}" aria-valuemin="0" aria-valuemax="${energy.target}" aria-label="Günlük kayıt edilen kalori ilerlemesi"><div class="ring-inner"><span class="ring-number">${number(used)}</span><span class="ring-unit">kcal kaydedildi</span></div></div>`;
}
function macrosView(energy){
  if(!energy || energy.target===null){return `<div class="empty-macro">Hedef makrolarını görmek için <button class="inline-link" data-tab="profile">profilini tamamla →</button></div>`;}
  const items=[
    {label:'Protein',grams:energy.protein,fill:(energy.protein*4)/energy.target,color:'lime'},
    {label:'Karbonhidrat',grams:energy.carbs,fill:(energy.carbs*4)/energy.target,color:'orange'},
    {label:'Yağ',grams:energy.fat,fill:(energy.fat*9)/energy.target,color:'blue'}
  ];
  return items.map(x=>`<div class="macro-row"><div class="macro-label"><span>${x.label}</span><strong>${number(x.grams)} g</strong></div><div class="macro-track"><div class="macro-fill ${x.color}" style="width:${Math.min(100,Math.max(0,Math.round(x.fill*100)))}%"></div></div></div>`).join('');
}
const formatMeasurement = new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});

function bodyGoalsView(inProfile = false) {
  const {heightCm,weightKg,targetWeightKg,weightGoalStartKg,goal} = state.profile;
  const progress = weightGoalProgress(weightKg,targetWeightKg,weightGoalStartKg);
  const measure = (value, unit) => value === null ? '—' : `${formatMeasurement.format(value)} <small>${unit}</small>`;
  return `<section class="card body-card">
    <div class="body-card-heading"><div><h2>Vücut hedefin</h2><p class="small-muted">${escapeHTML(GOALS[goal])}</p></div>
      ${inProfile?'':'<button class="btn btn-secondary btn-sm" type="button" data-tab="profile">Hedefi düzenle</button>'}</div>
    <dl class="body-measures">
      <div><dt>Güncel kilo</dt><dd>${measure(weightKg,'kg')}</dd></div>
      <div><dt>Güncel boy</dt><dd>${measure(heightCm,'cm')}</dd></div>
      <div><dt>Hedef kilo</dt><dd>${measure(targetWeightKg,'kg')}</dd></div>
    </dl>
    ${progress ? `<div class="weight-progress">
      <span>${progress.difference === 0 ? 'Hedef kilondasın' : `${progress.percent === 100 ? 'Hedef eşiği geçildi · Fark' : 'Hedefe fark'} ${formatMeasurement.format(progress.difference)} kg`}</span>
      ${progress.percent === null ? '' : `<progress max="100" value="${progress.percent}" aria-label="Başlangıç kilosundan hedefe ilerleme"></progress>`}
    </div>` : '<p class="small-muted goal-hint">Güncel ve hedef kilonu girerek aradaki farkı takip et.</p>'}
  </section>`;
}

const weightDateFormat = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
function visibleWeightTrend() {
  return weightTrend(state.weightHistory,weightRange,dateKey());
}

function weightTrendView() {
  const points = visibleWeightTrend();
  const filters = WEIGHT_RANGES.map(({days,label}) => `<button type="button" data-weight-range="${days}" aria-pressed="${days===weightRange}">${label}</button>`).join('');
  const chart = points.length >= 2 ? `<figure class="weight-figure">
    <canvas id="weight-chart" role="img" aria-label="${points.length} ölçüm · ${formatMeasurement.format(points[0].kg)} kg ile başlayıp ${formatMeasurement.format(points.at(-1).kg)} kg ile bitiyor"></canvas>
    <figcaption><span class="weight-key weight-key-measured">Ölçüm</span><span class="weight-key">7 günlük ortalama</span></figcaption>
    </figure>` : `<p class="weight-empty">${points.length
      ? 'Trend için farklı iki tarihte ölçüm kaydet.'
      : state.weightHistory.length ? 'Bu aralıkta ölçüm yok.' : 'İlk ölçümünü kaydederek kilo geçmişini başlat.'}</p>`;
  const delta = points.length >= 2 ? Math.round((points.at(-1).kg - points[0].kg) * 10) / 10 : null;
  const change = delta === null ? '' : `<span class="weight-change">${delta>0?'+':''}${formatMeasurement.format(delta)} kg değişim</span>`;
  return `<div class="weight-trend-head">${change}<div class="weight-ranges" role="group" aria-label="Grafik aralığı">${filters}</div></div>${chart}`;
}

function weightHistoryView() {
  const today = dateKey();
  const history = state.weightHistory.filter(entry => entry.date <= today);
  const latest = history.at(-1);
  const measurements = history.length ? `<details class="weight-measurements">
      <summary>Ölçümler (${history.length})</summary>
      <ul>${history.slice().reverse().map(entry => `<li><time datetime="${entry.date}">${weightDateFormat.format(new Date(entry.date))}</time>
        <strong>${formatMeasurement.format(entry.kg)} kg</strong>
        <button type="button" class="text-action" data-edit-weight="${entry.date}" aria-label="${weightDateFormat.format(new Date(entry.date))} ölçümünü düzenle">Düzenle</button>
      </li>`).join('')}</ul>
    </details>` : '';
  return `<section class="card weight-card" id="weight-history" aria-labelledby="weight-history-heading">
    <header class="weight-card-heading">
      <div><h2 id="weight-history-heading" tabindex="-1">Kilo geçmişi</h2>
        ${latest ? `<p class="weight-current"><strong>${formatMeasurement.format(latest.kg)} <small>kg</small></strong><span>Son ölçüm · ${weightDateFormat.format(new Date(latest.date))}</span></p>` : ''}
      </div>
      <details id="weight-editor">
        <summary>Ölçüm ekle</summary>
        <form id="weight-form">
          <div class="field"><label for="weight-date">Ölçüm tarihi</label><input id="weight-date" name="date" type="date" max="${today}" value="${today}" required></div>
          <div class="field"><label for="weight-amount">Kilo (kg)</label><input id="weight-amount" name="amount" type="number" min="${MIN_WEIGHT_KG}" max="${MAX_WEIGHT_KG}" step="0.1" inputmode="decimal"
            value="${latest?.date===today?latest.kg:''}" placeholder="Örn. 78,2" required></div>
          <button type="submit" class="btn btn-primary btn-sm">Ölçümü kaydet</button>
        </form>
      </details>
    </header>
    <div id="weight-trend-content">${weightTrendView()}</div>
    ${measurements}
  </section>`;
}

function paintWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (canvas) drawWeightTrend(canvas,visibleWeightTrend());
}

function weeklyProgressView() {
  const {workouts,foodDays,improvement} = weeklyProgress(state.workoutLogs,state.foodLogs,weekKey(),dateKey());
  const completed = completedThisWeek();
  const done = state.plan.workouts.filter(workout => completed.includes(workout.day)).length;
  const total = state.plan.workouts.length;
  let change = '';
  if (improvement) {
    const unit = improvement.unit === 'seconds' ? 'sn' : 'tekrar';
    const comparison = improvement.moreCount
      ? `+${improvement.moreCount} ${unit}${improvement.weightKg === null ? '' : ` · ${formatMeasurement.format(improvement.weightKg)} kg`}`
      : `+${formatMeasurement.format(improvement.moreWeight)} kg · ${improvement.count} ${unit}`;
    change = `<div><dt>${escapeHTML(improvement.name)}</dt><dd>${comparison}</dd></div>`;
  }
  return `<section class="card weekly-strip" aria-labelledby="weekly-progress-heading">
    <h2 id="weekly-progress-heading">Bu hafta</h2>
    <dl class="weekly-summary">
      <div><dt>Antrenman</dt><dd>${number(workouts)} seans kayıtlı${total ? ` · Plan ${done}/${total}` : ''}</dd></div>
      ${change}
      <div><dt>Beslenme kaydı</dt><dd>${foodDays}/7 gün</dd></div>
    </dl>
  </section>`;
}

function homeView() {
  const energy=calculateEnergy(state.profile);
  const name=state.profile.name ? `, ${escapeHTML(state.profile.name)}` : '';
  const today=dayIndex();
  const todaysMeals=visibleMenu()[today];
  const workoutLogs=todayWorkoutLogs();
  const active=activityTotal(workoutLogs);
  const workout=state.plan.workouts.find(w=>w.day===WEEKDAYS[today]);
  const used=consumedToday();
  const remaining=energy?.target!=null?energy.target-used:null;
  const remainingText=remaining===null?'Hedef belirlenmedi':remaining>=0?`${number(remaining)} kcal hedefe kalan`:`${number(-remaining)} kcal hedefin üzerinde`;
  return `<section class="overview-head overview-cover"><div><p class="eyebrow">${escapeHTML(todayName())}</p><h1>Bugünün rotası${name}</h1><p class="subcopy">Günlük öğünlerini ve antrenmanını takip et.</p><div class="overview-actions"><button class="btn btn-primary" data-tab="nutrition">Öğün kaydet</button><button class="btn btn-secondary" data-tab="${state.workoutSession?'session':'training'}">${state.workoutSession?'Antrenmana dön':'Bölge seç ve çalış'}</button></div></div></section>
  ${bodyGoalsView()}
  ${weightHistoryView()}
  <div class="overview-grid">
    <section class="card calories-card"><div class="card-heading"><div><h2>Günlük kalori dengesi</h2></div><span class="corner-mark">→</span></div>
      <div class="calories-body">${energyRing(energy)}<div class="calorie-details"><span class="detail-caption">TAHMİNİ GÜNLÜK HEDEF</span><div class="target-value">${energy?.target!=null?number(energy.target):'—'}<span> kcal</span></div><div class="remaining-line">${remainingText}</div></div></div>
      ${energy?.note?`<p class="safety-note">${escapeHTML(energy.note)}</p>`:''}
      ${!energy?'<p class="calorie-hint">Kalori hedefi için yaş, boy, kilo ve aktivite bilgilerini <button class="inline-link" data-tab="profile">profilden ekle</button>.</p>':'<p class="calorie-hint">Bu halka yalnızca kaydettiğin öğün kalorilerini gösterir; örnek menüler otomatik sayılmaz.</p>'}
    </section>
    <section class="card macro-card"><div class="card-heading"><div><h2>Makro dağılımın</h2></div><span class="icon-card">◎</span></div><p class="small-muted">Tahmini günlük hedefler · tüketim kaydı değil</p><div class="macros">${macrosView(energy)}</div><div class="macro-footer"><span>Dinlenme metabolizması</span><strong>${energy?number(energy.bmr)+' kcal':'—'}</strong></div><div class="macro-footer"><span>Koruma kalorisi (TDEE)</span><strong>${energy?number(energy.maintenance)+' kcal':'—'}</strong></div></section>
  </div>
  <div class="section-head"><h2>Bugünkü plan</h2></div>
  <div class="today-grid">
    <section class="card today-card"><div class="today-card-head"><span class="today-emoji">🥗</span><span class="eyebrow">ÖĞÜN ÖNERİSİ</span></div><h3>${escapeHTML(todaysMeals.lunch)}</h3><p class="meal-portion">${mealPortionText(todaysMeals,'lunch') || 'Öğle yemeği için örnek fikir.'}</p><button class="text-action" data-tab="nutrition">7 günlük menüyü gör <span>→</span></button></section>
    <section class="card today-card"><div class="today-card-head"><span class="today-emoji">${workout?'🏋️':'🌿'}</span><span class="eyebrow">BUGÜNKÜ ANTRENMAN</span></div><h3>${workout?escapeHTML(workout.title):'Aktif dinlenme günü'}</h3><p>${workout?escapeHTML(workoutSummary(workout)):'Bugün planlı antrenmanın yok. Hafif hareket veya dinlenme tercih edebilirsin.'}</p><button class="text-action" data-tab="training">Antrenmanları aç <span>→</span></button></section>
  </div>
  ${weeklyProgressView()}
  <section class="card activity-summary"><div><h3>Bugünkü antrenman kaydı</h3><p class="small-muted">${workoutLogs.length ? `${workoutLogs.length} seans · ${number(workoutLogs.reduce((sum, log) => sum + log.minutes, 0))} dk` : 'Henüz antrenman kaydı yok.'}</p></div>
    <div class="activity-value"><strong>${active === null ? '—' : `≈ ${number(active)} kcal`}</strong><span>Tahmini aktif yakım</span></div>
    <button class="btn btn-secondary btn-sm" data-tab="training">Antrenmanları aç</button></section>
  ${installPanel()}${banner()}`;
}
function recentFoodEntries() {
  const recent = [];
  const names = new Set();
  for (const date of Object.keys(state.foodLogs).sort().reverse()) {
    for (const entry of state.foodLogs[date].slice().reverse()) {
      const key = entry.name.trim().toLocaleLowerCase('tr-TR');
      if (!key || entry.recipePortion || names.has(key)) continue;
      recent.push(entry);
      names.add(key);
      if (recent.length === 4) return recent;
    }
  }
  return recent;
}

function foodQuickAddView() {
  const recent = recentFoodEntries();
  const recipes = state.recipes.slice(-4).reverse();
  return `${recent.length ? `<div class="quick-add-group"><h3>Son eklenenler</h3><div class="quick-add-grid">
    ${recent.map(entry => {
      const portion = entry.grams ? formatMeasurement.format(entry.grams) + ' g · ' : '';
      return `<button type="button" class="quick-add-item" data-relog-food="${escapeHTML(entry.id)}">
        <span><strong>${escapeHTML(entry.name)}</strong><small>${portion}${entry.estimated?'≈ ':''}${number(entry.kcal)} kcal</small></span>
        <span class="quick-add-icon" aria-hidden="true">+</span></button>`;
    }).join('')}
    </div></div>` : ''}
    <div class="quick-add-group"><div class="quick-add-heading">
      ${recipes.length?'<h3>Kayıtlı tarifler</h3>':''}
      <button class="text-action" type="button" data-action="open-recipes">${recipes.length?'Tüm tarifler':'Tarif oluştur'} →</button></div>
    ${recipes.length ? `<div class="quick-add-grid">${recipes.map(recipe => {
      const kcal = summarizeRecipe(recipe.ingredients,recipe.servings).servingKcal;
      return `<button type="button" class="quick-add-item" data-log-recipe="${escapeHTML(recipe.id)}" ${kcal>MAX_ENTRY_KCAL?'disabled':''}>
        <span><strong>${escapeHTML(recipe.name)}</strong><small>1 porsiyon · ≈ ${number(kcal)} kcal</small></span>
        <span class="quick-add-icon" aria-hidden="true">+</span></button>`;
    }).join('')}</div>` : ''}
    </div>`;
}

function foodDiaryEntries(logs) {
  const groups = [];
  const hasMeals = logs.some(entry => entry.meal);
  for (const meal of [...Object.keys(MEAL_LABELS),'']) {
    const entries = logs.filter(entry => entry.meal === meal).reverse();
    if (!entries.length) continue;
    const heading = hasMeals ? `<h3>${MEAL_LABELS[meal] ?? 'Öğün seçilmemiş'}</h3>` : '';
    groups.push(`<div class="food-meal-group">${heading}${entries.map(entry => `<div class="food-entry">
      <div><strong>${escapeHTML(entry.name)}</strong><span>${entry.recipePortion ? '1 porsiyon · ' : entry.grams ? number(entry.grams) + ' g · ' : ''}${entry.estimated ? '≈ ' : ''}${number(entry.kcal)} kcal</span></div>
      <button type="button" class="remove-food" data-remove-food="${escapeHTML(entry.id)}" aria-label="${escapeHTML(entry.name)} kaydını sil">✕</button></div>`).join('')}</div>`);
  }
  return `<div class="food-list">${groups.join('')}</div>`;
}

function foodDiary(){
  const energy=calculateEnergy(state.profile);
  const logs=todayEntries();
  const consumed=consumedToday();
  const target=energy?.target;
  return `<section id="food-diary" class="card diary-card"><div class="card-heading"><div><div class="eyebrow">KALORİ GÜNLÜĞÜ</div><h2>Bugün ne yedin?</h2></div><span class="small-tag">${escapeHTML(todayName())}</span></div>
    <div class="diary-metrics"><div><span>Kaydedilen</span><strong>${number(consumed)} <small>kcal</small></strong></div><div><span>Tahmini günlük hedef</span><strong>${target!=null?number(target):'—'} <small>kcal</small></strong></div></div>
    ${target!=null?`<div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,Math.round(consumed/target*100))}%"></div></div>`:'<p class="notice">Hedef için profilindeki vücut ölçülerini tamamla.</p>'}
    <form id="food-form" class="food-form">
      <div class="field food-name"><label for="food-name">Öğün / besin</label><input id="food-name" name="name" maxlength="70" required placeholder="Örn. 200 g yoğurt" autocomplete="off" aria-describedby="food-estimate"></div>
      <div id="food-suggestions" class="food-suggestions" role="group" aria-label="Eşleşen besinler" hidden></div>
      <div class="food-tools">
        <button class="btn btn-secondary btn-sm" type="button" data-action="copy-meal" aria-haspopup="dialog">Önceki öğünü kopyala</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="personal-food" aria-haspopup="dialog">Kendi besinimi kaydet</button>
      </div>
      <div id="food-quick-add">${foodQuickAddView()}</div>
      <div class="field"><label for="food-grams">Porsiyon (g)</label><input id="food-grams" name="grams" type="number" min="1" max="2000" step="1" inputmode="numeric" placeholder="Örn. 200"></div>
      <div class="field food-rate"><label for="food-rate">Etiket (kcal / 100 g)</label><input id="food-rate" name="rate" type="number" min="0" max="900" step="any" inputmode="decimal" placeholder="İsteğe bağlı"></div>
      <div class="field food-kcal"><label for="food-kcal">Kalori (kcal)</label><input id="food-kcal" name="kcal" inputmode="numeric" type="number" min="0" max="${MAX_ENTRY_KCAL}" step="1" required placeholder="kcal"></div>
      <div class="field food-meal"><label for="food-meal">Öğün (isteğe bağlı)</label><select id="food-meal" name="meal"><option value="">Öğün seçilmedi</option>${selectOptions(MEAL_LABELS)}</select></div>
      <button type="submit" class="btn btn-primary">+ Ekle</button>
      <div class="food-feedback">
        <p id="food-estimate" class="form-help" role="status">Katalogda ${FOODS.length} besin ve tarif var. Diğer ürünler için gramı ve etiketteki kcal / 100 g değerini gir.</p>
      </div>
    </form>
    <div class="diary-list-head"><strong>Bugünün kayıtları</strong><span>${logs.length} kayıt</span></div>
    ${logs.length?foodDiaryEntries(logs):'<div class="no-food">Henüz kayıt yok. İlk öğününü ekleyerek başlayabilirsin.</div>'}
    <p class="data-local">↳ Kayıtlar bu tarayıcıdaki localStorage’da tutulur.</p>
  </section>`;
}

function foodDialogsView() {
  return `<dialog id="meal-copy-dialog" class="card food-dialog" aria-labelledby="meal-copy-heading">
    <div class="card-heading"><h2 id="meal-copy-heading">Önceki öğünü kopyala</h2>
      <form method="dialog"><button class="btn btn-ghost btn-sm" type="submit" autofocus>Kapat</button></form>
    </div>
    <p class="small-muted">Bir öğün seç. İçindeki besinler ve porsiyonlar bugüne eklenecek.</p>
    <div id="meal-copy-options"></div>
    <p class="form-help" role="status"></p>
  </dialog>
  <dialog id="personal-food-dialog" class="card food-dialog" aria-labelledby="personal-food-heading">
    <div class="card-heading"><h2 id="personal-food-heading">Kendi besinimi kaydet</h2>
      <form method="dialog"><button class="btn btn-ghost btn-sm" type="submit">Kapat</button></form>
    </div>
    <form id="personal-food-form">
      <div class="field"><label for="personal-food-name">Besin adı</label><input id="personal-food-name" name="name" maxlength="70" placeholder="Örn. Annemin pilavı" required autofocus></div>
      <div class="field"><label for="personal-food-rate">Kalori (kcal / 100 g)</label><input id="personal-food-rate" name="rate" type="number" min="0" max="900" step="any" inputmode="decimal" required></div>
      <p class="form-help" role="status"></p>
      <div class="personal-food-actions">
        <button class="btn btn-primary" type="submit">Besini kaydet</button>
        <button class="btn btn-ghost" type="button" data-action="remove-personal-food" hidden>Kişisel besini sil</button>
      </div>
    </form>
  </dialog>`;
}
function recipeIngredientView(index) {
  return `<fieldset class="recipe-ingredient">
    <legend>Malzeme</legend>
    <div class="recipe-ingredient-grid">
      <div class="field recipe-ingredient-name"><label for="recipe-food-${index}">Besin adı</label>
        <input id="recipe-food-${index}" name="ingredient" maxlength="70" placeholder="Örn. haşlanmış makarna" autocomplete="off" required></div>
      <div class="field"><label for="recipe-grams-${index}">Gram</label>
        <input id="recipe-grams-${index}" name="grams" type="number" min="1" max="2000" step="1" inputmode="numeric" required></div>
      <div class="field"><label for="recipe-rate-${index}">Etiket (kcal / 100 g)</label>
        <input id="recipe-rate-${index}" name="rate" type="number" min="0" max="900" step="any" inputmode="decimal" placeholder="Katalogdan" aria-describedby="recipe-help" required></div>
      <button class="btn btn-ghost btn-sm" type="button" data-remove-ingredient>Malzemeyi kaldır</button>
      <div class="food-suggestions recipe-suggestions" aria-label="Eşleşen besinler" role="group" hidden></div>
    </div>
  </fieldset>`;
}

function savedRecipesView() {
  if (!state.recipes.length) return '<p class="no-food">Henüz kayıtlı tarifin yok.</p>';
  return `<div class="recipe-saved-list">${state.recipes.slice().reverse().map(recipe => {
    const {totalKcal,servingKcal} = summarizeRecipe(recipe.ingredients,recipe.servings);
    const id = escapeHTML(recipe.id);
    return `<article class="recipe-saved">
      <div><h3>${escapeHTML(recipe.name)}</h3><p class="small-muted">${recipe.servings} porsiyon · Toplam ≈ ${number(totalKcal)} kcal</p>
        <strong>1 porsiyon ≈ ${number(servingKcal)} kcal</strong></div>
      <div class="recipe-actions"><button class="btn btn-secondary btn-sm" type="button" data-log-recipe="${id}" ${servingKcal>MAX_ENTRY_KCAL?'disabled':''}>1 porsiyonu günlüğe ekle</button>
        <button class="btn btn-ghost btn-sm" type="button" data-delete-recipe="${id}" aria-label="${escapeHTML(recipe.name)} tarifini sil">Sil</button></div>
      ${servingKcal>MAX_ENTRY_KCAL?`<p class="form-help">Günlüğe tek seferde en fazla ${number(MAX_ENTRY_KCAL)} kcal eklenebilir.</p>`:''}
    </article>`;
  }).join('')}</div>`;
}

function recipeBuilderView() {
  return `<details id="recipe-builder" class="card diary-card">
    <summary class="recipe-toggle"><span><strong>Öğün oluşturucu</strong><span class="small-muted">Malzemeleri ekle, porsiyon kalorisini hesapla ve tarifini kaydet.</span></span></summary>
    <form id="recipe-form" data-next-row="1">
      <div class="recipe-form-heading">
        <div class="field"><label for="recipe-name">Tarif adı</label><input id="recipe-name" name="recipeName" maxlength="70" placeholder="Örn. Tavuklu makarnam" required></div>
        <div class="field"><label for="recipe-servings">Porsiyon sayısı</label><input id="recipe-servings" name="servings" type="number" min="1" max="${MAX_SERVINGS}" step="1" inputmode="numeric" value="1" required></div>
      </div>
      <p id="recipe-help" class="form-help">Katalog eşleşmesi kcal değerini doldurur. Diğer malzemeler için etiketteki kcal / 100 g değerini gir.</p>
      <div id="recipe-ingredients">${recipeIngredientView(0)}</div>
      <button class="btn btn-secondary btn-sm" type="button" data-add-ingredient>+ Malzeme ekle</button>
      <p class="recipe-totals" role="status">Kaloriyi hesaplamak için malzemeleri ve porsiyon sayısını gir.</p>
      <button class="btn btn-primary" type="submit">Tarifi kaydet</button>
    </form>
    <div class="diary-list-head"><strong id="saved-recipes-heading" tabindex="-1">Kayıtlı tarifler</strong></div>
    <div id="saved-recipes">${savedRecipesView()}</div>
  </details>`;
}

function mealPortionText(menu, type) {
  const portion = menu.portions?.[type];
  if (validMealPortion(portion)) return `${number(portion.grams)} g · ≈ ${number(portion.kcal)} kcal`;

  // Önceki AI menülerinde değerler saklanmıyordu. Tanınan besinleri katalogdan göster.
  const food = findFood(menu[type]);
  return food ? `${number(food.portion)} g · ≈ ${number(estimateFoodCalories(food,food.portion))} kcal` : '';
}

function menuView() {
  const meal = visibleMenu()[currentDay];
  const picker = WEEKDAYS.map((day,index) => `<button class="day-chip ${currentDay===index?'active':''}" type="button" data-day="${index}" aria-label="${day}" aria-pressed="${currentDay===index}">${SHORT_DAYS[index]}</button>`).join('');
  const meals = TYPES.map(type => {
    const portion = mealPortionText(meal,type.key);
    return `<article class="card meal-card"><div class="meal-emoji" aria-hidden="true">${type.emoji}</div><div><div class="type">${type.label}</div><h3>${escapeHTML(meal[type.key])}</h3>
      <p class="meal-portion">${portion || 'Porsiyon bilgisi için AI menüsünü yenile.'}</p></div></article>`;
  }).join('');
  return `<div class="section-head menu-head"><div><h2>${state.source==='ai'?'Yapay zekâ menüsü':'Haftalık menü'}</h2>
      <p class="small-muted">${escapeHTML(DIETS[state.profile.diet])}${state.source==='local'?' · Her hafta yeni fikirler':''}</p></div>
      ${state.source==='local'?'<button class="btn btn-secondary btn-sm" type="button" data-action="rotate-menu">Menüyü değiştir ↻</button>':''}</div>
    <div class="day-picker" aria-label="Gün seçimi">${picker}</div>
    <div class="section-head selected-day-head"><h2>${WEEKDAYS[currentDay]}</h2></div>
    <div class="grid meal-grid">${meals}</div>
    <p class="nutrition-footnote">Gram ve kalori örnek porsiyon içindir. Tarif, yağ ve kullanılan malzemeler değerleri değiştirebilir. ${state.profile.allergies?'Profilindeki alerji bilgisine göre içerikleri ayrıca kontrol et.':''}</p>${banner()}`;
}

function nutritionView() {
  return `<div class="head-row"><div><div class="eyebrow">◉ BESLENME</div><h1>Beslenmeni takip et.</h1><p class="subcopy">Öğünlerini kaydet, haftalık menü fikirlerine göz at.</p></div><button class="btn btn-secondary btn-sm" data-tab="profile">⚙ Hedefi düzenle</button></div>
    ${foodDiary()}${foodDialogsView()}${recipeBuilderView()}<section id="weekly-menu">${menuView()}</section>`;
}
function workoutBurnText(activity, minutes) {
  const weight = state.profile.weightKg;
  const kcal = estimateActiveCalories(activity, minutes, weight ?? REFERENCE_WEIGHT_KG);
  if (kcal === null) return '';
  return `≈ ${number(kcal)} aktif kcal${weight === null ? ` (${REFERENCE_WEIGHT_KG} kg örneği)` : ''}`;
}

function workoutSummary(workout) {
  const minutes = workoutMinutes(workout);
  const burn = workoutBurnText(workout.activity, minutes);
  const duration = minutes ? `${minutes} dk` : workout.duration || 'Esnek süre';
  return burn ? `${duration} · ${burn}` : duration;
}

function activityOptions() {
  return '<option value="">Aktivite seç</option>' + Object.entries(ACTIVITIES)
    .map(([key, activity]) => `<option value="${key}">${activity.label}</option>`).join('');
}

function workoutForm(workout, index) {
  const suffix = workout ? index : 'extra';
  const hasActivity = workout && Object.hasOwn(ACTIVITIES, workout.activity);
  const minutes = workout ? workoutMinutes(workout) : '';
  const preview = workoutBurnText(workout?.activity, minutes) || 'Aktivite ve süre gir';
  return `<form class="workout-form${workout?' planned-form':''}" data-workout-form ${workout?`data-plan-index="${index}"`:''}>
    ${hasActivity ? '<div class="field workout-kind"><span>Aktivite</span><strong>' + ACTIVITIES[workout.activity].label + '</strong></div>' : `<div class="field workout-kind"><label for="workout-activity-${suffix}">Aktivite</label><select name="activity" id="workout-activity-${suffix}" required>${activityOptions()}</select></div>`}
    <div class="field"><label for="workout-minutes-${suffix}">Süre (dk)</label><input id="workout-minutes-${suffix}" name="minutes" type="number" min="1" max="${MAX_WORKOUT_MINUTES}" step="1" inputmode="numeric" value="${minutes ?? ''}" required></div>
    <output class="burn-estimate" aria-label="Tahmini aktif kalori yakımı">${preview}</output>
    <button class="btn btn-primary" type="submit">${workout?'Antrenmanı tamamladım':'+ Aktiviteyi kaydet'}</button>
  </form>`;
}

function selectOptions(items, selected) {
  return Object.entries(items).map(([value,label]) =>
    `<option value="${value}" ${value===selected?'selected':''}>${escapeHTML(label)}</option>`).join('');
}

function focusChoices(choices,name,legend,selected) {
  return `<fieldset class="focus-choice-group">
    <legend>${legend}</legend>
    <div class="focus-choices focus-choices-${name}">
      ${Object.entries(choices).map(([value,label]) => `<label class="focus-choice">
        <input type="radio" name="${name}" value="${value}" ${value===selected?'checked':''}>
        <span>${escapeHTML(label)}</span>
      </label>`).join('')}
    </div>
  </fieldset>`;
}

function normalizedFocusSettings(settings) {
  if (!settings || !Object.hasOwn(FOCUS_REGIONS,settings.region) || !Object.hasOwn(FOCUS_GOALS,settings.goal) ||
      !Object.hasOwn(EQUIPMENT,settings.equipment)) return null;
  return {region:settings.region, goal:settings.goal, equipment:settings.equipment};
}

function exerciseVideoLinks(exercise) {
  const videos = exerciseVideos(exercise);
  if (!videos.length) return '';
  return `<div class="exercise-video-links">${videos.map(video => {
    const label = video.direct ? 'YouTube videosu' : 'YouTube’da ara';
    const text = videos.length > 1 ? `${label} · ${video.name}` : label;
    return `<a class="exercise-video-link" href="${escapeHTML(video.url)}" target="_blank" rel="noopener noreferrer"
      aria-label="${escapeHTML(video.name)} · ${label} (yeni sekme)">${escapeHTML(text)}</a>`;
  }).join('')}</div>`;
}

function focusResult(workout,goal,minutes) {
  const weight = state.profile.weightKg;
  const estimate = estimateFocusedWorkout(workout,minutes,weight ?? REFERENCE_WEIGHT_KG);
  const blockRows = workout.blocks.map((block,index) => {
    const measurement = estimate?.blocks[index];
    return `<li><div><strong>${block.name}</strong><p>${block.detail}</p>${block.cue?`<p class="focus-cue">${block.cue}</p>`:''}${exerciseVideoLinks(block.name)}</div>
      <span class="focus-block-metrics">${formatMeasurement.format(measurement?.minutes ?? block.minutes)} dk
        ${measurement?`<strong>≈ ${formatMeasurement.format(measurement.kcal)} kcal</strong>`:''}</span></li>`;
  }).join('');
  return `<div class="focus-session-heading">
    <div><h3>${workout.title}</h3><span class="small-muted">Tahmini süre ${estimate ? minutes : workout.minutes} dk · ${state.profile.experience==='orta'?'Orta seviye':'Başlangıç seviyesi'}</span></div>
    <div class="focus-energy" role="status"><strong>${estimate?`≈ ${number(estimate.kcal)} kcal`:'—'}</strong>
      <span>Tahmini aktif yakım${weight === null ? ` · ${REFERENCE_WEIGHT_KG} kg örneği` : ` · ${formatMeasurement.format(weight)} kg`}</span></div>
    </div>
    <ul class="focus-blocks" aria-label="Hareketler ve antrenman bölümleri">${blockRows}</ul>
    ${goal==='fatLoss'?'<p class="focus-note">Yağ kaybı tüm vücutta gerçekleşir. Bölge seçimi kuvvet hareketlerini belirler ve yürüyüş genel kardiyo sağlar.</p>':''}
    <p class="focus-note">Hareket kalorisinde set ve dinlenme süreleri birlikte tahmin edilir. MET hesabı, girilen seans süresini bölümlere orantılı dağıtır.${weight===null?' Kişisel tahmin için <button class="inline-link" type="button" data-tab="profile">güncel kilonu ekle</button>.':''}</p>`;
}

function focusPlanSummary(settings,minutes) {
  const duration = validWorkoutMinutes(minutes) ? ` · ${minutes} dk` : '';
  return `${FOCUS_GOALS[settings.goal]} · ${EQUIPMENT[settings.equipment]}${duration}`;
}

function focusedWorkoutView() {
  const settings = focusDraft ?? state.focusSettings ?? {region:'chest',
    goal:state.profile.goal==='yag'?'fatLoss':'muscle', equipment:state.profile.equipment};
  const workout = buildFocusedWorkout({...settings,experience:state.profile.experience});
  const minutes = validWorkoutMinutes(focusDraft?.minutes) ? focusDraft.minutes : workout.minutes;
  return `<section class="card focus-card" aria-labelledby="focus-heading">
    <div class="card-heading"><div><h2 id="focus-heading">Bölgesel antrenman</h2>
      <p class="small-muted">Bölgeye dokununca hareket planı aşağıda güncellenir.</p></div></div>
    <form id="focus-workout-form" novalidate>
      ${focusChoices(FOCUS_REGIONS,'region','Çalışacağın bölge',settings.region)}
      <div class="session-entry-actions">
        <button class="btn btn-primary" type="button" data-session-action="start">${state.workoutSession?'Antrenmana dön':'Antrenmanı başlat'}</button>
        <button class="btn btn-secondary" type="button" data-action="open-custom-workout">Kendi antrenmanını oluştur</button>
      </div>
      <details class="focus-plan-options" id="focus-plan-options">
        <summary><strong>Planı düzenle</strong><span id="focus-plan-summary">${focusPlanSummary(settings,minutes)}</span></summary>
        ${focusChoices(FOCUS_GOALS,'goal','Antrenman amacı',settings.goal)}
        <div class="focus-fields">
          <div class="field"><label for="focus-equipment">Ekipman</label><select id="focus-equipment" name="equipment">${selectOptions(EQUIPMENT,settings.equipment)}</select></div>
          <div class="field"><label for="focus-minutes">Tahmini seans süresi (dk)</label><input id="focus-minutes" name="minutes" type="number" inputmode="numeric" min="1" max="${MAX_WORKOUT_MINUTES}" step="1" required value="${minutes}"></div>
        </div>
      </details>
      <div id="focus-result">${focusResult(workout,settings.goal,minutes)}</div>
      <button class="btn btn-secondary focus-log" type="submit">Tamamladığım seansı kaydet</button>
    </form>
  </section>`;
}

function customDraft(region) {
  return customDrafts.get(region) ?? state.customPlans[region] ?? {
    region,equipment:focusDraft?.equipment ?? state.focusSettings?.equipment ?? state.profile.equipment,exercises:[]
  };
}

function customMovementOptions(region,equipment) {
  return regionalExercises(region,equipment).map(item => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join('');
}

function customMovementRows(exercises) {
  const value = number => Number.isFinite(number) ? number : '';
  return exercises.map((move,index) => {
    const slot = index+1;
    const seconds = move.unit === 'seconds';
    return `<fieldset class="custom-movement" data-custom-row data-name="${escapeHTML(move.name)}" data-unit="${move.unit}" data-equipment="${move.equipment}">
      <legend>${escapeHTML(move.name)} <small>· ${EQUIPMENT[move.equipment]}</small></legend>
      <div class="custom-fields">
        <div class="field"><label for="custom-sets-${slot}">Set</label>
          <input type="number" id="custom-sets-${slot}" data-quantity="sets" min="1" max="${MAX_CUSTOM_SETS}" step="1" value="${value(move.sets)}" inputmode="numeric" required></div>
        <div class="field"><label for="custom-count-${slot}">${seconds?'Tutuş (sn)':'Tekrar'}</label>
          <input type="number" id="custom-count-${slot}" data-quantity="count" min="1" max="${MAX_SET_COUNT[move.unit]}" step="1" value="${value(move.count)}" inputmode="numeric" required></div>
        <div class="field"><label for="custom-rest-${slot}">Dinlenme (sn)</label>
          <input type="number" id="custom-rest-${slot}" data-quantity="restSeconds" min="0" max="${MAX_REST_SECONDS}" step="1" value="${value(move.restSeconds)}" inputmode="numeric" required></div>
      </div>
      <button class="text-action custom-remove" type="button" data-custom-action="remove" data-index="${index}" aria-label="${escapeHTML(move.name)} hareketini kaldır">Kaldır</button>
    </fieldset>`;
  }).join('');
}

function customPlanSummary(draft) {
  if (!draft.exercises.length) return 'Bölge ve ekipman seçip ilk hareketi ekle.';
  const plan = normalizeCustomPlan(draft);
  if (!plan) return 'Set, tekrar, tutuş ve dinlenme sayılarını kontrol et.';
  const workout = buildCustomWorkout(plan);
  const minutes = Math.ceil(workout.minutes);
  const weight = state.profile.weightKg;
  const estimate = estimateFocusedWorkout(workout,minutes,weight ?? REFERENCE_WEIGHT_KG);
  const count = plan.exercises.reduce((sum,move) => sum+move.sets,0);
  return `${plan.exercises.length} hareket · ${count} set · ≈ ${number(minutes)} dk${estimate? ` · ≈ ${number(estimate.kcal)} aktif kcal${weight===null?' (70 kg örneği)':''}`:''}`;
}

function customWorkoutForm(region) {
  const draft = customDraft(region);
  return `<form id="custom-workout-form" data-region="${region}">
    <div class="custom-picker">
      <div class="field"><label for="custom-region">Bölge</label><select id="custom-region" name="region">${selectOptions(FOCUS_REGIONS,region)}</select></div>
      <div class="field"><label for="custom-equipment">Ekipman</label><select id="custom-equipment" name="equipment">${selectOptions(EQUIPMENT,draft.equipment)}</select></div>
    </div>
    <div class="custom-add-move">
      <div class="field"><label for="custom-exercise">Bölgeye uygun hareket</label>
        <select id="custom-exercise" name="exercise">${customMovementOptions(region,draft.equipment)}</select></div>
      <button type="button" class="btn btn-secondary btn-sm" data-custom-action="add">Hareket ekle</button>
    </div>
    <details class="custom-manual">
      <summary>Kendi hareketimi yaz</summary>
      <div class="custom-add-move">
        <div class="field"><label for="custom-name">Hareket adı</label><input id="custom-name" name="movementName" maxlength="100" placeholder="Örn. Bantla yana yürüyüş"></div>
        <div class="field"><label for="custom-unit">Ölçüm türü</label><select id="custom-unit" name="unit"><option value="reps">Tekrar</option><option value="seconds">Süre (sn)</option></select></div>
        <button type="button" class="btn btn-secondary btn-sm" data-custom-action="add-manual">Kendi hareketimi ekle</button>
      </div>
    </details>
    <div id="custom-movements">${customMovementRows(draft.exercises)}</div>
    <p id="custom-plan-preview" class="small-muted" role="status">${customPlanSummary(draft)}</p>
    <div class="custom-plan-actions">
      <button type="submit" name="intent" value="save" class="btn btn-secondary">Planı kaydet</button>
      ${state.workoutSession?'<button type="button" class="btn btn-primary" data-session-action="start">Antrenmana dön</button>':
        '<button type="submit" name="intent" value="start" class="btn btn-primary">Kaydet ve başlat</button>'}
    </div>
  </form>`;
}

function customWorkoutView() {
  const region = customRegion ?? focusDraft?.region ?? state.focusSettings?.region ?? 'chest';
  return `<details class="card custom-workout" id="custom-workout">
    <summary>Kendi antrenmanını oluştur</summary>
    ${customWorkoutForm(region)}
  </details>`;
}

const journalDateFormat = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',weekday:'long'});
const journalWeekFormat = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'});

function workoutJournalEntry(log) {
  const sets = log.sets ?? [];
  return `<div class="journal-entry">
    <div class="food-entry"><div><strong>${escapeHTML(log.title)}</strong>
      <span>${log.minutes} dk · ${log.kcal === null ? 'Yakım hesaplanmadı' : `≈ ${number(log.kcal)} aktif kcal`}</span></div>
      <button type="button" class="remove-food" data-remove-workout="${escapeHTML(log.id)}" aria-label="${escapeHTML(log.title)} kaydını sil">✕</button></div>
    ${sets.length ? `<details class="journal-sets"><summary>${sets.length} setin ayrıntıları</summary>
      <ol>${sets.map(set => `<li><span>${escapeHTML(set.name)}</span> <strong>${performanceText(set)}</strong></li>`).join('')}</ol></details>` : ''}
  </div>`;
}

function workoutJournalView() {
  const today = dateKey();
  const current = weekKey();
  const selected = journalWeek && journalWeek <= current ? journalWeek : current;
  const weeks = [...new Set([...journalWeeks(state.workoutLogs,today),selected])].sort().reverse();
  const options = weeks.map(week => {
    const start = new Date(week+'T12:00:00');
    const end = new Date(weekEnd(week)+'T12:00:00');
    const label = journalWeekFormat.formatRange(start,end);
    return `<option value="${week}" ${week===selected?'selected':''}>${week===current?'Bu hafta · ':''}${label}</option>`;
  }).join('');
  const {days,workouts,minutes,kcal,estimated} = weeklyWorkoutLog(state.workoutLogs,selected,today);
  const burn = estimated ? ` · ≈ ${number(kcal)} aktif kcal${estimated < workouts ? ` (${estimated} seans)` : ''}` : '';
  const entries = days.map(([date,logs]) => `<div class="journal-day">
    <h3>${date===today?'Bugün · ':''}${journalDateFormat.format(new Date(date+'T12:00:00'))}</h3>
    ${logs.slice().reverse().map(workoutJournalEntry).join('')}</div>`).join('');
  return `<section class="card diary-card" id="training-journal" aria-labelledby="training-journal-heading">
    <div class="journal-head"><h2 id="training-journal-heading" tabindex="-1">Haftalık antrenman günlüğü</h2>
      <div class="field"><label for="journal-week">Hafta seç</label><select id="journal-week">${options}</select></div></div>
    <p class="journal-total">${workouts} seans · ${number(minutes)} dk${burn}</p>
    ${entries || '<p class="no-food">Bu haftada antrenman kaydı yok.</p>'}
  </section>`;
}
function trainingView() {
  const completed = completedThisWeek();
  const cards = state.plan.workouts.map((workout,index) => {
    const done = completed.includes(workout.day);
    const exercises = workout.exercises.map(exercise => `<li><div>${escapeHTML(exercise)}${exerciseVideoLinks(exercise)}</div></li>`).join('');
    return `<article class="card workout-card ${done?'done':''}"><div class="workout-top"><span class="workout-day">${escapeHTML(workout.day)}</span><span class="duration">Plan · ${escapeHTML(workoutSummary(workout))}</span></div>
      <h3>${escapeHTML(workout.title)}</h3><ul class="exercise-list">${exercises}</ul>
      ${done?`<button class="btn btn-secondary btn-full" type="button" data-undo-workout="${index}">✓ Tamamlandı · Geri al</button>`:workoutForm(workout,index)}</article>`;
  }).join('');
  const done = state.plan.workouts.filter(workout => completed.includes(workout.day)).length;
  return `<div class="head-row"><div><div class="eyebrow">▤ ANTRENMAN</div><h1>Antrenmanların</h1><p class="subcopy">Planındaki seansları veya kendi aktivitelerini kaydet.</p></div>
    <div class="training-head-actions"><span class="small-tag">${done}/${state.plan.workouts.length} planlı seans tamamlandı</span>
      <button class="btn btn-secondary btn-sm" type="button" data-action="open-workout-journal">Antrenman günlüğü ↓</button></div></div>
    ${focusedWorkoutView()}
    ${customWorkoutView()}
    <div class="section-head"><h2>Haftalık program</h2><button class="text-action" data-tab="profile">Planı kişiselleştir →</button></div>
    <div class="activity-explainer">${state.profile.weightKg === null ? '<p>Kartlar 70 kg için örnek yakımı gösteriyor. Kendi tahminini görmek ve kaydetmek için <button class="inline-link" data-tab="profile">profiline kilonu ekle</button>.</p>' : ''}
      <p>Aktif kalori, dinlenmenin üzerindeki tahmini enerji harcamasıdır. Kilo, aktivite türü ve süreye göre hesaplanır.</p></div>
    <div class="grid workout-grid">${cards||'<p class="empty">Henüz antrenman bulunmuyor.</p>'}</div>
    <section class="card diary-card"><div class="card-heading"><h2>Plan dışı aktivite ekle</h2></div>${workoutForm()}</section>
    ${workoutJournalView()}`;
}
function formatRestTime(ms) {
  const seconds = Math.ceil(ms/1000);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

function performanceText(set) {
  const load = set.weightKg === null ? '' : `${formatMeasurement.format(set.weightKg)} kg · `;
  return `${load}${set.count} ${set.unit==='seconds'?'sn':'tekrar'}`;
}

function lastExercisePerformance(name,unit) {
  for (let index = state.workoutLogs.length-1; index >= 0; index--) {
    const log = state.workoutLogs[index];
    const sets = (log.sets ?? []).filter(set => set.name === name && set.unit === unit);
    if (sets.length) return sets;
  }
  return [];
}

function sessionStageView(session, workout) {
  const block = workout.blocks[session.blockIndex];
  if (!block) {
    const elapsed = Math.max(1,Math.round((session.finishedAt - session.startedAt)/60000));
    const minutes = elapsed <= MAX_WORKOUT_MINUTES ? elapsed : Math.min(MAX_WORKOUT_MINUTES,Math.ceil(workout.minutes));
    return `<div class="session-step">
      <h2 tabindex="-1">Antrenmanı tamamladın</h2>
      <p>${session.sets.length} set kaydettin. Günlüğe girecek süreyi kontrol et.</p>
      <form id="session-finish-form">
        <div class="field"><label for="session-minutes">Kayda girecek süre (dk)</label><input type="number" id="session-minutes" name="minutes"
          min="1" max="${MAX_WORKOUT_MINUTES}" step="1" inputmode="numeric" value="${minutes}" required></div>
        <p class="small-muted">Ara verdiğin uzun süreleri çıkarabilirsin.</p>
        <button class="btn btn-primary" type="submit">Antrenmanı günlüğe kaydet</button>
      </form></div>`;
  }
  if (session.rest) {
    const paused = session.rest.endsAt === null;
    const ms = restRemaining(session.rest,Date.now());
    const percent = ms/session.rest.durationMs*100;
    return `<div class="session-step session-rest">
      <h2 tabindex="-1">${paused?'Dinlenme duraklatıldı':'Dinlenme'}</h2>
      <div class="session-clock" id="session-clock" style="--remaining:${percent}%">
        <div><span id="session-time" role="timer" aria-label="Kalan dinlenme süresi">${formatRestTime(ms)}</span></div>
      </div>
      <p>Sırada <strong>${escapeHTML(block.name)}</strong> · Set ${session.setIndex+1}/${block.sets}</p>
      <div class="session-stage-actions">
        <button class="btn btn-secondary" type="button" data-session-action="toggle-rest">${paused?'Sayaçla devam et':'Sayacı duraklat'}</button>
        <button class="btn btn-ghost" type="button" data-session-action="skip-rest">Dinlenmeyi atla</button>
      </div></div>`;
  }

  const stage = `<h2 tabindex="-1">${escapeHTML(block.name)}</h2><p>${escapeHTML(block.detail)}</p>
    ${block.cue?`<p class="small-muted">${escapeHTML(block.cue)}</p>`:''}
    ${exerciseVideoLinks(block.name)}`;
  if (!block.sets) return `<div class="session-step">${stage}
    <p>Planlanan süre ${block.minutes} dk</p>
    <button class="btn btn-primary" type="button" data-session-action="complete-block">Bölümü tamamla</button></div>`;

  const previous = lastExercisePerformance(block.name,block.unit);
  const comparisonIndex = Math.min(session.setIndex,previous.length-1);
  const current = session.sets.filter(set => set.name === block.name);
  const seconds = block.unit === 'seconds';
  return `<div class="session-step">
    <div class="session-set-label">Set ${session.setIndex+1} / ${block.sets}</div>
    <h2 tabindex="-1">${escapeHTML(block.name)}</h2><p>${escapeHTML(block.detail)}</p>
    ${previous.length ? `<div class="session-history"><span>Son antrenman · Set ${comparisonIndex+1}</span>
      <strong>${performanceText(previous[comparisonIndex])}</strong></div>` : ''}
    <form id="session-set-form">
      <div class="session-set-inputs">
        <div class="field"><label for="session-count">${seconds?'Tutuş süren (sn)':'Yaptığın tekrar'}</label>
          <input id="session-count" name="count" type="number" min="1" max="${MAX_SET_COUNT[block.unit]}" step="1" inputmode="numeric" value="${block.count ?? ''}" required></div>
        <div class="field"><label for="session-weight">Ağırlık (kg, isteğe bağlı)</label>
          <input id="session-weight" name="weight" type="number" min="0" max="${MAX_SET_WEIGHT}" step="0.1" inputmode="decimal"></div>
      </div>
      <button class="btn btn-primary session-inline-submit" type="submit">Seti tamamla</button>
    </form>
    ${current.length ? `<p class="small-muted">Bu seans · ${current.map(performanceText).join(' / ')}</p>` : ''}
    ${block.cue?`<p class="small-muted">${escapeHTML(block.cue)}</p>`:''}
    ${exerciseVideoLinks(block.name)}
    ${previous.length > 1 ? `<details class="session-history-more"><summary>Son antrenmanın tüm setleri</summary>
      <ol>${previous.map(set=>`<li>${performanceText(set)}</li>`).join('')}</ol></details>` : ''}</div>`;
}

function workoutSessionView() {
  const session = state.workoutSession;
  const workout = sessionWorkout(session);
  const totalSteps = workout.blocks.length;
  const complete = session.blockIndex === totalSteps;
  return `<div class="session-layout">
    <div class="head-row"><div><h1>Antrenman modu</h1><p class="subcopy">${escapeHTML(workout.title)}</p></div>
      <button class="btn btn-secondary btn-sm" type="button" data-tab="training">Antrenman planına dön</button></div>
    <section class="card session-card">
      <div class="session-meta"><span id="session-progress">${complete?'Tamamlandı':`Bölüm ${session.blockIndex+1} / ${totalSteps}`}</span>
        <button class="btn btn-ghost btn-sm" type="button" data-session-action="sound" aria-pressed="${state.workoutSound}">${state.workoutSound?'Ses açık':'Ses kapalı'}</button></div>
      <div id="session-stage">${sessionStageView(session,workout)}</div>
    </section>
    <button class="btn btn-ghost btn-sm session-cancel" type="button" data-session-action="cancel">Seansı iptal et</button>
  </div>`;
}
function profileView(){
  const p=state.profile;
  const energy=calculateEnergy(p);
  const options=(items,selected)=>items.map(([val,label])=>`<option value="${val}" ${selected===val?'selected':''}>${escapeHTML(label)}</option>`).join('');
  return `<div class="head-row"><div><h1>Profilim</h1><p class="subcopy">Güncel ölçülerini, vücut hedefini ve plan tercihlerini düzenle.</p></div>
    <button type="button" class="btn btn-secondary btn-sm" data-tab="about">Hakkında</button></div>
  <div class="profile-layout"><section class="card form-card"><h2>Ölçüler ve hedefler</h2>
    <form id="profile-form"><fieldset class="profile-section"><legend>Güncel ölçüler</legend><div class="form-grid">
      <div class="field"><label for="name">İsmin (isteğe bağlı)</label><input id="name" name="name" maxlength="50" value="${escapeHTML(p.name)}" placeholder="İsmin" autocomplete="nickname"></div>
      <div class="field"><label for="age">Yaş</label><input id="age" name="age" type="number" min="18" max="85" step="1" value="${p.age??''}" placeholder="Örn. 24"></div>
      <div class="field"><label for="sex">Hesaplama formülü (biyolojik cinsiyet)</label><select id="sex" name="sex"><option value="" ${!p.sex?'selected':''}>Seçiniz</option>${options([['female','Kadın formülü'],['male','Erkek formülü']],p.sex)}</select><small>Mifflin–St Jeor formülü bu iki katsayıyı kullanır.</small></div>
      <div class="field"><label for="heightCm">Güncel boy (cm)</label><input id="heightCm" name="heightCm" type="number" inputmode="decimal" min="130" max="230" step="0.1" value="${p.heightCm??''}" placeholder="Örn. 175"></div>
      <div class="field"><label for="weightKg">Güncel kilo (kg)</label><input id="weightKg" name="weightKg" type="number" inputmode="decimal" min="${MIN_WEIGHT_KG}" max="${MAX_WEIGHT_KG}" step="0.1" value="${p.weightKg??''}" placeholder="Örn. 75">
        <small>Kilo değişiklikleri bugünün tarihiyle geçmişe eklenir.</small></div>
    </div></fieldset>
    <fieldset class="profile-section"><legend>Hedefler</legend><div class="form-grid">
      <div class="field"><label for="goal">Vücut hedefi</label><select id="goal" name="goal">${options(Object.entries(GOALS),p.goal)}</select></div>
      <div class="field"><label for="targetWeightKg">Hedef kilo (kg)</label><input id="targetWeightKg" name="targetWeightKg" type="number" inputmode="decimal" min="35" max="300" step="0.1" value="${p.targetWeightKg??''}" placeholder="İsteğe bağlı"></div>
    </div></fieldset>
    <fieldset class="profile-section"><legend>Plan tercihleri</legend><div class="form-grid">
      <div class="field wide"><label for="activity">Günlük aktivite düzeyin</label><select id="activity" name="activity">${options(Object.entries(ACTIVITY_LEVELS).map(([key,v])=>[key,v.label]),p.activity)}</select></div>
      <div class="field"><label for="days">Haftada kaç gün antrenman?</label><select id="days" name="days">${options([['2','2 gün'],['3','3 gün'],['4','4 gün'],['5','5 gün']],String(p.days))}</select></div>
      <div class="field"><label for="experience">Antrenman seviyesi</label><select id="experience" name="experience">${options([['baslangic','Başlangıç'],['orta','Orta seviye']],p.experience)}</select></div>
      <div class="field"><label for="equipment">Antrenman ekipmanı</label><select id="equipment" name="equipment">${options(Object.entries(EQUIPMENT),p.equipment)}</select></div>
      <div class="field"><label for="diet">Beslenme tercihin</label><select id="diet" name="diet">${options(Object.entries(DIETS),p.diet)}</select></div>
      <div class="field"><label for="allergies">Alerjilerin (isteğe bağlı)</label><input id="allergies" name="allergies" maxlength="160" value="${escapeHTML(p.allergies)}" placeholder="Örn. fındık, süt"><small id="ai-allergy-note" hidden>Yapay zekâ ile plan hazırlarsan alerji bilgisi de gönderilir.</small></div>
    </div></fieldset><div class="profile-actions"><button class="btn btn-primary" type="submit" ${busy?'disabled':''}>Profili kaydet</button><button class="btn btn-secondary" type="button" data-action="generate-ai" hidden ${busy?'disabled':''}>${busy?'<span class="loading"></span> Hazırlanıyor':'✦ Yapay zekâyla plan hazırla'}</button></div>
    </form></section>
    <aside class="profile-aside">${bodyGoalsView(true)}<div class="card info-card"><h2>Kalori hesabın</h2>
      <div class="profile-result"><span>Dinlenme metabolizması (BMR)</span><strong>${energy?number(energy.bmr)+' kcal':'—'}</strong></div>
      <div class="profile-result"><span>Günlük enerji ihtiyacı (TDEE)</span><strong>${energy?number(energy.maintenance)+' kcal':'—'}</strong></div>
      <div class="profile-result highlight-result"><span>Hedef kalori</span><strong>${energy?.target!=null?number(energy.target)+' kcal':'—'}</strong></div>
      ${energy?.note?`<p class="safety-note">${escapeHTML(energy.note)}</p>`:''}
      <p class="calc-explanation">Yetişkinler için Mifflin–St Jeor denklemi ve aktivite katsayısıyla hesaplanan tahmini enerji ihtiyacı.</p>
      <div class="notice">Hamilelik, emzirme, hastalık, yeme bozukluğu öyküsü veya diğer özel sağlık durumlarında bu hesap uygun olmayabilir; uzman görüşü gerekir.</div>
      <button type="button" class="btn btn-ghost btn-sm btn-full reset-btn" data-action="reset">Yerel verilerimi sıfırla</button>
    </div></aside>
  </div>${banner()}`;
}

function aboutView() {
  return `<div class="about-layout">
    <header class="head-row"><div><h1>FitRota hakkında</h1>
      <p class="subcopy">FitRota ile öğünlerini kaydedebilir, antrenmanlarını planlayabilir ve hedeflerine doğru ilerlemeni takip edebilirsin.</p></div></header>
    <section class="card info-card about-thanks" aria-labelledby="about-thanks-heading">
      <h2 id="about-thanks-heading">Teşekkür</h2>
      <p>Ahsenciğime, bana bu fikri verdiği ve bu yolda benimle olduğu için teşekkür ederim. İyi ki varsın.</p>
    </section>
  </div>`;
}

function activeTab() {
  const tab = location.hash.slice(1);
  if (tab==='session') return state.workoutSession ? tab : 'training';
  return ['home','nutrition','training','profile','about'].includes(tab) ? tab : 'home';
}
function render() {
  const tab = activeTab();
  const tabChanged = renderedTab !== undefined && renderedTab !== tab;
  renderedTab = tab;
  document.querySelectorAll('.nav-item, .bottom-item').forEach(element => {
    const current = element.dataset.tab === (tab==='session'?'training':tab);
    element.classList.toggle('is-active',current);
    if (current) element.setAttribute('aria-current','page');
    else element.removeAttribute('aria-current');
  });
  const main = document.getElementById('main-content');
  const view = {home:homeView,nutrition:nutritionView,training:trainingView,profile:profileView,about:aboutView,session:workoutSessionView}[tab];
  main.innerHTML = `<div class="page-view${tabChanged?' page-enter':''}">${view()}</div>`;
  updateAIControls();
  syncSessionSetDock();
  document.querySelector('.avatar').textContent=(state.profile.name.trim().split(/\s+/).map(word=>word[0]).join('').slice(0,2)||'FR').toLocaleUpperCase('tr');
  document.title=`${{home:'Genel Bakış',nutrition:'Beslenme',training:'Antrenman',profile:'Profilim',about:'Hakkında',session:'Antrenman modu'}[tab]} • FitRota`;
  if (tabChanged) {
    window.scrollTo(0,0);
    const heading = main.querySelector('h1');
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
  }
  paintWeightChart();
  syncWorkoutClock();
}
function navigateTo(tab) {
  if (location.hash === '#' + tab) return;
  location.hash = tab;
  render();
}
function profileFromForm() {
  const fields = Object.fromEntries(new FormData(document.getElementById('profile-form')).entries());
  const profile = normalizeProfile(fields);
  if (profile.targetWeightKg !== null && profile.targetWeightKg === state.profile.targetWeightKg) {
    profile.weightGoalStartKg = state.profile.weightGoalStartKg ?? profile.weightKg;
  }
  return profile;
}
function updateAIControls() {
  const button = document.querySelector('[data-action="generate-ai"]');
  if (!button) return;
  button.hidden = !aiAvailable;
  document.getElementById('ai-allergy-note').hidden = !aiAvailable;
  button.disabled = busy || !aiAvailable;
  button.textContent = busy ? 'Plan hazırlanıyor…' : 'Yapay zekâyla plan hazırla';
  document.querySelector('#profile-form button[type="submit"]').disabled = busy;
  document.querySelector('[data-action="reset"]').disabled = busy;
}
function formValid(){return document.getElementById('profile-form')?.reportValidity()??false;}

function applyProfile(profile) {
  if (profile.weightKg !== null && profile.weightKg !== state.profile.weightKg) {
    state.weightHistory = upsertWeight(state.weightHistory,dateKey(),profile.weightKg);
  }
  state.profile = profile;
}

function saveWeightMeasurement(form) {
  const date = form.elements.date.value;
  const kg = form.elements.amount.valueAsNumber;
  const today = dateKey();
  if (date > today || !validWeightMeasurement(date,kg)) {
    notify('Ölçümün tarihini ve kilo değerini kontrol et.');
    return;
  }
  const previous = {...state};
  state.weightHistory = upsertWeight(state.weightHistory,date,kg);
  if (date === today) {
    const {targetWeightKg,weightGoalStartKg} = state.profile;
    state.profile = {...state.profile,weightKg:kg,
      weightGoalStartKg:targetWeightKg === null ? null : weightGoalStartKg ?? kg};
  }
  if (!save()) { state = previous; return; }
  if (!visibleWeightTrend().some(entry => entry.date === date)) weightRange = 0;
  render();
  document.getElementById('weight-history-heading').focus({preventScroll:true});
  notify('Kilo ölçümün kaydedildi.');
}

function saveProfile(){
  if(!formValid())return;
  const profile = profileFromForm();
  const previous = {...state};
  const trainingChanged = ['goal','days','experience','equipment'].some(key => profile[key] !== state.profile[key]);
  const dietChanged = ['diet','allergies'].some(key => profile[key] !== state.profile[key]);
  if (trainingChanged || (state.source === 'ai' && dietChanged)) {
    state.plan = localPlan(profile);
    state.source = 'local';
    state.planId = uniqueId();
    state.completed = [];
  }
  applyProfile(profile);
  if (!save()) { state = previous; return; }
  currentDay = dayIndex();
  navigateTo('home');
  notify('Profilin kaydedildi.');
}
async function generateAI(){
  if(busy||!aiAvailable||!formValid())return;
  const profile=profileFromForm();
  const originalProfile = state.profile;
  busy=true;updateAIControls();
  try{
    const res=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{goal:profile.goal,days:profile.days,diet:profile.diet,experience:profile.experience,equipment:profile.equipment,allergies:profile.allergies}})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Yapay zekâya bağlanılamadı.');
    if(!validPlan(data.plan))throw new Error('Beklenen biçimde plan alınamadı.');
    const previous = {...state};
    if (state.profile !== originalProfile) {
      profile.weightKg = state.profile.weightKg;
      if (profile.targetWeightKg === state.profile.targetWeightKg) profile.weightGoalStartKg = state.profile.weightGoalStartKg;
    }
    applyProfile(profile);
    state.plan=data.plan;state.source='ai';state.planId=uniqueId();state.completed=[];
    if (!save()) { state = previous; return; }
    currentDay=dayIndex();
    if (activeTab() === 'home') render();
    else navigateTo('home');
    notify('Yapay zekâ planını oluşturdu!');
  }catch(err){notify(err.message||'Plan oluşturulamadı.');}
  finally{busy=false;updateAIControls();}
}
function updateFoodForm(form, changed) {
  const {name, grams, rate, kcal} = form.elements;
  const parsed = parseFoodText(name.value);
  const food = findFood(parsed.name,state.personalFoods);

  if (changed === name) {
    const suggestions = document.getElementById('food-suggestions');
    const matches = food ? [] : suggestFoods(parsed.name,state.personalFoods);
    suggestions.innerHTML = matches.map(match => `<button class="btn btn-secondary btn-sm" type="button" data-food-name="${escapeHTML(match.name)}">${escapeHTML(match.name)}${state.personalFoods.includes(match)?'<small>Kişisel</small>':''}</button>`).join('');
    suggestions.hidden = matches.length === 0;
    document.getElementById('food-quick-add').hidden = name.value.trim() !== '';

    if (parsed.grams !== null) {
      grams.value = parsed.grams;
      form.dataset.defaultGrams = grams.value;
    } else if (!grams.value || grams.value === form.dataset.defaultGrams) {
      grams.value = food?.portion ?? '';
      form.dataset.defaultGrams = grams.value;
    }
    rate.placeholder = food ? String(food.kcalPer100g) : 'İsteğe bağlı';
  }

  const labelRate = finiteRange(rate.value,0,900);
  const basis = rate.value || rate.validity.badInput
    ? (labelRate === null ? null : {kcalPer100g:labelRate})
    : food;
  const estimate = estimateFoodCalories(basis, Number(grams.value));
  if (changed === kcal) {
    delete form.dataset.estimated;
  } else if (estimate !== null) {
    kcal.value = estimate;
    form.dataset.estimated = 'true';
  } else if (form.dataset.estimated) {
    kcal.value = '';
    delete form.dataset.estimated;
  }

  const help = document.getElementById('food-estimate');
  if (form.dataset.estimated) {
    const source = labelRate === null ? food.name : 'Ürün etiketi';
    help.textContent = `${source} · ${number(grams.value)} g · ≈ ${number(estimate)} kcal`;
  } else if (kcal.value) {
    help.textContent = 'Girdiğin toplam kalori kullanılacak.';
  } else if (basis) {
    help.textContent = 'Toplam kaloriyi hesaplamak için 1–2.000 g arasında porsiyon gir.';
  } else if (name.value.trim()) {
    help.textContent = 'Katalog eşleşmesi için öneri seç. Paketli ürünse gramı ve etiketteki kcal / 100 g değerini gir.';
  } else {
    help.textContent = `Katalogda ${FOODS.length} besin ve tarif var. Diğer ürünler için gramı ve etiketteki kcal / 100 g değerini gir.`;
  }
}

function appendFoodEntries(newEntries,preserveDraft) {
  const key = dateKey();
  const previous = state.foodLogs[key];
  const entries = previous || [];
  if (entries.length + newEntries.length > MAX_DAILY_FOOD_ENTRIES) {
    notify(`Bir gün için en fazla ${MAX_DAILY_FOOD_ENTRIES} kayıt ekleyebilirsin.`);
    return false;
  }
  state.foodLogs[key] = [...entries,...newEntries.map(entry => ({...entry,id:uniqueId()}))];
  if (!save()) {
    if (previous) state.foodLogs[key] = previous;
    else delete state.foodLogs[key];
    return false;
  }
  renderFoodDiary(preserveDraft);
  return true;
}

function recordFood({name,grams=null,kcal,estimated=false,recipePortion=false,preserveDraft=recipePortion}) {
  const meal = mealType(document.getElementById('food-meal').value);
  return appendFoodEntries([{name,grams,kcal,estimated,recipePortion,meal}],preserveDraft);
}

const mealDateFormat = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'});
function openMealCopy() {
  const dialog = document.getElementById('meal-copy-dialog');
  const {length:currentCount} = todayEntries();
  const meals = previousMeals(state.foodLogs,dateKey());
  dialog.querySelector('#meal-copy-options').innerHTML = meals.length ? `<div class="meal-copy-options">${meals.map(({date,meal,entries}) => {
    const names = entries.slice(0,2).map(entry => escapeHTML(entry.name)).join(', ');
    const total = entries.reduce((sum,entry) => sum + entry.kcal,0);
    const fits = currentCount + entries.length <= MAX_DAILY_FOOD_ENTRIES;
    return `<button type="button" class="quick-add-item" data-copy-date="${date}" data-copy-meal="${meal}" ${fits?'':'disabled'}>
      <span><strong>${MEAL_LABELS[meal]} · ${mealDateFormat.format(new Date(date+'T12:00:00'))}</strong>
      <small>${names}${entries.length>2?` ve ${entries.length-2} besin daha`:''} · ${number(total)} kcal</small></span>
      <span class="quick-add-icon" aria-hidden="true">+</span></button>`;
  }).join('')}</div>` : '<p class="no-food">Henüz kopyalanabilir bir öğün yok. Yeni bir kayıt eklerken Kahvaltı, Öğle, Akşam veya Ara öğün seç. Bu kayıt ertesi gün burada görünür.</p>';
  dialog.querySelector('[role="status"]').textContent = meals.some(({entries}) => currentCount + entries.length > MAX_DAILY_FOOD_ENTRIES)
    ? `Günlük ${MAX_DAILY_FOOD_ENTRIES} kayıt sınırını aşan öğünler seçilemez.` : '';
  dialog.showModal();
}

function copyMeal(button) {
  const dialog = button.closest('dialog');
  const source = previousMeals(state.foodLogs,dateKey())
    .find(({date,meal}) => date === button.dataset.copyDate && meal === button.dataset.copyMeal);
  if (!source) return;
  if (!appendFoodEntries(source.entries,true)) {
    dialog.querySelector('[role="status"]').textContent = 'Öğün kaydedilemedi. Günlük kayıt sınırını ve tarayıcı depolamasını kontrol et.';
    return;
  }
  dialog.close();
  notify(`${MEAL_LABELS[source.meal]} bugüne kopyalandı · ${source.entries.length} kayıt`);
}

function personalFoodIndex(name) {
  return state.personalFoods.indexOf(findFood(parseFoodText(name).name,state.personalFoods));
}

function updatePersonalFoodEditor(form) {
  const existing = state.personalFoods[personalFoodIndex(form.elements.name.value)];
  form.querySelector('[data-action="remove-personal-food"]').hidden = !existing;
  form.querySelector('[role="status"]').textContent = existing ? 'Bu adla kaydedersen kişisel besinin değeri güncellenir.' : '';
  if (existing) form.elements.rate.placeholder = existing.kcalPer100g;
  else form.elements.rate.removeAttribute('placeholder');
}

function openPersonalFoodEditor() {
  const diary = document.getElementById('food-form').elements;
  const dialog = document.getElementById('personal-food-dialog');
  const form = document.getElementById('personal-food-form');
  const name = parseFoodText(diary.name.value).name;
  const existing = state.personalFoods[personalFoodIndex(name)];
  form.elements.name.value = existing?.name ?? name;
  form.elements.rate.value = diary.rate.value || (existing?.kcalPer100g ?? '');
  updatePersonalFoodEditor(form);
  dialog.showModal();
}

function replacePersonalFoods(next) {
  const previous = state.personalFoods;
  state.personalFoods = next;
  if (save()) return true;
  state.personalFoods = previous;
  document.querySelector('#personal-food-form [role="status"]').textContent = 'Besin kaydedilemedi. Tarayıcı depolamasını kontrol et.';
  return false;
}

function addPersonalFood(form) {
  const [food] = normalizePersonalFoods([{name:form.elements.name.value,kcalPer100g:form.elements.rate.valueAsNumber}]);
  const status = form.querySelector('[role="status"]');
  if (!food) {
    status.textContent = 'Besin adını ve 100 g başına kalori değerini kontrol et.';
    return;
  }
  const index = personalFoodIndex(food.name);
  if (index < 0 && state.personalFoods.length >= MAX_PERSONAL_FOODS) {
    status.textContent = `En fazla ${MAX_PERSONAL_FOODS} kişisel besin kaydedebilirsin.`;
    return;
  }
  const next = state.personalFoods.slice();
  if (index < 0) next.push(food);
  else next[index] = food;
  if (!replacePersonalFoods(next)) return;
  form.closest('dialog').close();
  const diary = document.getElementById('food-form');
  const {grams} = parseFoodText(diary.elements.name.value);
  diary.elements.name.value = grams === null ? food.name : `${grams} g ${food.name}`;
  diary.elements.rate.value = '';
  updateFoodForm(diary,diary.elements.name);
  diary.elements.grams.focus({preventScroll:true});
  notify(`${food.name} kişisel besinlerine eklendi.`);
}

function removePersonalFood(form) {
  const index = personalFoodIndex(form.elements.name.value);
  if (index < 0 || !confirm(`“${state.personalFoods[index].name}” kişisel besinlerinden silinsin mi?`)) return;
  if (!replacePersonalFoods(state.personalFoods.filter((_,position) => position !== index))) return;
  form.closest('dialog').close();
  const diary = document.getElementById('food-form');
  updateFoodForm(diary,diary.elements.name);
  notify('Kişisel besin silindi.');
}

function renderFoodDiary(preserveDraft = false) {
  const draft = preserveDraft ? document.getElementById('food-form') : null;
  document.getElementById('food-diary').outerHTML = foodDiary();
  if (draft) {
    document.getElementById('food-form').replaceWith(draft);
    document.getElementById('food-quick-add').innerHTML = foodQuickAddView();
  }
}

function addFood(form) {
  const input = new FormData(form);
  const name = parseFoodText(String(input.get('name') || '')).name.slice(0,70);
  const kcal = Number(input.get('kcal'));
  if (!name || input.get('kcal') === '' || !Number.isInteger(kcal) || kcal<0 || kcal>MAX_ENTRY_KCAL) {
    notify(`Besin adı ve 0–${number(MAX_ENTRY_KCAL)} arası kalori gir.`);
    return;
  }
  const grams = finiteRange(input.get('grams'),1,2000);
  if (recordFood({name,grams,kcal,estimated:form.dataset.estimated==='true'})) {
    document.getElementById('food-meal').value = mealType(input.get('meal'));
    document.getElementById('food-name').focus({preventScroll:true});
    notify(`${name} kaydedildi.`);
  }
}

function updateRecipeIngredient(row) {
  const name = row.querySelector('[name="ingredient"]');
  const rate = row.querySelector('[name="rate"]');
  const food = findFood(name.value,state.personalFoods);
  if (food) {
    rate.value = food.kcalPer100g;
    row.dataset.catalogRate = rate.value;
  } else if (rate.value === row.dataset.catalogRate) {
    rate.value = '';
    delete row.dataset.catalogRate;
  }
  const suggestions = row.querySelector('.recipe-suggestions');
  const matches = food ? [] : suggestFoods(name.value,state.personalFoods);
  suggestions.innerHTML = matches.map(match =>
    `<button class="btn btn-secondary btn-sm" type="button" data-recipe-food="${escapeHTML(match.name)}">${escapeHTML(match.name)}</button>`).join('');
  suggestions.hidden = !matches.length;
}

function readRecipeDraft(form) {
  const ingredients = Array.from(form.querySelectorAll('.recipe-ingredient'),row => ({
    name:row.querySelector('[name="ingredient"]').value.trim(),
    grams:row.querySelector('[name="grams"]').valueAsNumber,
    kcalPer100g:row.querySelector('[name="rate"]').valueAsNumber
  }));
  return {ingredients,servings:form.elements.servings.valueAsNumber};
}

function updateRecipeTotals(form) {
  const {ingredients,servings} = readRecipeDraft(form);
  const totals = summarizeRecipe(ingredients,servings);
  form.querySelector('.recipe-totals').textContent = totals ?
    `Toplam ≈ ${number(totals.totalKcal)} kcal · 1 porsiyon ≈ ${number(totals.servingKcal)} kcal` :
    'Kaloriyi hesaplamak için malzemeleri ve porsiyon sayısını gir.';
}

function replaceRecipes(recipes) {
  const previous = state.recipes;
  state.recipes = recipes;
  if (!save()) {
    state.recipes = previous;
    return false;
  }
  document.getElementById('saved-recipes').innerHTML = savedRecipesView();
  document.getElementById('food-quick-add').innerHTML = foodQuickAddView();
  return true;
}

function addRecipe(form) {
  const name = form.elements.recipeName.value.trim();
  const draft = readRecipeDraft(form);
  if (!name || !summarizeRecipe(draft.ingredients,draft.servings)) {
    notify('Tarif adını, malzemeleri ve porsiyon sayısını kontrol et.');
    return;
  }
  if (state.recipes.length >= MAX_RECIPES) {
    notify(`En fazla ${MAX_RECIPES} tarif kaydedebilirsin.`);
    return;
  }
  if (!replaceRecipes([...state.recipes,{id:uniqueId(),name,...draft}])) return;
  form.reset();
  form.dataset.nextRow = '1';
  document.getElementById('recipe-ingredients').innerHTML = recipeIngredientView(0);
  updateRecipeTotals(form);
  notify(`${name} tarifi kaydedildi.`);
}

function handleRecipeClick(target) {
  const form = target.closest('#recipe-form');
  if (target.hasAttribute('data-add-ingredient')) {
    const ingredients = form.querySelector('#recipe-ingredients');
    if (ingredients.children.length >= MAX_INGREDIENTS) {
      notify(`Tarife en fazla ${MAX_INGREDIENTS} malzeme ekleyebilirsin.`);
      return;
    }
    const index = Number(form.dataset.nextRow);
    ingredients.insertAdjacentHTML('beforeend',recipeIngredientView(index));
    form.dataset.nextRow = String(index + 1);
    ingredients.lastElementChild.querySelector('[name="ingredient"]').focus();
    updateRecipeTotals(form);
    return;
  }
  if (target.hasAttribute('data-remove-ingredient')) {
    const row = target.closest('.recipe-ingredient');
    if (row.parentElement.children.length === 1) return;
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    next.querySelector('[name="ingredient"]').focus();
    updateRecipeTotals(form);
    return;
  }
  if (target.hasAttribute('data-recipe-food')) {
    const row = target.closest('.recipe-ingredient');
    row.querySelector('[name="ingredient"]').value = target.dataset.recipeFood;
    updateRecipeIngredient(row);
    updateRecipeTotals(form);
    row.querySelector('[name="grams"]').focus();
    return;
  }
  const id = target.dataset.logRecipe ?? target.dataset.deleteRecipe;
  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe) return;
  if (target.hasAttribute('data-delete-recipe')) {
    if (confirm(`“${recipe.name}” tarifi silinsin mi?`) &&
        replaceRecipes(state.recipes.filter(item => item.id !== id))) notify('Tarif silindi.');
    return;
  }
  const kcal = summarizeRecipe(recipe.ingredients,recipe.servings).servingKcal;
  const quickAdd = target.closest('#food-quick-add');
  if (kcal <= MAX_ENTRY_KCAL && recordFood({name:recipe.name,kcal,estimated:true,recipePortion:true})) {
    quickAdd?.querySelector(`[data-log-recipe="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
    notify(`${recipe.name} · 1 porsiyon günlüğe eklendi.`);
  }
}

function currentFocusedWorkout(form) {
  const {region,goal,equipment} = form.elements;
  const settings = {region:region.value,goal:goal.value,equipment:equipment.value};
  return {settings,workout:buildFocusedWorkout({...settings,experience:state.profile.experience})};
}

function updateFocusedWorkout(form, changeDuration) {
  const {settings,workout} = currentFocusedWorkout(form);
  if (!workout) return;
  if (!changeDuration) form.elements.minutes.value = workout.minutes;
  const minutes = form.elements.minutes.valueAsNumber;
  focusDraft = {...settings,minutes};
  form.querySelector('#focus-result').innerHTML = focusResult(workout,settings.goal,minutes);
  form.querySelector('#focus-plan-summary').textContent = focusPlanSummary(settings,minutes);
}

function readCustomDraft(form) {
  return {region:form.dataset.region,equipment:form.elements.equipment.value,
    exercises:[...form.querySelectorAll('[data-custom-row]')].map(row => ({
      name:row.dataset.name,unit:row.dataset.unit,equipment:row.dataset.equipment,
      sets:row.querySelector('[data-quantity="sets"]').valueAsNumber,
      count:row.querySelector('[data-quantity="count"]').valueAsNumber,
      restSeconds:row.querySelector('[data-quantity="restSeconds"]').valueAsNumber
    }))};
}

function updateCustomDraft(form) {
  const draft = readCustomDraft(form);
  customDrafts.set(draft.region,draft);
  form.querySelector('#custom-plan-preview').textContent = customPlanSummary(draft);
  return draft;
}

function openCustomWorkout(focusedForm) {
  const builder = document.getElementById('custom-workout');
  const form = builder.querySelector('form');
  customRegion = focusedForm.elements.region.value;
  if (form.dataset.region !== customRegion) form.outerHTML = customWorkoutForm(customRegion);
  builder.open = true;
  builder.scrollIntoView({block:'start'});
  builder.querySelector('#custom-region').focus({preventScroll:true});
}

function editCustomMovements(button) {
  const form = button.form;
  const draft = readCustomDraft(form);
  const action = button.dataset.customAction;
  if (action === 'remove') {
    draft.exercises.splice(Number(button.dataset.index),1);
  } else {
    if (draft.exercises.length >= MAX_CUSTOM_MOVEMENTS) {
      notify(`Bir plana en fazla ${MAX_CUSTOM_MOVEMENTS} hareket ekleyebilirsin.`);
      return;
    }
    const manual = action === 'add-manual';
    const selected = manual ? {name:form.elements.movementName.value.trim(),unit:form.elements.unit.value}
      : regionalExercises(draft.region,draft.equipment).find(item => item.name === form.elements.exercise.value);
    if (!selected?.name) {
      notify('Eklemek istediğin hareketin adını yaz.');
      form.elements.movementName.focus();
      return;
    }
    draft.exercises.push({name:selected.name,unit:selected.unit,equipment:draft.equipment,
      sets:state.profile.experience==='orta'?3:2,count:selected.unit==='seconds'?20:10,restSeconds:75});
    if (manual) form.elements.movementName.value = '';
  }
  form.querySelector('#custom-movements').innerHTML = customMovementRows(draft.exercises);
  updateCustomDraft(form);
  const next = action === 'remove' ? form.querySelector('[data-custom-action="add"]') :
    form.querySelector(`#custom-sets-${draft.exercises.length}`);
  next?.focus({preventScroll:true});
}

function saveCustomWorkout(form,start) {
  const plan = normalizeCustomPlan(readCustomDraft(form));
  if (!plan) {
    notify('Kaydetmek için en az bir hareket ve geçerli set bilgisi gir.');
    return;
  }
  const previousPlans = state.customPlans;
  const previousSession = state.workoutSession;
  state.customPlans = {...previousPlans,[plan.region]:plan};
  if (start && !previousSession) {
    state.workoutSession = createWorkoutSession({id:uniqueId(),settings:null,
      experience:state.profile.experience,customPlan:plan},Date.now());
  }
  if (!save()) {
    state.customPlans = previousPlans;
    state.workoutSession = previousSession;
    return;
  }
  customDrafts.delete(plan.region);
  if (start) {
    if (state.workoutSound) enableWorkoutSound();
    navigateTo('session');
  } else notify(`${FOCUS_REGIONS[plan.region]} planın kaydedildi.`);
}

function recordWorkout(entry,settings = state.focusSettings) {
  const previousLogs = state.workoutLogs;
  const previousSettings = state.focusSettings;
  state.workoutLogs = [...previousLogs,{id:uniqueId(),date:dateKey(),...entry}];
  state.focusSettings = settings;
  if (save()) {
    journalWeek = null;
    return true;
  }
  state.workoutLogs = previousLogs;
  state.focusSettings = previousSettings;
  return false;
}

function addFocusedWorkout(form) {
  const {settings,workout} = currentFocusedWorkout(form);
  const minutes = form.elements.minutes.valueAsNumber;
  if (!workout) return;
  if (!validWorkoutMinutes(minutes)) {
    form.querySelector('#focus-plan-options').open = true;
    form.elements.minutes.reportValidity();
    return;
  }
  const kcal = estimateFocusedWorkout(workout,minutes,state.profile.weightKg)?.kcal ?? null;
  if (!recordWorkout({title:workout.title,minutes,kcal,planId:null},settings)) return;
  refreshWorkoutJournal();
  notify('Bölgesel antrenman günlüğe eklendi.');
}

function persistWorkoutSession(next) {
  const previous = state.workoutSession;
  state.workoutSession = next;
  if (save()) return true;
  state.workoutSession = previous;
  return false;
}

function positionSessionSetDock() {
  const viewport = window.visualViewport;
  const dock = document.getElementById('session-set-dock');
  if (!viewport || dock.hidden) return;
  const offset = viewport.scale === 1 ? Math.max(0,window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  document.documentElement.style.setProperty('--session-viewport-offset',`${offset}px`);
}

function syncSessionSetDock() {
  const dock = document.getElementById('session-set-dock');
  dock.hidden = !document.getElementById('session-set-form');
  document.documentElement.classList.toggle('session-set-active',!dock.hidden);
  positionSessionSetDock();
}

function renderSessionStage(enter) {
  const stage = document.getElementById('session-stage');
  const session = state.workoutSession;
  if (!stage || !session) return;
  const workout = sessionWorkout(session);
  stage.innerHTML = sessionStageView(session,workout);
  syncSessionSetDock();
  document.getElementById('session-progress').textContent = workout.blocks[session.blockIndex] ?
    `Bölüm ${session.blockIndex+1} / ${workout.blocks.length}` : 'Tamamlandı';
  if (enter) {
    stage.firstElementChild.classList.add('session-enter');
    stage.querySelector('h2').focus({preventScroll:true});
    stage.scrollIntoView({block:'nearest'});
  } else {
    stage.querySelector('[data-session-action="toggle-rest"]')?.focus({preventScroll:true});
  }
}

function updateWorkoutSession(next,enter = true) {
  if (!next || !persistWorkoutSession(next)) return false;
  renderSessionStage(enter);
  syncWorkoutClock();
  return true;
}

function paintWorkoutClock() {
  const rest = state.workoutSession?.rest;
  const clock = document.getElementById('session-clock');
  if (!rest || !clock || document.hidden) return;
  const remaining = restRemaining(rest,Date.now());
  const time = clock.querySelector('#session-time');
  const text = formatRestTime(remaining);
  if (time.textContent !== text) time.textContent = text;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ringMs = reducedMotion ? Math.ceil(remaining/1000)*1000 : remaining;
  clock.style.setProperty('--remaining',`${Math.min(100,ringMs/rest.durationMs*100).toFixed(2)}%`);
  if (!remaining || rest.endsAt === null) return;
  if (reducedMotion) restRefresh = setTimeout(paintWorkoutClock,remaining%1000 || 1000);
  else restFrame = requestAnimationFrame(paintWorkoutClock);
}

function syncWorkoutClock(playAudio = true) {
  clearTimeout(restDeadline);
  clearTimeout(restRefresh);
  cancelAnimationFrame(restFrame);
  const session = state.workoutSession;
  const rest = session?.rest;
  if (!rest) return;
  const remaining = restRemaining(rest,Date.now());
  if (!remaining) {
    if (updateWorkoutSession({...session,rest:null})) {
      if (playAudio && state.workoutSound) playRestChime();
      if (playAudio) notify('Dinlenme bitti.');
    }
    return;
  }
  paintWorkoutClock();
  if (rest.endsAt !== null) restDeadline = setTimeout(syncWorkoutClock,remaining);
}

function handleSessionAction(button) {
  const action = button.dataset.sessionAction;
  const session = state.workoutSession;
  if (action === 'start') {
    if (!session) {
      const {settings,workout} = currentFocusedWorkout(button.form);
      if (!workout || !persistWorkoutSession(createWorkoutSession({
        id:uniqueId(),settings,experience:state.profile.experience,
      },Date.now()))) return;
    }
    if (state.workoutSound) enableWorkoutSound();
    navigateTo('session');
    return;
  }
  if (!session) return;
  if (action === 'sound') {
    const previous = state.workoutSound;
    state.workoutSound = !previous;
    if (!save()) { state.workoutSound = previous; return; }
    if (state.workoutSound) enableWorkoutSound();
    button.setAttribute('aria-pressed',String(state.workoutSound));
    button.textContent = state.workoutSound?'Ses açık':'Ses kapalı';
  } else if (action === 'complete-block') {
    updateWorkoutSession(completeWorkoutBlock(session,Date.now()));
  } else if (action === 'toggle-rest') {
    if (state.workoutSound) enableWorkoutSound();
    updateWorkoutSession(toggleSessionRest(session,Date.now()),false);
  } else if (action === 'skip-rest' && session.rest) {
    updateWorkoutSession({...session,rest:null});
  } else if (action === 'cancel' && confirm('Bu seansın set kayıtları silinsin mi?')) {
    if (persistWorkoutSession(null)) navigateTo('training');
  }
}

function submitSessionSet(form) {
  if (!state.workoutSession) return;
  const {count,weight} = form.elements;
  const weightKg = weight.value === '' ? null : weight.valueAsNumber;
  const next = recordSessionSet(state.workoutSession,count.valueAsNumber,weightKg,Date.now());
  if (next && state.workoutSound) enableWorkoutSound();
  updateWorkoutSession(next);
}

function finishWorkoutSession(form) {
  const session = state.workoutSession;
  const minutes = form.elements.minutes.valueAsNumber;
  if (!session || session.finishedAt === null || !validWorkoutMinutes(minutes)) return;
  const workout = sessionWorkout(session);
  const kcal = estimateFocusedWorkout(workout,minutes,state.profile.weightKg)?.kcal ?? null;
  state.workoutSession = null;
  if (!recordWorkout({id:session.id,title:workout.title,minutes,kcal,planId:null,sets:session.sets},
    session.customPlan ? state.focusSettings : session.settings)) {
    state.workoutSession = session;
    return;
  }
  navigateTo('training');
  notify('Setlerin ve antrenmanın kaydedildi.');
}

function workoutFormValues(form) {
  const workout = state.plan.workouts[form.dataset.planIndex];
  const activity = form.elements.activity?.value ?? workout?.activity;
  const minutes = Number(form.elements.minutes.value);
  return {workout, activity, minutes, kcal:estimateActiveCalories(activity,minutes,state.profile.weightKg)};
}

function addWorkout(form) {
  const {workout, activity, minutes, kcal} = workoutFormValues(form);
  if (!Object.hasOwn(ACTIVITIES,activity) || !validWorkoutMinutes(minutes)) return;
  if (workout && completedThisWeek().includes(workout.day)) return;
  const title = workout?.title ?? ACTIVITIES[activity].label;
  if (!recordWorkout({title,minutes,kcal,planId:workout ? state.planId : null,day:workout?.day})) return;
  render();
  const next = workout ? document.querySelector(`[data-undo-workout="${form.dataset.planIndex}"]`) :
    document.querySelector('#workout-activity-extra');
  next?.focus({preventScroll:true});
  notify('Antrenman kaydedildi.');
}

function updateMenu(focusSelector) {
  const section = document.getElementById('weekly-menu');
  section.innerHTML = menuView();
  section.querySelector(focusSelector)?.focus({preventScroll:true});
}
function refreshWorkoutJournal(focusWeek = false) {
  document.getElementById('training-journal').outerHTML = workoutJournalView();
  if (focusWeek) document.getElementById('journal-week').focus({preventScroll:true});
}
function installInstructions(){
  if(/iPad|iPhone|iPod/i.test(navigator.userAgent))notify('iPhone: Paylaş → Ana Ekrana Ekle');
  else if(/Android/i.test(navigator.userAgent))notify('Android: Tarayıcı menüsü → Uygulamayı yükle');
  else notify('Tarayıcı menüsünden “Uygulamayı yükle” seçeneğini kullan.');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installingPrompt=e;});
window.addEventListener('hashchange', () => {
  if (renderedTab !== activeTab()) render();
});
document.addEventListener('click',async e=>{
  const themeChoice = e.target.closest('[data-theme-choice]');
  if (themeChoice) { selectTheme(themeChoice.dataset.themeChoice); return; }
  const tabEl=e.target.closest('[data-tab]');
  if (tabEl) {
    e.preventDefault();
    if (tabEl.dataset.tab === 'session' && state.workoutSound) enableWorkoutSound();
    navigateTo(tabEl.dataset.tab);
    return;
  }
  const sessionButton = e.target.closest('[data-session-action]');
  if (sessionButton) { handleSessionAction(sessionButton); return; }
  const customButton = e.target.closest('[data-custom-action]');
  if (customButton) { editCustomMovements(customButton); return; }
  const range = e.target.closest('[data-weight-range]');
  if (range) {
    weightRange = Number(range.dataset.weightRange);
    const trend = document.getElementById('weight-trend-content');
    trend.innerHTML = weightTrendView();
    trend.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
    paintWeightChart();
    return;
  }
  const editWeight = e.target.closest('[data-edit-weight]');
  if (editWeight) {
    const entry = state.weightHistory.find(item => item.date === editWeight.dataset.editWeight);
    const editor = document.getElementById('weight-editor');
    editor.open = true;
    const form = document.getElementById('weight-form');
    form.elements.date.value = entry.date;
    form.elements.amount.value = entry.kg;
    form.elements.amount.focus();
    return;
  }
  const recipeButton = e.target.closest('[data-add-ingredient],[data-remove-ingredient],[data-recipe-food],[data-log-recipe],[data-delete-recipe]');
  if (recipeButton) { handleRecipeClick(recipeButton); return; }
  const recent = e.target.closest('[data-relog-food]');
  if (recent) {
    const entry = recentFoodEntries().find(item => item.id === recent.dataset.relogFood);
    if (entry && recordFood({...entry,preserveDraft:true})) {
      document.querySelector('[data-relog-food]')?.focus({preventScroll:true});
      notify(`${entry.name} günlüğe eklendi.`);
    }
    return;
  }
  const mealCopy = e.target.closest('[data-copy-meal]');
  if (mealCopy) { copyMeal(mealCopy); return; }
  const dayEl = e.target.closest('[data-day]');
  if (dayEl) {
    currentDay = Number(dayEl.dataset.day);
    updateMenu(`[data-day="${currentDay}"]`);
    return;
  }
  const choice = e.target.closest('[data-food-name]');
  if (choice) {
    const form = document.getElementById('food-form');
    const grams = parseFoodText(form.elements.name.value).grams;
    form.elements.name.value = grams === null ? choice.dataset.foodName : `${grams} g ${choice.dataset.foodName}`;
    updateFoodForm(form,form.elements.name);
    form.elements.grams.focus();
    return;
  }
  const undo = e.target.closest('[data-undo-workout]');
  if (undo) {
    const {day} = state.plan.workouts[undo.dataset.undoWorkout];
    const week = weekKey();
    const previousCompleted = state.completed;
    const previousLogs = state.workoutLogs;
    if (state.completedWeek === week) state.completed = state.completed.filter(value => value !== day);
    state.workoutLogs = state.workoutLogs.filter(log => !(log.planId === state.planId &&
      log.day === day && log.date >= week && log.date <= dateKey()));
    if (!save()) {
      state.completed = previousCompleted;
      state.workoutLogs = previousLogs;
      return;
    }
    render();
    document.getElementById(`workout-minutes-${undo.dataset.undoWorkout}`)?.focus({preventScroll:true});
    notify('Tamamlama geri alındı.');
    return;
  }
  const removeWorkout = e.target.closest('[data-remove-workout]');
  if (removeWorkout) {
    const previous = state.workoutLogs;
    state.workoutLogs = state.workoutLogs.filter(log => log.id !== removeWorkout.dataset.removeWorkout);
    if (!save()) {
      state.workoutLogs = previous;
      return;
    }
    render();
    document.getElementById('journal-week').focus({preventScroll:true});
    notify('Antrenman kaydı silindi.');
    return;
  }
  const removeEl=e.target.closest('[data-remove-food]');
  if(removeEl){
    const key=dateKey();
    const previous=todayEntries();
    state.foodLogs[key]=previous.filter(x=>x.id!==removeEl.dataset.removeFood);
    if (save()) { renderFoodDiary(true); notify('Kayıt silindi.'); }
    else state.foodLogs[key]=previous;
    return;
  }
  const actionEl=e.target.closest('[data-action]');if(!actionEl)return;
  if (actionEl.dataset.action === 'open-custom-workout') { openCustomWorkout(actionEl.form); return; }
  if (actionEl.dataset.action === 'open-workout-journal') {
    const heading = document.getElementById('training-journal-heading');
    heading.scrollIntoView({block:'start'});
    heading.focus({preventScroll:true});
    return;
  }
  if (actionEl.dataset.action === 'copy-meal') { openMealCopy(); return; }
  if (actionEl.dataset.action === 'personal-food') { openPersonalFoodEditor(); return; }
  if (actionEl.dataset.action === 'remove-personal-food') { removePersonalFood(actionEl.form); return; }
  if (actionEl.dataset.action === 'open-recipes') {
    const builder = document.getElementById('recipe-builder');
    builder.open = true;
    if (state.recipes.length) {
      const heading = document.getElementById('saved-recipes-heading');
      heading.scrollIntoView({block:'start'});
      heading.focus({preventScroll:true});
    } else {
      document.getElementById('recipe-name').focus();
    }
    return;
  }
  if (actionEl.dataset.action === 'rotate-menu') {
    const previous = state.menuOffset;
    state.menuOffset = (previous + 1) >>> 0;
    if (!save()) { state.menuOffset = previous; return; }
    updateMenu('[data-action="rotate-menu"]');
    notify('Haftalık menü değiştirildi.');
    return;
  }
  if(actionEl.dataset.action==='generate-ai')return generateAI();
  if(actionEl.dataset.action==='reset'){
    if(busy || !confirm('Bu tarayıcıdaki profilin, kilo geçmişin, besin kayıtların, kişisel besinlerin, tariflerin, kendi planların ve antrenmanların silinsin mi?'))return;
    try { localStorage.removeItem(STORAGE_KEY); }
    catch (_) { notify('Tarayıcı yerel verileri silmeye izin vermedi.'); return; }
    state=initialState();
    focusDraft = null;
    customRegion = null;
    customDrafts.clear();
    journalWeek = null;
    weightRange = 30;
    currentDay=dayIndex();applyTheme();render();notify('Yerel veriler sıfırlandı.');
  }
  if(actionEl.dataset.action==='install'){
    if(installingPrompt){installingPrompt.prompt();await installingPrompt.userChoice;installingPrompt=null;}
    else installInstructions();
  }
});
function updateEstimate(e) {
  const form = e.target.form;
  if (form?.id === 'food-form' && e.target.name !== 'meal') updateFoodForm(form,e.target);
  if (form?.id === 'personal-food-form' && e.target.name === 'name') updatePersonalFoodEditor(form);
  if (form?.id === 'recipe-form') {
    if (e.target.name === 'ingredient') updateRecipeIngredient(e.target.closest('.recipe-ingredient'));
    updateRecipeTotals(form);
  }
  if (form?.id === 'focus-workout-form') updateFocusedWorkout(form,e.target.name === 'minutes');
  if (form?.hasAttribute('data-workout-form')) {
    const {activity, minutes} = workoutFormValues(form);
    form.querySelector('output').value = workoutBurnText(activity, minutes) || 'Aktivite ve süre gir';
  }
}
document.addEventListener('input', e => {
  if (e.target.hasAttribute('data-quantity') && e.target.form?.id==='custom-workout-form') {
    updateCustomDraft(e.target.form);
    return;
  }
  if (e.target.form?.id !== 'focus-workout-form' || e.target.name === 'minutes') updateEstimate(e);
});
document.addEventListener('change', e => {
  if (e.target.id === 'custom-region') {
    const form = e.target.form;
    updateCustomDraft(form);
    customRegion = e.target.value;
    form.outerHTML = customWorkoutForm(customRegion);
    document.getElementById('custom-region').focus({preventScroll:true});
    return;
  }
  if (e.target.id === 'custom-equipment') {
    const form = e.target.form;
    const draft = updateCustomDraft(form);
    form.elements.exercise.innerHTML = customMovementOptions(draft.region,draft.equipment);
    return;
  }
  if (e.target.id === 'weight-date') {
    const entry = state.weightHistory.find(item => item.date === e.target.value);
    e.target.form.elements.amount.value = entry?.kg ?? '';
    return;
  }
  if (e.target.id === 'journal-week') {
    journalWeek = e.target.value || null;
    refreshWorkoutJournal(true);
    return;
  }
  if (e.target.matches('select, #focus-workout-form input[type=radio]')) updateEstimate(e);
});
document.addEventListener('submit',e=>{
  if(e.target.id==='profile-form'){e.preventDefault();if(!busy)saveProfile();}
  if(e.target.id==='weight-form'){e.preventDefault();saveWeightMeasurement(e.target);}
  if(e.target.id==='food-form'){e.preventDefault();addFood(e.target);}
  if(e.target.id==='personal-food-form'){e.preventDefault();addPersonalFood(e.target);}
  if(e.target.id==='recipe-form'){e.preventDefault();addRecipe(e.target);}
  if(e.target.id==='custom-workout-form'){e.preventDefault();saveCustomWorkout(e.target,e.submitter?.value==='start');}
  if (e.target.id === 'session-set-form') {
    e.preventDefault();
    submitSessionSet(e.target);
  }
  if (e.target.id === 'session-finish-form') {
    e.preventDefault();
    finishWorkoutSession(e.target);
  }
  if (e.target.id === 'focus-workout-form') {
    e.preventDefault();
    addFocusedWorkout(e.target);
  }
  if (e.target.hasAttribute('data-workout-form')) {
    e.preventDefault();
    addWorkout(e.target);
  }
});
function isSafeToReload() {
  if (busy || state.workoutSession) return false;
  const changedFields = [...document.querySelectorAll('form input, form select, form textarea')].some(input => {
    if (input.disabled || input.type === 'hidden') return false;
    if (input.type === 'checkbox' || input.type === 'radio') return input.checked !== input.defaultChecked;
    if (input.tagName === 'SELECT') {
      const options = [...input.options];
      return input.value !== (options.find(option => option.defaultSelected) ?? options[0])?.value;
    }
    return input.value !== input.defaultValue;
  });
  return !changedFields && [...customDrafts].every(([region,draft]) => {
    const saved = state.customPlans[region];
    if (!draft.exercises.length && !saved) return true;
    return JSON.stringify(normalizeCustomPlan(draft)) === JSON.stringify(saved);
  });
}

window.visualViewport?.addEventListener('resize',positionSessionSetDock);
window.addEventListener('resize',paintWeightChart);
window.visualViewport?.addEventListener('scroll',positionSessionSetDock);
document.addEventListener('visibilitychange', () => {
  syncWorkoutClock();
});
async function init(){
  applyTheme();
  syncWorkoutClock(false);
  render();
  watchForUpdates({isSafeToReload,notify});
  try{const response=await fetch('/api/status',{cache:'no-store'});if(response.ok){aiAvailable=Boolean((await response.json()).aiConfigured);updateAIControls();}}catch(_){/* Offline sürüm kullanılabilir. */}

}
init();
