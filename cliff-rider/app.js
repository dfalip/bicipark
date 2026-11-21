const $=id=>document.getElementById(id),c=$("stage"),g=c.getContext("2d"),W=960,H=600,keys=new Set();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), C=480,Y=455, finish=1500;
let best=0;try{best=+localStorage.getItem("cliff-best")||0}catch{}let r,last=0;
const path=z=>95*Math.sin(z*.009)+44*Math.sin(z*.021)+17*Math.sin(z*.038);
const width=z=>Math.max(68,166-z*.057+20*Math.sin(z*.018));
const rocks=Array.from({length:35},(_,i)=>{const z=85+i*39;return {z,x:path(z)+Math.sin(i*2.37)*width(z)*.32,r:8+i%3*3}});
const coins=Array.from({length:36},(_,i)=>{const z=65+i*39;return {z,x:path(z)+Math.cos(i*1.7)*width(z)*.27,id:i}});
let particles=[];
function reset(){r={z:0,x:0,v:0,vx:0,t:0,phase:"ready",fall:0,side:1,hit:0,points:0,coins:new Set(),near:0};particles=[];keys.clear();hud()}
function start(){reset();r.phase="play";r.v=32;$("start").textContent="Reinicia";$("status").textContent="Segueix el sender!"}
function pause(){if(r.phase==="play"){r.phase="pause";keys.clear()}else if(r.phase==="pause")r.phase="play"}
function hud(){$("distance").textContent=Math.floor(r.z)+" / "+finish+" m";$("speed").textContent=Math.round(r.v*.72)+" km/h";$("score").textContent=Math.floor(r.z+r.points)+" punts";$("record").textContent="Rècord: "+best}
function save(){best=Math.max(best,Math.floor(r.z+r.points));try{localStorage.setItem("cliff-best",best)}catch{}hud()}
function burst(x,y,color,n=12){for(let i=0;i<n;i++)particles.push({x,y,vx:Math.cos(i*2.4)*(20+i*7),vy:Math.sin(i*2.4)*(20+i*7),life:.45+i%4*.1,color});if(particles.length>180)particles.splice(0,particles.length-180)}
function step(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
if(r.phase==="fall"){r.fall+=dt;if(r.fall>1.1){r.phase="lost";save();$("status").textContent="Has caigut! Torna-ho a intentar."}return}
if(r.phase!=="play")return;r.t+=dt;r.hit=Math.max(0,r.hit-dt);
const steer=+keys.has("right")-+keys.has("left"),target=keys.has("brake")?17:keys.has("boost")?82:47;
r.v+=(target-r.v)*Math.min(1,dt*2);r.vx+=(steer*(91+r.v*.65)+Math.sin(r.z*.031)*7-r.vx)*Math.min(1,dt*6);r.x+=r.vx*dt;r.z+=r.v*dt;
if(Math.random()<dt*(r.v*.45))burst(C+(Math.random()-.5)*12,Y+23,"#e6c58d",2);
for(const o of rocks){if(Math.abs(o.z-r.z)<7&&Math.abs(o.x-r.x)<o.r+6&&r.hit===0){r.hit=.65;r.v*=.55;r.vx+=(r.x<o.x?-1:1)*85;burst(C,Y,"#ff9b69",20);$("status").textContent="Pedra! Recupera l’equilibri."}}
for(const o of coins){if(!r.coins.has(o.id)&&Math.abs(o.z-r.z)<10&&Math.abs(o.x-r.x)<16){r.coins.add(o.id);r.points+=100;burst(C,Y-35,"#ffe36c",20);$("status").textContent="+100 punts!"}}
const d=r.x-path(r.z),edge=width(r.z)/2;if(Math.abs(d)>edge-5){r.phase="fall";r.side=Math.sign(d)||1;r.fall=0;burst(C,Y,"#f8cf8f",30);$("status").textContent="Fora del sender!";return}
if(Math.abs(d)>edge-18){r.near+=dt;if(r.near>1){r.points+=25;r.near=0;$("status").textContent="Al límit! +25 punts"}}else r.near=0;
if(r.z>=finish){r.z=finish;r.phase="won";save();$("status").textContent="Refugi assolit!"}hud()}
function proj(x,z){const d=z-r.z,s=clamp(1-d/720,.24,1.25);return [C+(x-r.x)*s,Y-d*.76,s]}
function poly(a,f){g.fillStyle=f;g.beginPath();a.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()}
function line(x,y,a,b,col,w=2){g.strokeStyle=col;g.lineWidth=w;g.lineCap="round";g.beginPath();g.moveTo(x,y);g.lineTo(a,b);g.stroke()}
function oval(x,y,a,b,col){g.fillStyle=col;g.beginPath();g.ellipse(x,y,a,b,0,0,Math.PI*2);g.fill()}
function draw(){const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#83bdb5");sky.addColorStop(.4,"#426b70");sky.addColorStop(1,"#142e3d");g.fillStyle=sky;g.fillRect(0,0,W,H);
oval(765,70,38,38,"#ffe5a0");
for(let layer=0;layer<3;layer++){for(let i=-1;i<7;i++){const x=i*200-(r.x*(.10+layer*.11))%200,y=110+layer*70,h=100+((i+layer+8)%3)*30;poly([[x-130,y+110],[x+40,y-h],[x+230,y+110]],["#719898","#4c777b","#345c68"][layer]);if(layer<2)poly([[x+10,y-h+33],[x+40,y-h],[x+72,y-h+37],[x+45,y-h+25]],"#e2e8d2")}}
for(let i=0;i<12;i++){const x=(i*173+r.x*.23)%1100-80,y=(i*67+r.z*.14)%H;oval(x,y,44,5,"#d6e7d51b")}
const a=[];for(let d=575;d>=-220;d-=7){const z=r.z+d,p=path(z),w=width(z)/2;a.push({z,l:proj(p-w,z),q:proj(p+w,z)})}
for(let i=0;i<a.length-1;i++){const u=a[i],v=a[i+1],[l,y]=u.l,[q,t]=u.q,[L,Y2]=v.l,[Q,T]=v.q;
poly([[l,y],[L,Y2],[L-45,Y2+105],[l-45,y+105]],i%3?"#5f584a":"#746750");poly([[q,t],[Q,T],[Q+53,T+120],[q+53,t+120]],i%4?"#605044":"#856b50");
if(i%5===0){line(l,y,l-45,y+105,"#302f34",2);line(q,t,q+53,t+120,"#302f34",2)}
poly([[l,y],[q,t],[Q,T],[L,Y2]],Math.floor(u.z/16)%2?"#c6a475":"#d0af7c");line(l,y,L,Y2,"#f5d7a1",2);line(q,t,Q,T,"#f5d7a1",2);
if(i%4===0){let f=.25+.5*Math.abs(Math.sin(Math.floor(u.z/14)*12));line(l+(q-l)*f,y,l+(q-l)*f+8,y+2,"#9d7b5066",2)}}
for(const o of [...rocks].reverse()){if(o.z-r.z< -70||o.z-r.z>550)continue;let [x,y,s]=proj(o.x,o.z),k=o.r*s;oval(x+3,y+2,k*1.4,k*.35,"#54453666");poly([[x-k,y],[x-k*.5,y-k],[x+k*.6,y-k*.75],[x+k,y]],"#514b46");poly([[x-k*.5,y-k],[x+k*.6,y-k*.75],[x,y]],"#9e9780")}
for(const o of coins){if(r.coins.has(o.id)||o.z-r.z< -60||o.z-r.z>550)continue;const [x,y,s]=proj(o.x,o.z),w=(.35+.65*Math.abs(Math.cos(r.t*6+o.id)))*8*s;oval(x,y-13*s,w,11*s,"#9b6c2d");oval(x,y-15*s,w*.85,9*s,"#ffe169");line(x,y-19*s,x,y-12*s,"#fff4bc",1.5)}
if(finish-r.z<550){const [x,y,s]=proj(path(finish),finish);line(x-30*s,y,x-30*s,y-65*s,"#f0e7d3",4);line(x+30*s,y,x+30*s,y-65*s,"#f0e7d3",4);g.fillStyle="#164a40";g.fillRect(x-30*s,y-65*s,60*s,18*s);g.fillStyle="white";g.font="bold "+Math.max(8,11*s)+"px system-ui";g.textAlign="center";g.fillText("REFUGI",x,y-52*s)}
if(r.phase==="play"&&r.v>50){for(let i=0;i<12;i++){let x=i%2?W-18-i*4:18+i*4,y=(i*59+r.z*5)%H;line(x,y,x+(i%2?8:-8),y+32+(r.v-50),"#e8efe944",2)}}
for(const p of particles){g.globalAlpha=clamp(p.life*2,0,1);oval(p.x,p.y,2.5,2.5,p.color)}g.globalAlpha=1;rider();
if(["ready","pause","won","lost"].includes(r.phase)){g.fillStyle="#10242dbb";g.fillRect(0,0,W,H);g.textAlign="center";g.fillStyle="#ffdb79";g.font="bold 46px system-ui";g.fillText({ready:"CLIFF RIDER",pause:"PAUSA",lost:"HAS CAIGUT!",won:"REFUGI ASSOLIT!"}[r.phase],C,250);g.fillStyle="#fff";g.font="21px system-ui";g.fillText(r.phase==="ready"?"Domina el sender · controla la velocitat":r.phase==="pause"?"Prem P per continuar":"Prem Reinicia per tornar-hi",C,295)}}
function rider(){const t=r.fall,f=r.phase==="fall"||r.phase==="lost",p=r.z*.22;g.save();g.translate(C+(f?r.side*t*t*180:0),Y+(f?t*t*90:0));g.rotate(f?r.side*t*3:clamp(r.vx/220,-.4,.4)+(r.hit>0?Math.sin(r.t*38)*.12:0));if(f)g.scale(Math.max(.25,1-t*.55),Math.max(.25,1-t*.55));
oval(0,12,19,11,"#18252a55");
for(const y of [-39,11]){oval(0,y,7,16,"#14272e");oval(0,y,3,12,"#739b9c");line(-2,y+Math.sin(p)*9,2,y-Math.sin(p)*9,"#d6e7e0",2)}
line(0,-39,0,11,"#172b31",9);line(0,-39,0,11,"#f3ba45",4);line(-17,-35,17,-35,"#182d35",5);
for(const s of [-1,1]){const a=p+(s===1?0:Math.PI),fy=4+Math.sin(a)*11,fx=s*(8+Math.cos(a)*2);line(0,4,fx,fy,"#ced9cb",2);line(s*6,-3,s*12,-1+Math.cos(a)*5,"#1d3148",8);line(s*12,-1+Math.cos(a)*5,fx,fy,"#304966",7);line(fx,fy,fx,fy+5,"#162b32",6)}
oval(0,-13,13,17,"#19383b");oval(0,-15,11,15,"#2ac0a5");line(-5,-25,-5,-6,"#83ead0",3);for(const s of [-1,1]){line(s*8,-20,s*17,-27,"#174445",8);line(s*17,-27,s*17,-35,"#d8ad83",5);oval(s*17,-35,3,4,"#182b33")}
oval(0,-32,10,12,"#13292e");oval(0,-33,8,10,"#ffd25c");line(-5,-36,5,-36,"#fff2a3",2);line(-6,-29,6,-29,"#26464a",3);g.restore()}
const map={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowDown:"brake",s:"brake",ArrowUp:"boost",w:"boost"};
addEventListener("keydown",e=>{const k=map[e.key]||map[e.key.toLowerCase()];if(k){e.preventDefault();keys.add(k)}if(e.key.toLowerCase()==="p"&&!e.repeat)pause();if(e.key==="Enter"&&!e.repeat&&r.phase!=="play")start()});addEventListener("keyup",e=>keys.delete(map[e.key]||map[e.key.toLowerCase()]));addEventListener("blur",()=>{keys.clear();if(r.phase==="play")pause()});
document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k)});for(const evt of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(evt,()=>keys.delete(k))});
$("start").onclick=start;$("pause").onclick=pause;reset();function frame(t){let dt=Math.min(.05,(t-(last||t))/1000);last=t;step(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);