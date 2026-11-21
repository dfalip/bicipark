// Original pixel-art renderer; no borrowed images, sprites or game assets.
import {VIEW,DISTRICTS,clamp,DISTRICT_LENGTH} from "./arcade-engine.js";
const W=VIEW.width,H=VIEW.height;
const ink="#20252b";
const palette=[
 ["#344044","#53615b","#7b8170","#a1977e","#556b72","#c0ab78"],
 ["#2e4447","#526e62","#79836b","#a9a28a","#4b6a71","#e7c578"],
 ["#373b49","#59565b","#77706b","#948577","#514b65","#e7b27b"],
 ["#39444f","#59676d","#798d90","#b1a694","#536d80","#ffe2a1"]
];
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function line(c,x0,y0,x1,y1,color,width=2){
 x0=Math.round(x0);x1=Math.round(x1);y0=Math.round(y0);y1=Math.round(y1);
 let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
 for(let n=0;n<1000;n++){
  rect(c,x0-width/2,y0-width/2,width,width,color);
  if(x0===x1&&y0===y1)break;
  const e=err*2;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}
 }
}
function circle(c,x,y,r,color,fill=true){
 x=Math.round(x);y=Math.round(y);r=Math.max(1,Math.round(r));
 for(let yy=-r;yy<=r;yy++){
  const end=Math.floor(Math.sqrt(r*r-yy*yy));
  if(fill)rect(c,x-end,y+yy,end*2+1,1,color);
  else {rect(c,x-end,y+yy,1,1,color);rect(c,x+end,y+yy,1,1,color);}
 }
}
function shadow(c,x,y,w=28){
 c.save();c.globalAlpha=.42;
 rect(c,x-w/2,y-1,w,4,"#1c232b");rect(c,x-w/2+3,y-3,w-6,8,"#1c232b");c.restore();
}
function outlineBox(c,x,y,w,h,color,edge=ink){
 rect(c,x,y,w,h,edge);rect(c,x+1,y+1,w-2,h-2,color);
}
function text(c,t,x,y,size=12,color="#f9f3d2",align="left"){
 c.textAlign=align;c.textBaseline="alphabetic";c.font="bold "+size+"px monospace";
 c.lineWidth=3;c.strokeStyle="#171f25";c.strokeText(t,x,y);c.fillStyle=color;c.fillText(t,x,y);
}
function hash(n){n=Math.imul(n^0x45d9f3b,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(n^(n>>>16))>>>0;}
function brickWall(c,x,y,w,h,colors,i){
 rect(c,x,y,w,h,colors[2]);rect(c,x,y,w,4,colors[3]);rect(c,x,y,3,h,colors[0]);rect(c,x+w-4,y,4,h,colors[1]);
 for(let yy=y+11;yy<y+h;yy+=11){
  rect(c,x+4,yy,w-8,1,colors[1]);
  for(let xx=x+5+(Math.floor(yy/11)%2)*7;xx<x+w-5;xx+=15)rect(c,xx,yy-10,1,10,colors[1]);
 }
 for(let j=0;j<16;j++){const v=hash(i*143+j);rect(c,x+5+v%Math.max(1,w-10),y+5+(v>>>8)%Math.max(1,h-10),3+v%4,1,colors[3]);}
}
function windowFrame(c,x,y,w,h,lit,colors,shutters){
 rect(c,x-2,y-2,w+4,h+4,colors[0]);rect(c,x-1,y-1,w+2,h+2,colors[3]);
 rect(c,x,y,w,h,"#252b30");rect(c,x+2,y+2,w-4,h-4,lit?"#a89658":"#39484b");
 rect(c,x+w/2-1,y+2,2,h-4,colors[0]);rect(c,x+2,y+h/2-1,w-4,2,colors[0]);
 rect(c,x-4,y+h,w+8,3,colors[3]);
 if(shutters){for(let s of [-1,1]){const xx=s<0?x-5:x+w+2;rect(c,xx,y,4,h,colors[1]);for(let k=2;k<h;k+=4)rect(c,xx+1,y+k,2,1,colors[3]);}}
}
function balcony(c,x,y,w,colors){
 rect(c,x-4,y,w+8,3,colors[0]);rect(c,x-4,y-11,w+8,2,colors[0]);
 for(let j=x-3;j<x+w+3;j+=4){rect(c,j,y-10,1,11,colors[0]);rect(c,j+1,y-8,1,4,colors[3]);}
}
function building(c,x,w,zone,i){
 const col=palette[zone],v=hash(i+zone*124),y=9+(v%25);
 brickWall(c,x,y,w,169-y,col,i);
 rect(c,x-2,y-4,w+4,4,col[0]);rect(c,x,y+4,w,3,col[3]);
 for(let yy=y+19;yy<119;yy+=39){
  for(let j=10;j<w-13;j+=26){
   windowFrame(c,x+j,yy,17,22,(hash(i*24+j+yy)%7===0),col,true);
   if((i+yy)%3===0)balcony(c,x+j-2,yy+21,21,col);
  }
  rect(c,x,yy+29,w,3,col[3]);rect(c,x,yy+32,w,2,col[1]);
 }
 // Ground floor deep doors, small shop fronts, stone pillars and plinths.
 const doorW=Math.min(29,w-15),dx=x+Math.floor((w-doorW)/2);
 rect(c,dx-4,119,doorW+8,50,col[1]);rect(c,dx,125,doorW,44,"#252d30");
 rect(c,dx+3,128,doorW-6,41,"#3c4140");rect(c,dx+doorW-7,148,2,4,col[5]);
 rect(c,x,166,w,4,col[3]);rect(c,x+2,113,w-4,4,col[0]);
 if(i%3===1){
  const labels=zone===2?["TALLER","MOLL","MAGATZEM"]:zone===1?["PARC","METRO","CAFÈ"]:["FORN","BICI","CAFÈ"];
  rect(c,x+5,116,w-10,10,"#293a3a");rect(c,x+6,117,w-12,2,col[5]);
  c.font="bold 7px monospace";c.textAlign="center";c.fillStyle=col[5];c.fillText(labels[i%labels.length],x+w/2,124);
 }
 if(zone===2&&i%2===0){
  rect(c,x+7,13,8,100,col[0]);rect(c,x+9,17,3,93,col[4]);
  for(let k=22;k<111;k+=15)rect(c,x+6,k,11,2,col[3]);
 }
}
// Cache repeated architecture tiles. Rendering cost stays bounded on mobile.
const buildingCache=new Map();
function sceneryTile(c,x,zone,i){
 const variant=((i%12)+12)%12;
 if(!c.canvas?.ownerDocument){building(c,x,112,zone,variant);return;}
 const key=zone+":"+variant;
 let tile=buildingCache.get(key);
 if(!tile){
  tile=c.canvas.ownerDocument.createElement("canvas");tile.width=112;tile.height=170;
  const pc=tile.getContext("2d");if(!pc){building(c,x,112,zone,variant);return;}
  const colors=palette[zone];
  rect(pc,0,0,112,170,colors[4]);
  if(zone===1&&variant%3===1){
   // Enclosed city park with layered trees, fence, pavement and benches.
   rect(pc,0,120,112,50,"#61705e");
   for(let j=0;j<4;j++){
    const tx=12+j*27,ty=49+(hash(variant*8+j)%25);
    rect(pc,tx-3,ty+20,6,96-ty,"#504c44");
    circle(pc,tx,ty+14,18,"#3e584d");circle(pc,tx-5,ty+7,13,"#71886a");circle(pc,tx+5,ty+3,10,"#91a27b");
   }
   for(let j=0;j<112;j+=12)rect(pc,j,134,2,34,"#30483f");
   rect(pc,0,135,112,3,"#30483f");rect(pc,0,157,112,3,"#30483f");
   rect(pc,28,143,33,4,"#ae9876");rect(pc,29,149,31,4,"#82715c");
  }else if(zone===3&&variant%3!==0){
   // Bridge deck spans the river, with riveted latticework behind the street.
   rect(pc,0,96,112,73,"#486975");rect(pc,0,142,112,17,"#71928d");
   for(let yy=120;yy<160;yy+=8)rect(pc,hash(variant+yy)%62,yy,44,1,"#a8b9ad");
   rect(pc,0,0,9,169,"#384b55");rect(pc,103,0,9,169,"#384b55");rect(pc,0,9,112,8,"#a1aaa3");
   line(pc,7,14,107,114,"#74848a",7);line(pc,107,14,7,114,"#74848a",7);
   rect(pc,0,114,112,6,"#384b55");
   for(let xx=4;xx<112;xx+=13){rect(pc,xx,12,2,2,"#c4c5b1");rect(pc,xx,116,2,2,"#c4c5b1");}
  }else building(pc,0,112,zone,variant);
  buildingCache.set(key,tile);
 }
 c.drawImage(tile,Math.round(x),0);
}
function sceneBack(c,g){
 const zone=(g.wave-1)%4,colors=palette[zone],d=g.distance;
 rect(c,0,0,W,H,colors[4]);
 // Stable near façades and skyline use world-space positions and genuine parallax.
 for(let i=Math.floor(d*.22/70)-1;i<Math.floor((d*.22+W)/70)+2;i++){
  const x=i*70-d*.22,h=30+hash(i)%42;
  rect(c,x,83-h,66,h+48,colors[0]);rect(c,x+4,78-h,17,5,colors[1]);
 }
 const b0=Math.floor(d*.72/112)-1;
 for(let i=b0;i<=b0+8;i++)sceneryTile(c,i*112-d*.72,zone,i);
 // Overhead cables and tram lighting.
 for(let j=0;j<3;j++)for(let k=0;k<W;k+=16)rect(c,k,28+j*13+Math.round(k/W*(11-j*3)),16,1,"#252b2e");
 for(let i=Math.floor(d/180)-1;i<Math.floor((d+W)/180)+2;i++){
  const x=i*180-d;
  rect(c,x,43,4,128,"#303c40");rect(c,x+1,43,1,128,"#77847b");
  rect(c,x-23,42,25,3,"#303c40");rect(c,x-25,45,11,4,"#d1c899");
  rect(c,x-22,49,6,1,"#fff2ab");
 }
 // Sidewalk, curb, iron railing. World road geometry remains aligned to entities.
 rect(c,0,170,W,19,"#878375");rect(c,0,184,W,5,"#b1a89a");rect(c,0,188,W,3,"#434849");
 for(let i=Math.floor(d/22)-1;i<Math.floor((d+W)/22)+1;i++){const x=i*22-d;rect(c,x,172,1,12,"#565b58");}
 rect(c,0,162,W,3,"#303b40");rect(c,0,175,W,3,"#303b40");
 for(let i=Math.floor(d/13)-1;i<Math.floor((d+W)/13)+1;i++){const x=i*13-d;rect(c,x,161,2,18,"#303b40");rect(c,x+2,164,1,12,"#c3c1a8");}
 // Road: three distinct lanes, perspective strips, cracks, markings, foreground curb.
 rect(c,0,191,W,123,"#424c56");rect(c,0,194,W,38,"#414b54");rect(c,0,234,W,44,"#48515a");
 rect(c,0,279,W,33,"#454c54");rect(c,0,312,W,8,"#aaa598");rect(c,0,320,W,40,"#65665f");
 for(let i=Math.floor(d/70)-1;i<Math.floor((d+W)/70)+2;i++){
  const x=i*70-d;
  for(let yy of [226,272])rect(c,x,yy,34,2,"#d4ceae");
  const v=hash(i+zone*30);
  rect(c,x+v%25,196+v%105,3+v%9,1,"#303b41");
  line(c,x+31,207+(v%60),x+36,211+(v%60),"#565e62",1);
  rect(c,x,323,1,37,"#484f50");rect(c,x+25,320,1,40,"#8d8a7d");
 }
 rect(c,0,345,W,3,"#353e43");rect(c,0,356,W,3,"#353e43");
 for(let i=Math.floor(d/14)-1;i<Math.floor((d+W)/14)+2;i++){
  const x=i*14-d;rect(c,x,344,2,16,"#353e43");rect(c,x+2,347,1,8,"#999e91");
 }
}
function wheel(c,x,y,r,angle){
 circle(c,x,y,r+2,ink);circle(c,x,y,r,"#62767b");circle(c,x,y,r-2,"#252f38");
 circle(c,x,y,r-4,"#404f55",false);
 for(let j=0;j<4;j++){
  const a=angle+j*Math.PI/2;
  line(c,x,y,x+Math.cos(a)*(r-3),y+Math.sin(a)*(r-3),"#9aadb2",1);
 }
 circle(c,x,y,2,"#dce5d5");
}
function cyclist(c,g,reduced){
 const x=VIEW.riderX,y=VIEW.lanes[0]+g.lane*45,air=g.altitude;
 const cadence=reduced?0:g.distance/40;
 shadow(c,x,y,62);
 c.save();c.translate(Math.round(x),Math.round(y-air-(g.altitude?0:reduced?0:Math.sin(cadence*2))));
 if(g.invuln>0&&!reduced&&Math.floor(g.time*12)%2===0)c.globalAlpha=.58;
 if(g.turbo>0){for(let i=0;i<5;i++)rect(c,-40-i*8,-10+i%3*7,16+i*3,2,i%2?"#eacb64":"#7fd9d2");}
 if(g.altitude>0)c.rotate(clamp(-g.vy/1800,-.12,.12));
 // Frame, crank, two rotating spoked wheels, pedalling feet, side-on rider.
 wheel(c,-21,-10,10,cadence);wheel(c,24,-10,10,cadence);
 const tubes=[[-21,-10,-6,-27],[-6,-27,7,-10],[7,-10,-21,-10],[-6,-27,18,-27],[18,-27,24,-10],[7,-10,18,-27]];
 for(const t of tubes)line(c,...t,ink,5);
 for(const t of tubes)line(c,...t,"#43c4ae",3);
 line(c,-6,-27,-10,-34,"#171c25",3);rect(c,-18,-36,16,4,"#293b40");
 line(c,18,-27,20,-39,"#acbfc0",3);line(c,20,-39,29,-39,"#242b30",3);
 circle(c,7,-10,4,"#f3c86b");
 for(const [offset,color] of [[Math.PI,"#344458"],[0,"#536877"]]){
  const a=cadence+offset,fx=7+Math.cos(a)*7,fy=-10+Math.sin(a)*5;
  const kx=-3+(fx-7)*.5,ky=-25+(fy+10)*.5;
  line(c,7,-10,fx,fy,"#a8c4c6",2);
  line(c,-7,-39,kx,ky,ink,7);line(c,kx,ky,fx,fy,ink,6);
  line(c,-7,-39,kx,ky,color,4);line(c,kx,ky,fx,fy,color,4);
  rect(c,fx-4,fy-2,10,4,"#20282c");
 }
 line(c,-8,-40,4,-56,ink,14);line(c,-8,-40,4,-56,"#2b9a94",10);line(c,-6,-42,1,-51,"#71d1b6",4);
 line(c,4,-56,13,-43,ink,7);line(c,13,-43,26,-39,ink,6);
 line(c,4,-56,13,-43,"#e1b69a",4);line(c,13,-43,26,-39,"#d4b59a",3);
 rect(c,21,-46,15,5,ink);rect(c,23,-45,10,3,"#e6b35e");rect(c,33,-44,4,2,"#ffde85");
 circle(c,9,-63,10,ink);circle(c,10,-63,8,"#b8b77c");
 rect(c,3,-71,14,8,"#68b052");rect(c,6,-73,9,3,"#a8d06c");rect(c,15,-65,7,4,"#243844");
 rect(c,12,-59,6,3,"#e6b79a");rect(c,1,-63,3,7,"#4c7245");
 if(g.shield>0){
  c.strokeStyle="#82e3ef";c.lineWidth=2;c.globalAlpha=.85;c.beginPath();c.ellipse(1,-35,41,44,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
 }
 c.restore();
}
function obstacle(c,e,x,y,g,reduced){
 const type=e.type;shadow(c,x,y,type==="van"?74:type==="car"?63:28);
 if(type==="cone"){
  rect(c,x-12,y-3,25,4,ink);line(c,x,y-25,x-9,y-5,"#b75b3e",5);line(c,x,y-25,x+9,y-5,"#d29655",5);
  rect(c,x-6,y-12,13,4,"#f2e2bd");rect(c,x-8,y-5,17,4,"#a74f39");return;
 }
 if(type==="car"||type==="van"){
  c.save();c.translate(Math.round(x),Math.round(y));
  const van=type==="van";const w=van?70:60,h=van?70:29;
  const base=van?"#d7d1b7":"#87695b",top=van?"#a5aba1":"#c1a185";
  outlineBox(c,-w/2,-h,w,h-4,base);rect(c,-w/2+3,-h+2,w-6,3,top);
  rect(c,-w/2+5,-h+6,van?35:24,15,"#303c46");rect(c,-w/2+8,-h+9,van?29:18,4,"#708a91");
  rect(c,-w/2+5,-h+6,3,15,"#aaa99a");rect(c,9,-h+6,17,15,"#35444d");rect(c,10,-h+8,12,4,"#78949b");
  rect(c,-w/2+4,-h+25,w-8,4,van?"#b36d59":"#504b4a");
  rect(c,-w/2+5,-h+30,3,5,"#716e62");rect(c,w/2-7,-10,5,4,"#f3d28a");
  rect(c,-w/2+2,-11,3,4,"#c86a50");
  circle(c,-w/2+13,-4,8,ink);circle(c,w/2-13,-4,8,ink);circle(c,-w/2+13,-4,4,"#8c9895");circle(c,w/2-13,-4,4,"#8c9895");
  line(c,-9,-h+12,-16,-h+18,"#bdb8a1",1);rect(c,-8,-h+21,11,2,"#6b746d");
  c.restore();return;
 }
 const giant=type==="giant",runner=type==="runner",helmet=type==="helmet",size=giant?1.48:runner?.86:1;
 const stride=e.stunned?0:reduced?0:Math.sin(g.time*(runner?20:11)+e.id);
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);
 if(e.stunned){c.rotate(.20);c.globalAlpha=.83;}
 // Unmistakable silhouettes: runner leans forward; helmet has riveted armour; giant is wide.
 const tilt=runner?-6:0;
 for(const side of [-1,1]){
  const knee=side*6+stride*side*5,foot=side*8+stride*side*7;
  line(c,side*5,-20,knee,-10,ink,8);line(c,knee,-10,foot,-2,ink,7);
  line(c,side*5,-20,knee,-10,"#54585a",5);line(c,knee,-10,foot,-2,"#73766c",4);
  rect(c,foot-4,-3,9,4,"#21282c");
 }
 const coat=helmet?"#a08653":giant?"#8b514b":runner?"#8b693d":"#657b8a";
 outlineBox(c,-12+tilt,-43,24,23,coat);
 rect(c,-9+tilt,-40,6,17,"#a0a692");rect(c,5+tilt,-39,4,10,"#3e5155");rect(c,-12+tilt,-23,24,4,"#373e42");
 for(const side of [-1,1]){
  line(c,side*11+tilt,-39,side*15+tilt,-28+stride*3,ink,7);
  line(c,side*15+tilt,-28+stride*3,side*20-3,-24+stride*3,ink,6);
  line(c,side*11+tilt,-39,side*15+tilt,-28+stride*3,coat,4);
  line(c,side*15+tilt,-28+stride*3,side*20-3,-24+stride*3,"#86a65b",4);
 }
 circle(c,tilt,-51,11,ink);circle(c,tilt,-51,9,"#8ba36b");
 rect(c,tilt-7,-57,5,3,"#b5c58a");rect(c,tilt-8,-51,5,5,"#3c4b37");rect(c,tilt+2,-51,5,5,"#3c4b37");
 rect(c,tilt-6,-50,2,2,"#fff1a7");rect(c,tilt+3,-50,2,2,"#fff1a7");
 rect(c,tilt-6,-45,12,3,"#394037");rect(c,tilt-4,-45,2,2,"#c1c396");
 if(helmet){rect(c,tilt-11,-61,23,5,ink);rect(c,tilt-10,-65,20,7,"#788a98");rect(c,tilt-7,-65,8,2,"#b9bfb9");}
 if(giant){rect(c,-17,-42,4,17,"#b19b76");rect(c,13,-42,4,17,"#b19b76");}
 if(e.stunned){rect(c,tilt-9,-55,13,5,"#ddc25e");rect(c,tilt+1,-38,11,7,"#a4d56d");text(c,"✦",0,-69,12,"#ffe577","center");}
 else if(e.warning){text(c,"!",0,-71,14,"#ffcf69","center");}
 if(e.hp>1&&!e.stunned){for(let p=0;p<e.hp;p++)rect(c,p*5-e.hp*2.5,-68,4,3,"#f4c16b");}
 c.restore();
}
function pickup(c,p,x,y,reduced,time){
 const bob=reduced?0:Math.sin(time*5+p.id)*3;
 const labels={ammo:"P",turbo:"⚡",shield:"S",heart:"♥",star:"★"};
 const col={ammo:"#bada77",turbo:"#f8cb59",shield:"#78d2de",heart:"#e68a86",star:"#f3d76b"}[p.kind];
 shadow(c,x,y,24);outlineBox(c,x-11,y-28+bob,22,22,col);
 rect(c,x-8,y-26+bob,15,2,"#faffce");text(c,labels[p.kind],x,y-12+bob,13,"#f9f7d4","center");
}
export function makeEffects(){return {particles:[],words:[],shake:0,banner:null};}
export function pushEffects(fx,ev,g,reduced=false){
 const x=ev.x===undefined?VIEW.riderX:VIEW.riderX+ev.x-g.distance,y=VIEW.lanes[0]+(ev.lane??g.lane)*45-25;
 const data={paint:["PLOF!","#d6d86e",12],stun:["COMBO ×"+g.combo,"#f7d46a",22],hit:["XOC! −1 COR","#ff9a78",24],protected:["ESCUT / TURBO!","#81e1df",22],dodge:["+"+ev.points,"#e7e9a7",9],pickup:[ev.kind==="ammo"?"+4 PINTURA":ev.kind==="shield"?"ESCUT!":ev.kind==="turbo"?"+1 TURBO":ev.kind==="heart"?"+1 COR":"+"+ev.points,"#f6e08d",17],land:["","#c3c0ac",8],turbo:["TURBO!","#fbd274",20]}[ev.type];
 if(ev.type==="wave"){fx.banner={text:"ONADA "+ev.wave,subtitle:DISTRICTS[(ev.wave-1)%4].name,life:1.65};return;}
 if(!data)return;
 const [label,col,n]=data;
 for(let i=0;i<(reduced?Math.min(5,n):n);i++){
  const a=i*2.39996,v=18+(i%6)*11;fx.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-24,life:.28+i%4*.09,color:col,size:2+i%3});
 }
 if(label)fx.words.push({x:clamp(x,80,570),y:clamp(y-19,105,305),label,col,life:.75});
 if(ev.type==="hit"||ev.type==="stun")fx.shake=reduced?0:ev.type==="hit"?5:2;
 fx.particles=fx.particles.slice(-140);fx.words=fx.words.slice(-7);
}
export function advanceEffects(fx,dt){
 fx.shake=Math.max(0,fx.shake-dt*22);
 for(const p of fx.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;}
 for(const w of fx.words){w.y-=28*dt;w.life-=dt;}
 fx.particles=fx.particles.filter(p=>p.life>0);fx.words=fx.words.filter(w=>w.life>0);
 if(fx.banner){fx.banner.life-=dt;if(fx.banner.life<=0)fx.banner=null;}
}
function canvasHud(c,g){
 // Arcade cluster is drawn over the scenery, never over the critical road.
 rect(c,8,8,139,50,"#1f292ddd");rect(c,9,9,137,1,"#b6af8a");
 circle(c,34,32,19,ink);circle(c,34,32,17,"#4a5660");circle(c,34,32,15,"#303c44");
 for(let i=0;i<7;i++){const a=Math.PI*(.8+i*.2333);rect(c,34+Math.cos(a)*13,32+Math.sin(a)*13,2,2,"#d2d1ac");}
 const a=Math.PI*(.8+clamp(g.speed/255,0,1)*1.4);
 line(c,34,32,34+Math.cos(a)*12,32+Math.sin(a)*12,"#ffdd86",2);circle(c,34,32,2,"#eee9c7");
 text(c,Math.floor(g.speed/2)+" VEL",59,26,10,"#f4e4b3");text(c,Math.floor(g.distance)+" m",59,41,10);
 rect(c,244,8,152,31,"#1f292ddd");text(c,"PINTURA  "+g.ammo+"/"+g.maxAmmo,320,20,10,"#e9e5c7","center");
 for(let i=0;i<g.maxAmmo;i++){rect(c,258+i*14,25,9,8,i<g.ammo?"#e0cd70":"#54575a");rect(c,258+i*14,25,9,1,"#c1ba9d");}
 rect(c,494,8,138,50,"#1f292ddd");text(c,"COMBO",506,21,11,"#eec974");
 const bonus=1+Math.min(4,Math.floor(Math.max(0,g.combo-1)/3));
 text(c,"BONUS ×"+bonus,506,34,8,"#a6d29f");
 rect(c,499,55,130*clamp(g.comboLeft/3.6,0,1),2,"#d9bf6a");
 text(c,"×"+g.combo,620,39,22,"#fff0a0","right");text(c,Math.floor(g.score)+" PTS",505,51,9,"#f0edcd");
 const progress=g.mode==="story"?clamp(g.distance/(DISTRICT_LENGTH*4),0,1):(g.distance%DISTRICT_LENGTH)/DISTRICT_LENGTH;
 rect(c,10,64,136,5,"#20282a");rect(c,10,64,136*progress,5,"#86cfab");
}
export function drawArcade(c,g,fx,reduced=false){
 c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.save();
 if(!reduced&&fx.shake>0)c.translate(Math.round(Math.sin(g.time*77)*fx.shake),Math.round(Math.cos(g.time*109)*fx.shake*.5));
 sceneBack(c,g);
 // Depth sorting: rider and foes in front lanes occlude those farther away.
 const actors=[];
 for(const e of g.enemies){const x=VIEW.riderX+e.x-g.distance;if(x>-90&&x<W+100)actors.push({lane:e.lane,draw:()=>obstacle(c,e,x,VIEW.lanes[e.lane],g,reduced)});}
 for(const p of g.pickups){const x=VIEW.riderX+p.x-g.distance;if(!p.collected&&x>-30&&x<W+30)actors.push({lane:p.lane,draw:()=>pickup(c,p,x,VIEW.lanes[p.lane],reduced,g.time)});}
 actors.push({lane:g.lane,draw:()=>cyclist(c,g,reduced)});
 actors.sort((a,b)=>a.lane-b.lane).forEach(a=>a.draw());
 for(const shot of g.shots){const x=VIEW.riderX+shot.x-g.distance,y=VIEW.lanes[0]+shot.lane*45-42;rect(c,x-7,y,8,2,"#f7e2a1");circle(c,x,y,3,"#f3d16f");}
 // Visible pursuing pack; its size depends on actual horde pressure.
 const count=2+Math.floor(g.threat/17);
 for(let i=0;i<count;i++){
  const x=8+g.threat*.61-i*14,y=VIEW.lanes[i%3];
  if(x>-40)obstacle(c,{type:i%3===0?"runner":"walker",id:i,hp:1,stunned:false,warning:false},x,y,g,reduced);
 }
 for(const p of fx.particles){c.save();c.globalAlpha=clamp(p.life*3,0,1);rect(c,p.x,p.y,p.size,p.size,p.color);c.restore();}
 for(const w of fx.words){c.save();c.globalAlpha=clamp(w.life*3,0,1);text(c,w.label,w.x,w.y,12,w.col,"center");c.restore();}
 c.restore();canvasHud(c,g);
 if(fx.banner){rect(c,185,77,270,34,"#1d282de8");text(c,fx.banner.text,W/2,91,14,"#ffd87c","center");text(c,fx.banner.subtitle,W/2,104,9,"#e7e8ca","center");}
}
