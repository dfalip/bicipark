'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'play-arcade-smoke');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');
 let file=path.resolve(root,rel);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
const games=[
 ['snowbike-downhill/index.html','snow','#gameCanvas','#startButton'],
 ['bike-jump-ride/index.html','ride','#gameCanvas','#playButton'],
 ['bike-jump/index.html','jump','#gameCanvas','#launchButton'],
 ['roda-rumble/index.html','rumble','#gameCanvas','#fireButton'],
 ['modules/bike-cannon/index.html','cannon','#bikeCannonCanvas','#launchButton'],
 ['bike-parking-puzzle/index.html','puzzle',null,null],
 ['zombiepedal/index.html','zombie','#city','#play']
];
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync(out,{recursive:true});
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   for(const [url,theme,canvas,action] of games){
    const page=await browser.newPage({viewport,deviceScaleFactor:1,hasTouch:viewport.width<500});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/'+url,{waitUntil:'domcontentloaded'});
    if(theme==='zombie'){
     await page.locator('#city').waitFor();
     assert.ok(await page.locator('h1').textContent().then(s=>s.includes('ARCADE CITY')));
     assert.equal(await page.locator('a[href*="classic.html"]').count(),0);
    }else{
     await page.locator('body[data-play-arcade="'+theme+'"]').waitFor();
     assert.ok(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--pa-gold').trim()),theme+' shared CSS must be active');
    }
    if(canvas){
     const el=page.locator(canvas);
     await el.waitFor({state:'visible'});
     await page.waitForFunction(sel=>{
      const cv=document.querySelector(sel);if(!cv?.width||!cv.height)return false;
      const ctx=cv.getContext('2d');if(!ctx)return false;
      const d=ctx.getImageData(0,0,cv.width,cv.height).data;
      const colors=new Set();for(let i=0;i<d.length;i+=64){colors.add(d[i]*65536+d[i+1]*256+d[i+2]);if(colors.size>25)return true;}
      return false;
     },canvas,{timeout:12000});
     if(theme!=='zombie')assert.ok(await page.evaluate(()=>typeof window.BiciParkArcadeArt?.pixelFrame==='function'));
     if(action&&await page.locator(action).isVisible()&&await page.locator(action).isEnabled()){
       await page.locator(action).click();await page.waitForTimeout(250);
     }
     await el.screenshot({path:path.join(out,theme+'-'+viewport.width+'.png')});
    }else{
     await page.locator('#board .tile').first().waitFor();
     assert.ok(await page.locator('#board .tile').count()>0);
     assert.ok(await page.locator('#board .bike').count()>=2);
     await page.locator('#board').screenshot({path:path.join(out,theme+'-'+viewport.width+'.png')});
    }
    assert.deepEqual(errors,[],theme+' '+viewport.width+' runtime errors');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),theme+' overflow');
    await page.close();console.log('Arcade smoke passed:',theme,viewport.width);
   }
  }
 }finally{if(browser)await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
