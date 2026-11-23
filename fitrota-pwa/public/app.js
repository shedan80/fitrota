import {calculateEnergy, ACTIVITY_LEVELS, dateKey} from './calorie.js';
import {weightGoalProgress} from './body-goals.js';
import {exerciseVideos} from './exercise-videos.js';
import {MAX_SET_COUNT, MAX_SET_WEIGHT, completeWorkoutBlock, createWorkoutSession, normalizeSetHistory,
  normalizeWorkoutSession, recordSessionSet, restRemaining, sessionWorkout, toggleSessionRest} from './workout-session.js';
import {enableWorkoutSound, playRestChime} from './workout-sound.js';
import {FOODS, findFood, suggestFoods, estimateFoodCalories, parseFoodText} from './food.js';
import {MAX_INGREDIENTS, MAX_SERVINGS, MAX_RECIPES, summarizeRecipe, normalizeRecipes} from './recipes.js';
import {MENU_VARIANTS, WEEKDAYS, weeklyMenu, validMealPortion} from './menus.js';
import {ACTIVITIES, EQUIPMENT, MAX_WORKOUT_MINUTES, buildWorkouts, estimateActiveCalories,
  validWorkoutMinutes, workoutMinutes} from './workouts.js';
import {FOCUS_REGIONS, FOCUS_GOALS, buildFocusedWorkout, estimateFocusedWorkout} from './focused-workouts.js';

'use strict';
const REFERENCE_WEIGHT_KG = 70;
const MAX_DAILY_FOOD_ENTRIES = 50;
const MAX_ENTRY_KCAL = 2500;
const STORAGE_KEY = 'fitrota-v1'; // Eski kullanıcının yerel verilerini koru.
const SHORT_DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const GOALS = {denge:'Kilomu korumak', yag:'Yağ kaybı', kas:'Kas geliştirme', form:'Kondisyon geliştirme'};
const DIETS = {karisik:'Karışık beslenme', vejetaryen:'Vejetaryen'};
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
  p.weightKg = finiteRange(input.weightKg,35,300);
  p.targetWeightKg = finiteRange(input.targetWeightKg,35,300);
  p.weightGoalStartKg = p.targetWeightKg === null ? null : finiteRange(input.weightGoalStartKg,35,300) ?? p.weightKg;
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
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(items))continue;
    out[key] = items.slice(-MAX_DAILY_FOOD_ENTRIES).filter(x=>x && typeof x.id==='string' && typeof x.name==='string' &&
      Number.isFinite(x.kcal) && x.kcal>=0 && x.kcal<=MAX_ENTRY_KCAL).map(x=>({
      id:x.id.slice(0,64),name:x.name.slice(0,70),kcal:Math.round(x.kcal),
      grams:finiteRange(x.grams,1,2000), estimated:x.estimated===true, recipePortion:x.recipePortion===true
    }));
  }
  return out;
}
function normalizeWorkoutLogs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(log => log && typeof log.id === 'string' && typeof log.title === 'string' &&
    typeof log.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(log.date) &&
    validWorkoutMinutes(log.minutes) && (log.kcal === null || Number.isFinite(log.kcal) && log.kcal >= 0))
    .map(log => ({id:log.id, date:log.date, title:log.title.slice(0,100), minutes:log.minutes,
      kcal:log.kcal, planId:log.planId, day:log.day, sets:normalizeSetHistory(log.sets)}));
}

