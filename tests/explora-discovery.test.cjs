'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const hub=path.join(root,'explora');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(read('explora/data/modules.js')).toString('base64'));

test('Explora discovery UI and module registry have valid JavaScript syntax',()=>{
  for(const name of ['explora/app.js','explora/data/modules.js']){
    execFileSync(process.execPath,['--check',path.join(root,name)],{stdio:'pipe'});
  }
  for(const id of ['categoryNavigation','moduleGrid','moduleSearch','moduleResults']){
    assert.match(read('explora/index.html'),new RegExp('id="'+id+'"'));
  }
  assert.match(read('explora/app.js'),/URLSearchParams/);
  assert.match(read('explora/app.js'),/normalizeSearch/);
});
test('All linked playable games exist and have unique IDs',async()=>{
  const {biciparkModules,moduleCategories}=await load();
  const games=biciparkModules.filter(item=>item.category==='games' && item.enabled);
  assert.ok(games.length>=6);
  assert.ok(games.some(item=>item.id==='geo-sprint'));
  assert.ok(games.some(item=>item.id==='bike-jump'));
  assert.ok(games.some(item=>item.id==='bike-cannon'));
  assert.ok(games.some(item=>item.id==='joc-3clics'));
  assert.equal(new Set(biciparkModules.map(item=>item.id)).size,biciparkModules.length);
  assert.ok(moduleCategories.some(item=>item.id==='games'));
  for(const item of games){
    const file=path.resolve(hub,item.href);
    const html=file.endsWith('.html') ? file : path.join(file,'index.html');
    assert.ok(fs.existsSync(html),'Missing playable page: '+item.id);
  }
});
