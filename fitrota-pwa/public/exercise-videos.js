// Kayıtlar YouTube video kimlikleri olarak tutulur. Aramalar ve bilinmeyen hareketler ayrı etiketlenir.
const DIRECT_VIDEOS = new Map([
  ['Dinamik ısınma', 'ztN66R_hgOs'],
  ['Duvar şınavı', 'IlgO8Sppw0Y'],
  ['Yüksek destekli şınav', '-9S9gdRwwak'],
  ['Avuç içi göğüs sıkıştırma', 'dAX20JUYxYQ'],
  ['Orta tempolu yürüyüş', 'YPf2KpGHFM4'],
  ['Soğuma', 'u6u4BKwUVF8'],
  ['Yerde dambıl göğüs press', 'jjlekYs1cfQ'],
  ['Yerde dambıl fly', 'bgC53-J-6gA'],
  ['Yerde dambıl sıkıştırma press', '148apBtmngY'],
  ['Makinede göğüs press', 'lRo9zZ7EwpM'],
  ['Eğimli sehpada dambıl press', '8nNi8jbbUPE'],
  ['Pec deck', '3jYo5cMU3d4'],
  ['Yüzüstü W kaldırışı', 'FP5wYb76rcM'],
  ['Yüzüstü ters kar meleği', '5ayqrZbyuZU'],
  ['Yüzüstü kol çekişi', 'p2OV6IhcY4Y'],
  ['Tek kol dambıl çekişi', 'dFzUjzfih7k'],
  ['Çift dambıl öne eğilerek çekiş', '--gDUDFKx6Q'],
  ['Dambılla ters açış', 'fFtfgTZWyIQ'],
  ['Kabloyla üstten çekiş', '43hWj8mfYGY'],
  ['Oturarak kablo çekişi', '4ZbqM_gcgAI'],
  ['Göğüs destekli çekiş makinesi', 'FU6YQawma2Q'],
  ['Yüksek destekli pike şınavı', 'z4GTYSM0zZI'],
  ['Yüzüstü T kaldırışı', '4yaUXuz57uY'],
  ['Oturarak dambıl omuz press', 'rO_iEImwHyo'],
  ['Dambılla yana açış', '6a-sO62TN5E'],
  ['Makinede omuz press', 'Gkk-6q7Rq-s'],
  ['Tek kol kablolu yana açış', '1AmmsXlf8MU'],
  ['Ters pec deck', 'O2J8Qs7Wl3U'],
  ['Kendi direncinle biseps curl', 'Eh9O_ZJXMyo'],
  ['Dar tutuş duvar şınavı', 'AKzLv7lWlFA'],
  ['Dambıl biseps curl', 'mNlMGMvCgOY'],
  ['Dambıl çekiç curl', 'm8oUmDEgmYg'],
  ['Yerde dambıl triseps açışı', '4rI3EBpbA2U'],
  ['Alt makarada kablolu biseps curl', 'GAfhJiXIl24'],
  ['İpli triseps aşağı itiş', 'ZzNuKaKwCJA'],
  ['Makinede preacher curl', 'R-8Sa0_qiws'],
  ['Sandalyeye otur-kalk', 'Dg20pIkkzh8'],
  ['Destekli geri hamle', 'gWuZrnxtKDs'],
  ['Ayakta baldır yükseltme', 'LFfmd7lzVWQ'],
  ['Dambılla goblet squat', 'Elx2y-Qb1nM'],
  ['Dambılla Romen deadlift', 'QFbZevA7dps'],
  ['Dambılla geri hamle', 'Q2k3kYbtOcI'],
  ['Bacak presi', '3qCiBik5cUY'],
  ['Makinede bacak açma', '0fl1RRgJ83I'],
  ['Makinede bacak bükme', '_2Kd0d-JEUM'],
  ['Yerde kalça köprüsü', 'Y-4lrT9VuOs'],
  ['Dört ayakta kalça geriye uzatma', 'M4VcS3q-j9A'],
  ['Yan yatarak bacak kaldırma', 'g9FtnmsIYgI'],
  ['Dambılla yerde kalça köprüsü', 'cruqsnAyU6A'],
  ['Dambılla bölünmüş squat', 'Nu1zcGLooYE'],
  ['Makinede hip thrust', 'dkf8iq4sh8k'],
  ['Kablolu geriye kalça itişi', 'bVrmtCI00Ys'],
  ['Makinede kalça dışa açma', 'G_8LItOiZ0Q'],
  ['Dead bug', 'bxn9FBrt4-A'],
  ['Diz destekli yan plank', '1zpH0V32Vb8'],
  ['Bird dog', 'GVEJIzsQKqw'],
  ['Tek yanda dambılla sabit duruş', 'eAdujYvZaCE'],
  ['Dambılla dead bug', 'MctkvH4c6gs'],
  ['Tek yanda dambılla taşıma', 'ypWHRn0Wex0'],
  ['Kabloyla Pallof press', 'E6xLhhDKYcc'],
  ['Makinede kontrollü karın büküşü', '3h2dF58DLuc'],
  ['Tek yanda ağırlıkla taşıma', 'ypWHRn0Wex0'],
  ['Pelvik tilt', 'Kbz2KR3j670'],
  ['Topuk kaydırma', 'A7fcobCVppc'],
  ['Hafif esneme', 'K28V2bS2PbI'],
  ['Zıplamadan yan adım ve ritimli yürüyüş', 'rJiX_k8XKKM'],
]);

