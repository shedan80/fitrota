export const WEEKDAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

export const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'];

// Her fikir için yemek adı, örnek porsiyon (g) ve o porsiyonun yaklaşık kcal değeri.
// Öğün başına 21 fikir, sırasıyla üç farklı haftaya ayrılır.
const breakfast = [
  ['Yulaf, sade yoğurt ve muz', 245, 300],
  ['Menemen ve tam tahıllı ekmek', 230, 285],
  ['Lor, domates ve tam tahıllı tost', 185, 270],
  ['Yoğurt, çilek ve ceviz', 240, 260],
  ['Ispanaklı omlet', 180, 215],
  ['Tahınlı muzlu tam tahıl tostu', 155, 295],
  ['Haşlanmış yumurta ve söğüş sebze', 195, 180],
  ['Elmalı tarçınlı yulaf', 230, 265],
  ['Mantarlı yumurta ve çavdar ekmeği', 205, 265],
  ['Avokadolu nohut ezmeli tost', 175, 310],
  ['Peynirli tam buğday gözleme ve domates', 240, 390],
  ['Kefir, armut ve yulaf', 265, 285],
  ['Fırında sebzeli yumurta', 210, 240],
  ['Süzme yoğurt, incir ve yulaf', 205, 260],
  ['Kabaklı omlet ve tam tahıl tostu', 230, 255],
  ['Tam tahıllı pankek ve meyve', 200, 335],
  ['Humuslu kahvaltı dürümü', 195, 325],
  ['Peynir, salatalık ve simit', 185, 375],
  ['Lor ve yeşillikli yumurtalı ekmek', 195, 280],
  ['Armutlu cevizli yulaf kasesi', 245, 320],
  ['Biberli ve peynirli tost', 155, 320],
];
const lunch = [
  [['Nohutlu Akdeniz salatası', 280, 370], ['Izgara tavuklu Akdeniz salatası', 280, 365]],
  [['Mercimek çorbası ve tam tahıllı ekmek', 290, 250]],
  [['Fasulyeli bulgur kasesi', 300, 370], ['Hindili bulgur kasesi', 300, 395]],
  [['Humuslu sebze dürümü', 230, 350], ['Tavuklu sebze dürümü', 230, 395]],
  [['Zeytinyağlı barbunya ve roka salatası', 280, 330]],
  [['Peynirli tam tahıl sandviç', 200, 340], ['Ton balıklı tam tahıl sandviç', 200, 360]],
  [['Yeşil mercimekli kısır', 280, 385], ['Izgara tavuk ve kısır', 300, 450]],
  [['Nohutlu semizotu salatası', 280, 330]],
  [['Mantarlı tam buğday makarna', 290, 385], ['Tavuklu tam buğday makarna', 300, 450]],
  [['Fırında falafel ve havuç salatası', 270, 390]],
  [['Yoğurtlu kabaklı bulgur kasesi', 290, 330]],
  [['Meksika usulü fasulyeli pirinç kasesi', 315, 440], ['Meksika usulü tavuklu pirinç kasesi', 315, 470]],
  [['Peynirli biberli erişte salatası', 270, 390]],
  [['Patatesli mercimek salatası', 300, 350], ['Somonlu patates salatası', 300, 420]],
  [['Tahin soslu nohut ve kinoa kasesi', 300, 435]],
  [['Domatesli beyaz fasulye salatası', 285, 355]],
  [['Ispanaklı mercimekli dürüm', 240, 360], ['Hindili ıspanaklı dürüm', 240, 405]],
  [['Bezelyeli patates salatası', 280, 325]],
  [['Fırında sebzeli nohut köftesi', 290, 380], ['Fırında sebzeli hindi köftesi', 290, 420]],
  [['Köz patlıcan, yoğurt ve bulgur', 300, 315]],
  [['Avokadolu yeşil mercimekli sandviç', 215, 395], ['Avokadolu ton balıklı sandviç', 215, 420]],
];
const dinner = [
  [['Sebzeli bulgur pilavı ve cacık', 335, 340]],
  [['Fırında sebze ve kuru fasulye', 340, 395], ['Fırında balık, patates ve salata', 350, 450]],
  [['Nohutlu karnabahar ve yoğurt', 320, 350]],
  [['Kabak yemeği ve bulgur', 340, 315]],
  [['Mantarlı sebze sote ve pilav', 340, 425], ['Etli sebze sote ve pilav', 340, 485]],
  [['Fırın patates ve mercimek köftesi', 325, 390]],
  [['Sebze çorbası ve peynirli tost', 320, 355]],
  [['Mercimekli patlıcan musakka', 340, 375], ['Kıymalı patlıcan musakka', 340, 450]],
  [['Domatesli taze fasulye ve cacık', 340, 305]],
  [['Mantarlı arpa şehriye pilavı', 330, 400], ['Fırın tavuk ve arpa şehriye pilavı', 340, 485]],
  [['Nohutlu sebzeli kuskus', 335, 420]],
  [['Ispanaklı fırın makarna', 300, 460]],
  [['Fırında baharatlı karnabahar ve mercimek', 350, 385], ['Fırın somon ve baharatlı karnabahar', 350, 465]],
  [['Yoğurtlu kabak mücveri ve roka', 315, 385]],
  [['Mercimekli kabak dolması', 340, 380], ['Kıymalı kabak dolması', 340, 445]],
  [['Kuru fasulye, bulgur ve salata', 360, 455]],
  [['Patatesli sebzeli frittata', 325, 365]],
  [['Fırında peynirli biber ve mercimek salatası', 340, 405]],
  [['Nohutlu tandır sebzeler', 335, 395], ['Fırında köfte ve tandır sebzeler', 335, 480]],
  [['Bezelyeli mantarlı risotto', 310, 440]],
  [['Brokoli çorbası ve humuslu tost', 330, 370]],
];
const snack = [
  ['Elma ve badem', 190, 150],
  ['Yoğurt ve mevsim meyvesi', 210, 145],
  ['Armut ve ceviz', 180, 155],
  ['Sade kefir', 200, 105],
  ['Muz ve fındık', 135, 165],
  ['Havuç ve humus', 125, 125],
  ['Çilek ve yoğurt', 200, 95],
  ['Mandalina ve kabak çekirdeği', 150, 130],
  ['Tarçınlı yoğurt', 155, 95],
  ['Kuru kayısı ve badem', 50, 190],
  ['Salatalık ve lor peyniri', 150, 90],
  ['Portakal dilimleri', 150, 70],
  ['Üzüm ve ceviz', 145, 145],
  ['Tam tahıllı kraker ve humus', 90, 190],
  ['Muz ve sade yoğurt', 205, 145],
  ['Elma dilimleri ve tahin', 170, 160],
  ['Armut ve sade kefir', 230, 125],
  ['Köz nohut', 45, 165],
  ['Havuç ve yoğurtlu dip sos', 160, 95],
  ['Taze meyve salatası', 170, 100],
  ['Tam tahıllı tost ve lor', 95, 170],
];

export const MENU_VARIANTS = 3;

export function validMealPortion(portion) {
  return Number.isInteger(portion?.grams) && portion.grams >= 1 && portion.grams <= 2000 &&
    Number.isInteger(portion.kcal) && portion.kcal >= 0 && portion.kcal <= 2500 &&
    portion.kcal <= portion.grams * 9;
}

export function weeklyMenu(diet, week, offset = 0) {
  const variant = ((week + offset) % MENU_VARIANTS + MENU_VARIANTS) % MENU_VARIANTS;
  const preferred = options => (diet === 'vejetaryen' ? options[0] : options.at(-1));
  return WEEKDAYS.map((day, index) => {
    const item = variant * WEEKDAYS.length + index;
    const entries = [breakfast[item], preferred(lunch[item]), preferred(dinner[item]), snack[item]];
    const menu = {day, portions:{}};
    entries.forEach(([name, grams, kcal], slot) => {
      const type = MEAL_KEYS[slot];
      menu[type] = name;
      menu.portions[type] = {grams, kcal};
    });
    return menu;
  });
}
