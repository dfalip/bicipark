const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Arcade City is the canonical public game; classic is unlisted and noindex',()=>{
 const main=read('zombiepedal/index.html'),arcade=read('zombiepedal/arcade.html'),classic=read('zombiepedal/classic.html');
 assert.equal(main,arcade);assert.match(main,/id="city"/);assert.doesNotMatch(main,/Versió original|classic\.html/);
 assert.match(classic,/noindex,nofollow/);assert.match(classic,/id="gameCanvas"/);
 const catalog=read('explora/data/modules.js');
 assert.equal([...catalog.matchAll(/id: "zombiepedal[^"]*"/g)].length,1);
 assert.match(catalog,/id: "zombiepedal"[\s\S]*?title: "ZombiePedal · Arcade City"/);
});
