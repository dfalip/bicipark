const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('backup preserves My Bike/Passport, rejects foreign keys, and restores all supported data',()=>{
 const dom=new JSDOM('',{url:'https://bicipark.test',runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync('modules/account/state.js','utf8'));
 const key='bicipark.myBike.v1';w.localStorage.setItem(key,JSON.stringify({bikes:[{id:'BP-1'}]}));w.localStorage.setItem('bicipark.passport.proofs.v1',JSON.stringify({version:1,proofs:[]}));
 const data=w.BiciParkState.snapshot();assert.ok(data[key]);assert.throws(()=>w.BiciParkState.restore({'supabase.auth.token':'{}'}));assert.throws(()=>w.BiciParkState.restore({[key]:'[]'}));w.BiciParkState.restore({});assert.equal(w.localStorage.getItem(key),null);w.BiciParkState.restore(data);assert.equal(w.localStorage.getItem(key),data[key]);dom.window.close();
});
test('catalog has unique entries, local tracks exist, bases retain explicit unverified status',()=>{
 const routes=JSON.parse(fs.readFileSync('route-explorer/data/catalog.json','utf8'));assert.equal(routes.length,25);assert.equal(new Set(routes.map(r=>r.id)).size,25);
 const local=JSON.parse(fs.readFileSync('route-explorer/data/routes.json','utf8'));assert.equal(local.length,12);for(const r of local){const file=r.geometryFile.startsWith('/')?r.geometryFile.slice(1):require('path').join('route-explorer',r.geometryFile);assert.ok(fs.existsSync(file),file)}
 const bases=JSON.parse(fs.readFileSync('bike-bases/data/bike-bases.json','utf8'));assert.equal(bases.bases.length,12);for(const b of bases.bases){const d=JSON.parse(fs.readFileSync(require('path').join('bike-bases',b.dataFile),'utf8'));assert.equal(d.status.verified,false);assert.ok(d.sources.length)}
});
