'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
test('Homepage launches Ride rather than the older BikeJump challenge',()=>{
  const home=read('index.html');
  assert.match(home,/<a class="content-card" href="\.\/bike-jump-ride\/">/);
  assert.match(home,/<h4>BikeJump Ride · Circuit<\/h4>/);
  assert.doesNotMatch(home,/<a class="content-card" href="\.\/bike-jump\/">/);
});
test('Games catalogue presents Ride as featured and preserves the original Classic',()=>{
  const catalogue=read('explora/data/modules.js');
  assert.match(catalogue,/id: "bike-jump-ride",[\s\S]*?title: "BikeJump Ride · Circuit principal",[\s\S]*?href: "\.\.\/bike-jump-ride\/",[\s\S]*?status: "Destacat"/);
  assert.match(catalogue,/id: "bike-jump",[\s\S]*?title: "BikeJump clàssic · Salts",[\s\S]*?href: "\.\.\/bike-jump\/",[\s\S]*?status: "Clàssic"/);
  assert.ok(catalogue.indexOf('id: "bike-jump-ride"')<catalogue.indexOf('id: "bike-jump"'));
});
test('Both game entrypoints and links to the old game remain available',()=>{
  assert.ok(existsSync(join(root,'bike-jump-ride/index.html')));
  assert.ok(existsSync(join(root,'bike-jump/index.html')));
  const ride=read('bike-jump-ride/index.html');
  const classic=read('bike-jump/index.html');
  assert.match(ride,/href="\.\.\/bike-jump\/"/);
  assert.match(classic,/href="\.\.\/bike-jump-ride\/"/);
});
