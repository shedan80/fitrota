// Yetişkinlere yönelik, yalnızca tahmini enerji ihtiyacı hesaplayıcısı.
// Mifflin-St Jeor RMR + yaygın kullanılan aktivite çarpanları.
export const ACTIVITY_LEVELS = {
  sedentary: {label:'Hareketsiz / masa başı',factor:1.2},
  light: {label:'Az aktif (haftada 1–3 gün)',factor:1.375},
  moderate: {label:'Orta aktif (haftada 3–5 gün)',factor:1.55},
  active: {label:'Çok aktif (haftada 6–7 gün)',factor:1.725}
};

export function calculateEnergy(profile) {
  const {age, heightCm, weightKg, sex, activity, goal} = profile || {};
  if (!Number.isFinite(age) || age < 18 || age > 85 ||
      !Number.isFinite(heightCm) || heightCm < 130 || heightCm > 230 ||
      !Number.isFinite(weightKg) || weightKg < 35 || weightKg > 300 ||
      !['female','male'].includes(sex) || !Object.hasOwn(ACTIVITY_LEVELS,activity)) return null;

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const maintenance = Math.round(bmr * ACTIVITY_LEVELS[activity].factor / 10) * 10;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const adjustments = {denge:0, form:0, kas:200, yag:-300};
  const adjustment = Object.hasOwn(adjustments,goal) ? adjustments[goal] : 0;
  let note = '';
  let target = maintenance + adjustment;

  // Güvenlik sınırı: zayıf aralıktaki profillere enerji açığı önerilmez.
  if (goal === 'yag' && bmi < 18.5) {
    target = maintenance;
    note = 'Bu boy/kilo aralığında kalori açığı uygulanmadı. Kişisel değerlendirme için uzmana danış.';
  }
  // Çok düşük otomatik hedefleri sunma; kişisel profesyonel değerlendirme gerektirir.
  const minTarget = sex === 'female' ? 1200 : 1500;
  if (target < minTarget) {
    target = null;
    note = 'Bu verilerle güvenilir bir hedef öneremiyoruz. Kişisel kalori hedefini uzmanla belirle.';
  }

  if (target === null) return {bmr:Math.round(bmr),maintenance,target:null,protein:null,carbs:null,fat:null,note};

  const protein = Math.round(weightKg * (goal === 'kas' ? 1.8 : goal === 'yag' ? 1.6 : 1.4));
  const fat = Math.round(target * 0.29 / 9);
  const carbs = Math.max(0,Math.round((target - protein * 4 - fat * 9) / 4));
  return {bmr:Math.round(bmr),maintenance,target,protein,carbs,fat,note};
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
