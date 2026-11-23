// Yaklaşık kcal / 100 g ve değiştirilebilir bir başlangıç porsiyonu.
// Temel besinler genel gıda bileşimi değerlerini, tarifler örnek hazırlamaları temsil eder.
export const FOODS = [
  ['Elma (kabuklu)', 52, 180, 'elma'],
  ['Muz (kabuksuz)', 89, 120, 'muz'],
  ['Armut', 57, 175],
  ['Üzüm', 69, 150],
  ['Salatalık', 15, 120],
  ['Domates', 18, 120],
  ['Portakal (kabuksuz)', 47, 135, 'portakal'],
  ['Çilek', 32, 150],
  ['Avokado (yenebilir kısım)', 160, 75, 'avokado'],
  ['Haşlanmış yumurta', 155, 50, 'yumurta', 'haslama yumurta'],
  ['Sade yoğurt (tam yağlı)', 61, 150, 'yoğurt', 'sade yoğurt'],
  ['Süt (tam yağlı)', 61, 200, 'süt', 'tam yağlı süt'],
  ['Lor peyniri', 100, 50, 'lor'],
  ['Ayran (sade)', 35, 200, 'ayran'],
  ['Kefir (sade)', 52, 200, 'kefir', 'sade kefir'],
  ['Kaşar peyniri', 350, 30, 'kaşar'],
  ['Yulaf ezmesi (kuru)', 379, 40, 'yulaf', 'yulaf ezmesi'],
  ['Tam buğday ekmeği', 252, 30, 'tam tahıllı ekmek'],
  ['Beyaz ekmek', 266, 30],
  ['Pirinç (haşlanmış, yağsız)', 130, 150, 'haşlanmış pirinç', 'sade haşlanmış pirinç'],
  ['Bulgur (haşlanmış, yağsız)', 83, 150, 'haşlanmış bulgur'],
  ['Makarna (haşlanmış, sossuz)', 158, 150, 'haşlanmış makarna', 'sade makarna'],
  ['Haşlanmış patates', 87, 150],
  ['Nohut (haşlanmış)', 164, 150, 'haşlanmış nohut'],
  ['Yeşil mercimek (haşlanmış)', 116, 150, 'haşlanmış yeşil mercimek'],
  ['Badem (çiğ)', 579, 25, 'badem'],
  ['Ceviz içi', 654, 25, 'ceviz'],
  ['Tavuk göğsü (pişmiş, derisiz)', 165, 150, 'ızgara tavuk', 'ızgara tavuk göğsü'],
  ['Ton balığı (suda, süzülmüş)', 116, 100, 'suda ton balığı'],
  ['Somon (pişmiş)', 206, 150, 'fırında somon', 'ızgara somon'],
  ['Sade filtre kahve', 1, 200, 'filtre kahve'],
  ['Mercimek çorbası (örnek tarif)', 70, 250, 'mercimek çorbası'],
  ['Pirinç pilavı (örnek tarif)', 162, 160, 'pilav', 'pirinç pilavı'],
  ['Bulgur pilavı (örnek tarif)', 120, 160, 'bulgur pilavı'],
  ['Menemen (örnek tarif)', 105, 200, 'menemen'],
  ['Kuru fasulye (etsiz, örnek tarif)', 125, 200, 'kuru fasulye', 'etsiz kuru fasulye'],
  ['Cacık (örnek tarif)', 45, 200, 'cacık'],
  ['Simit (susamlı)', 365, 100, 'simit'],
  ['Humus (örnek tarif)', 166, 70, 'humus'],
  ['Izgara köfte (örnek tarif)', 235, 120, 'köfte', 'ızgara köfte'],
  ['Lahmacun (örnek tarif)', 245, 100, 'lahmacun'],
  ['Peynirli poğaça (örnek tarif)', 345, 80, 'peynirli poğaça'],
  ['Patates kızartması (örnek tarif)', 310, 120, 'patates kızartması'],
  ['Tavuk dürüm (örnek tarif)', 205, 200, 'tavuk dürüm'],
  ['Meyveli yulaf kasesi (örnek tarif)', 120, 250, 'yoğurt ve yulaf', 'yulaf kasesi'],
  // Meyve ve sebzeler
  ['Mandalina (kabuksuz)', 53, 90, 'mandalina'],
  ['Kivi (kabuksuz)', 61, 75, 'kivi'],
  ['Karpuz (kabuksuz)', 30, 200, 'karpuz'],
  ['Kavun (kabuksuz)', 34, 200, 'kavun'],
  ['Şeftali', 39, 150],
  ['Kayısı', 48, 100, 'taze kayısı'],
  ['Kuru kayısı', 241, 35],
  ['Kiraz (çekirdeksiz ağırlık)', 63, 150, 'kiraz'],
  ['Nar taneleri', 83, 100, 'nar'],
  ['Ananas (kabuksuz)', 50, 150, 'ananas'],
  ['Yaban mersini', 57, 100, 'blueberry'],
  ['Havuç (çiğ)', 41, 100, 'havuç'],
  ['Brokoli (haşlanmış)', 35, 150, 'brokoli', 'haşlanmış brokoli'],
  ['Karnabahar (haşlanmış)', 23, 150, 'karnabahar', 'haşlanmış karnabahar'],
  ['Ispanak (çiğ)', 23, 75, 'çiğ ıspanak'],
  ['Marul (çiğ)', 15, 70, 'marul'],
  ['Roka (çiğ)', 25, 40, 'roka'],
  ['Kırmızı biber (çiğ)', 31, 100, 'kırmızı biber', 'kapya biber'],
  ['Mantar (çiğ)', 22, 100, 'kültür mantarı', 'çiğ mantar'],
  ['Yeşil bezelye (haşlanmış)', 84, 150, 'haşlanmış bezelye'],
  ['Mısır (haşlanmış taneler)', 96, 100, 'haşlanmış mısır', 'haşlanmış süt mısır'],
  // Süt ürünleri, kahvaltılık ve atıştırmalıklar
  ['Yarım yağlı süt', 46, 200],
  ['Süzme yoğurt (tam yağlı)', 100, 150, 'süzme yoğurt'],
  ['Yarım yağlı sade yoğurt', 55, 150, 'yarım yağlı yoğurt'],
  ['Beyaz peynir (tam yağlı)', 265, 40, 'beyaz peynir'],
  ['Labne (sade)', 225, 30, 'labne'],
  ['Siyah zeytin', 116, 25],
  ['Yeşil zeytin', 145, 25],
  ['Fındık (çiğ)', 628, 25, 'fındık'],
  ['Antep fıstığı (iç)', 560, 25, 'antep fıstığı'],
  ['Yer fıstığı (kavrulmuş, tuzsuz)', 587, 25, 'yer fıstığı'],
  ['Kabak çekirdeği içi', 559, 25, 'kabak çekirdeği'],
  ['Hurma (kuru, çekirdeksiz ağırlık)', 282, 40, 'hurma', 'kuru hurma'],
  ['Kuru üzüm', 299, 30],
  ['Kuru incir', 249, 40],
  ['Fıstık ezmesi (sade)', 588, 20, 'fıstık ezmesi'],
  ['Tahin (sade)', 595, 20, 'tahin'],
  ['Bal', 304, 20],
  ['Bitter çikolata (%70–85)', 598, 20, 'bitter çikolata', 'siyah çikolata'],
  ['Granola (örnek karışım)', 450, 45, 'granola'],
  ['Tuzlu kraker (örnek ürün)', 430, 35, 'kraker', 'tuzlu kraker'],
  // Tahıl, bakliyat ve proteinler
  ['Tam buğday lavaş', 280, 60, 'lavaş', 'tam buğday lavaşı'],
  ['Çavdar ekmeği', 259, 35],
  ['Tam buğday makarna (haşlanmış)', 149, 150, 'haşlanmış tam buğday makarna', 'tam buğday makarna'],
  ['Kinoa (haşlanmış)', 120, 150, 'haşlanmış kinoa'],
  ['Kuskus (haşlanmış)', 112, 150, 'haşlanmış kuskus'],
  ['Barbunya (haşlanmış)', 127, 150, 'haşlanmış barbunya'],
  ['Kırmızı mercimek (haşlanmış)', 116, 150, 'haşlanmış kırmızı mercimek'],
  ['Sert tofu (sade)', 144, 120, 'tofu', 'sert tofu'],
  ['Hindi göğsü (pişmiş, derisiz)', 147, 150, 'hindi göğsü', 'ızgara hindi göğsü'],
  ['Tavuk but (pişmiş, derisiz)', 179, 150, 'pişmiş tavuk but', 'derisiz tavuk but'],
  ['Yağsız dana biftek (ızgara)', 183, 150, 'ızgara dana biftek', 'dana biftek'],
  ['Levrek (pişmiş)', 124, 150, 'ızgara levrek', 'fırında levrek'],
  ['Hamsi (pişmiş, yağ eklenmemiş)', 131, 150, 'ızgara hamsi', 'fırında hamsi'],
  ['Karides (haşlanmış)', 99, 120, 'haşlanmış karides'],
  // Sık aranan yemekler ve içecekler. Tarif ve marka değerleri değişebilir.
  ['Ezogelin çorbası (örnek tarif)', 65, 250, 'ezogelin', 'ezogelin çorbası'],
  ['Tarhana çorbası (örnek tarif)', 60, 250, 'tarhana çorbası'],
  ['Yayla çorbası (örnek tarif)', 75, 250, 'yayla çorbası'],
  ['Tavuk suyu çorbası (örnek tarif)', 50, 250, 'tavuk suyu çorbası'],
  ['Tavuklu pilav (örnek tarif)', 175, 280, 'tavuklu pilav', 'tavuklu pirinç pilavı'],
  ['Nohutlu pilav (örnek tarif)', 169, 250, 'nohutlu pilav'],
  ['Kısır (örnek tarif)', 160, 180, 'kısır'],
  ['Mercimek köftesi (örnek tarif)', 160, 120, 'mercimek köftesi'],
  ['Zeytinyağlı taze fasulye (örnek tarif)', 70, 220, 'taze fasulye', 'zeytinyağlı fasulye'],
  ['Zeytinyağlı barbunya pilaki (örnek tarif)', 120, 220, 'barbunya pilaki', 'zeytinyağlı barbunya'],
  ['Zeytinyağlı yaprak sarma (örnek tarif)', 160, 150, 'yaprak sarma', 'yaprak sarması', 'zeytinyağlı sarma'],
  ['Biber dolması (zeytinyağlı, örnek tarif)', 145, 220, 'zeytinyağlı biber dolması'],
  ['Karnıyarık (örnek tarif)', 120, 250, 'karnıyarık'],
  ['İmam bayıldı (örnek tarif)', 105, 220, 'imam bayıldı'],
  ['Yoğurtlu mantı (örnek tarif)', 180, 250, 'mantı', 'yoğurtlu mantı'],
  ['Peynirli su böreği (örnek tarif)', 260, 150, 'su böreği', 'su börek', 'peynirli su böreği'],
  ['Peynirli gözleme (örnek tarif)', 245, 180, 'peynirli gözleme'],
  ['Kaşarlı tost (örnek tarif)', 275, 160, 'kaşarlı tost'],
  ['Tavuk döner (örnek tarif)', 200, 120, 'tavuk döner'],
  ['Tavuk döner dürüm (örnek tarif)', 210, 200, 'döner dürüm', 'tavuk döner dürüm'],
  ['Et döner (örnek tarif)', 250, 120, 'et döner'],
  ['Kıymalı pide (örnek tarif)', 250, 220, 'kıymalı pide'],
  ['Margarita pizza (örnek tarif)', 255, 120, 'margherita pizza', 'margarita pizza'],
  ['Sütlaç (örnek tarif)', 120, 180, 'sütlaç'],
  ['Fıstıklı baklava (örnek tarif)', 440, 45, 'fıstıklı baklava'],
  ['Sade Türk kahvesi (şekersiz)', 2, 65, 'türk kahvesi', 'şekersiz türk kahvesi'],
  ['Siyah çay (şekersiz)', 1, 170, 'çay', 'şekersiz çay'],
  ['Su', 0, 250],
  ['Su', 0, 250],
  // Ek çevrimdışı seçenekler. Pişmiş ve kuru ağırlıklar ayrı tutulur.
  ['Yumurta akı (pişmiş)', 52, 65, 'yumurta beyazı'],
  ['Çırpılmış yumurta (örnek tarif)', 149, 100, 'çırpılmış yumurta'],
  ['Sade omlet (örnek tarif)', 154, 120, 'omlet', 'sade omlet'],
  ['Laktozsuz süt (yarım yağlı)', 46, 200, 'laktozsuz süt'],
  ['Badem içeceği (şekersiz)', 15, 200, 'şekersiz badem sütü', 'badem sütü'],
  ['Soya içeceği (şekersiz)', 33, 200, 'şekersiz soya sütü', 'soya sütü'],
  ['Yulaf içeceği (şekersiz, örnek ürün)', 43, 200, 'yulaf sütü', 'yulaf içeceği'],
  ['Mozzarella (tam yağlı)', 300, 40, 'mozzarella'],
  ['Hellim peyniri (örnek ürün)', 320, 40, 'hellim', 'hellim peyniri'],
  ['Tulum peyniri (örnek ürün)', 350, 30, 'tulum peyniri'],
  ['Zeytinyağı', 884, 10, 'sızma zeytinyağı'],
  ['Tereyağı', 717, 10],
  ['Fındık ezmesi (ilave şekersiz)', 630, 20, 'fındık ezmesi'],
  ['Dut pekmezi (örnek ürün)', 290, 20, 'dut pekmezi'],
  ['Çilek reçeli (örnek ürün)', 260, 20, 'çilek reçeli'],
  ['Kaju (çiğ)', 553, 25, 'kaju'],
  ['Chia tohumu', 486, 15, 'chia'],
  ['Keten tohumu', 534, 15],
  ['Ay çekirdeği içi (çiğ)', 584, 25, 'ay çekirdeği'],
  ['Patlamış mısır (yağsız)', 387, 25, 'yağsız patlamış mısır', 'yağsız popcorn'],
  ['Pirinç patlağı (sade)', 387, 18, 'pirinç patlağı'],
  ['Kakaolu süt (örnek ürün)', 76, 200, 'çikolatalı süt', 'kakaolu süt'],
  ['Portakal suyu (şekersiz)', 45, 200, 'portakal suyu'],
  ['Sade maden suyu', 0, 200, 'maden suyu', 'sade soda'],
  ['Sade espresso', 9, 30, 'espresso'],
  ['Americano (şekersiz)', 1, 180, 'americano'],
  ['Latte (tam yağlı süt, şekersiz)', 55, 240, 'şekersiz latte', 'sade latte'],
  ['Fırında patates (kabuğuyla, yağsız)', 93, 175, 'yağsız fırın patates'],
  ['Tatlı patates (fırında, yağsız)', 90, 150, 'fırında tatlı patates'],
  ['Kabak (haşlanmış)', 15, 150, 'haşlanmış kabak'],
  ['Patlıcan (haşlanmış)', 35, 150, 'haşlanmış patlıcan'],
  ['Kırmızı pancar (haşlanmış)', 44, 100, 'haşlanmış pancar'],
  ['Brüksel lahanası (haşlanmış)', 36, 150, 'haşlanmış brüksel lahanası'],
  ['Beyaz lahana (çiğ)', 25, 100, 'beyaz lahana'],
  ['Mor lahana (çiğ)', 31, 100, 'mor lahana', 'kırmızı lahana'],
  ['Kereviz kökü (çiğ)', 42, 100, 'çiğ kereviz'],
  ['Bamya (haşlanmış)', 22, 150, 'haşlanmış bamya'],
  ['Taze soğan', 32, 30, 'yeşil soğan'],
  ['Kuru soğan (çiğ)', 40, 50, 'soğan', 'çiğ soğan'],
  ['Sarımsak (çiğ)', 149, 6, 'sarımsak'],
  ['Semizotu (çiğ)', 20, 75, 'çiğ semizotu'],
  ['Böğürtlen', 43, 100],
  ['Ahududu', 52, 100],
  ['Mango (kabuksuz)', 60, 150, 'mango'],
  ['Nektarin', 44, 150],
  ['İncir (taze)', 74, 100, 'taze incir'],
  ['Erik (taze)', 46, 120, 'taze erik'],
  ['Hindistan cevizi (taze iç)', 354, 35, 'taze hindistan cevizi'],
  ['Pirinç (kuru)', 365, 60, 'kuru pirinç', 'çiğ pirinç'],
  ['Esmer pirinç (haşlanmış)', 123, 150, 'haşlanmış esmer pirinç'],
  ['Bulgur (kuru)', 342, 60, 'kuru bulgur'],
  ['Makarna (kuru)', 371, 75, 'kuru makarna', 'çiğ makarna'],
  ['Beyaz fasulye (haşlanmış)', 139, 150, 'haşlanmış beyaz fasulye'],
  ['Siyah fasulye (haşlanmış)', 132, 150, 'haşlanmış siyah fasulye'],
  ['Kuru börülce (haşlanmış)', 116, 150, 'haşlanmış börülce'],
  ['Edamame (haşlanmış, iç)', 121, 100, 'edamame'],
  ['Tempeh (pişmiş)', 195, 100, 'tempeh'],
  ['Tavuk göğsü (çiğ, derisiz)', 120, 150, 'çiğ tavuk göğsü'],
  ['Hindi füme (örnek ürün)', 110, 60, 'hindi füme', 'füme hindi'],
  ['Ton balığı (yağda, süzülmüş)', 198, 100, 'yağda ton balığı'],
  ['Sardalya (yağda, süzülmüş)', 208, 100, 'yağda sardalya'],
  ['Alabalık (pişmiş)', 168, 150, 'ızgara alabalık'],
  ['Uskumru (pişmiş)', 262, 150, 'ızgara uskumru'],
  ['Zeytinyağlı pırasa (örnek tarif)', 75, 220, 'pırasa yemeği', 'zeytinyağlı pırasa'],
  ['Zeytinyağlı enginar (örnek tarif)', 90, 200, 'enginar yemeği', 'zeytinyağlı enginar'],
  ['Bezelye yemeği (etsiz, örnek tarif)', 90, 220, 'bezelye yemeği', 'etsiz bezelye'],
  ['Yoğurtlu semizotu (örnek tarif)', 62, 180, 'yoğurtlu semizotu'],
  ['Çoban salatası (örnek tarif)', 52, 180, 'çoban salatası'],
  ['Fırında kabak mücveri (örnek tarif)', 145, 150, 'fırında mücver', 'kabak mücveri'],
  ['Domates çorbası (örnek tarif)', 55, 250, 'domates çorbası'],
  ['Sebze çorbası (örnek tarif)', 45, 250, 'sebze çorbası'],
  ['Kabak çorbası (örnek tarif)', 45, 250, 'kabak çorbası'],
  ['Tavuklu sebze sote (örnek tarif)', 130, 250, 'tavuk sote', 'tavuklu sebze sote'],
  ['Nohut yemeği (etsiz, örnek tarif)', 135, 230, 'nohut yemeği', 'etsiz nohut'],
  ['Ispanak yemeği (örnek tarif)', 85, 220, 'ıspanak yemeği'],
  ['Fırın makarna (peynirli, örnek tarif)', 180, 220, 'fırında makarna', 'peynirli fırın makarna'],
  ['İnegöl köfte (örnek tarif)', 250, 140, 'inegöl köfte'],
  ['Adana kebap (örnek tarif)', 260, 150, 'adana kebap', 'adana kebabı'],
  ['İskender kebap (örnek tarif)', 195, 350, 'iskender', 'iskender kebap'],
  ['Açma (sade, örnek tarif)', 365, 85, 'sade açma'],
  ['Fırın sütlaç (örnek tarif)', 130, 180, 'fırında sütlaç'],
  ['İrmik helvası (örnek tarif)', 330, 100, 'irmik helvası'],
  ['Aşure (örnek tarif)', 150, 180, 'aşure'],
  ['Dondurma (vanilyalı, örnek ürün)', 207, 65, 'vanilyalı dondurma'],

].map(([name, kcalPer100g, portion, ...aliases]) => ({name, kcalPer100g, portion, aliases}));

