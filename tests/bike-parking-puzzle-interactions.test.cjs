'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','bike-parking-puzzle');
const read=p=>readFileSync(path.join(dir,p),'utf8');
function setup(){
  const dom=new JSDOM(read('index.html'),{url:'https://www.bicipark.com/bike-parking-puzzle/',
    runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const script=read('engine.js').replace(/^export /gm,'');
  w.eval(script+'\nwindow.__engine={LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,moveDirection,movesAvailable,streetPath,undo,hint,restart,isSolved,solve};');
  let app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,
    'const {LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,moveDirection,movesAvailable,streetPath,undo,hint,restart,isSolved}=window.__engine;');
  assert.doesNotMatch(app,/^import\s/m);
  w.eval(app+'\nwindow.__getGame=()=>game;');
  const $=id=>w.document.getElementById(id);
  function key(code,opts={}){w.document.dispatchEvent(new w.KeyboardEvent('keydown',
    {bubbles:true,cancelable:true,code,...opts}));}
  function pointer(target,type,{x=0,y=0,id=1}={}){
    const el=typeof target==='string'?$(target):target;
    const event=new w.Event(type,{bubbles:true,cancelable:true});
    for(const [k,v] of Object.entries({clientX:x,clientY:y,pointerId:id,button:0}))
      Object.defineProperty(event,k,{value:v});
    el.dispatchEvent(event);
  }
  return {w,dom,$,key,pointer};
}
test('Puzzle is immediately playable, shows twelve level choices and a labelled bicycle garage',()=>{
  const h=setup();try{
    assert.equal(h.$('levelSelect').options.length,12);
    assert.equal(h.$('board').querySelectorAll('button.tile').length,16);
    assert.match(h.$('chapterLabel').textContent,/Inici/i);
    assert.match(h.$('movesValue').textContent,/0/);
    assert.ok(h.$('board').querySelector('button[aria-label*="Bicicleta A"]'));
    assert.ok(h.$('legend').textContent.includes('Bici A'));
  }finally{h.dom.window.close();}
});
test('Click-to-move, keyboard arrows, undo, hint and reset all affect the same board state',()=>{
  const h=setup();try{
    const g=h.w.__getGame();
    const plan=h.w.__engine.solve(g.cfg,g.positions);
    const next=plan[0],selected=g.positions[next.bike];
    h.$('board').querySelector('[data-pos="'+selected+'"]').click();
    assert.equal(g.selected,next.bike);
    assert.match(h.$('statusText').textContent,/seleccionada/i);
    h.$('board').querySelector('[data-pos="'+next.to+'"]').click();
    assert.equal(g.positions[next.bike],next.to);
    assert.equal(h.$('movesValue').textContent,'1');
    h.$('undoButton').click();
    assert.equal(h.$('movesValue').textContent,'0');
    h.$('hintButton').click();
    assert.match(h.$('statusText').textContent,/Pista/);
    assert.ok(g.hints>=1);
    h.$('resetButton').click();
    assert.equal(h.w.__getGame().hints,0);
    assert.equal(h.$('movesValue').textContent,'0');
  }finally{h.dom.window.close();}
});
test('Winning a level displays results, remembers stars and opens the next level',()=>{
  const h=setup();try{
    const g=h.w.__getGame();
    const moves=h.w.__engine.solve(g.cfg,g.positions);
    for(const m of moves){
      const from=g.positions[m.bike];
      h.$('board').querySelector('[data-pos="'+from+'"]').click();
      h.$('board').querySelector('[data-pos="'+m.to+'"]').click();
    }
    assert.equal(g.phase,'won');
    assert.equal(g.stars,3);
    assert.equal(h.$('winPanel').hidden,false);
    assert.match(h.$('bestValue').textContent,/★/);
    assert.equal(JSON.parse(h.w.localStorage.getItem('bicipark-bike-parking-progress-v1'))[0],3);
    h.$('nextLevelButton').click();
    assert.equal(h.w.__getGame().cfg.id,1);
    assert.equal(h.$('board').querySelectorAll('button.tile').length,16);
  }finally{h.dom.window.close();}
});
test('A touch swipe moves exactly one cell without an accidental second action',()=>{
  const h=setup();try{
    const g=h.w.__getGame(),move=h.w.__engine.solve(g.cfg,g.positions)[0];
    const tile=h.$('board').querySelector('[data-pos="'+move.from+'"]');
    const dir=move.direction;
    const vector={up:[0,-50],down:[0,50],left:[-50,0],right:[50,0]}[dir];
    h.pointer(tile,'pointerdown',{x:100,y:100,id:8});
    h.pointer(tile,'pointerup',{x:100+vector[0],y:100+vector[1],id:8});
    tile.click();
    assert.equal(g.moves,1);
    assert.equal(g.positions[move.bike],move.to);
  }finally{h.dom.window.close();}
});
test('Level picker can access more challenging 5x5 levels and their chapter stats',()=>{
  const h=setup();try{
    h.$('levelSelect').value='11';
    h.$('levelSelect').dispatchEvent(new h.w.Event('change',{bubbles:true}));
    assert.equal(h.w.__getGame().cfg.id,11);
    assert.equal(h.$('board').querySelectorAll('button.tile').length,25);
    assert.match(h.$('chapterLabel').textContent,/Mestres/);
    assert.equal(h.$('board').querySelectorAll('.tile-wall').length,5);
  }finally{h.dom.window.close();}
});

test('Arrow keys move the selected bicycle and Ctrl+Z undoes its move',()=>{
  const h=setup();try{
    const game=h.w.__getGame();
    const chosen=h.w.__engine.solve(game.cfg,game.positions)[0];
    h.$('board').querySelector('[data-pos="'+chosen.from+'"]').click();
    const keyName={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[chosen.direction];
    h.key(keyName);
    assert.equal(game.positions[chosen.bike],chosen.to);
    assert.equal(game.moves,1);
    h.key('KeyZ',{ctrlKey:true});
    assert.equal(game.positions[chosen.bike],chosen.from);
    assert.equal(game.moves,0);
  }finally{h.dom.window.close();}
});

test('City map retains 12 deterministic levels and renders buildings, roads, parks and original cycle artwork',()=>{
 const h=setup();try{
  const g=h.w.__getGame();
  assert.equal(h.$('levelSelect').options.length,12);
  assert.equal(h.$('puzzleDpad').querySelectorAll('[data-puzzle-direction]').length,4);
  assert.equal(h.$('board').querySelectorAll('.tile-street').length,16);
  assert.ok(h.$('board').querySelectorAll('.cycle-top-view').length>=g.positions.length);
  assert.match(h.$('board').getAttribute('aria-label'),/Mapa urbà/);
  h.$('levelSelect').value='11';
  h.$('levelSelect').dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.ok(h.$('board').querySelectorAll('.tile-building,.tile-park').length>=5);
  assert.equal(h.$('board').querySelectorAll('.tile').length,25);
 }finally{h.dom.window.close();}
});
test('On-screen direction buttons allow a legal adjacent move and disable blocked directions',()=>{
 const h=setup();try{
  const g=h.w.__getGame(),m=h.w.__engine.solve(g.cfg,g.positions)[0];
  const buttons=[...h.$('puzzleDpad').querySelectorAll('[data-puzzle-direction]')];
  assert.ok(buttons.every(b=>b.disabled),'Cannot drive without selecting a bike');
  h.$('board').querySelector('[data-pos="'+m.from+'"]').click();
  const direction=buttons.find(b=>b.dataset.puzzleDirection===m.direction);
  assert.equal(direction.disabled,false);
  direction.focus();
  direction.click();
  assert.equal(g.positions[m.bike],m.to);
  assert.equal(g.moves,1);
  assert.equal(h.w.document.activeElement,direction,'Direction pad should retain keyboard focus');
  h.$('undoButton').click();
  assert.equal(g.moves,0);
  assert.equal(g.positions[m.bike],m.from);
 }finally{h.dom.window.close();}
});
test('A completed animated move is decorative and does not alter engine positions or controls',()=>{
 const h=setup();try{
  const g=h.w.__getGame(),move=h.w.__engine.solve(g.cfg,g.positions)[0];
  const native=h.w.HTMLElement.prototype.getBoundingClientRect;
  h.w.HTMLElement.prototype.getBoundingClientRect=function(){
   const pos=Number(this.dataset?.pos);
   if(this.classList?.contains('tile')&&Number.isInteger(pos)){
    const size=g.cfg.size;return {left:(pos%size)*85,top:Math.floor(pos/size)*85,width:80,height:80,right:0,bottom:0};
   }
   return native.call(this);
  };
  h.$('board').querySelector('[data-pos="'+move.from+'"]').click();
  h.$('board').querySelector('[data-pos="'+move.to+'"]').click();
  assert.equal(g.positions[move.bike],move.to);
  const tile=h.$('board').querySelector('[data-pos="'+move.to+'"]');
  const ghost=tile.querySelector('.bike-drive-ghost');
  assert(ghost,'moving bike should be visible as a ghost sprite during the animation');
  assert.equal(tile.querySelector('.bike-drive-hidden')!==null,true);
  ghost.dispatchEvent(new h.w.Event('animationend'));
  assert.equal(tile.querySelector('.bike-drive-ghost'),null);
  assert.equal(tile.querySelector('.bike-drive-hidden'),null);
  assert.equal(g.moves,1);
 }finally{h.dom.window.close();}
});

test('Puzzle City keeps keyboard focus when selected tiles are rebuilt, including undo',()=>{
 const h=setup();try{
  const game=h.w.__getGame();
  const move=h.w.__engine.solve(game.cfg,game.positions)[0];
  const tile=h.$('board').querySelector('[data-pos="'+move.from+'"]');
  tile.focus();tile.click();
  assert.equal(h.w.document.activeElement.dataset.pos,String(move.from));
  const destination=h.$('board').querySelector('[data-pos="'+move.to+'"]');
  destination.focus();destination.click();
  assert.equal(h.w.document.activeElement.dataset.pos,String(move.to));
  h.key('KeyZ',{ctrlKey:true});
  assert.equal(h.w.document.activeElement.dataset.pos,String(move.to));
 }finally{h.dom.window.close();}
});

test('Tap a distant connected street and the bike pedals the full legal route with all moves counted',async()=>{
 const h=setup();try{
  const g=h.w.__getGame();
  const entries=[...Array(g.cfg.size*g.cfg.size).keys()].map(pos=>({pos,path:h.w.__engine.streetPath(g,pos,0)}));
  const target=entries.find(x=>x.path&&x.path.length>=2&&x.path.length<=Math.min(3,g.limit));
  assert.ok(target,'A starter level must offer a reachable multi-street destination');
  h.$('board').querySelector('[data-pos="'+g.positions[0]+'"]').click();
  h.$('board').querySelector('[data-pos="'+target.pos+'"]').click();
  assert.equal(g.moves,1,'First street segment should be driven immediately');
  assert.equal(h.$('undoButton').disabled,true,'Do not undo while a multi-step route is in progress');
  await new Promise(resolve=>setTimeout(resolve,(target.path.length-1)*250+100));
  assert.equal(g.positions[0],target.pos);
  assert.equal(g.moves,target.path.length,'No teleporting / discounted route distance');
  assert.equal(g.history.length,target.path.length);
  assert.equal(h.$('undoButton').disabled,false);
 }finally{h.dom.window.close();}
});
test('Restart and Escape cancel an ongoing city ride with no ghost moves afterward',async()=>{
 const h=setup();try{
  const g=h.w.__getGame();
  const target=[...Array(g.cfg.size*g.cfg.size).keys()].map(pos=>({pos,path:h.w.__engine.streetPath(g,pos,0)}))
   .find(x=>x.path&&x.path.length>=3&&x.path.length<=g.limit);
  assert.ok(target,'Expected a connected route of three or more cells');
  h.$('board').querySelector('[data-pos="'+g.positions[0]+'"]').click();
  h.$('board').querySelector('[data-pos="'+target.pos+'"]').click();
  assert.equal(g.moves,1);
  h.key('Escape');
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(g.moves,1,'No queued movement should complete after Escape');
  h.$('board').querySelector('[data-pos="'+g.positions[0]+'"]').click();
  h.$('board').querySelector('[data-pos="'+target.pos+'"]').click();
  assert.equal(g.moves,2,'Second route starts from current location');
  h.$('resetButton').click();
  assert.equal(g.moves,0);
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(g.moves,0,'Reset cancels all delayed drive steps');
 }finally{h.dom.window.close();}
});
test('Bike SVG visibly steers toward its travel direction and undo restores a heading',()=>{
 const h=setup();try{
  const g=h.w.__getGame();
  const move=h.w.__engine.solve(g.cfg,g.positions)[0];
  h.$('board').querySelector('[data-pos="'+move.from+'"]').click();
  h.$('board').querySelector('[data-pos="'+move.to+'"]').click();
  const tile=h.$('board').querySelector('[data-pos="'+move.to+'"]');
  const heading=tile.querySelector('.bike').style.getPropertyValue('--bike-heading');
  const expected={up:'0deg',down:'180deg',left:'-90deg',right:'90deg'}[move.direction];
  assert.equal(heading,expected);
  h.$('undoButton').click();
  const restored=h.$('board').querySelector('[data-pos="'+move.from+'"]').querySelector('.bike');
  assert.ok(restored.style.getPropertyValue('--bike-heading').endsWith('deg'));
 }finally{h.dom.window.close();}
});
