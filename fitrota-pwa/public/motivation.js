import {dateKey} from './calorie.js';

const quotes = [
  'Bugün ayırdığın birkaç dakika, yarın işini kolaylaştırır.',
  'İyi bir başlangıç bazen sadece ayakkabılarını giymektir.',
  'Enerjine uygun bir tempo seç. Devam edebilmek de ilerlemedir.',
  'Bir set, bir yürüyüş, bir öğün. Bugün birinden başla.',
  'Kayıt tutmak, zamanla neyin işe yaradığını görmeni sağlar.',
  'Bugünkü hedefin ufak olabilir. Onu tamamlamak yine de değerli.',
  'Dinlenmeye yer açmak da düzenli çalışmanın bir parçası.',
  'Kendi temponda ilerlemek için bugün küçük bir adım at.',
  'Kendine verdiğin moladan sonra kaldığın yerden devam edebilirsin.',
  'İyi hissettiren hareketi bulmak da antrenmanın bir parçası.',
  'Zor bir günde daha kısa bir plan işini görebilir.',
  'Bugün yaptıklarını fark etmek için bir dakikanı ayır.',
  'Gelişimini kendi önceki kayıtlarınla kıyasla.',
  'Bir hareketi kontrollü yapmak, hızlanmaktan daha iyi hissettirebilir.',
  'Bir sonraki küçük adımı seç. Kalanını sonra düşünürsün.',
  'Bir gün ara verdiysen, düzenine bugün yeniden dönebilirsin.',
  'Yoğun bir günde kısa bir yürüyüşe yer açabilirsin.',
  'Bir alışkanlık, tekrar ettikçe hayatına daha kolay sığar.',
  'Bugün nasıl hissettiğini dikkate alarak planını ayarla.',
  'Antrenmanın sonunda kendine toparlanmak için zaman ayır.'
];

export function dailyMotivation(date = dateKey()) {
  const day = Math.floor(Date.parse(date)/86400000);
  // Haftanın veya ayın sınırında da üst üste aynı sözü gösterme.
  const seed = Math.imul(day ^ (day >>> 16),0x45d9f3b);
  return quotes[((seed >>> 0) % (quotes.length/2))*2 + (day&1)];
}
