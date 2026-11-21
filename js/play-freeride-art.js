/* Original layered gameplay artwork inspired by SnowBike A / Ride C.
 * Geometry and collision rules are owned by the games. No baked HUD or screenshot. */
(function(){
"use strict";
const TAU=Math.PI*2,seed=n=>{n=Math.imul(n^0x45d9f3b,0x45d9f3b);return (n^(n>>>16))>>>0;};
function poly(c,pts,fill,stroke=null,w=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,pts,col,w){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=w;c.strokeStyle=col;c.lineCap="round";c.lineJoin="round";c.stroke();}
function ellipse(c,x,y,rx,ry,col,stroke=null,w=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=col;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
function pine(c,x,y,h,snow=false,v=0){
 c.save();c.translate(x,y);c.scale(h/120,h/120);
 const dark=snow?"#244b44":"#173d2d",mid=snow?"#376a55":"#32673c",light=snow?"#66927b":"#73a548";
 poly(c,[[-5,0],[-3,-103],[5,-105],[8,0]],"#79523b");
 line(c,[[0,-1],[1,-95]],"#b58956",2);
 for(let n=7;n>=0;n--){
  const top=-120+n*13,w=8+n*4.6,base=top+39;
  poly(c,[[0,top],[-w*.66,top+18],[-w*.47,top+19],[-w,base],[-w*.29,base-8],[0,base-2],[w*.25,base-6],[w,base-2],[w*.48,top+22],[w*.65,top+18]],dark);
  poly(c,[[0,top+4],[-w*.43,top+17],[-w*.21,top+20],[-w*.78,base-4],[0,base-13],[w*.45,base-8],[w*.26,top+19]],mid);
  poly(c,[[0,top+7],[-w*.28,top+19],[-w*.14,top+22],[-w*.5,base-10],[0,base-17]],light);
  if(snow)poly(c,[[0,top+2],[-w*.46,top+18],[-w*.63,top+23],[-w*.31,top+23],[-w*.2,top+20],[0,top+24],[w*.32,top+19],[w*.54,top+23],[w*.35,top+13]],"#f2fbff");
 }
 c.restore();
}
function peaks(c,w,h,phase,snow){
 for(let j=0;j<3;j++){
  const base=150+j*52,span=210+j*44,shift=(phase*(.035+j*.028))%span;
  const dark=["#588ec1","#3578ab","#225973"][j],shade=["#426ba5","#2b6095","#234969"][j],ice=["#eafaff","#e4f1fb","#b6d4ec"][j];
  for(let i=-2;i<Math.ceil(w/span)+2;i++){
   const x=i*span-shift,xx=x+span*.49,top=base-85-(seed(i+88*j+130)%85),bottom=base+165;
   poly(c,[[x-span*.25,bottom],[xx,top],[x+span*1.22,bottom]],dark);
   poly(c,[[xx,top],[xx+span*.16,base+25],[xx+span*.56,bottom],[xx-span*.03,bottom]],shade);
   const snowline=base+8;
   poly(c,[[xx,top],[xx-span*.18,snowline-15],[xx-span*.03,snowline-26],[xx+span*.04,snowline+4],[xx+span*.13,snowline-17],[xx+span*.23,snowline+1]],ice);
   line(c,[[xx,top+5],[xx-9,top+42],[xx+14,top+72]],"#ffffff",2);
   poly(c,[[xx-12,top+41],[xx-28,top+92],[xx-50,top+111],[xx-27,top+74]],"#93bbdf");
  }
 }
}
function chalet(c,x,y,s){
 c.save();c.translate(x,y);c.scale(s,s);
 rect(c,-31,-38,64,38,"#6f4937");rect(c,-26,-34,54,32,"#b77a49");
 for(let j=0;j<4;j++)rect(c,-26,-32+j*8,54,2,"#8b593e");
 poly(c,[[-39,-36],[0,-65],[40,-36],[30,-31],[0,-51],[-30,-31]],"#edfaff","#557c98",2);
 for(const q of [-19,10]){rect(c,q,-27,13,15,"#402e36");rect(c,q+2,-25,9,9,"#ffd68a");line(c,[[q+6,-26],[q+6,-15]],"#79533c",1);}
 rect(c,-5,-16,12,16,"#56382e");rect(c,17,-66,7,15,"#946753");rect(c,16,-68,9,3,"#f2faff");
 c.restore();
}
function world(c,w,h,phase,snow=false,time=0){
 const sky=c.createLinearGradient(0,0,0,h);
 sky.addColorStop(0,snow?"#229ee9":"#329ee9");sky.addColorStop(.52,"#b9e8fc");sky.addColorStop(1,snow?"#c7e0f5":"#a5d4b8");
 c.fillStyle=sky;c.fillRect(0,0,w,h);
 ellipse(c,w*.82,68,25,25,"#fff9c3");
 if(snow)for(let i=0;i<12;i++){const a=i*TAU/12;line(c,[[w*.82+Math.cos(a)*31,68+Math.sin(a)*31],[w*.82+Math.cos(a)*53,68+Math.sin(a)*53]],"#fff6bc91",2);}
 for(let i=0;i<8;i++){let x=((i*211-phase*.025)%1300+1300)%1300-100,y=37+i%3*27;ellipse(c,x,y,35,9,"#f3fcff");ellipse(c,x+10,y-5,20,14,"#ffffff");ellipse(c,x+35,y+3,29,8,"#e1f3ff");}
 peaks(c,w,h,phase,snow);
 // distant forest line using parallax. The terrain in front is drawn by the engine.
 for(let i=0;i<26;i++){let x=((i*51-phase*.11)%1390+1390)%1390-40;pine(c,x,333+(i%3)*9,49+seed(i+9)%42,snow);}
 if(snow){
  for(let i=0;i<4;i++)chalet(c,w-260+i*55,236+i%2*8,.73);
  line(c,[[w-390,202],[w,115]],"#314f60",2);
  for(let i=0;i<3;i++){let x=w-390+((i*124+time*11)%390),y=202-(x-(w-390))*87/390;line(c,[[x,y],[x,y+12]],"#283e4d",2);rect(c,x-10,y+11,20,13,"#c43b3d");rect(c,x-8,y+13,16,6,"#51badf");}
 }else{
  // Rock gorge and animated waterfall below the real track.
  poly(c,[[0,379],[w*.25,354],[w*.39,426],[w*.54,372],[w*.72,410],[w,348],[w,h],[0,h]],"#354e4b");
  for(let i=0;i<20;i++){let x=i*w/19,y=388+seed(i)%54;poly(c,[[x-24,y],[x+14,y-17],[x+45,y+10],[x+26,y+79],[x-31,y+70]],i%2?"#777b68":"#52635e");}
  const wx=w*.67;poly(c,[[wx-30,360],[wx+18,365],[wx+44,484],[wx+26,h],[wx-63,h],[wx-41,460]],"#2989b3");
  for(let i=0;i<10;i++){const x=wx-24+i*5,y=360+((time*105+i*29)%155);line(c,[[x,y],[x-8,y+34],[x-12,y+62]],i%2?"#94e0ef":"#e5fbff",3);}
  for(let i=0;i<8;i++)ellipse(c,wx-48+i*10,h-25,15,4,"#c4f3f4a8");
 }
}
function rock(c,x,y,size,snow=false){
 const a=size*.5;
 poly(c,[[x-a,y],[x-a*.8,y-a*.7],[x-a*.15,y-size],[x+a*.65,y-a*.76],[x+a,y]],snow?"#536d92":"#52615a","#344c50",1.5);
 poly(c,[[x-a*.8,y-a*.7],[x-a*.15,y-size],[x+a*.1,y-a*.25],[x-a,y]],snow?"#9bbad8":"#91a28a");
 if(snow)poly(c,[[x-a*.8,y-a*.7],[x-a*.15,y-size],[x+a*.65,y-a*.76],[x+a*.44,y-a*.58],[x,y-a*.72],[x-a*.43,y-a*.48]],"#f2fbff");
}
function marker(c,x,y,snow=false){
 c.save();c.translate(x,y);
 rect(c,-2,-49,5,49,"#725444");poly(c,[[0,-48],[38,-44],[35,-22],[0,-26]],snow?"#e44a3b":"#9cc52c","#e8f1ce",1);
 line(c,[[10,-42],[22,-34],[10,-28]],snow?"#fff8ce":"#203e33",4);c.restore();
}
function wheel(c,x,y,r,spin,accent){
 ellipse(c,x,y,r+2,r+2,"#192329","#101b23",2);
 ellipse(c,x,y,r-3,r-3,"#203139",accent,2.6);
 for(let k=0;k<14;k++){const a=k*TAU/14+spin;line(c,[[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(a)*(.8*r),y+Math.sin(a)*(.8*r)]],"#46565a",2.7);}
 for(let k=0;k<10;k++){const a=k*TAU/10+spin;line(c,[[x,y],[x+Math.cos(a)*(r-4),y+Math.sin(a)*(r-4)]],"#a1b9b5",.8);}
 ellipse(c,x,y,r*.38,r*.38,"#657b81","#c7d8d5",1.2);
 ellipse(c,x,y,2.8,2.8,"#19252c");
}
function rider(c,{snow=false,time=0,speed=0,air=false,wheelie=false,scale=1}={}){
 c.save();c.scale(scale,scale);
 const accent=snow?"#138bcd":"#a9d929", hi=snow?"#7be1ff":"#e1fe73", jersey=snow?"#f05224":"#e3e9de",shadow=snow?"#a83123":"#546a49", skin="#e5a478";
 // Coordinates centered on the physical bike; rear tire touches y=22.
 const spin=time*speed*.025, rear=[-29,7],front=[29,7], crank=[-4,0],seat=[-15,-18],head=[16,-21];
 wheel(c,...rear,13,spin,accent);
 if(!snow)wheel(c,...front,13,spin,accent);
 else {poly(c,[[10,15],[45,15],[55,10],[52,18],[13,22],[-3,21]],"#183549","#0d2031",2);line(c,[[2,17],[43,17],[52,12]],"#edf7fc",2.8);}
 line(c,[rear,seat,head,crank,rear],"#132c37",7);
 line(c,[rear,seat,head,crank,rear],accent,4.6);
 line(c,[seat,crank,head],hi,2);
 line(c,[[15,-22],[27,4]],"#182831",7);line(c,[[15,-23],[26,0]],"#eabe66",3.5);line(c,[[26,0],[29,7]],"#a8c1c5",3.4);
 line(c,[[17,-22],[20,-32],[30,-32]],"#243239",4);line(c,[[15,-31],[30,-31]],"#52696d",1.5);
 line(c,[[-18,-19],[-7,-19]],"#1a2529",4);ellipse(c,-4,0,5,5,"#7c8c88","#263842",1.5);
 line(c,[rear,[-4,2]],"#889895",1.2);
 const pedal=air?1.2:time*speed*.038,px=-4+Math.cos(pedal)*5,py=Math.sin(pedal)*5;
 const hip=wheelie?[-21,-27]:[-15,-29], shoulder=air?[0,-47]:[0,-45];
 // Far leg & arm; near limbs bend naturally towards bars and rotating pedal.
 line(c,[hip,[-3,-15],[-10,4]],"#14252c",9);line(c,[hip,[-3,-15],[-10,4]],"#546468",5.5);
 line(c,[shoulder,[14,-43],[24,-32]],"#293b43",7);line(c,[shoulder,[14,-43],[24,-32]],"#9f785c",4.8);
 poly(c,[[hip[0]-7,hip[1]+3],[-24,-42],[-10,-53],[4,-48],[9,-41],[-1,-33],[hip[0]+6,hip[1]+4]],jersey,"#22313a",2.2);
 poly(c,[[-23,-43],[-14,-51],[-7,-44],[-13,-32],[-23,-31]],shadow);
 poly(c,[[-17,-49],[-9,-52],[5,-48],[1,-44],[-11,-46]],snow?"#ffb24c":"#b7ea38");
 poly(c,[[-28,-48],[-18,-51],[-15,-39],[-20,-29],[-29,-32]],"#25363d","#172630",1.5);
 line(c,[[-26,-46],[-22,-34]],snow?"#9ad034":"#b6e34e",2);
 const knee=wheelie?[-7,-17]:[2,-15+(air?-3:0)];
 line(c,[hip,knee,[px,py]],"#13252d",12);line(c,[hip,knee,[px,py]],"#45525a",8);
 line(c,[[knee[0]-3,knee[1]-4],knee],"#7f8986",5);
 line(c,[[px-4,py+1],[px+6,py+1]],snow?"#ef7033":"#232d2d",6);
 line(c,[[px-4,py+3],[px+6,py+3]],"#e1e6d8",1.5);
 line(c,[shoulder,[11,-36],[25,-31]],"#21323a",9);line(c,[shoulder,[11,-36],[25,-31]],skin,5.7);
 line(c,[shoulder,[5,-42]],jersey,7.5);ellipse(c,24,-31,4,3,"#202b32");
 // Helmet, goggles and face, high-contrast lime / orange identity.
 ellipse(c,1,-57,10,11,skin,"#26343b",1.5);
 poly(c,[[-11,-58],[-9,-65],[1,-69],[9,-66],[15,-60],[11,-54],[4,-58],[-3,-54]],snow?"#e96b23":"#abd735","#172b37",2);
 poly(c,[[-7,-65],[0,-67],[7,-65],[4,-62],[-4,-63]],snow?"#ffc36b":"#e8fc89");
 poly(c,[[4,-61],[13,-60],[11,-55],[3,-55]],"#253b4e","#151e28",1);
 line(c,[[5,-58],[10,-59]],snow?"#ffb249":"#8dd6ef",1.6);
 line(c,[[10,-54],[8,-49],[2,-50]],"#27343b",2.1);
 c.restore();
}
function arrow(c,x,y){c.save();c.translate(x,y);rect(c,-3,-36,6,36,"#624329");poly(c,[[-29,-46],[32,-46],[32,-18],[-29,-18]],"#b97535","#563925",2);for(const n of [-12,9])line(c,[[n-2,-40],[n+8,-32],[n-2,-24]],"#fff4cd",4);c.restore();}
window.BiciParkPremiumArt=Object.freeze({world,pine,rock,marker,arrow,rider,poly,line,rect,ellipse});
})();
