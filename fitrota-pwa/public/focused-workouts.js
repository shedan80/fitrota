import {EQUIPMENT, activeCalories, validWorkoutMinutes} from './workouts.js';

export const FOCUS_REGIONS = {
  chest:'Göğüs', back:'Sırt', shoulders:'Omuz', arms:'Kol', legs:'Bacak',
  glutes:'Kalça', core:'Karın ve gövde',
};

export const FOCUS_GOALS = {muscle:'Kas geliştirme', fatLoss:'Yağ kaybı'};

// Her bölge için ekipmana göre üç hareket. Üçüncü sütun, standart tekrar aralığına istisnadır.
const moves = {
  chest: {
    none:[
      ['Duvar şınavı','Dirseklerini gövdeden hafifçe açık tut.'],
      ['Yüksek destekli şınav','Ellerini sağlam ve kaymayan bir yüzeye koy.'],
      ['Avuç içi göğüs sıkıştırma','Ellerini göğüs hizasında birbirine bastır.','15–25 sn'],
    ],
    dumbbells:[
      ['Yerde dambıl göğüs press','Dirseklerini yere kontrollü indir.'],
      ['Yerde dambıl fly','Dirseklerini hafif bükülü tut ve açıklığı kontrol et.'],
      ['Yerde dambıl sıkıştırma press','Dambılları birbirine yakın tutarak it.'],
    ],
    gym:[
      ['Makinede göğüs press','Kolları göğüs hizasına getirecek oturma ayarını seç.'],
      ['Eğimli sehpada dambıl press','Kürek kemiklerini sehpada sabit tut.'],
      ['Pec deck','Kollarını göğüs hizasında kontrollü birleştir.'],
    ],
  },
  back: {
    none:[
      ['Yüzüstü W kaldırışı','Dirseklerini bük, kürek kemiklerini nazikçe yaklaştır.'],
      ['Yüzüstü ters kar meleği','Ellerini kalçadan baş üstüne kontrollü taşı.'],
      ['Yüzüstü kol çekişi','Kollar baş üstünden başlasın, dirseklerini kaburgana çek.'],
    ],
    dumbbells:[
      ['Tek kol dambıl çekişi','Boştaki elinle sağlam bir yüzeyden destek al.','her kol'],
      ['Çift dambıl öne eğilerek çekiş','Kalçadan eğil, sırtını doğal pozisyonda tut.'],
      ['Dambılla ters açış','Hafif yükle kollarını iki yana kontrollü aç.'],
    ],
    gym:[
      ['Kabloyla üstten çekiş','Barı göğsünün üstüne doğru çek.'],
      ['Oturarak kablo çekişi','Gövdeyi sabit tutup dirsekleri geriye çek.'],
      ['Göğüs destekli çekiş makinesi','Göğsünü destekten ayırmadan çek.'],
    ],
  },
  shoulders: {
    none:[
      ['Yüksek destekli pike şınavı','Eller sabit destek üzerinde, kalçan hafif yukarıda.'],
      ['Kendi direncinle yana kol kaldırma','Diğer elinle hafif karşı direnç uygula.','her kol'],
      ['Yüzüstü T kaldırışı','Kolları yana aç ve omuzlarını kulaklarından uzak tut.'],
    ],
    dumbbells:[
      ['Oturarak dambıl omuz press','Belini aşırı yaymadan yukarı it.'],
      ['Dambılla yana açış','Hafif yükle omuz hizasına kadar kaldır.'],
      ['Dambılla ters açış','Eğilerek arka omzu kontrollü çalıştır.'],
    ],
    gym:[
      ['Makinede omuz press','Tutacakları rahat bir omuz hizasına ayarla.'],
      ['Tek kol kablolu yana açış','Gövdeyi eğmeden kolu yana kaldır.','her kol'],
      ['Ters pec deck','Dirseklerini yumuşak tut ve geriye aç.'],
    ],
  },
  arms: {
    none:[
      ['Kendi direncinle biseps curl','Diğer elinle hafif direnç vererek dirseğini bük.','her kol'],
      ['Dar tutuş duvar şınavı','Dirseklerini gövdene yakın tut.'],
      ['Kendi direncinle triseps açışı','Diğer elinle karşı direnç vererek dirseğini doğrult.','her kol'],
    ],
    dumbbells:[
      ['Dambıl biseps curl','Dirseklerini yanda tut, gövdeni sallama.'],
      ['Dambıl çekiç curl','Avuç içlerini birbirine dönük tut.'],
      ['Yerde dambıl triseps açışı','Üst kollar sabitken dirsekleri kontrollü bük.'],
    ],
    gym:[
      ['Alt makarada kablolu biseps curl','Dirseklerini gövdenin yanında sabitle.'],
      ['İpli triseps aşağı itiş','Dirseklerini sabit tutarak ipi aşağı it.'],
      ['Makinede preacher curl','Kolları desteğe yerleştir, ağırlığı yavaş indir.'],
    ],
  },
  legs: {
    none:[
      ['Sandalyeye otur-kalk','Sabit bir sandalyeye kontrollü oturup kalk.'],
      ['Destekli geri hamle','Dengeni sabit bir destekle koru.','her bacak'],
      ['Ayakta baldır yükseltme','Topuklarını kontrollü kaldırıp indir.'],
    ],
    dumbbells:[
      ['Dambılla goblet squat','Dambılı göğsüne yakın tut.'],
      ['Dambılla Romen deadlift','Dizler hafif bükülü, hareket kalçadan başlasın.'],
      ['Dambılla geri hamle','Bir adım geriye at ve ön ayağını sabit tut.','her bacak'],
    ],
    gym:[
      ['Bacak presi','Topukları platformda tut ve dizlerini kilitleme.'],
      ['Makinede bacak açma','Diz eklemini makinenin dönme eksenine hizala.'],
      ['Makinede bacak bükme','Ağırlığı kontrollü kaldırıp indir.'],
    ],
  },
  glutes: {
    none:[
      ['Yerde kalça köprüsü','Kalçanı kaldırırken belini aşırı yayma.'],
      ['Dört ayakta kalça geriye uzatma','Gövdeyi çevirmeden bacağını geriye uzat.','her bacak'],
      ['Yan yatarak bacak kaldırma','Kalçanı geriye devirmeden üst bacağı kaldır.','her bacak'],
    ],
    dumbbells:[
      ['Dambılla yerde kalça köprüsü','Dambılı kalça üzerinde güvenle sabitle.'],
      ['Dambılla Romen deadlift','Ağırlığı bacaklarına yakın taşı.'],
      ['Dambılla bölünmüş squat','Dengeni koruyarak iki dizini de bük.','her bacak'],
    ],
    gym:[
      ['Makinede hip thrust','Üst pozisyonda gövdeyi aşırı yayma.'],
      ['Kablolu geriye kalça itişi','Kalçayı sabit tutarak bacağı geriye taşı.','her bacak'],
      ['Makinede kalça dışa açma','Gövdeyi sallamadan kontrollü aç ve dön.'],
    ],
  },
  core: {
    none:[
      ['Dead bug','Bel pozisyonunu koruyarak zıt kol ve bacağı uzat.','her taraf'],
      ['Diz destekli yan plank','Omuz, kalça ve dizini aynı çizgide tut.','15–25 sn / taraf'],
      ['Bird dog','Kalçanı çevirmeden zıt kol ve bacağını uzat.','her taraf'],
    ],
    dumbbells:[
      ['Tek yanda dambılla sabit duruş','Bir yana eğilmeden gövdeyi dik tut.','20–30 sn / taraf'],
      ['Dambılla dead bug','Hafif bir dambılı iki elle sabit tutarak sırayla bacak uzat.','her bacak'],
      ['Tek yanda dambılla taşıma','Dik durarak kısa ve kontrollü adımlar at.','20–30 sn / taraf'],
    ],
    gym:[
      ['Kabloyla Pallof press','Kablo seni döndürürken gövdeyi sabit tut.','her taraf'],
      ['Makinede kontrollü karın büküşü','Boynundan çekmeden gövdeyi kontrollü bük.'],
      ['Tek yanda ağırlıkla taşıma','Omuz hizanı koruyarak yürüyüş yap.','20–30 sn / taraf'],
    ],
  },
};

