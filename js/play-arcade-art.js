/* Original BiciPark pixel scenery; no third-party assets.
   Decorative rendering only: all collision geometry stays in existing engines. */
(function(){
 "use strict";
 const cache=new WeakMap();
 function box(c,x,y,w,h,col){
   c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
 }
 function seed(n){n=Math.imul(n^0x45d9f3b,0x45d9f3b);return(n^(n>>>16))>>>0;}
 function tree(c,x,y,h,snow=false){
   const q=Math.max(2,Math.round(h/19)),z=Math.round(h/2.9);
   const shades=snow?["#344f5b","#597d80","#a8c9c9","#e0f0e9"]:["#31494b","#52765c","#76966a","#b2b78c"];
   box(c,x-q,y-h*.45,q*2,h*.45,"#675a47");
   for(let i=0;i<11;i++){
    const depth=(i+1)/11,yy=y-h+i*q*1.45,ww=Math.round(z*(.20+depth*.80));
    box(c,x-ww,yy,ww*2,q*1.7,shades[0]);
    box(c,x-ww+q,yy+q*.3,Math.max(q,ww*1.52),q,shades[1]);
    if(i%3===0)box(c,x-ww+q,yy,Math.max(q,ww*1.25),q*.65,shades[2]);
    if(snow&&i%3!==2)box(c,x-ww+q*2,yy-q*.5,Math.max(q,ww*.9),q*.7,shades[3]);
   }
 }
 function surface(c,x,y,variant,theme="earth"){
   const a=seed(variant),col=theme==="snow"?["#c3dce0","#a1bec7","#e8f2ee"]:["#69583f","#a38b65","#bcaa79"];
   box(c,x,y,9+a%9,3,col[0]);box(c,x+3,y+4,5+a%6,2,col[1]);
   if(a%3===0)box(c,x+8,y+2,4,2,col[2]);
 }
 function industrial(c,w,h,ground){
   box(c,0,0,w,h,"#53626a");box(c,0,0,w,150,"#4c5960");
   box(c,0,150,w,100,"#697574");box(c,0,250,w,110,"#848879");
   const sunX=w*.85;box(c,sunX-28,72,56,56,"#efc78e");box(c,sunX-38,84,76,32,"#efc78e");
   for(let i=0;i<13;i++){
    const x=i*88,yy=210+seed(i)%75;
    box(c,x,yy,85,ground-yy,"#606c6c");box(c,x,yy,85,5,"#8c8c7e");
    box(c,x+10,yy+14,54,8,"#53605f");
   }
   for(let i=0;i<8;i++){
    const x=i*147-20,yy=ground-155-(seed(i+4)%55);
    box(c,x,yy,137,ground-yy,"#746f62");box(c,x,yy,137,8,"#a69b83");box(c,x,yy,5,ground-yy,"#434d4f");
    for(let j=0;j<4;j++)for(let k=0;k<2;k++){
     const xx=x+12+j*28,wy=yy+24+k*34;
     box(c,xx-2,wy-2,22,24,"#b3a38a");box(c,xx,wy,18,20,"#37454a");
     box(c,xx+2,wy+3,14,6,(i+j+k)%5===0?"#bcad79":"#5b6d70");box(c,xx+8,wy,2,20,"#766e62");
    }
    box(c,x+17,ground-48,47,48,"#374449");
    for(let k=0;k<6;k++)box(c,x+17,ground-45+k*7,47,2,"#667273");
    for(let k=0;k<10;k++){const v=seed(i*31+k);box(c,x+5+v%125,yy+8+(v>>>8)%Math.max(8,ground-yy-12),6,2,"#918c77");}
   }
   // Scrap-yard fence and road, separate from target collision surfaces.
   box(c,0,ground-27,w,3,"#333e40");box(c,0,ground-7,w,3,"#333e40");
   for(let x=0;x<w;x+=17){box(c,x,ground-29,3,28,"#414c4a");box(c,x+3,ground-26,2,18,"#a4aa8b");}
   box(c,0,ground,w,h-ground,"#494e4b");box(c,0,ground,w,7,"#a69d7c");
   for(let x=0;x<w;x+=45){box(c,x,ground+14,24,3,"#777970");box(c,x+17,ground+34,8,2,"#313b3d");}
 }
 function material(c,b,colors){
   const [base,light,edge]=colors,w=b.w,h=b.h;
   if(w<14||h<14)return;
   c.save();c.beginPath();c.rect(-w/2+4,-h/2+4,w-8,h-8);c.clip();
   if(b.material==="wood"){
    for(let y=-h/2+18;y<h/2-4;y+=10){
     box(c,-w/2+5,y,w-10,2,edge);box(c,-w/2+8,y+3,w*.42,2,light);
    }
   }else if(b.material==="steel"){
    for(let x=-w/2+8;x<w/2-7;x+=14)box(c,x,-h/2+15,3,h-24,"#748894");
    box(c,-w/2+4,h/2-11,w-8,4,edge);
   }else if(b.material==="glass"){
    for(let k=0;k<4;k++){
     const x=-w/2+8+k*9,y=-h/2+13+k*7;
     box(c,x,y,Math.max(3,Math.min(22,w/2)),3,light);
    }
   }
   c.restore();
 }
 function jumpScene(c,theme){
  const city=theme==="city",canyon=theme==="canyon";
  if(city){
   for(let i=0;i<8;i++){
    const x=i*145-12,y=350+(seed(i)%39),h=560-y;
    box(c,x,y,125,h,"#46596a");box(c,x,y,125,5,"#80918e");
    for(let a=12;a<110;a+=22)for(let b=14;b<h-10;b+=26){
     box(c,x+a,y+b,13,17,"#293c4b");
     box(c,x+a+2,y+b+2,9,10,(a+b+i)%4?"#788787":"#dbc58d");
    }
    box(c,x+10,y+96,105,5,"#9aa18e");
   }
  }else if(canyon){
   for(let i=0;i<16;i++){
    const x=i*70,y=410+(seed(i)%35);
    box(c,x,y,46,9,"#a86f57");box(c,x+5,y+9,29,4,"#d49870");
   }
  }else{
   for(let i=0;i<9;i++)tree(c,45+i*116,430+(i%3)*5,35+seed(i)%45,true);
  }
 }
 function pixelFrame(c){
  // Two inexpensive canvas blits, no readback. Downsample only action canvas,
  // never maps, photos, HTML controls or HUD labels (call before native HUD).
  const cv=c&&c.canvas,doc=cv&&cv.ownerDocument;
  if(!cv||!doc||typeof c.drawImage!=="function")return;
  try{
   let record=cache.get(cv);
   const w=Math.max(1,Math.floor(cv.width/2)),h=Math.max(1,Math.floor(cv.height/2));
   if(!record||record.buf.width!==w||record.buf.height!==h){
    const buf=doc.createElement("canvas");buf.width=w;buf.height=h;
    record={buf,ctx:buf.getContext("2d")};if(!record.ctx)return;cache.set(cv,record);
   }
   const b=record.ctx;b.imageSmoothingEnabled=false;b.clearRect(0,0,w,h);b.drawImage(cv,0,0,w,h);
   c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,cv.width,cv.height);
   c.drawImage(record.buf,0,0,cv.width,cv.height);c.restore();
  }catch{/* Graceful fallback to existing renderer. */}
 }
 window.BiciParkArcadeArt=Object.freeze({tree,surface,industrial,material,jumpScene,pixelFrame});
})();
