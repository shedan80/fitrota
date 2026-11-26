import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {releaseScript} from '../scripts/pwa-release.mjs';
import {dailyMotivation} from '../public/motivation.js';

function parse(script) {
  return JSON.parse(script.slice('self.FITROTA_RELEASE = '.length,-2));
}

test('build revision follows asset and worker content while excluding the generated script', async () => {
  const dir = await mkdtemp(join(tmpdir(),'fitrota-pwa-'));
  try {
    await mkdir(join(dir,'icons'));
    await writeFile(join(dir,'app.js'),'v1');
    await writeFile(join(dir,'index.html'),'FitRota');
    await writeFile(join(dir,'sw.js'),'worker');
    await writeFile(join(dir,'icons','pwa.png'),'icon');
    const first = parse(await releaseScript(dir));
    await writeFile(join(dir,'pwa-release.js'),'old build');
    assert.deepEqual(parse(await releaseScript(dir)),first);
    assert.equal(first.assets['/app.js'],'sha256-'+createHash('sha256').update('v1').digest('base64'));
    assert.ok(first.assets['/icons/pwa.png']);
    assert.equal(first.assets['/sw.js'],undefined);
    await writeFile(join(dir,'app.js'),'v2');
    const second = parse(await releaseScript(dir));
    assert.notEqual(second.id,first.id);
    await writeFile(join(dir,'sw.js'),'worker v2');
    assert.notEqual(parse(await releaseScript(dir)).id,second.id);
  } finally {
    await rm(dir,{recursive:true,force:true});
  }
});

test('motivation quote is stable per date and changes on consecutive local dates', () => {
  const days = ['2026-11-30','2026-12-01','2026-12-02'];
  const quotes = days.map(date=>dailyMotivation(date));
  assert.deepEqual(days.map(date=>dailyMotivation(date)),quotes);
  assert.notEqual(quotes[0],quotes[1]);
  assert.notEqual(quotes[1],quotes[2]);
  assert.ok(quotes.every(quote=>quote.length>10));
});
