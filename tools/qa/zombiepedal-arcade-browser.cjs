'use strict';
// A real-browser smoke run, separate from core Node tests. The server is local,
// has no external dependencies, and does not expose credentials.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');
 const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync(path.join(root,'arcade-smoke'),{recursive:true});
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1,hasTouch:viewport.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',res=>{if(res.status()>=400)errors.push(res.status()+' '+res.url());});
   const url='http://127.0.0.1:'+server.address().port+'/zombiepedal/arcade.html';
   await page.goto(url);await page.locator('#city').waitFor();
   await page.locator('#play').click();
   await page.waitForTimeout(220);
   assert.equal(await page.locator('#overlay').isVisible(),false);
   await page.screenshot({path:path.join(root,'arcade-smoke',viewport.width+'-game.png'),fullPage:true});
   const box=await page.locator('#city').boundingBox();
   assert.ok(box.width>300&&Math.abs(box.width/box.height-16/9)<.03);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'No horizontal overflow');
   const pixels=await page.locator('#city').evaluate(c=>{
    const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const colors=new Set();let nonblack=0;
    for(let i=0;i<data.length;i+=16){colors.add((data[i]<<16)|(data[i+1]<<8)|data[i+2]);if(data[i]+data[i+1]+data[i+2]>30)nonblack++;}
    return {colors:colors.size,nonblack};
   });
   assert.ok(pixels.colors>=40&&pixels.nonblack>10000,'Detailed, non-blank arcade scene');
   const ammo=await page.locator('#ammo').textContent();
   // Buttons work on both a touch-sized viewport and desktop with native events.
   await page.keyboard.press('ArrowUp');
   await page.keyboard.press('KeyX');
   await page.waitForTimeout(200);
   assert.notEqual(await page.locator('#ammo').textContent(),ammo,'A real shot consumes paint');
   await page.keyboard.press('Space');
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#phase').textContent(),"EN L'AIRE");
   await page.locator('#pause').click();
   assert.equal(await page.locator('#overlay').isVisible(),true);
   assert.equal(await page.locator('#phase').textContent(),'PAUSA');
   await page.locator('#play').click();
   await page.locator('#reset').click();
   await page.locator('#mode').selectOption('endless');
   assert.match(await page.locator('#overlayTitle').textContent(),/SUPERVIVÈNCIA/);
   await page.locator('#play').click();
   await page.locator('[data-action="down"]').click();
   await page.locator('#pause').click();
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('Browser smoke passed:',viewport.width+'x'+viewport.height,'colors',pixels.colors);
  }
 }finally{if(browser)await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