function normalizeName(name) {
  return name.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
}

const terms = new Map(FOODS.map(food => [food, [food.name, ...food.aliases].map(normalizeName)]));

export function findFood(name) {
  const query = normalizeName(name);
  return FOODS.find(food => terms.get(food).includes(query));
}

export function suggestFoods(name) {
  const query = normalizeName(name);
  if (query.length < 2) return [];
  const words = query.split(' ');
  const results = [];
  for (const food of FOODS) {
    let best = Infinity;
    for (const term of terms.get(food)) {
      const tokens = term.split(' ');
      if (term === query) best = 0;
      else if (term.startsWith(query)) best = Math.min(best,1);
      else if (words.every(word => tokens.some(token => token.startsWith(word)))) best = Math.min(best,2);
      else if (term.includes(query)) best = Math.min(best,3);
    }
    if (best < Infinity) results.push({food, rank:best});
  }
  return results.sort((a,b) => a.rank - b.rank).slice(0,8).map(result => result.food);
}

export function parseFoodText(value) {
  const amountFirst = value.trim().match(/^(\d{1,4})\s*(?:gram|gr|g)\s+(.+)$/iu);
  if (amountFirst) return {name:amountFirst[2], grams:Number(amountFirst[1])};
  const amountLast = value.trim().match(/^(.+?)\s+(\d{1,4})\s*(?:gram|gr|g)$/iu);
  if (amountLast) return {name:amountLast[1], grams:Number(amountLast[2])};
  return {name:value.trim(), grams:null};
}

export function calculateFoodEnergy(food, grams) {
  if (!Number.isFinite(food?.kcalPer100g) || food.kcalPer100g < 0 || food.kcalPer100g > 900 || !Number.isFinite(grams) || grams < 1 || grams > 2000) return null;
  return food.kcalPer100g * grams / 100;
}

export function estimateFoodCalories(food, grams) {
  const kcal = calculateFoodEnergy(food, grams);
  return kcal === null ? null : Math.round(kcal);
}