export function buildFocusedWorkout({region,goal,equipment,experience}) {
  if (!Object.hasOwn(FOCUS_REGIONS,region) || !Object.hasOwn(FOCUS_GOALS,goal) ||
      !Object.hasOwn(EQUIPMENT,equipment)) return null;

  const intermediate = experience === 'orta';
  const muscle = goal === 'muscle';
  const sets = intermediate ? 3 : 2;
  const rest = muscle ? (intermediate ? 90 : 75) : 60;
  const reps = muscle ? '8–12' : '10–15';
  const blockMinutes = sets + (muscle ? 3 : 2);
  const activity = equipment === 'none' ? (region === 'core' ? 'core' : 'bodyweight') : 'strength';
  const blocks = [{name:'Dinamik ısınma', detail:'Rahat yürüyüş ve eklem hareketleri', activity:'core', minutes:5}];

  for (const [name,cue,quantity] of moves[region][equipment]) {
    const unit = quantity?.includes('sn') ? 'seconds' : 'reps';
    const dose = unit === 'seconds' ? quantity : reps + ' tekrar' + (quantity ? ' / ' + quantity : '');
    blocks.push({name, sets, restSeconds:rest, unit, detail:`${sets} set × ${dose} · Set arası ${rest} sn`, cue, activity, minutes:blockMinutes});
  }

  if (!muscle) {
    blocks.push({name:'Orta tempolu yürüyüş', detail:'Konuşabileceğin tempoda genel kardiyo', activity:'walking',
      minutes:intermediate ? 15 : 12});
  }
  blocks.push({name:'Soğuma', detail:'Yavaş adımlar ve rahat eklem hareketleri', activity:'core', minutes:3});
  return {
    title:`${FOCUS_REGIONS[region]} · ${FOCUS_GOALS[goal]}`,
    minutes:blocks.reduce((total,block) => total + block.minutes,0),
    blocks,
  };
}

export function estimateFocusedWorkout(workout, minutes, weightKg) {
  if (!workout || !validWorkoutMinutes(minutes)) return null;
  const scale = minutes / workout.minutes;
  const blocks = workout.blocks.map(block => {
    const duration = block.minutes * scale;
    return {minutes:duration, kcal:activeCalories(block.activity,duration,weightKg)};
  });
  if (blocks.some(block => block.kcal === null)) return null;
  return {blocks,kcal:Math.round(blocks.reduce((total,block) => total + block.kcal,0))};
}
