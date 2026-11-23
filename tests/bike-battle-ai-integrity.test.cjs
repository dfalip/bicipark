const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../bike-battle/engine.js');

test('AI targeting is pure and does not consume health, moves, or turns',()=>{
 const s=E.create();s.turn=1;
 const snapshot=JSON.stringify(s);
 const choice=E.aim(s);
 assert.equal(JSON.stringify(s),snapshot);
 assert.ok(Number.isFinite(choice.angle)&&Number.isFinite(choice.power));
});
test('terminal duel rejects further movement and shooting',()=>{
 const s=E.create();s.winner=0;
 const snapshot=JSON.stringify(s);
 E.move(s,-40);
 assert.equal(E.fire(s,45,70),false);
 E.tick(s,.1);
 assert.equal(JSON.stringify(s),snapshot);
});
test('projectiles never leave riders with negative HP',()=>{
 const s=E.create();s.riders[1].hp=1;
 assert.equal(E.fire(s,45,75),true);
 for(let i=0;i<3000&&s.shot;i++)E.tick(s,1/120);
 assert.ok(s.riders.every(r=>r.hp>=0&&r.hp<=100));
});
