# FitRota PWA

FitRota 1.9.0, ana ekrana eklenebilen bir **beslenme ve antrenman PWA’sı**. Node.js ile çalışır. Profil, kilo geçmişi, kişisel besinler, tarifler, antrenman planları ve günlükler bu cihazdaki tarayıcıda saklanır.

**Hakkında** bölümü masaüstünde sol menüden, telefonda **Profilim → Hakkında** yolundan açılır.

### Beslenme ve antrenman

- **Öğünü kopyala.** Bir besini ya da tarifi eklerken istersen Kahvaltı, Öğle, Akşam veya Ara öğün seç. **Önceki öğünü kopyala** listesinden bir öğün seçince o öğünün porsiyonları ve kalorileri bugüne eklenir. Öğün seçimi olmayan eski kayıtlar günlük toplamda kalır ve son eklenenler üzerinden tek tek yeniden kaydedilebilir.
- **Kişisel besin.** Beslenme’de **Kendi besinimi kaydet** düğmesiyle besin adını ve 100 g başına kaloriyi kaydet. Besin ve tarif malzemesi aramalarında kendi besinlerin de görünür. Aynı kişisel adı yeniden kaydetmek değeri günceller. Düzenlemek veya silmek için önce besin adını ara ve kaydetme ekranını aç.
- **Haftalık özet.** Özet ekranındaki **Bu hafta** kartı pazartesiden bugüne kaydedilen antrenmanları, plan tamamlamalarını ve beslenme kaydı olan günleri gösterir. Karşılaştırılabilir setler varsa bir hareketin son iki seansı arasındaki gelişimi de gösterir.

- **Öğün kaydı.** Örneğin `200 g yoğurt` yazdığında katalog eşleşmesi ve porsiyondan toplam kalori hesaplanır. 213 kayıt içeren katalogda Türkçe karakter kullanmadan ve kelimelerin sırasını değiştirerek arayabilirsin. Katalog dışı paketli ürünler için gramı ve ürün etiketindeki **kcal / 100 g** değerini gir. Toplam kalori her iki durumda da elle düzeltilebilir. Besin aramasının hemen altındaki **Son eklenenler** ve **Kayıtlı tarifler** düğmeleri porsiyonu tek dokunuşla günlüğe ekler.
- **Öğün oluşturucu.** Beslenme ekranında tarif adını, malzemeleri ve gramlarını gir. Kalori değeri katalogdan veya ürün etiketinden alınır. Porsiyon sayısına göre toplam ve porsiyon başına tahmini kaloriyi gör, tarifi kaydet ve sonraki günlerde tek dokunuşla bir porsiyon ekle. Tarifler tarayıcıda saklanır ve çevrimdışı kullanılabilir.
- **Haftalık menü.** Yerel menü kahvaltı, öğle, akşam ve ara öğün havuzlarını ayrı ayrı karıştırır. Karışık ve vejetaryen tercihlerine göre aynı haftada her öğün türü için yedi farklı öneri gelir. Gram ve tahmini kalori önerinin örnek porsiyonuna aittir. **Menüyü değiştir** yeni bir menü gösterir ve yenilemeden sonra seçimi korur. AI menüleri Profilim ekranından yeniden oluşturulabilir.
- **Antrenman.** Hedef, gün sayısı, seviye ve ekipman seçimi kuvvet, yürüyüş, dans kardiyosu, pilates ve gövde denge seanslarını belirler. Planlı bir seansı tamamlarken süreyi düzenleyebilir veya bisiklet ve koşu gibi plan dışı aktiviteleri de kaydedebilirsin.
- **Haftalık antrenman günlüğü.** Antrenman ekranındaki **Antrenman günlüğü** düğmesi mevcut haftanın seanslarını açar. **Hafta seç** ile kayıtlı geçmiş haftalara git. Her hafta için seans sayısı, toplam süre ve hesaplanabilen tahmini aktif kalori görünür. Rehberli antrenmanların kayıtlı set ayrıntılarını seansın altında açabilirsin.
- **Kendi antrenmanın.** Antrenman ekranında bir bölge seç ve **Kendi antrenmanını oluştur** düğmesini kullan. Ekipmana uygun hareketleri listeden ekleyebilir veya kendi hareket adını yazabilirsin. Hareket başına set, tekrar ya da tutuş süresi ve 0–300 saniye dinlenme ayarla. Her bölgeye bir plan kaydedilir. **Kaydet ve başlat** ile planı sayaçlı antrenman moduna al.
- **Bölgesel antrenman.** Özet’te **Bölge seç ve çalış** düğmesine veya **Antrenman** sekmesine dokun. Antrenman ekranının üstündeki **Bölgesel antrenman** kartında göğüs, sırt, omuz, kol, bacak, kalça veya karın ve gövdeyi doğrudan seç. Ekipman ve profil seviyesine göre planlanmış hareket, set, tekrar ve dinlenme sürelerini gör. Kas geliştirme kuvvet odaklıdır. Yağ kaybı seçeneği seçili bölgeyi kuvvet çalışmasıyla hedefler ve genel kardiyo ekler. Seansı kaydettiğinde günlük antrenman listesine eklenir.
- **Hareket videoları.** Bölgesel ve haftalık programda her hareketin altında bir YouTube bağlantısı bulunur. Eşleşen örnek varsa video, diğer hareketlerde isimle arama açılır. Videolar için internet bağlantısı gerekir. Set, tekrar ve süre bilgileri FitRota planında gösterilir.
- **Antrenman Modu.** Bölge seçiminin altındaki **Antrenmanı başlat** düğmesiyle ısınmadan soğumaya kadar sırayla ilerle. Amaç, ekipman ve süre **Planı düzenle** altında. Setlerde yaptığın tekrarları, süreli hareketlerde tutuş süreni ve varsa ağırlığı kaydet. Mobilde **Seti tamamla** düğmesi alt menünün üzerinde sabit kalır. Dinlenme çemberini duraklatabilir veya atlayabilirsin. Süre dolunca iki tonlu ses çalar. Son seansın setleri aynı hareket tekrar geldiğinde gösterilir. **Antrenmana dön** düğmesi kaydedilmiş son adıma götürür.
- **Aktif kalori.** Kiloya, süreye ve aktivite türünün MET değerine göre dinlenme harcaması üstündeki enerji tahmin edilir. Profil kilosu boşsa antrenman kartında 70 kg için örnek değer görünür. Dashboard’a kişisel yakım tahmini yalnızca kilo girilmiş bir profilden kaydedilir.

