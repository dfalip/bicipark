'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const atlases=[
 ['snowbike-downhill/assets/skibike-rider-atlas.svg',960,260,4],
 ['zombiepedal/assets/cyclist-pedal-atlas.svg',1200,260,4],
 ['zombiepedal/assets/zombie-characters-atlas.svg',720,230,4]
];

test('Each character atlas is valid SVG, four poses, self-contained and transparent',()=>{
 for(const [file,width,height,count] of atlases){
  const svg=read(file);
  const dom=new JSDOM(svg,{contentType:'image/svg+xml'});
  try{
   const root=dom.window.document.documentElement;
   assert.equal(root.localName,'svg',file);
   assert.equal(root.getAttribute('width'),String(width),file);
   assert.equal(root.getAttribute('height'),String(height),file);
   const paths=root.querySelectorAll('path');
   assert.ok(paths.length>=count*6,file+' should be illustrated, not a placeholder');
   assert.ok(root.querySelectorAll('linearGradient').length>=2,file);
   assert.doesNotMatch(svg,/<(?:image|script|foreignObject)\b/i,'sprites have no external dependencies');
   assert.doesNotMatch(svg,/https?:\/\/(?!www\.w3\.org\/2000\/svg)/i,'no remote resource loading');
   assert.ok(svg.length<100_000,'small enough for fast mobile loading');
  }finally{dom.window.close();}
 }
});

test('SnowBike uses rider sprite pose driven by steer/jump but keeps canvas fallback',()=>{
 const s=read('snowbike-downhill/app.js');
 assert.match(s,/riderAtlas\.src="\.\/assets\/skibike-rider-atlas\.svg"/);
 assert.match(s,/game\.airHeight>\.04\?3:/);
 assert.match(s,/game\.steerVelocity<-\.[0-9]+\?1:/);
 assert.match(s,/ctx\.drawImage\(riderAtlas,pose\*240/);
 assert.match(s,/if\(riderAtlasReady\(\)\)/);
 assert.match(s,/Two curved, tapered downhill skis/,'procedural fallback kept');
});

test('ZombiePedal sprites cycle with cadence and preserve stunned animation',()=>{
 const s=read('zombiepedal/app.js');
 assert.match(s,/cyclistAtlas\.src="\.\/assets\/cyclist-pedal-atlas\.svg"/);
 assert.match(s,/zombieAtlas\.src="\.\/assets\/zombie-characters-atlas\.svg"/);
 assert.match(s,/game\.time\*game\.speed\*\.092/,'pedaling responds to speed');
 assert.match(s,/ctx\.drawImage\(cyclistAtlas,frame\*300/);
 assert.match(s,/ctx\.drawImage\(zombieAtlas,frame\*180/);
 assert.match(s,/if\(enemy\.stunned\)/,'stun overlay remains visible');
 assert.match(s,/A believable double-triangle mountain-bike frame/,'procedural fallback kept');
});