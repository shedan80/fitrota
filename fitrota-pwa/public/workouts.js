import {WEEKDAYS} from './menus.js';

// 2024 Adult Compendium: kategori etiketleri kaynak koddaki tempo/efor varsayımına karşılık gelir.
export const ACTIVITIES = {
  walking: {label:'Orta tempolu yürüyüş', met:3.8, code:'17190'},
  brisk: {label:'Hızlı yürüyüş', met:4.8, code:'17200'},
  jogging: {label:'Koşu (kişisel tempo)', met:7.5, code:'12020'},
  cycling: {label:'Rahat tempolu bisiklet', met:4.0, code:'01010'},
  strength: {label:'Ağırlık antrenmanı', met:3.5, code:'02054'},
  bodyweight: {label:'Vücut ağırlığı · orta efor', met:3.8, code:'02022'},
  core: {label:'Vücut ağırlığı · hafif efor', met:2.8, code:'02024'},
  dance: {label:'Düşük darbeli dans kardiyosu', met:4.8, code:'02005'},
  pilates: {label:'Mat pilatesi', met:1.8, code:'02103'},
};

export const EQUIPMENT = {none:'Ekipmansız', dumbbells:'Dambıl', gym:'Spor salonu'};
export const MAX_WORKOUT_MINUTES = 240;

export function validWorkoutMinutes(minutes) {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_WORKOUT_MINUTES;
}

export function activeCalories(activity, minutes, weightKg) {
  if (!Object.hasOwn(ACTIVITIES, activity) || !Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_WORKOUT_MINUTES ||
      !Number.isFinite(weightKg) || weightKg < 35 || weightKg > 300) return null;
  const activeMetTenths = Math.round(ACTIVITIES[activity].met * 10) - 10;
  return activeMetTenths * 3.5 * weightKg * minutes / 2000;
}

export function estimateActiveCalories(activity, minutes, weightKg) {
  if (!validWorkoutMinutes(minutes)) return null;
  const kcal = activeCalories(activity,minutes,weightKg);
  return kcal === null ? null : Math.round(kcal);
}

export function workoutMinutes(workout) {
  if (validWorkoutMinutes(workout.minutes)) return workout.minutes;
  // Önceki AI planlarında süre, örn. "30–40 dk" şeklinde metin olarak saklanıyordu.
  const match = workout.duration?.match?.(/^\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*(?:dk|dakika)\.?\s*$/i);
  if (!match) return null;
  const minutes = Math.round((Number(match[1]) + Number(match[2] ?? match[1])) / 2);
  return validWorkoutMinutes(minutes) ? minutes : null;
}

const schedule = {2:[0,3], 3:[0,2,4], 4:[0,1,3,5], 5:[0,1,2,4,5]};
const strengthMoves = {
  none: {
    full: ['Sandalyeye otur-kalk', 'Duvar şınavı', 'Kalça köprüsü'],
    upper: ['Duvar şınavı', 'Yüzüstü W kaldırışı', 'Bird dog (her taraf)'],
    lower: ['Destekli geri hamle (her bacak)', 'Kalça köprüsü', 'Baldır yükseltme'],
  },
  dumbbells: {
    full: ['Dambılla goblet squat', 'Tek kol dambıl çekişi (her kol)', 'Yerde dambıl press'],
    upper: ['Yerde dambıl press', 'Tek kol dambıl çekişi (her kol)', 'Hafif dambılla omuz press'],
    lower: ['Dambılla goblet squat', 'Dambılla kalça menteşesi', 'Destekli geri hamle (her bacak)'],
  },
  gym: {
    full: ['Bacak presi', 'Oturarak kablo çekişi', 'Makinede göğüs press'],
    upper: ['Makinede göğüs press', 'Kabloyla üstten çekiş', 'Oturarak kablo çekişi'],
    lower: ['Bacak presi', 'Makinede bacak bükme', 'Destekli baldır yükseltme'],
  },
};

const templatesByGoal = {
  denge: ['full', 'walk', 'upper', 'pilates', 'lower'],
  kas: ['full', 'lower', 'upper', 'walk', 'core'],
  form: ['walk', 'dance', 'full', 'brisk', 'pilates'],
  yag: ['full', 'walk', 'dance', 'lower', 'pilates'],
};

export function buildWorkouts(profile) {
  const intermediate = profile.experience === 'orta';
  const sets = intermediate ? 3 : 2;
  const minutes = intermediate ? 35 : 25;
  const equipment = Object.hasOwn(EQUIPMENT, profile.equipment) ? profile.equipment : 'none';
  const resistance = equipment === 'none' ? 'bodyweight' : 'strength';
  const moves = strengthMoves[equipment];
  const strength = (title, exercises) => ({
    title, activity:resistance, minutes,
    exercises:['Hafif ısınma · 5 dk', ...exercises.map(move => `${move} · ${sets} × 8–12`), 'Set aralarında 60–90 sn dinlen'],
  });
  const walk = (title, activity) => ({
    title, activity, minutes,
    exercises:['Rahat tempoda başla · 5 dk', `Ana yürüyüş · ${minutes - 10} dk`, 'Tempoyu düşür · 5 dk'],
  });
  const sessions = {
    full:strength('Tüm vücut kuvveti', moves.full),
    upper:strength('Üst vücut kuvveti', moves.upper),
    lower:strength('Alt vücut kuvveti', moves.lower),
    walk:walk('Dayanıklılık yürüyüşü', 'walking'),
    brisk:walk('Hızlı yürüyüş', 'brisk'),
    dance:{title:'Dans kardiyosu', activity:'dance', minutes, exercises:[
      'Yavaş adımlarla ısın · 5 dk', `Zıplamadan yan adım ve ritimli yürüyüş · ${minutes - 10} dk`, 'Hafif adımlarla soğu · 5 dk',
    ]},
    pilates:{title:'Mat pilatesi ve hareketlilik', activity:'pilates', minutes:20, exercises:[
      'Diyafram nefesi ve omurga mobilitesi · 5 dk', 'Pelvik tilt, topuk kaydırma ve kontrollü köprü · 10 dk', 'Hafif esneme · 5 dk',
    ]},
    core:{title:'Gövde dengesi', activity:'core', minutes:20, exercises:[
      'Hafif mobilite · 5 dk', `Dead bug ve bird dog · ${sets} × 8 (her taraf)`, `Diz destekli yan plank · ${sets} × 15 sn (her taraf)`,
    ]},
  };
  const sequence = templatesByGoal[profile.goal] || templatesByGoal.denge;
  return schedule[profile.days].map((day, index) => ({...sessions[sequence[index]], day:WEEKDAYS[day]}));
}
