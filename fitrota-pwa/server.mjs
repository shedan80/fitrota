import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {WEEKDAYS as DAYS, MEAL_KEYS, validMealPortion} from './public/menus.js';
import {ACTIVITIES, EQUIPMENT, validWorkoutMinutes} from './public/workouts.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');

// Lightweight .env reader, no third-party packages needed.
try {
  const contents = await readFile(path.join(root,'.env'),'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*?)\s*$/);
    if (m && !Object.hasOwn(process.env,m[1])) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');
  }
} catch (_) {}

const port = Number(process.env.PORT || 3000);
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const hits = new Map();
const PORTION_SCHEMA = {
  type:'object', additionalProperties:false, required:['grams','kcal'],
  properties:{grams:{type:'integer'},kcal:{type:'integer'}},
};
const SCHEMA = {
  type:'object', additionalProperties:false,
  required:['summary','nutrition','workouts','tips'],
  properties:{
    summary:{type:'string'},
    nutrition:{type:'array',items:{
      type:'object', additionalProperties:false, required:['day',...MEAL_KEYS,'portions'],
      properties:{
        day:{type:'string',enum:DAYS},
        ...Object.fromEntries(MEAL_KEYS.map(key => [key,{type:'string'}])),
        portions:{type:'object',additionalProperties:false,required:MEAL_KEYS,
          properties:Object.fromEntries(MEAL_KEYS.map(key => [key,PORTION_SCHEMA]))},
      },
    }},
    workouts:{type:'array',items:{type:'object',additionalProperties:false,required:['day','title','duration','activity','minutes','exercises'],properties:{day:{type:'string',enum:DAYS},title:{type:'string'},duration:{type:'string'},activity:{type:'string',enum:Object.keys(ACTIVITIES)},minutes:{type:'integer'},exercises:{type:'array',items:{type:'string'}}}}},
    tips:{type:'array',items:{type:'string'}}
  }
};

