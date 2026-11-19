'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(read('explora/play-progress.js')).toString('base64'));
const store=obj=>({getItem(key){return obj[key]??null;}});

test('Daily Play missions alternate games, pick deterministic routes and reject malformed dates',async()=>{
 const p=await load();
 const day='2026-11-19',m=p.missionForDay(day);
 assert.equal(m.game,'snowbike');
 assert.match(m.href,/challenge=2026-11-19&course=0/);
 assert.deepEqual(p.missionForDay(day),m);
 const next=p.missionForDay('2026-11-20');
 assert.equal(next.game,'zombiepedal');
 assert.ok(Number.isSafeInteger(next.seed)&&next.seed>=0);
 assert.match(next.href,new RegExp('seed='+next.seed+'$'));
 for(const bad of ['not-a-day','2026-02-31','2026-18-92','',null])
  assert.equal(p.missionForDay(bad),null);
});

test('Daily results never guess completions from game records; seven-day streak uses only finished missions',async()=>{
 const p=await load();
 assert.deepEqual(p.readDaily(store({})),{});
 assert.deepEqual(p.readDaily(store({[p.DAILY_STORE]:'broken JSON'})),{});
 const completed={
 '2026-11-16':{game:p.missionForDay('2026-11-16').game,score:100},
 '2026-11-17':{game:p.missionForDay('2026-11-17').game,score:160},
 '2026-11-18':{game:p.missionForDay('2026-11-18').game,score:220}
 };
 const records=p.readDaily(store({[p.DAILY_STORE]:JSON.stringify(completed)}));
 const stats=p.dailyStats(records,'2026-11-19');
 assert.equal(stats.completed,3);
 assert.equal(stats.streak,3,'unfinished today continues previous streak');
 assert.equal(stats.lastSeven.length,7);
 assert.equal(p.dailyStats({...records,'2026-11-19':{game:'snowbike',score:300}},'2026-11-19').streak,4);
 assert.equal(p.dailyStats(records,'2026-11-20').streak,0);
});

test('Local game best statistics only count real positive or zero saved values',async()=>{
 const p=await load();
 assert.deepEqual(p.readBest(store({})),{snowTime:null,zombieScore:null});
 const value=p.readBest(store({
  'bicipark-snowbike-downhill-times-v1':JSON.stringify({'0':{time:44.5},'1':{time:37.2},'2':{time:null}}),
  'bicipark-zombiepedal-best-v1':JSON.stringify({score:1540,finished:true})
 }));
 assert.equal(value.snowTime,37.2);
 assert.equal(value.zombieScore,1540);
});

test('Explore page has fully labeled daily Play progress and JS is executable',()=>{
 const html=read('explora/index.html');
 for(const id of ['playMissions','playMissionTitle','playMissionSubtitle','playMissionStatus',
  'playMissionLink','playStreak','playWeekCount','playSnowRecord','playZombieRecord','playWeek']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/src="\.\/play-progress-ui\.js"/);
 for(const file of ['explora/play-progress.js','explora/play-progress-ui.js',
  'snowbike-downhill/app.js','zombiepedal/app.js'])
  execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
 assert.match(read('snowbike-downhill/app.js'),/recordDailyFinish\(result\)/);
 assert.match(read('zombiepedal/app.js'),/return recordDailyFinish\(\)/);
 assert.match(read('zombiepedal/app.js'),/game\.seed!==dailyChallenge\.seed/);
});
