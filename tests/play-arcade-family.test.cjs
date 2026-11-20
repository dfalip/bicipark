'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages={
 'snowbike-downhill/index.html':'snow','bike-jump-ride/index.html':'ride','bike-jump/index.html':'jump',
 'roda-rumble/index.html':'rumble','bike-parking-puzzle/index.html':'puzzle',
 'modules/bike-cannon/index.html':'cannon','geo-sprint/index.html':'geo','map-game/index.html':'photo',
 'drag-map-game/index.html':'drag','joc-3clics.html':'three','zombiepedal/index.html':'zombie'
};
test('All eleven existing game pages opt into the shared arcade identity and local stylesheet',()=>{
 for(const [p,theme] of Object.entries(pages)){
  const html=read(p);
  assert.ok(html.includes('data-play-arcade="'+theme+'"'),p);
  const css=html.match(/href="([^"]*css\/play-arcade\.css)"/);
  assert.ok(css,p);assert.ok(fs.existsSync(path.resolve(root,path.dirname(p),css[1])));
 }
});
test('Pixel graphics are only loaded for the five action canvases; not for actual geographical clues',()=>{
 for(const [p,theme] of Object.entries(pages)){
  const html=read(p),paint=['snow','ride','jump','rumble','cannon'].includes(theme);
  assert.equal(html.includes('play-arcade-art.js'),paint,p);
  if(paint){
   const app=p.includes('bike-cannon')?'modules/bike-cannon/bike-cannon.js':path.posix.join(path.posix.dirname(p),'app.js');
   assert.match(read(app),/pixelFrame\(/);assert.match(read(app),/window\.BiciParkArcadeArt/);
  }
 }
 const css=read('css/play-arcade.css');
 assert.match(css,/\.map-game-photo-frame img\{object-fit:contain;image-rendering:auto;filter:none\}/);
 assert.doesNotMatch(css,/\.leaflet-tile[^{}]*\{[^{}]*(image-rendering|filter)\s*:/);
});
test('Procedural sprite routines paint pixel art, keep canvas transforms balanced and reuse a buffer',()=>{
 let depth=0,blits=0,rects=0,alloc=0;
 const doc={createElement(){alloc++;return {width:0,height:0,getContext(){return context()}}}};
 function context(){
  return {canvas:{width:1000,height:560,ownerDocument:doc},
   fillRect(){rects++},clearRect(){},drawImage(){blits++},save(){depth++},restore(){depth--},
   setTransform(){},beginPath(){},rect(){},clip(){}};
 }
 const ctx=context(),window={};
 vm.runInNewContext(read('js/play-arcade-art.js'),{window});
 const a=window.BiciParkArcadeArt;
 for(const theme of ['city','canyon','alpine'])a.jumpScene(ctx,theme);
 a.tree(ctx,50,100,65,true);a.surface(ctx,10,50,1,'snow');
 a.industrial(ctx,1000,560,510);
 for(const material of ['wood','glass','steel'])a.material(ctx,{material,w:60,h:100},['#aaa','#ddd','#333']);
 assert.ok(rects>500);assert.equal(depth,0);
 const count=alloc;a.pixelFrame(ctx);a.pixelFrame(ctx);
 assert.equal(alloc,count+1);assert.ok(blits>=4);assert.equal(depth,0);
});