function sendJson(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
function validateProfile(p) {
  if(!p || typeof p!=='object')return null;
  const goal=['denge','kas','form','yag'].includes(p.goal)?p.goal:null;
  const diet=['karisik','vejetaryen'].includes(p.diet)?p.diet:null;
  const days=Number(p.days);
  const experience=['baslangic','orta'].includes(p.experience)?p.experience:null;
  const equipment = p.equipment ?? 'none';
  if(!goal||!diet||!Number.isInteger(days)||days<2||days>5||!experience||!Object.hasOwn(EQUIPMENT,equipment))return null;
  if(typeof p.allergies!=='string'||p.allergies.length>160)return null;
  return {goal,diet,days,experience,equipment,allergies:p.allergies.trim().slice(0,160)};
}
function readBody(req) {
  return new Promise((resolve,reject)=>{
    let body='';
    req.on('data',chunk=>{body+=chunk;if(body.length>5000){reject(new Error('İstek çok büyük.'));req.destroy();}});
    req.on('end',()=>resolve(body));
    req.on('error',reject);
  });
}
function isRateLimited(req){
  const ip=req.socket.remoteAddress || 'unknown';
  const now=Date.now();
  const list=(hits.get(ip)||[]).filter(t=>now-t<60*60*1000);
  if(list.length>=10)return true;
  list.push(now);hits.set(ip,list);
  if(hits.size>5000){for(const [key,value] of hits){if(!value.some(t=>now-t<60*60*1000))hits.delete(key);}}
  return false;
}
function extractText(data){
  return (data.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('');
}
async function planHandler(req,res){
  if(!process.env.OPENAI_API_KEY){sendJson(res,503,{error:'Yapay zekâ henüz etkin değil. Sunucuya OPENAI_API_KEY ekle.'});return;}
  if(isRateLimited(req)){sendJson(res,429,{error:'Saatlik deneme sınırına ulaşıldı. Daha sonra tekrar dene.'});return;}
  let profile;
  try{profile=validateProfile(JSON.parse(await readBody(req)).profile);}catch(_){sendJson(res,400,{error:'Geçersiz istek.'});return;}
  if(!profile){sendJson(res,400,{error:'Profil bilgilerini kontrol et.'});return;}
  const labels={denge:'sürdürülebilir sağlıklı rutin',kas:'kas geliştirme',form:'kondisyon geliştirme',yag:'sürdürülebilir yağ kaybı'};
  const prompt=`Aşağıdaki yetişkin kullanıcı için TÜRKÇE bir haftalık genel fitness ve dengeli beslenme fikirleri planı oluştur.
Hedef: ${labels[profile.goal]}. Antrenman günü sayısı: ${profile.days}. Seviye: ${profile.experience}. Ekipman: ${EQUIPMENT[profile.equipment]}.
Beslenme: ${profile.diet==='vejetaryen'?'vejetaryen (balık ve et yok)':'karışık'}.
Belirtilen alerjiler / kaçınılacak besinler: ${profile.allergies || 'belirtilmedi'}.
KURALLAR:
- nutrition dizisi sırayla tam 7 gün (${DAYS.join(', ')}) içersin; breakfast/lunch/dinner/snack alanları kısa, tek öğün fikri olsun.
- workouts dizisi tam ${profile.days} gün içersin; günler çakışmasın, araya dinlenme koymaya çalış.
- Her antrenman için ekipmana uygun, baskın aktiviteyi ve tam sayı dakika (10–60 arası) yaz. duration aynı süreyi Türkçe metin olarak içersin.
- Aktivite kodları: ${Object.entries(ACTIVITIES).map(([key, value]) => key + ' = ' + value.label).join(', ')}.
- portions altında her öğün için yenebilir örnek porsiyonun toplam gramını ve o porsiyonun yaklaşık kcal değerini tam sayı olarak ver. Bunlar tüketim hedefi veya günlük toplam değildir.
- Menüde aynı kahvaltı, ana öğün veya ara öğünü tekrarlama. Farklı sebze, tahıl ve protein seçenekleri kullan.
- Sürdürülebilir ve acemiler için güvenli egzersiz öner; tehlikeli hareketler, aşırı yoğunluk, kalori hedefleri, kilo kaybı garantisi, tıbbi tavsiye olmasın.
- Alerjenleri yemeklerde kullanma; ancak çapraz bulaşma konusunda kullanıcıyı uyarmak gerekebileceğini belirt.
- Önerilen porsiyonların bireye göre uyarlanması gerektiğini tips alanında belirt.
- Çok kısa, doğal Türkçe yaz. Yapay zekâ önerileri besin veritabanıyla doğrulanmış değildir.
- Yalnızca istenen JSON şemasına uygun çıktı üret.`;
  try{
    const upstream=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        store:false,
        instructions:'Sen genel iyi yaşam içerikleri hazırlayan dikkatli bir fitness asistanısın. Sağlık profesyoneli gibi davranma. Güvenli ve dengeli, kısıtlayıcı olmayan öneriler sun.',
        input:prompt,
        text:{format:{type:'json_schema',name:'weekly_fitness_plan',strict:true,schema:SCHEMA}},
        max_output_tokens:4000
      }),
      signal:AbortSignal.timeout(55000)
    });
    const result=await upstream.json();
    if(!upstream.ok){console.error('OpenAI API error',upstream.status,result?.error?.code||'unknown');sendJson(res,502,{error:'Yapay zekâ servisi yanıt vermedi. API anahtarını/modelini ve bakiyeni kontrol et.'});return;}
    const body=extractText(result);
    if(!body){sendJson(res,502,{error:'Model tamamlanmış bir plan döndürmedi.'});return;}
    const plan=JSON.parse(body);
    if(!Array.isArray(plan.nutrition)||plan.nutrition.length!==7||!Array.isArray(plan.workouts)||plan.workouts.length!==profile.days||
       !plan.nutrition.every((x,i)=>x?.day===DAYS[i]&&MEAL_KEYS.every(key =>
         typeof x[key]==='string'&&validMealPortion(x.portions?.[key])))||
       new Set(plan.workouts.map(x=>x?.day)).size!==profile.days||
       !plan.workouts.every(x=>x&&DAYS.includes(x.day)&&typeof x.title==='string'&&Array.isArray(x.exercises)&&
         x.exercises.every(exercise=>typeof exercise==='string')&&Object.hasOwn(ACTIVITIES,x.activity)&&validWorkoutMinutes(x.minutes))){
       sendJson(res,502,{error:'Oluşturulan plan beklenen biçimde değil. Tekrar dene.'});return;
    }
    sendJson(res,200,{plan});
  } catch(err) {
    console.error('Plan generation failed:',err.name||'Error');
    sendJson(res,502,{error:'Yapay zekâ planı şu anda hazırlanamadı. Tekrar dene.'});
  }
}
async function serveFile(res,pathname){
  let urlpath;
  try{urlpath=decodeURIComponent(pathname);}catch(_){sendJson(res,400,{error:'Geçersiz adres.'});return;}
  if(urlpath==='/'||urlpath==='')urlpath='/index.html';
  const filename=path.resolve(publicDir,'.'+urlpath);
  if(!filename.startsWith(publicDir+path.sep)){sendJson(res,403,{error:'Erişim engellendi.'});return;}
  try{
    const info=await stat(filename);
    if(!info.isFile())throw new Error('not a file');
    const data=await readFile(filename);
    res.writeHead(200,{
      'Content-Type':mime[path.extname(filename)]||'application/octet-stream',
      'Cache-Control':urlpath==='/sw.js'?'no-store':'public, max-age=300',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    res.end(data);
  }catch(_){sendJson(res,404,{error:'Dosya bulunamadı.'});}
}

const server=createServer(async(req,res)=>{
  let url;
  try { url=new URL(req.url||'/', 'http://localhost'); }
  catch (_) { sendJson(res,400,{error:'Geçersiz adres.'}); return; }
  if(url.pathname==='/api/status'&&req.method==='GET'){sendJson(res,200,{aiConfigured:Boolean(process.env.OPENAI_API_KEY)});return;}
  if(url.pathname==='/api/plan'&&req.method==='POST'){await planHandler(req,res);return;}
  if(url.pathname.startsWith('/api/')){sendJson(res,404,{error:'API adresi bulunamadı.'});return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){sendJson(res,405,{error:'Desteklenmeyen istek.'});return;}
  await serveFile(res,url.pathname);
});
server.listen(port,()=>console.log(`FitRota: http://localhost:${port} | AI: ${process.env.OPENAI_API_KEY?'aktif':'kapalı'}`));
