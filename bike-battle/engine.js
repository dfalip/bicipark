(function(root){
'use strict';
const W=800,H=400;
const ground=x=>320+24*Math.sin(x/95)+12*Math.cos(x/43);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(){return {riders:[{x:100,hp:100},{x:690,hp:100}],turn:0,move:65,shot:null,winner:null,round:1};}
function move(s,dx){if(s.shot||s.winner!==null||!Number.isFinite(dx))return;const p=s.riders[s.turn],d=clamp(dx,-s.move,s.move),x=clamp(p.x+d,s.turn?410:30,s.turn?770:390);s.move-=Math.abs(x-p.x);p.x=x;}
function fire(s,angle,power){if(s.shot||s.winner!==null||!Number.isFinite(angle)||!Number.isFinite(power))return false;const p=s.riders[s.turn],a=clamp(angle,10,85)*Math.PI/180,v=clamp(power,10,100)*5.5,dir=s.turn?-1:1;s.shot={x:p.x,y:ground(p.x)-20,vx:dir*v*Math.cos(a),vy:-v*Math.sin(a),age:0};return true;}
function tick(s,dt){if(!s.shot||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,.1);while(remaining>0&&s.shot){const h=Math.min(remaining,1/240),q=s.shot;q.vy+=260*h;q.x+=q.vx*h;q.y+=q.vy*h;q.age+=h;remaining-=h;const target=s.riders[1-s.turn],hit=Math.hypot(q.x-target.x,q.y-(ground(target.x)-16))<22;const landed=q.y>=ground(clamp(q.x,0,W));if(hit||landed||q.x<0||q.x>W||q.age>10){if(hit||landed){const d=Math.hypot(q.x-target.x,q.y-(ground(target.x)-16));target.hp=Math.max(0,target.hp-(hit?35:Math.max(0,Math.round(30-d*.65))));}s.shot=null;if(!target.hp){s.winner=s.turn;return;}s.turn=1-s.turn;s.move=65;if(!s.turn)s.round++;}}}
function aim(s){const p=s.riders[1],t=s.riders[0];let best={error:Infinity,angle:45,power:70};for(let angle=25;angle<=75;angle+=5)for(let power=30;power<=100;power+=2){const a=angle*Math.PI/180,v=power*5.5,dx=p.x-t.x,time=dx/(v*Math.cos(a)),y=ground(p.x)-20-v*Math.sin(a)*time+130*time*time,error=Math.abs(y-(ground(t.x)-16));if(error<best.error)best={error,angle,power};}return best;}
const api={W,H,ground,create,move,fire,tick,aim};if(typeof module==='object')module.exports=api;else root.BikeBattle=api;
})(typeof globalThis==='object'?globalThis:this);
