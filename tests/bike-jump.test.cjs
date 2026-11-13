'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const gameDir = path.resolve(__dirname, '..', 'bike-jump');
function source(file) {
  return readFileSync(path.join(gameDir, file), 'utf8');
}
function asModule(file) {
  const uri = 'data:text/javascript;base64,' + Buffer.from(source(file)).toString('base64');
  return import(uri);
}
const modules = Promise.all([asModule('physics.js'), asModule('levels.js')]);

test('BikeJump v2 modules remain valid JavaScript and UI controls exist', () => {
  for (const file of ['app.js', 'physics.js', 'levels.js']) {
    execFileSync(process.execPath, ['--check', path.join(gameDir, file)], {stdio: 'pipe'});
  }
  const html = source('index.html');
  for (const id of ['gameCanvas','launchButton','runProgressTrack','jumpFeedback','jumpStars','gameSummary','nextAttemptButton']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'Missing expected game element ' + id);
  }
});

test('Trampolí: start and finish align with the configured level', async () => {
  const [{getInrunPosition}, {levels}] = await modules;
  const level = levels[0];
  assert.deepEqual(getInrunPosition(level,0), level.startPoint);
  assert.deepEqual(getInrunPosition(level,1), level.takeoffPoint);
  assert.deepEqual(getInrunPosition(level,-10), level.startPoint);
});

test('An accurate takeoff is rewarded but early releases still produce a finite launch', async () => {
  const [{launchBike}, {levels}] = await modules;
  const level = levels[0];
  const ideal = launchBike({level,progress:level.idealTakeoffProgress,power:1,wind:0});
  const early = launchBike({level,progress:0.4,power:0.5,wind:0});
  assert.equal(ideal.takeoffAccuracy,1);
  assert.ok(early.takeoffAccuracy < ideal.takeoffAccuracy);
  assert.ok(ideal.velocityX > early.velocityX);
  assert.ok(Number.isFinite(early.velocityY));
});

test('Control is gentle but manual steering still changes the bike angle', async () => {
  const [{integrateFlight,getLandingAngle}, {levels}] = await modules;
  const level = levels[0];
  const initial = {x:550,y:220,velocityX:0,velocityY:0,rotation:0.86,angularVelocity:0,controlEffort:0,flightTime:0};
  const neutral = {...initial};
  const steer = {...initial};
  const errorBefore = Math.abs(initial.rotation - getLandingAngle(level,initial.x));
  for(let i=0;i<60;i++) {
    integrateFlight({bike:neutral,level,deltaSeconds:1/60,rotationInput:0,wind:0});
    integrateFlight({bike:steer,level,deltaSeconds:1/60,rotationInput:-1,wind:0});
  }
  const errorAfter = Math.abs(neutral.rotation - getLandingAngle(level,neutral.x));
  assert.ok(errorAfter < errorBefore, 'Passive assist should gently reduce a big angle error');
  assert.ok(steer.rotation < neutral.rotation - 0.05, 'Player steering must remain meaningful');
  assert.ok(Math.abs(steer.angularVelocity) <= 1.5);
});

test('Landing classes remain ordered and forgiving without treating a crash as a success', async () => {
  const [{evaluateLanding,getLandingAngle}, {levels}] = await modules;
  const level=levels[0], x=620;
  const slope=getLandingAngle(level,x);
  const at=delta=>evaluateLanding({level,bike:{x,rotation:slope+delta}});
  assert.equal(at(0.08).score,2000);
  assert.equal(at(0.23).score,1450);
  assert.equal(at(0.40).score,650);
  assert.equal(at(0.75).crashed,true);
});

test('New feedback is backed by labels and accessible controls', () => {
  const js=source('app.js');
  const css=source('styles.css');
  assert.match(js, /state\.gameStartingRecord/);
  assert.match(js, /state\.flightTrail\.push/);
  assert.match(js, /function drawLandingEffect/);
  assert.match(js, /function draw\(\)/);
  assert.match(css, /bike-jump-feedback\[hidden\]/);
  assert.match(source('index.html'), /aria-live="polite"/);
});
