// BikeJump 3.1: deterministic cinematic presentation.
// This module NEVER alters the point system, collision geometry or official
// distance: it maps already-classified physical outcomes to visible motion.
import {clamp, getLandingY, normalizeAngle} from "./physics.js";

export function landingStory(landing, bike) {
  const difference = normalizeAngle(bike.rotation - landing.slopeAngle);
  const direction = difference >= 0 ? "forward" : "backward";
  if (landing.crashed) return {
    kind:"crash", direction, duration:1.65,
    label:direction==="forward"?"Caiguda de morro":"Caiguda cap enrere",
    description:direction==="forward"
      ?"La roda davantera ha clavat l'aterratge. Mira la caiguda i prova d'inclinar menys la bici."
      :"La bicicleta ha arribat massa aixecada i ha bolcat enrere. Corregeix l'angle durant el vol."
  };
  if (landing.score < 1000) return {
    kind:"rough", direction, duration:1.18,
    label:"Aterratge inestable",
    description:direction==="forward"
      ?"La roda davantera ha picat fort: la bicicleta ha rebotat abans de recuperar l'equilibri."
      :"La roda posterior ha tocat massa aviat: un rebot fort t'ha desequilibrat."
  };
  if (landing.score < 2000) return {
    kind:"clean", direction, duration:.9,
    label:"Bon aterratge",
    description:"Les rodes han tocat la pendent i la bicicleta s'ha estabilitzat amb una petita compressió."
  };
  return {
    kind:"perfect", direction, duration:.82,
    label:"Aterratge perfecte",
    description:"Aterratge net, suspensió comprimida i bona continuïtat sobre la pendent."
  };
}

export function landingPose({level, story, initial, elapsed}) {
  const t=clamp(elapsed/story.duration,0,1);
  const slow=1-Math.pow(1-t,3);
  const groundAtStart=getLandingY(level,initial.x)-8;
  const sign=story.direction==="forward"?1:-1;
  const speed=clamp(Math.abs(initial.velocityX||170),70,380);
  const slide=story.kind==="crash"?speed*.26:
    story.kind==="rough"?speed*.22:speed*.31;
  const x=initial.x+slide*slow;
  const ground=getLandingY(level,x)-8;
  const angle=Math.atan(level.landingSlope+2*level.landingCurve*Math.max(0,x-level.landingStartX));
  const offset=normalizeAngle(initial.rotation-angle);
  const envelope=Math.exp(-4.5*t);
  let rotation, bounce, compression;
  if(story.kind==="crash"){
    rotation=initial.rotation+sign*(.28*t+2.0*slow);
    bounce=Math.abs(Math.sin(t*Math.PI*2))*Math.exp(-2.4*t)*12;
    compression=0;
  }else if(story.kind==="rough"){
    rotation=angle+offset*Math.exp(-4*t)+Math.sin(t*Math.PI*5)*envelope*.29;
    bounce=Math.abs(Math.sin(t*Math.PI*3.6))*Math.exp(-2.6*t)*16;
    compression=clamp(Math.abs(Math.sin(t*Math.PI*3.3))*9*(1-t),0,9);
  }else{
    rotation=angle+offset*Math.exp(-6*t);
    bounce=Math.max(0,Math.sin(t*Math.PI*2))*Math.exp(-5*t)*(story.kind==="perfect"?3:6);
    compression=Math.max(0,Math.sin(t*Math.PI))*Math.exp(-2.2*t)*(story.kind==="perfect"?9:6);
  }
  const dust=(story.kind==="crash"?1:story.kind==="rough"?.75:.4)*Math.exp(-1.6*t);
  const rider=story.kind==="crash"?{
    x:initial.x+slide*slow+sign*(18+75*slow),
    // Deterministic arcade tumble, visually separate from the bike frame.
    y:groundAtStart-24-57*Math.sin(Math.PI*t)+Math.max(0,ground-groundAtStart)*t,
    rotation:sign*(.15+3.5*slow)
  }:null;
  return {x,y:ground-bounce+compression*.35,rotation,bounce,compression,
    wheelSpin:initial.wheelSpin+Math.max(0,x-initial.x)/11,
    dust,shake:(story.kind==="crash"?10:story.kind==="rough"?5:2)*Math.exp(-7*t),
    rider,progress:t};
}

export function flightReadout(level,bike){
  if(!bike)return {distanceMeters:0,clearanceMeters:0};
  const distanceMeters=clamp(
    Math.max(0,bike.x-level.takeoffPoint.x)*level.distanceScale,
    0,level.maximumDistanceMeters);
  const groundX=Math.max(level.landingStartX,bike.x);
  // Approximate arcade-world vertical clearance, not GPS / real elevation.
  const clearanceMeters=Math.max(0,getLandingY(level,groundX)-bike.y)*level.distanceScale;
  return {distanceMeters,clearanceMeters};
}

export function cinematicCamera({phase,bike,level,width=1000,height=560}) {
  const neutral={x:width/2,y:height/2,zoom:1};
  if(!bike || (phase!=="flight" && phase!=="impact"))return neutral;
  const runway=flightReadout(level,bike);
  const travel=clamp((bike.x-level.takeoffPoint.x)/480,0,1);
  const altitude=clamp(runway.clearanceMeters/55,0,1);
  if(phase==="impact")return {
    x:bike.x+38,y:getLandingY(level,bike.x)-100,zoom:.87
  };
  return {
    x:width/2+(bike.x-width/2)*.88,
    y:height/2+(bike.y-height/2)*.48+14*altitude,
    zoom:clamp(1-.22*altitude-.08*travel,.72,1)
  };
}

export function easeCamera(current,target,seconds){
  const factor=clamp(1-Math.exp(-3.8*Math.max(0,seconds)),0,1);
  return {x:current.x+(target.x-current.x)*factor,
    y:current.y+(target.y-current.y)*factor,
    zoom:current.zoom+(target.zoom-current.zoom)*factor};
}
