'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(read('bike-parking-puzzle/engine.js')).toString('base64'));
test('Puzzle ships twelve unique levels in four progressively distinct chapters',async()=>{
  const e=await engine();
  assert.equal(e.LEVELS.length,12);
  assert.equal(new Set(e.LEVELS.map(l=>l.name)).size,12);
  assert.equal(new Set(e.LEVELS.map(l=>l.section)).size,4);
  assert.ok(e.LEVELS[8].walls.length>e.LEVELS[0].walls.length);
  for(let i=0;i<12;i++){
    const cfg=e.config(i);
    assert.ok([4,5].includes(cfg.size));
    assert.equal(new Set(cfg.goals).size,cfg.goals.length);
    assert.equal(new Set(cfg.walls).size,cfg.walls.length);
    assert.ok(cfg.goals.every(x=>!cfg.walls.includes(x)));
  }
});
test('All 12 curated levels are provably solvable, with move limits, no collisions and genuine 3-star optimal paths',async()=>{
  const e=await engine();
  const difficulties=[];
  for(let i=0;i<e.LEVELS.length;i++){
    const g=e.newGame(i);
    const initial=g.positions.slice(),plan=e.solve(g.cfg,g.positions);
    assert.ok(Array.isArray(plan)&&plan.length>0,'Solver must find a path in level '+(i+1));
    assert.equal(g.optimal,plan.length,'Minimum move count must come from solver, level '+(i+1));
    assert.ok(g.limit>g.optimal);
    difficulties.push(g.optimal);
    assert.equal(g.phase,'playing');
    for(const move of plan){
      assert.equal(e.selectBike(g,move.bike),true);
      const legal=e.movesAvailable(g,move.bike).map(m=>m.to);
      assert.ok(legal.includes(move.to),'Hint must not jump or cross a blocked tile');
      assert.equal(e.moveTo(g,move.to,move.bike),true);
      assert.equal(new Set(g.positions).size,g.positions.length,'Bicycles cannot overlap');
      for(const p of g.positions)assert.ok(!g.cfg.walls.includes(p),'Bikes may not occupy blocked cells');
    }
    assert.equal(e.isSolved(g),true);
    assert.equal(g.phase,'won');
    assert.equal(g.stars,3);
    assert.equal(g.moves,g.optimal);
    assert.deepEqual(initial,e.scramble(g.cfg));
  }
  assert.ok(difficulties.some(x=>x>=8),'Some levels must require real planning');
});
test('A hint is legal, non-mutating, consistent with the complete solution and counts against a perfect award',async()=>{
  const e=await engine(),g=e.newGame(7);
  const before=g.positions.slice(),path=e.solve(g.cfg,g.positions);
  const first=e.hint(g);
  assert.deepEqual(g.positions,before,'Hint must not secretly move a bicycle');
  assert.equal(g.hints,1);
  assert.equal(first.bike,path[0].bike);
  assert.equal(first.to,path[0].to);
  assert.equal(g.selected,first.bike);
  assert.match(g.notice,/Pista/);
  assert.equal(e.moveTo(g,first.to,first.bike),true);
  const rest=e.solve(g.cfg,g.positions);
  for(const move of rest)e.moveTo(g,move.to,move.bike);
  assert.equal(g.phase,'won');
  assert.ok(g.stars<=2,'Hint cannot earn perfect 3 stars');
});
test('Undo, restart, illegal moves and movement budget are enforced',async()=>{
  const e=await engine(),g=e.newGame(2);
  const positions=g.positions.slice(),move=e.solve(g.cfg,positions)[0];
  assert.equal(e.moveTo(g,-2,move.bike),false);
  assert.equal(g.moves,0);
  assert.equal(e.moveTo(g,move.to,move.bike),true);
  assert.equal(g.moves,1);
  assert.equal(e.undo(g),true);
  assert.deepEqual(g.positions,positions);
  assert.equal(g.moves,0);
  assert.equal(e.undo(g),false);
  e.hint(g);assert.equal(g.hints,1);
  e.restart(g);
  assert.equal(g.hints,0);
  assert.equal(g.history.length,0);
  assert.equal(g.phase,'playing');
  assert.deepEqual(g.positions,positions);
  g.moves=g.limit;
  assert.equal(e.moveTo(g,move.to,move.bike),false);
  assert.match(g.notice,/esgotat/);
});
test('Every move is orthogonal one tile and board geometry stays finite',async()=>{
  const e=await engine();
  for(let i=0;i<e.LEVELS.length;i++){
    const g=e.newGame(i);
    for(let bike=0;bike<g.positions.length;bike++){
      for(const move of e.movesAvailable(g,bike)){
        const from=e.xy(move.from,g.cfg.size),to=e.xy(move.to,g.cfg.size);
        assert.equal(Math.abs(from.x-to.x)+Math.abs(from.y-to.y),1);
      }
    }
  }
});
test('Game source is standalone and the user can play without network assets',()=>{
  for(const file of ['engine.js','app.js'])
    execFileSync(process.execPath,['--check',path.join(root,'bike-parking-puzzle',file)],{stdio:'pipe'});
  const html=read('bike-parking-puzzle/index.html');
  const css=read('bike-parking-puzzle/styles.css');
  const js=read('bike-parking-puzzle/app.js');
  for(const id of ['board','levelSelect','movesValue','undoButton','hintButton','resetButton','winPanel','nextLevelButton','statusText'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/aria-live="polite"/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(js,/pointerdown/);
  assert.match(js,/ArrowUp/);
  assert.doesNotMatch(html,/https?:\/\//,'No external scripts or resources');
});
