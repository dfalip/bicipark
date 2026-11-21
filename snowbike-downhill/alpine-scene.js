/* Alpine Adventure — oblique scrolling camera, separate from simulation.
 * All hazards and gates use one world-to-screen projection. Artwork never scores.
 * Original assets drawn at gameplay resolution, no static reference screenshot. */
(function(){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const hash=n=>{n=Math.imul(n^0x45d9f3b,0x45d9f3b);return (n^(n>>>16))>>>0;};
const W=960,H=540;
function terrain(at){return Math.sin(at/82)*19+Math.sin(at/41)*7+Math.sin(at/203)*23;}
function project(g,at,lane=0){
 const d=at-g.distance;
 return {x:269+d*2.32+lane*24,y:345+d*.19+terrain(at)-terrain(g.distance)+lane*67,scale:clamp(1+lane*.12,.76,1.19)};
}
function path(c,pts,col,stroke,w=1){
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=col;c.fill();
 if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin="round";c.stroke();}
}
function stroke(c,pts,col,w=1){
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineCap="round";c.lineJoin="round";c.stroke();
}
function oval(c,x,y,rx,ry,col,outline,w=1){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=col;c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=w;c.stroke();}
}
function grad(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);for(const [t,k] of stops)g.addColorStop(t,k);return g;}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
function ridge(x,seed,h){
 const n=k=>((hash(k+seed*79)%1000)/1000-.5);
 const i=Math.floor(x/155),t=x/155-i,peak=1-Math.abs(t-.49)*2;
 return h-peak*(100+n(i)*70)+Math.sin(x/19)*8+Math.sin(x/7.2)*4+n(Math.floor(x/8))*5;
}
const landscapeCache=new WeakMap();
function makeSky(c,w,h){
 c.fillStyle=grad(c,0,0,0,h,[[0,"#258fe0"],[.5,"#9cddff"],[1,"#d6eef8"]]);c.fillRect(0,0,w,h);
 const sun=c.createRadialGradient(790,69,4,790,69,92);sun.addColorStop(0,"#ffffff");sun.addColorStop(.23,"#fff7c6cc");sun.addColorStop(1,"#fff9d000");c.fillStyle=sun;c.fillRect(690,0,200,174);
 oval(c,790,69,17,17,"#fffbed");
 for(let i=0;i<12;i++){const x=hash(i+5)%w,y=22+hash(i+40)%80;oval(c,x,y,39,9,"#e4f6ff");oval(c,x+4,y-5,21,12,"#fffdf8");oval(c,x+25,y+3,28,6,"#d5eafa");}
 for(const [j,base,rock,shade,snow] of [[0,171,"#699cc9","#497eaf","#f0faff"],[1,222,"#407fb6","#315d97","#e2f3ff"],[2,260,"#2a6597","#24466f","#d1e5f5"]]){
  const pts=[];for(let x=-50;x<=w+50;x+=5)pts.push([x,ridge(x+j*93,j+8,base)]);
  path(c,[...pts,[w+52,h],[-52,h]],rock);
  for(let i=0;i<pts.length-5;i+=4){const [x,y]=pts[i],p=pts[i+4];path(c,[[x,y],[p[0],p[1]],[p[0]+35,base+70],[x+11,base+43]],i%3===0?shade:rock);if(y<base-38)path(c,[[x,y],[p[0],p[1]],[p[0]+7,Math.min(base-13,p[1]+46)],[x+3,Math.min(base-16,y+26)],[x-5,Math.min(base-12,y+36)]],snow);}
  for(let i=0;i<85;i++){const x=hash(i+j*200)%w,y=ridge(x+j*93,j+8,base)+12+hash(i+32)%75;stroke(c,[[x,y],[x+8+hash(i)%13,y+13+hash(i+19)%19]],i%2===0?"#edf7fc55":"#193b6c32",1.5);}
 }
 const far=window.BiciParkPremiumArt;
 if(far)for(let i=0;i<73;i++){const x=i*17-30,y=316+Math.sin(i*.2)*22;far.pine(c,x,y,26+hash(i+28)%42,true);}
}
function background(c,g){
 // Cache the mountain painting per canvas; the terrain & forest scroll independently.
 const cv=c.canvas,doc=cv?.ownerDocument;let cached=cv&&landscapeCache.get(cv);
 if(!cached&&doc){
  try{const image=doc.createElement("canvas");image.width=1040;image.height=H;const cc=image.getContext("2d");if(cc){makeSky(cc,1040,H);cached=image;landscapeCache.set(cv,image);}}catch{}
 }
 if(cached){const offset=clamp((g.distance/g.course.length)*79,0,79);c.drawImage(cached,-offset,0);}
 else makeSky(c,W,H);
 const art=window.BiciParkPremiumArt;
 // Resort ledge and waterfall are painted on the same rock mass.
 const off=(g.distance*.09)%220,x=690-off,y=253;
 path(c,[[x-58,y+18],[x+213,y+18],[x+182,y+118],[x+18,y+132],[x-51,y+75]],"#456d94");
 path(c,[[x-58,y+18],[x+213,y+18],[x+194,y+29],[x+13,y+35],[x-58,y+29]],"#eaf7ff");
 for(let i=0;i<9;i++){const xx=x-40+i*28;path(c,[[xx,y+26],[xx+18,y+24],[xx+8,y+108],[xx-6,y+89]],i%2?"#7896b7":"#395b85");}
 path(c,[[x+101,y+22],[x+127,y+20],[x+114,y+110],[x+81,y+130],[x+72,y+120],[x+96,y+87]],"#52baf0");
 for(let i=0;i<8;i++){const run=(g.time*79+i*14)%92,xx=x+105+i%3*6-run*.145;stroke(c,[[xx,y+27+run],[xx-5,y+41+run]],i%2?"#e4fbff":"#94e4ff",2.4);}
 for(let i=0;i<3;i++){const xx=x-19+i*63;rect(c,xx,y-20,47,40,"#895038");for(let j=0;j<4;j++)rect(c,xx,y-17+j*8,47,2,"#bc855a");path(c,[[xx-6,y-20],[xx+22,y-43],[xx+54,y-20],[xx+47,y-17],[xx+22,y-33],[xx,y-17]],"#f3fcff","#476e94",1.4);for(const k of [5,28]){rect(c,xx+k,y-11,12,14,"#452e34");rect(c,xx+k+2,y-9,8,9,"#ffe398");}}
 stroke(c,[[x-284,y+13],[x+198,y-82]],"#304a67",1.8);
 for(let i=0;i<3;i++){const d=(i*154+g.time*9)%480,xx=x-284+d,yy=y+13-d*95/482;stroke(c,[[xx,yy],[xx,yy+8]],"#193951",1.4);rect(c,xx-9,yy+8,18,14,"#b9273d");rect(c,xx-6,yy+10,12,7,"#7cdbf4");rect(c,xx-7,yy+22,14,2,"#4a4059");}
 if(art)for(let i=0;i<14;i++){const xx=i*86-(g.distance*.42%86)-15;art.pine(c,xx,304+Math.sin(i*.86)*16,72+hash(i+32)%40,true,i);}
}
function piste(c,g){
 const far=[],near=[],groundStart=g.distance-190,groundEnd=g.distance+370;
 for(let at=groundStart;at<=groundEnd;at+=5){const p=project(g,at,-1.2),q=project(g,at,1.2);far.push([p.x,p.y]);near.push([q.x,q.y]);}
 // Rocky drop beneath the near edge — continuous, not a floating white rectangle.
 path(c,[...near,[near.at(-1)[0],H+100],[near[0][0],H+100]],grad(c,0,350,0,H,[[0,"#7794ba"],[.48,"#475376"],[1,"#283956"]]));
 for(let at=Math.floor(groundStart/19)*19;at<=groundEnd;at+=19){
  const p=project(g,at,1.2),k=hash(at);const depth=25+k%50;
  path(c,[[p.x-24,p.y+3],[p.x+14,p.y+3],[p.x+25,p.y+depth],[p.x-12,p.y+depth+16]],k%2?"#879ab1":"#596a8e");
  stroke(c,[[p.x-20,p.y+7],[p.x-9,p.y+depth-4],[p.x+10,p.y+depth]],"#36476d",1.5);
  path(c,[[p.x-16,p.y+3],[p.x+17,p.y+3],[p.x+8,p.y+17],[p.x-7,p.y+14]],"#d8eaff");
 }
 const surface=grad(c,0,240,0,500,[[0,"#adc9ec"],[.22,"#e3f2fd"],[.51,"#fcffff"],[.8,"#d5e7fa"],[1,"#a4c5ea"]]);
 path(c,[...far,...near.slice().reverse()],surface,"#daeefe",2);
 c.save();c.clip();
 for(let at=Math.floor(groundStart/7)*7;at<groundEnd;at+=7){const k=hash(at+828),lane=(k%210)/100-1.05,p=project(g,at,lane);
  const l=11+k%35;stroke(c,[[p.x-l,p.y-1],[p.x,p.y+1]],k%3===0?"#f9ffff":"#accbee88",1+(k%3));
  if(k%3===0){stroke(c,[[p.x+3,p.y+3],[p.x+15,p.y+5]],"#7fa6d22e",2);}
 }
 for(const lane of [-.51,.51]){const arr=[];for(let at=groundStart;at<=groundEnd;at+=8){const p=project(g,at,lane);arr.push([p.x,p.y]);}stroke(c,arr,"#8eb7df53",2);stroke(c,arr.map(([x,y])=>[x,y+3]),"#ffffff94",1);}
 c.restore();
 stroke(c,far,"#d5e6fe",7);stroke(c,near,"#f9ffff",9);stroke(c,near.map(([x,y])=>[x,y+6]),"#9ebcdd",3);
}
function gate(c,g,a){
 const left=project(g,a.at,a.lane-.48),right=project(g,a.at,a.lane+.48),center=project(g,a.at,a.lane);
 stroke(c,[[left.x,left.y],[right.x,right.y]],"#3d79aeaa",2);
 for(const [pos,color] of [[left,"#ef3d46"],[right,"#287fdb"]]){
  stroke(c,[[pos.x,pos.y+4],[pos.x,pos.y-48]],"#344d66",3.6);
  stroke(c,[[pos.x+1,pos.y-46],[pos.x+1,pos.y-11]],"#e3eef4",.9);
  path(c,[[pos.x,pos.y-48],[pos.x+28,pos.y-42],[pos.x+24,pos.y-28],[pos.x,pos.y-32]],color,"#f4f4ee",1.2);
  stroke(c,[[pos.x+7,pos.y-45],[pos.x+14,pos.y-33]],"#ffffff88",2);
 }
 // Only the next gate gets an on-track label; no stacked number wall.
 if(g.course.gates.find(p=>!p.passed)===a){
  c.save();c.textAlign="center";c.font="900 12px system-ui";c.fillStyle="#213a61";c.fillText("PORTA "+(a.id+1),center.x+8,Math.min(left.y,right.y)-55);c.restore();
 }
}
function furEdge(cx,cy,rx,ry,k=0){let pts=[];for(let i=0;i<48;i++){const a=i*TAU/48,r=i%2?1.03:.86+(hash(i+k)%12)/100;pts.push([cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r]);}return pts;}
function yeti(c,a,time){
 const t=time*8+(a.stride||0),walk=Math.sin(t),col="#ddeefa",outline="#354566";
 // Feet and heavy arms swing in opposing phases, anchored to the body.
 for(const sign of [-1,1]){
  const foot=sign*14+sign*walk*10;
  path(c,[[sign*10,-31],[sign*22,-24],[foot+10,-1],[foot-8,5],[sign*3,-14]],"#a1c0d7",outline,2);
  oval(c,foot+4,0,13,6,"#647e9c",outline,1.5);
  for(let j=0;j<3;j++)stroke(c,[[foot+j*4,-1],[foot+j*4+1,3]],"#bfd4e5",1);
  const fistX=sign*(38+walk*6),fistY=-26+sign*walk*13;
  stroke(c,[[sign*20,-66],[sign*32,-46],[fistX,fistY]],outline,20);
  stroke(c,[[sign*20,-66],[sign*32,-46],[fistX,fistY]],"#c3dcec",15);
  path(c,furEdge(sign*32,-45,12,18,5),col);
  oval(c,fistX,fistY,11,12,"#647b9a",outline,2);
  for(let j=0;j<3;j++)oval(c,fistX-6+j*6,fistY-8,3.5,5,"#425876");
 }
 path(c,furEdge(0,-47,33,42,7),outline);
 path(c,furEdge(-1,-49,30,38,7),grad(c,-35,-85,25,-20,[[0,"#ffffff"],[.42,"#e7f5ff"],[1,"#80abc9"]]));
 for(let i=0;i<24;i++){let x=(hash(i+17)%44)-22,y=-31-(hash(i+71)%44);stroke(c,[[x,y],[x+3,y+6],[x+7,y+4]],i%2?"#f7fcff":"#90b5d0",1.7);}
 path(c,furEdge(1,-87,24,26,13),outline);path(c,furEdge(0,-89,21,23,13),"#f1faff");
 path(c,[[-17,-94],[-10,-101],[7,-100],[17,-93],[15,-80],[9,-74],[-7,-74],[-16,-82]],"#5487ad",outline,1.4);
 path(c,[[-13,-94],[-3,-90],[-12,-87]],"#192f4a");path(c,[[13,-94],[3,-90],[12,-87]],"#192f4a");
 oval(c,-8,-91,3.3,2.4,"#7eedff");oval(c,8,-91,3.3,2.4,"#7eedff");
 path(c,[[-9,-83],[9,-83],[8,-75],[0,-72],[-8,-76]],"#8b3349","#25324c",1.4);
 path(c,[[-8,-83],[-3,-83],[-5,-78],[1,-83],[7,-83],[5,-77]],"#faffff");
}
function wildlife(c,a,time){
 const species=a.label,fox=species==="Guineu",rabbit=species==="Conill",goat=species==="Cabra";
 const col=rabbit?"#efe9dc":fox?"#d57937":goat?"#ccc9bb":"#b17a43",dark=rabbit?"#94939a":fox?"#833e2c":goat?"#696e79":"#6e4733";
 const walk=Math.sin(time*(rabbit?13:10)+(a.stride||0)),bob=Math.abs(walk)*(rabbit?6:2);
 c.save();c.translate(0,-bob);if(rabbit)c.scale(.67,.67);
 // Separate haunch, neck and articulated legs rather than oval with sticks.
 if(fox)path(c,[[-17,-25],[-37,-38],[-53,-34],[-49,-20],[-31,-16],[-15,-18]],dark,"#493c39",1.5);
 if(fox)path(c,[[-44,-34],[-53,-34],[-49,-20],[-40,-21]],"#fff2df");
 if(!fox)path(c,[[-23,-23],[-32,-28],[-30,-18],[-20,-15]],col,dark,1.5);
 for(let i=0;i<4;i++){const base=i<2?-14:14,dir=i%2?1:-1,foot=base+dir*walk*10,y=-1+(i%2?2:0);stroke(c,[[base,-18],[base+dir*walk*5,-9],[foot,y]],"#4c4040",i%2?4:5);stroke(c,[[base,-18],[base+dir*walk*5,-9]],dark,4);stroke(c,[[foot-3,y],[foot+3,y]],"#252d38",2.4);}
 path(c,[[-27,-27],[-17,-37],[9,-35],[22,-31],[20,-18],[6,-13],[-18,-15],[-26,-22]],col,"#493c39",1.7);
 path(c,[[-22,-29],[-13,-34],[8,-32],[16,-27],[3,-22],[-16,-24]],fox?"#ed9c53":rabbit?"#fffdfa":goat?"#ebe5d5":"#ddaa67");
 path(c,[[11,-32],[15,-47],[22,-49],[29,-39],[19,-20],[10,-19]],col,"#493c39",1.5);
 path(c,[[22,-49],[35,-47],[42,-41],[37,-35],[25,-37],[20,-42]],col,"#493c39",1.5);
 stroke(c,[[33,-37],[40,-40]],"#f4dfb7",2.2);oval(c,33,-45,2.4,2.4,"#1c2633");oval(c,33.5,-45.5,.7,.7,"#fff");
 for(const s of [-1,1]){
  const x=24+s*4;
  if(species==="Cérvol"){
   stroke(c,[[x,-48],[x+s*5,-60],[x+s*3,-72]],"#6d4531",2.5);
   stroke(c,[[x+s*5,-61],[x+s*11,-66],[x+s*12,-72]],"#805439",2.1);
   stroke(c,[[x+s*3,-67],[x+s*8,-70]],"#805439",1.8);
  }else if(goat)stroke(c,[[x,-47],[x+s*5,-58],[x+s*8,-62]],"#d8c6a3",3);
  else path(c,[[x-3,-47],[x-4,-(rabbit?78:61)],[x+5,-(rabbit?73:58)],[x+6,-49]],col,"#5b4c49",1.4);
 }
 if(goat)path(c,[[31,-37],[36,-37],[33,-27],[28,-35]],"#c1b3a2");
 c.restore();
}
function animal(c,g,a,p){
 c.save();c.translate(p.x,p.y);const sc=p.scale*(a.kind==="yeti"?1.04:.94);c.scale(sc,sc);
 oval(c,0,4,a.kind==="yeti"?39:29,7,"#233d6655");
 if(a.kind!=="yeti"&&a.side<0)c.scale(-1,1);
 if(a.kind==="yeti")yeti(c,a,g.time);else wildlife(c,a,g.time);
 c.restore();
 // Early warning badges only for real moving encounters close enough to affect play.
 const delta=a.at-g.distance;
 if(delta>=-5&&delta<65&&Math.abs(a.x)<1.3){
  c.save();c.translate(p.x,p.y-(a.kind==="yeti"?125:76)*sc);
  path(c,[[0,-10],[-13,11],[13,11]],"#ffd768","#503a2d",1.6);rect(c,-1.5,-4,3,8,"#45321f");oval(c,0,7,1.6,1.6,"#45321f");c.restore();
 }
}
function drawHero(c,g,scale){
 c.save();c.scale(scale,scale);
 const ink="#15263a",dark="#273949",blue="#0d79b9",cyan="#69d2ee",orange="#e54b1b";
 const spin=g.distance*.12,air=!g.grounded;
 // Rear snow tyre: layered carcass, 24 moving cleats, spokes, rim and hub.
 c.save();c.translate(-35,8);c.rotate(spin);
 oval(c,0,0,20,20,"#142235",ink,2);
 for(let i=0;i<24;i++){const a=i*TAU/24;c.save();c.rotate(a);path(c,[[-3,-21],[3,-21],[4,-17],[-4,-17]],i%3===0?"#bacdd7":"#425265",ink,.7);c.restore();}
 oval(c,0,0,15,15,"#244259","#8cb6d6",2.6);
 oval(c,0,0,11.9,11.9,"#304653","#4e758d",1);
 for(let i=0;i<16;i++){const a=i*TAU/16;stroke(c,[[Math.cos(a)*4,Math.sin(a)*4],[Math.cos(a+.17)*13,Math.sin(a+.17)*13]],i%2?"#b9d6e2":"#627c9c",.85);}
 oval(c,0,0,5,5,"#8299aa","#283c56",1.3);oval(c,0,0,2,2,"#c6e4ec");c.restore();
 // Chassis: dark back triangle, solid downhill down-tube, head tube, skid plate.
 stroke(c,[[-35,8],[-20,-19],[-6,6],[-35,8]],ink,8);
 stroke(c,[[-35,8],[-20,-19],[-6,6],[-35,8]],"#2877ac",4.8);
 path(c,[[-23,-20],[22,-27],[26,-18],[4,12],[-13,17],[-26,5]],ink,ink,1);
 path(c,[[-20,-18],[21,-25],[22,-19],[4,7],[-12,12],[-19,3]],grad(c,-23,-25,19,16,[[0,"#57d6ff"],[.35,"#198ed0"],[1,"#124776"]]));
 path(c,[[-14,-8],[-3,-14],[2,-10],[11,-15],[7,-5],[-2,1]],"#d4f5ff");
 path(c,[[-8,12],[5,8],[-1,16],[-13,21],[-24,12]],"#33475f",ink,1);
 oval(c,-6,6,7,7,"#243947","#b4cad4",1.2);oval(c,-6,6,2,2,"#dcecf3");stroke(c,[[-35,9],[-6,9]],"#a9b8c0",1.2);
 // Gold telescopic fork reaching the actual ski pivot.
 stroke(c,[[22,-25],[39,11]],ink,9);
 stroke(c,[[22,-25],[31,-4]],"#bd7626",6.3);stroke(c,[[22,-23],[31,-4]],"#ffd263",3.4);
 stroke(c,[[31,-4],[39,11]],"#2f4660",6);stroke(c,[[32,-2],[39,9]],"#6886a4",2.4);
 oval(c,39,11,3.4,3.4,"#a0b5c8",ink,1.2);
 // The ski bends up at the nose and meets the fork at its pivot, not a floating board.
 path(c,[[9,20],[35,18],[54,16],[67,9],[70,10],[63,20],[51,24],[9,27],[-1,25],[-3,22]],"#10253f",ink,1.9);
 path(c,[[3,21],[35,20],[54,17],[66,11],[63,16],[49,21],[4,24]],"#99cce8");
 stroke(c,[[24,19],[38,11],[47,17]],"#31485e",4);
 for(let i=0;i<5;i++)stroke(c,[[7+i*11,20],[10+i*11,18]],"#f4fbff",1.8);
 stroke(c,[[21,-25],[24,-35],[36,-38]],ink,5.8);stroke(c,[[23,-35],[35,-37]],"#8299ae",2.2);
 stroke(c,[[-25,-23],[-12,-23]],"#172939",6);
 // Far limbs give depth: crank and steering remain fixed attachment points.
 const ankle=[-7+Math.cos(spin*2)*5,6+Math.sin(spin*2)*5],hip=air?[-23,-32]:[-25,-34],shoulder=[-3,-58];
 stroke(c,[hip,[-11,-20],[-18,7]],ink,16);stroke(c,[hip,[-11,-20],[-18,7]],"#455266",10);
 stroke(c,[shoulder,[9,-53],[28,-39]],ink,12);stroke(c,[shoulder,[9,-53],[28,-39]],"#a66c46",7);
 // Packs & torso: shaped panels with shaded folds, pack straps and weatherproof trim.
 path(c,[[-39,-68],[-28,-75],[-17,-69],[-15,-54],[-27,-43],[-42,-49],[-45,-61]],ink,ink,1.8);
 path(c,[[-39,-66],[-28,-71],[-21,-67],[-20,-54],[-29,-48],[-39,-52]],grad(c,-45,-71,-22,-45,[[0,"#597b66"],[.4,"#293f48"],[1,"#13293e"]]));
 stroke(c,[[-39,-67],[-29,-68],[-23,-58]],"#c2db50",3.1);stroke(c,[[-36,-58],[-32,-50]],"#95bd45",2.4);stroke(c,[[-40,-61],[-33,-60]],"#a2c7a1",1.1);
 path(c,[[-31,-55],[-17,-72],[-5,-72],[7,-62],[4,-45],[-8,-33],[-25,-28],[-34,-39]],ink,ink,2);
 path(c,[[-30,-54],[-17,-70],[-5,-69],[5,-61],[2,-47],[-9,-36],[-25,-31],[-32,-40]],grad(c,-28,-73,2,-31,[[0,"#ffb046"],[.25,"#fc7227"],[.64,orange],[1,"#98261a"]]));
 path(c,[[-24,-64],[-15,-69],[-8,-65],[-20,-56],[-28,-49]],"#ff9841");
 stroke(c,[[-24,-63],[-14,-57],[-9,-46],[-14,-37]],"#9e3024",2.6);
 stroke(c,[[-29,-46],[-23,-39],[-16,-39]],"#fda252",1.9);
 stroke(c,[[-22,-67],[-21,-51],[-29,-42]],"#35444e",3.7);stroke(c,[[-22,-65],[-23,-53]],"#a1c44d",1.4);
 // Near leg: articulated knee, pad, boot planted on moving pedal.
 const knee=air?[-1,-26]:[-3,-20];
 stroke(c,[hip,knee,ankle],ink,19);stroke(c,[hip,knee,ankle],"#45516d",14);
 stroke(c,[[hip[0]+1,hip[1]-4],[knee[0]-3,knee[1]-3]],"#77849a",4.5);
 path(c,[[knee[0]-6,knee[1]-5],[knee[0]+5,knee[1]-6],[knee[0]+7,knee[1]+4],[knee[0]+1,knee[1]+8],[knee[0]-7,knee[1]+4]],"#253444",ink,1.4);
 stroke(c,[[knee[0]-3,knee[1]-3],[knee[0]+3,knee[1]+2]],"#8496ac",2);
 stroke(c,[[ankle[0]-5,ankle[1]-2],[ankle[0]+8,ankle[1]+1]],ink,10);
 stroke(c,[[ankle[0]-5,ankle[1]-3],[ankle[0]+8,ankle[1]+1]],"#e96520",7);
 stroke(c,[[ankle[0]-6,ankle[1]+3],[ankle[0]+9,ankle[1]+4]],"#f7efe5",2.2);
 // Bent sleeve, exposed wrist and glove wrapped around the grips.
 stroke(c,[shoulder,[9,-48],[30,-39]],ink,13);stroke(c,[shoulder,[9,-48]],"#c6421a",10);
 stroke(c,[[1,-58],[8,-52]],"#fc8d39",3.8);stroke(c,[[9,-48],[26,-39]],"#dd9360",8);
 stroke(c,[[12,-49],[25,-42]],"#ffc58d",2.5);oval(c,30,-39,7,5,"#253749",ink,1.4);
 for(let i=0;i<3;i++)stroke(c,[[27+i*2,-41],[28+i*2,-38]],"#90a1ac",1.15);
 // Helmet & goggles with actual face, visor, ear cover, cheek and mouth.
 path(c,[[-9,-76],[-7,-87],[6,-93],[18,-87],[22,-79],[17,-69],[10,-64],[0,-67]],ink,ink,1.8);
 path(c,[[-7,-76],[-5,-86],[6,-90],[18,-85],[19,-77],[11,-74],[7,-79]],grad(c,-8,-91,19,-70,[[0,"#ffca69"],[.3,"#f88726"],[1,"#bb3c1c"]]));
 path(c,[[4,-79],[18,-78],[20,-70],[13,-64],[6,-67],[3,-72]],"#d99968",ink,1.1);
 path(c,[[11,-74],[20,-73],[17,-69],[12,-69]],"#f0b47e");
 stroke(c,[[12,-67],[16,-68]],"#743624",1.4);
 path(c,[[-4,-84],[4,-89],[8,-87],[3,-82]],"#263745",ink,.9);
 path(c,[[6,-84],[16,-84],[23,-80],[19,-77],[5,-78]],"#243b54",ink,1.1);
 path(c,[[7,-82],[17,-82],[20,-80],[17,-79],[7,-79]],"#f3a64b");stroke(c,[[9,-81],[15,-80]],"#fff4ad",1.4);
 oval(c,-4,-77,4.5,5,"#344451",ink,1);stroke(c,[[-5,-75],[0,-70],[5,-67]],"#435364",2.2);
 stroke(c,[[0,-90],[8,-91]],"#fff1b3",1.4);
 // Reflected snow edging on the rear wheel and fork.
 for(let i=0;i<9;i++){const q=hash(i+38);oval(c,-48+q%29,20+q%6,1.4,1,"#e8f8ff");}
 c.restore();
}
function rider(c,g,p,reduced){
 const art=window.BiciParkPremiumArt;
 if(!art)return;
 const h=g.airHeight*145,rotation=g.grounded||reduced?0:g.trickSpin*TAU;
 oval(c,p.x,p.y+5,53+g.airHeight*15,9+g.airHeight*4,"#24497455");
 if(g.grounded&&g.phase==="playing"&&!reduced){
  for(let i=0;i<40;i++){const d=(i*17+g.time*g.velocity*4)%135,xx=p.x-35-d,yy=p.y-2+(hash(i)%28)-d*.14;oval(c,xx,yy,1.8+i%5,1.5+i%3,i%3?"#ffffffcc":"#b4d9faff");}
  stroke(c,[[p.x-55,p.y+4],[p.x-103,p.y+5],[p.x-152,p.y+2]],"#89b5e0a8",4);
 }
 c.save();c.translate(p.x,p.y-h-27*1.67*p.scale);c.rotate(.07+g.steerVelocity*.07+(g.stumble?Math.sin(g.time*26)*.17:0)+rotation);
 if(g.invulnerability>0&&Math.floor(g.time*14)%2===0)c.globalAlpha=.57;
 drawHero(c,g,1.67*p.scale);
 c.restore();
}
function draw(c,g,{visible,reduced=false}={}){
 background(c,g);piste(c,g);
 const art=window.BiciParkPremiumArt;
 if(art)for(let at=Math.floor((g.distance-170)/55)*55;at<g.distance+330;at+=55){
  const p=project(g,at,-1.48),k=hash(at+77);
  if(k%3!==0)art.pine(c,p.x,p.y,74+k%49,true,k);
  else art.rock(c,p.x,p.y,24+k%22,true);
  if(k%7===0)art.marker(c,p.x+22,p.y+2,true);
 }
 const items=[];
 for(const a of g.course.gates)if(!a.passed&&a.at>=g.distance-35&&a.at<=g.distance+310)items.push({y:project(g,a.at,a.lane).y,kind:"gate",a});
 for(const a of g.course.animals)if((visible?visible(a):a.seen&&!a.passed&&a.phase==="crossing"&&Math.abs(a.x)<1.62)&&a.at>=g.distance-18&&a.at<=g.distance+190){const p=project(g,a.at,a.x);items.push({y:p.y,kind:"animal",a,p});}
 const p=project(g,g.distance,g.lane);items.push({y:p.y,kind:"rider",p});
 items.sort((a,b)=>a.y-b.y);
 for(const i of items){if(i.kind==="gate")gate(c,g,i.a);else if(i.kind==="animal")animal(c,g,i.a,i.p);else rider(c,g,i.p,reduced);}
 // Foreground branches are kept below the playable track so no hazard is obscured.
 if(art)for(let at=Math.floor((g.distance-180)/92)*92;at<g.distance+340;at+=92){const k=hash(at+2),p=project(g,at,1.83);if(p.y>432&&k%3!==0)art.rock(c,p.x,p.y+38,30+k%28,true);}
 if(!reduced&&g.velocity>42&&g.phase==="playing")for(let i=0;i<13;i++){const x=(i*89-g.distance*3%960+960)%960,y=440+(i%3)*14;stroke(c,[[x,y],[x-14-g.velocity*.4,y-2]],"#e9f9ff9f",1.5);}
}
window.SnowBikeAlpine=Object.freeze({project,draw,animalVisible:a=>Boolean(a.seen&&!a.passed&&a.phase==="crossing"&&Math.abs(a.x)<1.62)});
})();
