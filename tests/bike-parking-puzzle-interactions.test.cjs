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
  w.eval(script+'\nwindow.__engine={LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,moveDirection,movesAvailable,undo,hint,restart,isSolved,solve};');
  let app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,
    'const {LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,moveDirection,movesAvailable,undo,hint,restart,isSolved}=window.__engine;');
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
