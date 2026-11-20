'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'..','map-game');
const read=name=>readFileSync(path.join(dir,name),'utf8');
const source=read('data/locations.js');
const gameLocations=()=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')).then(m=>m.gameLocations);
test('On és això? has five documented, distinct documentary photographs, not invented scenery',async()=>{
 const list=await gameLocations();
 assert.equal(list.length,5);
 assert.equal(new Set(list.map(x=>x.id)).size,list.length);
 assert.equal(new Set(list.map(x=>x.image)).size,list.length);
 const ids=new Set();
 for(const x of list){
  assert.doesNotMatch(x.id,/demo/);
  assert.doesNotMatch(x.image,/\.(svg|webp)(\?|$)/i);
  assert.match(x.image,/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//);
  assert.match(x.photoSource,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(x.photoLicense,/^CC BY(-SA)? [234]\.0$/);
  assert.match(x.photoLicenseUrl,/^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/[234]\.0\/$/);
  assert.ok(x.photoAuthor.length>=4,'The photographer must receive visible credit');
  assert.ok(x.title.length>=5);
  assert.match(x.coordinateSource,/^https:\/\//);
  assert.equal(x.photoVerifiedAt,'2026-11-20');
  assert.ok(Number.isFinite(x.lat)&&x.lat>=41.35&&x.lat<=41.44);
  assert.ok(Number.isFinite(x.lng)&&x.lng>=2.1&&x.lng<=2.21);
  assert.ok(!ids.has(x.title));ids.add(x.title);
  const filename=decodeURIComponent(x.image.split('/').pop().replace(/^[0-9]+px-/,''));
  const sourceFilename=decodeURIComponent(x.photoSource.split('File:')[1]);
  assert.equal(filename,sourceFilename,'The displayed photograph must match its attributed Commons file');
 }
 assert.doesNotMatch(source,/images\/demo-/);
});
test('Photographs cannot be cropped into unrecognisable areas, and source credits stay visible',()=>{
 const css=read('styles.css'),html=read('index.html'),app=read('app.js');
 assert.match(css,/\.map-game-photo-frame img\{[^}]*object-fit:contain/);
 assert.match(html,/id="photoSourceLink"/);
 assert.match(html,/id="photoLicenseLink"/);
 assert.match(html,/id="photoError"/);
 assert.match(app,/state\.imageFailed/);
 assert.match(app,/state\.questions\.splice\(state\.currentRoundIndex,1\)/);
 assert.doesNotMatch(app,/[.]src\s*=\s*["'].*demo-.*[.]svg/);
});
