'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/world-bike.js');

function response(){
  return {
    statusCode:200,
    headers:{},
    setHeader(name,value){this.headers[name.toLowerCase()]=value;},
    end(text){this.data=JSON.parse(text);}
  };
}
async function invoke(url,method='GET'){
  const res=response();
  await handler({url,method},res);
  return res;
}
test('World gateway refuses unsafe coords, unsupported providers and non-GET methods',async()=>{
  const r1=await invoke('/api/world-bike?lat=100&lng=2');
  assert.equal(r1.statusCode,400);
  assert.equal(r1.data.code,'INVALID_COORDS');
  const r2=await invoke('/api/world-bike?lat=41&lng=2&provider=https://evil.example');
  assert.equal(r2.statusCode,400);
  assert.equal(r2.data.code,'INVALID_PROVIDER');
  const r3=await invoke('/api/world-bike?lat=41&lng=2','POST');
  assert.equal(r3.statusCode,405);
  assert.equal(r3.headers.allow,'GET');
});
test('World gateway sends a bounded query server-side and returns attributable OSM data',async()=>{
  const previous=global.fetch;
  let requests=0;
  try{
    global.fetch=async (url,opts)=>{
      requests+=1;
      assert.match(url,/^https:\/\/overpass\.private\.coffee\/api\/interpreter$/);
      assert.equal(opts.method,'POST');
      assert.match(String(opts.body),/data=/);
      assert.match(new URLSearchParams(String(opts.body)).get('data'),/around:900,41\.389,2\.170/);
      return {
        ok:true,status:200,headers:{get:()=>null},
        text:async()=>JSON.stringify({
          elements:[{type:'node',id:5,lat:41.389,lon:2.17,tags:{amenity:'bicycle_parking'}}],
          osm3s:{timestamp_osm_base:'2026-11-14T13:00:00Z'}
        })
      };
    };
    const res=await invoke('/api/world-bike?lat=41.38902&lng=2.16996');
    assert.equal(res.statusCode,200);
    assert.equal(res.data.ok,true);
    assert.equal(res.data.elements.length,1);
    assert.equal(res.data.provider,'Private.coffee');
    assert.deepEqual(res.data.queriedCenter,{lat:41.38902,lng:2.16996});
    assert.match(res.headers['cache-control'],/s-maxage=600/);
    assert.equal(requests,1);
  }finally{global.fetch=previous;}
});
test('World gateway keeps upstream failures visible and never converts them into empty success',async()=>{
  const previous=global.fetch;
  try{
    global.fetch=async ()=>({ok:false,status:429,headers:{get:()=>null}});
    const res=await invoke('/api/world-bike?lat=-33.87&lng=151.20&provider=secondary');
    assert.equal(res.statusCode,503);
    assert.equal(res.data.ok,false);
    assert.equal(res.data.code,'UPSTREAM_HTTP');
    assert.equal(res.data.upstreamStatus,429);
    assert.equal(res.data.provider,'FOSSGIS');
    const repeat=await invoke('/api/world-bike?lat=-33.87&lng=151.20&provider=secondary');
    assert.equal(repeat.statusCode,429);
    assert.equal(repeat.data.code,'RECENT_FAILURE');
  }finally{global.fetch=previous;}
});
test('World gateway fails closed when an upstream returns HTML or invalid data',async()=>{
  const previous=global.fetch;
  try{
    global.fetch=async ()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>'<html>Busy</html>'});
    const res=await invoke('/api/world-bike?lat=35.68&lng=139.65');
    assert.equal(res.statusCode,503);
    assert.equal(res.data.code,'UPSTREAM_INVALID_DATA');
  }finally{global.fetch=previous;}
});

test('World gateway diagnostics never log exact or rounded user coordinates',async()=>{
  const previous=global.fetch, info=console.info;
  const logs=[];
  try{
    console.info=message=>logs.push(String(message));
    global.fetch=async()=>({ok:false,status:503,headers:{get:()=>null}});
    const res=await invoke('/api/world-bike?lat=53.34984&lng=-6.26031');
    assert.equal(res.statusCode,503);
    assert.equal(logs.length,1);
    const metric=JSON.parse(logs[0]);
    assert.equal(metric.event,'world-bike.provider');
    assert.equal(metric.provider,'Private.coffee');
    assert.equal(metric.outcome,'UPSTREAM_HTTP');
    assert.doesNotMatch(logs[0],/53\\.34|6\\.26|lat|lng|coords|ipAddress/i);
  }finally{global.fetch=previous;console.info=info;}
});

test('World gateway preserves distinct nearby search centres instead of aliasing 3-decimal buckets',async()=>{
  const previous=global.fetch;
  const centres=[];
  try{
    global.fetch=async (_url,opts)=>{
      centres.push(new URLSearchParams(String(opts.body)).get('data'));
      return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({elements:[]})};
    };
    const first=await invoke('/api/world-bike?lat=48.85661&lng=2.35221');
    const second=await invoke('/api/world-bike?lat=48.85699&lng=2.35249');
    assert.equal(first.statusCode,200);
    assert.equal(second.statusCode,200);
    assert.equal(centres.length,2);
    assert.match(centres[0],/around:900,48\\.85661,2\\.35221/);
    assert.match(centres[1],/around:900,48\\.85699,2\\.35249/);
    assert.notDeepEqual(first.data.queriedCenter,second.data.queriedCenter);
  }finally{global.fetch=previous;}
});