MET değerleri için [2024 Adult Compendium of Physical Activities](https://pacompendium.com/). Temel besinlerin bileşim değerlerini karşılaştırmak için [USDA FoodData Central](https://fdc.nal.usda.gov/).

Bölgesel seans kalori hesabı blok bazında `(MET − 1) × 3,5 × kilo × dakika / 200` formülünü kullanır. Kuvvet bloklarında hazırlık ve set araları ortalamaya dahildir. Süre değiştirildiğinde bloklar orantılı güncellenir. Kilo yoksa gösterilen 70 kg örneği kişisel kayda yazılmaz. Gerçek harcama tempon ve eforuna göre değişir.

### Temel özellikler

- **Günün sözü.** Özet ekranı ve antrenman bitişi günün yerel tarihine göre bir motivasyon sözü gösterir. Söz gün içinde sabit kalır ve çevrimdışı çalışır.

- **Renk teması.** Sağ üstteki **Yeşil** ve **Pembe** düğmeleri uygulamanın renklerini değiştirir. Seçim aynı tarayıcıda korunur.

- **Kilo geçmişi ve trendi.** Özet’te **Kilo geçmişi → Ölçüm ekle** ile bugüne veya geçmiş bir tarihe ölçüm ekle. Aynı tarihi tekrar kaydetmek ölçümü günceller. Bugünkü kayıt ve Profilim’de değiştirdiğin kilo güncel kiloyu da günceller. **30 gün**, **90 gün** ya da **Tümü** ile ölçümleri ve son yedi takvim günündeki mevcut ölçümlerin ortalamasını gör. Önceki sürümlerde tarih tutulmayan profil kilosu, güncel kilo olarak korunur.

- **Vücut hedefi.** Profilim ekranında güncel boyunu, güncel kilonu, hedef kilonu ve vücut hedefini ayarla. Özet ekranı hedefe olan farkı ve başlangıç ölçümünden ilerlemeyi gösterir. Hedef kilo, günlük enerji formülünü değiştirmeden takip edilir.
- **Mobil gezinme.** Alt menü dokunmatik kullanım için düzenlendi. Sayfa geçişleri kısa bir animasyonla gösterilir ve işletim sisteminin hareketi azaltma tercihi uygulanır.

- Yenilenen veri odaklı, mobil öncelikli dashboard: **günlük hedef, kaydedilen kalori, ilerleme halkası, makro hedefleri, günün öğünü, antrenman ve haftalık ilerleme**.
- **Yaş (18+), boy, kilo, biyolojik cinsiyete dayalı formül seçimi, aktivite düzeyi ve hedef** üzerinden tahmini BMR/TDEE ve günlük kalori hedefi.
- Günlük kayıtlar cihazın `localStorage` alanında tutulur. Önceki `fitrota-v1` profili ve antrenman kayıtları korunur; yeni alanlar profil ekranından tamamlanabilir.
- Kalori formülü **Mifflin–St Jeor**; TDEE için aktivite çarpanları **1,2 / 1,375 / 1,55 / 1,725**; kas geliştirmeye yaklaşık +200 kcal, yağ kaybına yaklaşık −300 kcal. Bunlar kişiye özel klinik öneri değildir. Düşük VKİ'de otomatik kalori açığı verilmez. Çok düşük tahminler hedef olarak sunulmaz.
- **Protein, karbonhidrat ve yağ miktarları günlük tahmini hedeflerdir**. Menü kalori bilgisi örnek porsiyon içindir.

> Katalog çevrimdışı çalışır. Barkod, fotoğraf analizi ve canlı besin veri tabanı bağlantısı sonraki geliştirmeler arasında.

## 1) Çalıştır (Windows / macOS / Linux)

1. [Node.js](https://nodejs.org/) **20 veya üzeri** sürümünü kur.
2. Bu ZIP'i aç ve terminali / VS Code terminalini `fitrota-pwa` klasöründe aç.
3. Şunu çalıştır:

```bash
npm run dev
```

4. Bilgisayarının tarayıcısında **http://localhost:3000** adresine git.

Alternatif: `npm start` (otomatik yeniden başlatma yok). **npm install yapman gerekmiyor.**

### GitHub ve Vercel’de PWA güncellemeleri

GitHub’a `vercel.json`, `scripts/` ve uygulama dosyalarını birlikte gönder. Vercel projesinin kökü, `package.json` dosyasının bulunduğu dizindir. Vercel deploy sırasında `npm run build` ile `public/pwa-release.js` dosyasını üretir. Doğrudan statik klasör sunacaksan önce bu komutu çalıştır. Node sunucusu sürüm listesini yerelde kendisi üretir.

Yeni sürümün dosyaları doğrulanıp indirildikten sonra **Yeni sürüm mevcut → Güncelle** duyurusu görünür. Aktif antrenman ve kaydedilmemiş formlar bitene kadar uygulama yenilemez. Eski FitRota önbellekleri yeni sürüm etkinleşince temizlenir. Günlükler, planlar ve profil aynı site adresindeki tarayıcı deposunda kalır. v1.8 ve öncesinden ilk geçişte yeni önbellek arka planda etkinleşir ve uygulama sonraki açılışta yeni sürümü gösterir.

Önizleme testi için aynı Vercel dal adresinde iki ardışık dağıtım kullan. İlk dağıtımı açıp bir kayıt ekle. İkinci dağıtım tamamlanınca sekmeye dön ve **Güncelle** düğmesine dokun. Kaydın durduğunu ve bağlantı kapalıyken sayfanın açıldığını kontrol et.

## 2) Gerçek yapay zekâ (isteğe bağlı)

Yerel beslenme ve antrenman planları anahtar gerektirmeden çalışır. `OPENAI_API_KEY` ayarlandığında isteğe bağlı yapay zekâ planı görünür.

API üzerinden gerçek plan üretimi için:

1. `.env.example` dosyasının kopyasını `.env` adıyla oluştur.
2. `.env` içindeki `OPENAI_API_KEY=` alanına anahtarını yaz. Anahtarı **asla** `public/` içine koyma veya GitHub'a yükleme.
3. Gerekirse `OPENAI_MODEL` değerini API hesabının erişebildiği modelle değiştir. Varsayılan `gpt-5.4-mini`.
4. Sunucuyu yeniden başlat.
5. Uygulamada **Profilim → Yapay zekâyla plan hazırla** seç.

API kullanımı ücrete tabidir. Sunucu `/api/plan` yolundan OpenAI Responses API'ye istek gönderir, Structured Outputs JSON şemasını kullanır. Sunucuda temel istek boyutu kontrolü, profil doğrulama ve IP başına 10/saat limit bulunur. Çok kullanıcılı barındırma için kullanıcı hesapları, yetkilendirme, harcama sınırları ve veri gizliliği ayrı ele alınmalıdır.

## 3) Telefonuma nasıl yüklerim?

PWA uygulaması internet üzerinden **HTTPS ile yayınlanmalıdır**. `localhost` geliştirme için istisnadır; telefondan bilgisayarın `http://192.168...` adresine girerek PWA yüklemesi test etmek genelde güvenli bağlantı şartını karşılamaz.

- **iPhone:** HTTPS adresini Safari'de aç, **Paylaş → Ana Ekrana Ekle**.
- **Android:** HTTPS adresini Chrome'da aç, **Uygulamayı yükle** veya **Ana ekrana ekle**.

Sunucu ve statik siteyi aynı yerde çalıştırabilen Node.js uyumlu bir host'a (ör. Render / Railway / benzeri) dağıtarak HTTPS sağlayabilirsin. Başlatma komutu `npm start`, port `process.env.PORT` ile otomatik ayarlanır. Gelecek sürümde kimlik doğrulama için Supabase eklenebilir.

Arayüz dosyaları çevrimdışı kullanım için birlikte önbelleğe alınır. Bu dosyalar değiştiğinde `public/sw.js` içindeki önbellek sürümünü artır. Yeni önbellek tamamlanınca servis çalışanı etkinleşir. Açık sayfayı yenileyerek güncel arayüzü görebilirsin.

## 4) Proje yapısı

```
fitrota-pwa/
├── server.mjs                 # Node HTTP sunucusu; /api/plan ve statik dosyalar
├── package.json               # Komutlar (harici bağımlılık yok)
├── .env.example               # Sunucu yapılandırması örneği
└── public/
    ├── index.html             # Mobil/masaüstü arayüz
    ├── styles.css             # Tasarım
    ├── app.js                 # Dashboard, kalori günlüğü, profil, yerel kayıt
    ├── body-goals.js         # Hedef kiloya kalan fark ve ilerleme
    ├── calorie.js             # Test edilen BMR/TDEE ve makro hesaplama
    ├── recipes.js             # Tarif doğrulaması ve porsiyon hesabı
    ├── food.js                # Yerel besin kataloğu ve porsiyon hesabı
    ├── menus.js               # Dönüşümlü haftalık menüler
    ├── exercise-videos.js    # YouTube gösterim bağlantıları ve arama eşleşmeleri
    ├── workout-session.js    # Adım, set ve dinlenme durumu
    ├── workout-sound.js      # Dinlenme bitiş sesi
    ├── focused-workouts.js   # Bölgeye göre hareket ve seans kalori hesabı
    ├── workouts.js            # Antrenman programları ve MET hesabı
    ├── manifest.webmanifest   # PWA manifesti
    ├── sw.js                  # Offline uygulama kabuğu
    └── icons/                 # PWA ikonları
```

## 5) Şu an var / sonraki aşama

✅ Mobil ve masaüstü arayüz, kalori ve makro hedefleri, porsiyona göre kalori tahmini, dönüşümlü menüler, kişiselleştirilen örnek antrenman programları, aktif kalori tahmini, yerel kayıt, çevrimdışı PWA ve isteğe bağlı sunucu tarafı OpenAI entegrasyonu.

⌛ Üyelik, cihazlar arası senkronizasyon, geçmiş günleri görüntüleme, bildirimler, tıbbi güvenlik kontrolleri ve abonelik sonraki aşamada. Kayıtlar tarayıcının `localStorage` alanında tutulur. Çevrimdışı kullanımda yerel hesaplar, katalog, menüler ve kayıtlar erişilebilir.

> Bu yazılım tıbbi tavsiye vermez. Besin içeriklerini ve alerjenleri bağımsız olarak doğrulamak gerekir. Henüz halka açık ürün olarak kullanılmaya uygun güvenlik ve gizlilik süreçleri tamamlanmamıştır.

## 6) Test

```bash
npm test
```

`test/calorie.test.mjs` hesaplayıcı için BMR/TDEE, hedef ayarlama, yaş/ölçü doğrulama ve düşük VKİ korumasını sınar.
`test/features.test.mjs` porsiyon hesabını, menü dönüşümünü, antrenman seçimini ve aktif kalori tahminini sınar.
