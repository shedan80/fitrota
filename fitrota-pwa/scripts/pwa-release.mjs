import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const RELEASE_FILE = 'pwa-release.js';
const workerFile = 'sw.js';
const hash = bytes => createHash('sha256').update(bytes).digest('base64');

async function publicAssets(directory,prefix = '') {
  const entries = (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
  const assets = [];
  for (const entry of entries) {
    if (!prefix && [workerFile,RELEASE_FILE].includes(entry.name)) continue;
    const local = path.join(directory,entry.name);
    const url = prefix + '/' + encodeURIComponent(entry.name);
    if (entry.isDirectory()) assets.push(...await publicAssets(local,url));
    else if (entry.isFile()) assets.push([url,'sha256-' + hash(await readFile(local))]);
  }
  return assets;
}

export async function releaseScript(publicDirectory) {
  const assets = Object.fromEntries(await publicAssets(publicDirectory));
  if (!assets['/index.html'] || !assets['/app.js']) throw new Error('FitRota uygulama dosyaları eksik.');
  const workerHash = hash(await readFile(path.join(publicDirectory,workerFile)));
  const id = createHash('sha256').update(workerHash).update(JSON.stringify(assets)).digest('hex').slice(0,24);
  return `self.FITROTA_RELEASE = ${JSON.stringify({id,assets})};\n`;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const directory = fileURLToPath(new URL('../public/',import.meta.url));
  const script = await releaseScript(directory);
  await writeFile(path.join(directory,RELEASE_FILE),script);
  console.log('FitRota çevrimdışı sürüm listesi hazır.');
}