function initialState() {
  return {profile:{...defaults}, plan:localPlan(defaults), source:'local', planId:'initial',
    completed:[], foodLogs:{}, recipes:[], workoutLogs:[], workoutSession:null, workoutSound:true, focusSettings:null, menuOffset:0};
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
        menuOffset:Number.isInteger(saved.menuOffset)?saved.menuOffset:0,
        workoutLogs:normalizeWorkoutLogs(saved.workoutLogs),
        workoutSession:normalizeWorkoutSession(saved.workoutSession),
        workoutSound:saved.workoutSound !== false,
        focusSettings:normalizedFocusSettings(saved.focusSettings),
        completedWeek:saved.completedWeek ?? weekKey(),
        completed:Array.isArray(saved.completed)?saved.completed.filter(x=>typeof x==='string'):[],
        foodLogs:normalizeFoodLogs(saved.foodLogs), recipes:normalizeRecipes(saved.recipes)};
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
function weekKey() {
  const monday = new Date();
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return dateKey(monday);
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

function homeView() {
  const energy=calculateEnergy(state.profile);
  const completed = completedThisWeek();
  const done=state.plan.workouts.filter(w=>completed.includes(w.day)).length;
  const total=state.plan.workouts.length;
  const pct=total?Math.round(done/total*100):0;
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
  <section class="card weekly-strip"><div><div class="eyebrow">HAFTALIK İLERLEME</div><h3>${done} / ${total} antrenman tamamlandı</h3></div><div class="weekly-meter"><div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Haftalık antrenman ilerlemesi"><div class="progress-fill" style="width:${pct}%"></div></div><strong>${pct}%</strong></div></section>
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
      <div id="food-quick-add">${foodQuickAddView()}</div>
      <div class="field"><label for="food-grams">Porsiyon (g)</label><input id="food-grams" name="grams" type="number" min="1" max="2000" step="1" inputmode="numeric" placeholder="Örn. 200"></div>
      <div class="field food-rate"><label for="food-rate">Etiket (kcal / 100 g)</label><input id="food-rate" name="rate" type="number" min="0" max="900" step="any" inputmode="decimal" placeholder="İsteğe bağlı"></div>
      <div class="field food-kcal"><label for="food-kcal">Kalori (kcal)</label><input id="food-kcal" name="kcal" inputmode="numeric" type="number" min="0" max="${MAX_ENTRY_KCAL}" step="1" required placeholder="kcal"></div>
      <button type="submit" class="btn btn-primary">+ Ekle</button>
      <div class="food-feedback">
        <p id="food-estimate" class="form-help" role="status">Katalogda ${FOODS.length} besin ve tarif var. Diğer ürünler için gramı ve etiketteki kcal / 100 g değerini gir.</p>
      </div>
    </form>
    <div class="diary-list-head"><strong>Bugünün kayıtları</strong><span>${logs.length} kayıt</span></div>
    ${logs.length?`<div class="food-list">${logs.slice().reverse().map(x=>`<div class="food-entry"><div><strong>${escapeHTML(x.name)}</strong><span>${x.recipePortion ? '1 porsiyon · ' : x.grams ? number(x.grams) + ' g · ' : ''}${x.estimated ? '≈ ' : ''}${number(x.kcal)} kcal</span></div><button type="button" class="remove-food" data-remove-food="${escapeHTML(x.id)}" aria-label="${escapeHTML(x.name)} kaydını sil">✕</button></div>`).join('')}</div>`:'<div class="no-food">Henüz kayıt yok. İlk öğününü ekleyerek başlayabilirsin.</div>'}
    <p class="data-local">↳ Kayıtlar bu tarayıcıdaki localStorage’da tutulur.</p>
  </section>`;
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
    ${foodDiary()}${recipeBuilderView()}<section id="weekly-menu">${menuView()}</section>`;
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

function workoutJournalView() {
  const logs = todayWorkoutLogs();
  const entries = logs.slice().reverse().map(log => `<div class="food-entry"><div><strong>${escapeHTML(log.title)}</strong><span>${log.minutes} dk · ${log.kcal === null ? 'Yakım hesaplanmadı' : `≈ ${number(log.kcal)} aktif kcal`}</span></div>
    <button type="button" class="remove-food" data-remove-workout="${escapeHTML(log.id)}" aria-label="${escapeHTML(log.title)} kaydını sil">✕</button></div>`).join('');
  return `<div id="training-journal">
    <div class="diary-list-head"><strong>Bugünkü antrenman kayıtları</strong><span>${logs.length} seans</span></div>
    ${entries?`<div class="food-list">${entries}</div>`:'<div class="no-food">Henüz antrenman kaydı yok.</div>'}</div>`;
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
  return `<div class="head-row"><div><div class="eyebrow">▤ ANTRENMAN</div><h1>Antrenmanların</h1><p class="subcopy">Planındaki seansları veya kendi aktivitelerini kaydet.</p></div><span class="small-tag">${done}/${state.plan.workouts.length} planlı seans tamamlandı</span></div>
    ${focusedWorkoutView()}
    <div class="section-head"><h2>Haftalık program</h2><button class="text-action" data-tab="profile">Planı kişiselleştir →</button></div>
    <div class="activity-explainer">${state.profile.weightKg === null ? '<p>Kartlar 70 kg için örnek yakımı gösteriyor. Kendi tahminini görmek ve kaydetmek için <button class="inline-link" data-tab="profile">profiline kilonu ekle</button>.</p>' : ''}
      <p>Aktif kalori, dinlenmenin üzerindeki tahmini enerji harcamasıdır. Kilo, aktivite türü ve süreye göre hesaplanır.</p></div>
    <div class="grid workout-grid">${cards||'<p class="empty">Henüz antrenman bulunmuyor.</p>'}</div>
    <section class="card diary-card"><div class="card-heading"><h2>Plan dışı aktivite ekle</h2></div>${workoutForm()}
      ${workoutJournalView()}</section>`;
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
    const minutes = elapsed <= MAX_WORKOUT_MINUTES ? elapsed : workout.minutes;
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
          <input id="session-count" name="count" type="number" min="1" max="${MAX_SET_COUNT[block.unit]}" step="1" inputmode="numeric" required></div>
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
  return `<div class="head-row"><div><h1>Profilim</h1><p class="subcopy">Güncel ölçülerini, vücut hedefini ve plan tercihlerini düzenle.</p></div></div>
  <div class="profile-layout"><section class="card form-card"><h2>Ölçüler ve hedefler</h2>
    <form id="profile-form"><fieldset class="profile-section"><legend>Güncel ölçüler</legend><div class="form-grid">
      <div class="field"><label for="name">İsmin (isteğe bağlı)</label><input id="name" name="name" maxlength="50" value="${escapeHTML(p.name)}" placeholder="İsmin" autocomplete="nickname"></div>
      <div class="field"><label for="age">Yaş</label><input id="age" name="age" type="number" min="18" max="85" step="1" value="${p.age??''}" placeholder="Örn. 24"></div>
      <div class="field"><label for="sex">Hesaplama formülü (biyolojik cinsiyet)</label><select id="sex" name="sex"><option value="" ${!p.sex?'selected':''}>Seçiniz</option>${options([['female','Kadın formülü'],['male','Erkek formülü']],p.sex)}</select><small>Mifflin–St Jeor formülü bu iki katsayıyı kullanır.</small></div>
      <div class="field"><label for="heightCm">Güncel boy (cm)</label><input id="heightCm" name="heightCm" type="number" inputmode="decimal" min="130" max="230" step="0.1" value="${p.heightCm??''}" placeholder="Örn. 175"></div>
      <div class="field"><label for="weightKg">Güncel kilo (kg)</label><input id="weightKg" name="weightKg" type="number" inputmode="decimal" min="35" max="300" step="0.1" value="${p.weightKg??''}" placeholder="Örn. 75"></div>
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
function activeTab() {
  const tab = location.hash.slice(1);
  if (tab==='session') return state.workoutSession ? tab : 'training';
  return ['home','nutrition','training','profile'].includes(tab) ? tab : 'home';
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
  const view = {home:homeView,nutrition:nutritionView,training:trainingView,profile:profileView,session:workoutSessionView}[tab];
  main.innerHTML = `<div class="page-view${tabChanged?' page-enter':''}">${view()}</div>`;
  updateAIControls();
  syncSessionSetDock();
  document.querySelector('.avatar').textContent=(state.profile.name.trim().split(/\s+/).map(word=>word[0]).join('').slice(0,2)||'FR').toLocaleUpperCase('tr');
  document.title=`${{home:'Genel Bakış',nutrition:'Beslenme',training:'Antrenman',profile:'Profilim',session:'Antrenman modu'}[tab]} • FitRota`;
  if (tabChanged) {
    window.scrollTo(0,0);
    const heading = main.querySelector('h1');
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
  }
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
  state.profile = profile;
  if (!save()) { state = previous; return; }
  currentDay = dayIndex();
  navigateTo('home');
  notify('Profilin kaydedildi.');
}
async function generateAI(){
  if(busy||!aiAvailable||!formValid())return;
  const profile=profileFromForm();busy=true;updateAIControls();
  try{
    const res=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{goal:profile.goal,days:profile.days,diet:profile.diet,experience:profile.experience,equipment:profile.equipment,allergies:profile.allergies}})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Yapay zekâya bağlanılamadı.');
    if(!validPlan(data.plan))throw new Error('Beklenen biçimde plan alınamadı.');
    const previous = {...state};
    state.profile=profile;state.plan=data.plan;state.source='ai';state.planId=uniqueId();state.completed=[];
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
  const food = findFood(parsed.name);

  if (changed === name) {
    const suggestions = document.getElementById('food-suggestions');
    const matches = food ? [] : suggestFoods(parsed.name);
    suggestions.innerHTML = matches.map(match => `<button class="btn btn-secondary btn-sm" type="button" data-food-name="${escapeHTML(match.name)}">${escapeHTML(match.name)}</button>`).join('');
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

function recordFood({name,grams=null,kcal,estimated=false,recipePortion=false,preserveDraft=recipePortion}) {
  const key = dateKey();
  const previous = state.foodLogs[key];
  const entries = previous || [];
  if (entries.length >= MAX_DAILY_FOOD_ENTRIES) {
    notify(`Bir gün için en fazla ${MAX_DAILY_FOOD_ENTRIES} kayıt ekleyebilirsin.`);
    return false;
  }
  state.foodLogs[key] = [...entries,{id:uniqueId(),name,grams,kcal,estimated,recipePortion}];
  if (!save()) {
    if (previous) state.foodLogs[key] = previous;
    else delete state.foodLogs[key];
    return false;
  }
  renderFoodDiary(preserveDraft);
  return true;
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
    document.getElementById('food-name').focus({preventScroll:true});
    notify(`${name} kaydedildi.`);
  }
}

function updateRecipeIngredient(row) {
  const name = row.querySelector('[name="ingredient"]');
  const rate = row.querySelector('[name="rate"]');
  const food = findFood(name.value);
  if (food) {
    rate.value = food.kcalPer100g;
    row.dataset.catalogRate = rate.value;
  } else if (rate.value === row.dataset.catalogRate) {
    rate.value = '';
    delete row.dataset.catalogRate;
  }
  const suggestions = row.querySelector('.recipe-suggestions');
  const matches = food ? [] : suggestFoods(name.value);
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

function recordWorkout(entry,settings = state.focusSettings) {
  const previousLogs = state.workoutLogs;
  const previousSettings = state.focusSettings;
  state.workoutLogs = [...previousLogs,{id:uniqueId(),date:dateKey(),...entry}];
  state.focusSettings = settings;
  if (save()) return true;
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
  document.getElementById('training-journal').outerHTML = workoutJournalView();
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
  if (!recordWorkout({id:session.id,title:workout.title,minutes,kcal,planId:null,sets:session.sets},session.settings)) {
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
  const tabEl=e.target.closest('[data-tab]');
  if (tabEl) {
    e.preventDefault();
    if (tabEl.dataset.tab === 'session' && state.workoutSound) enableWorkoutSound();
    navigateTo(tabEl.dataset.tab);
    return;
  }
  const sessionButton = e.target.closest('[data-session-action]');
  if (sessionButton) { handleSessionAction(sessionButton); return; }
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
    if (state.completedWeek === week) state.completed = state.completed.filter(value => value !== day);
    state.workoutLogs = state.workoutLogs.filter(log => !(log.planId === state.planId &&
      log.day === day && log.date >= week && log.date <= dateKey()));
    save();
    render();
    document.getElementById(`workout-minutes-${undo.dataset.undoWorkout}`)?.focus({preventScroll:true});
    notify('Tamamlama geri alındı.');
    return;
  }
  const removeWorkout = e.target.closest('[data-remove-workout]');
  if (removeWorkout) {
    state.workoutLogs = state.workoutLogs.filter(log => log.id !== removeWorkout.dataset.removeWorkout);
    save();
    render();
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
    state.menuOffset = (state.menuOffset + 1) % MENU_VARIANTS;
    save();
    updateMenu('[data-action="rotate-menu"]');
    notify('Haftalık menü değiştirildi.');
    return;
  }
  if(actionEl.dataset.action==='generate-ai')return generateAI();
  if(actionEl.dataset.action==='reset'){
    if(busy || !confirm('Bu tarayıcıdaki profilin, besin kayıtların, tariflerin, planın ve antrenmanların silinsin mi?'))return;
    try { localStorage.removeItem(STORAGE_KEY); }
    catch (_) { notify('Tarayıcı yerel verileri silmeye izin vermedi.'); return; }
    state=initialState();
    focusDraft = null;
    currentDay=dayIndex();render();notify('Yerel veriler sıfırlandı.');
  }
  if(actionEl.dataset.action==='install'){
    if(installingPrompt){installingPrompt.prompt();await installingPrompt.userChoice;installingPrompt=null;}
    else installInstructions();
  }
});
function updateEstimate(e) {
  const form = e.target.form;
  if (form?.id === 'food-form') updateFoodForm(form,e.target);
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
  if (e.target.form?.id !== 'focus-workout-form' || e.target.name === 'minutes') updateEstimate(e);
});
document.addEventListener('change', e => {
  if (e.target.matches('select, #focus-workout-form input[type=radio]')) updateEstimate(e);
});
document.addEventListener('submit',e=>{
  if(e.target.id==='profile-form'){e.preventDefault();if(!busy)saveProfile();}
  if(e.target.id==='food-form'){e.preventDefault();addFood(e.target);}
  if(e.target.id==='recipe-form'){e.preventDefault();addRecipe(e.target);}
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
window.visualViewport?.addEventListener('resize',positionSessionSetDock);
window.visualViewport?.addEventListener('scroll',positionSessionSetDock);
document.addEventListener('visibilitychange', () => syncWorkoutClock());
async function init(){
  syncWorkoutClock(false);
  render();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
  }
  try{const response=await fetch('/api/status',{cache:'no-store'});if(response.ok){aiAvailable=Boolean((await response.json()).aiConfigured);updateAIControls();}}catch(_){/* Offline sürüm kullanılabilir. */}

}
init();