const MOVEMENT_ALIASES = new Map([
  ['Hafif ısınma', ['Dinamik ısınma']],
  ['Rahat tempoda başla', ['Orta tempolu yürüyüş']],
  ['Ana yürüyüş', ['Orta tempolu yürüyüş']],
  ['Tempoyu düşür', ['Soğuma']],
  ['Kalça köprüsü', ['Yerde kalça köprüsü']],
  ['Bird dog (her taraf)', ['Bird dog']],
  ['Pelvik tilt, topuk kaydırma ve kontrollü köprü', ['Pelvik tilt', 'Topuk kaydırma', 'Yerde kalça köprüsü']],
  ['Destekli geri hamle (her bacak)', ['Destekli geri hamle']],
  ['Baldır yükseltme', ['Ayakta baldır yükseltme']],
  ['Yavaş adımlarla ısın', ['Dinamik ısınma']],
  ['Hafif adımlarla soğu', ['Soğuma']],
  ['Hafif mobilite', ['Dinamik ısınma']],
  ['Dead bug ve bird dog', ['Dead bug', 'Bird dog']],
  ['Tek kol dambıl çekişi (her kol)', ['Tek kol dambıl çekişi']],
  ['Yerde dambıl press', ['Yerde dambıl göğüs press']],
  ['Hafif dambılla omuz press', ['Oturarak dambıl omuz press']],
  ['Dambılla kalça menteşesi', ['Dambılla Romen deadlift']],
]);

const SEARCH_TERMS = new Map([
  ['Kendi direncinle yana kol kaldırma','self resisted shoulder lateral raise opposite hand exercise'],
  ['Kendi direncinle triseps açışı','self resisted triceps extension opposite hand exercise'],
  ['Diyafram nefesi ve omurga mobilitesi','diyafram nefesi omurga mobilitesi egzersiz'],
  ['Destekli baldır yükseltme','supported standing calf raise holding a chair exercise'],
]);

export function exerciseVideos(exercise) {
  if (typeof exercise !== 'string') return [];
  const name = exercise.split(' · ', 1)[0].trim();
  if (!name || /^(set aralarında|dinlen(?:me)?(?:\s|$))/iu.test(name)) return [];

  return (MOVEMENT_ALIASES.get(name) ?? [name]).map(variant => {
    const videoId = DIRECT_VIDEOS.get(variant);
    if (videoId) return {name:variant, direct:true, url:'https://www.youtube.com/watch?v=' + videoId};

    const query = SEARCH_TERMS.get(variant) ?? (variant.slice(0,120) + ' hareketi nasıl yapılır');
    return {name:variant, direct:false, url:'https://www.youtube.com/results?' + new URLSearchParams({search_query:query})};
  });
}
