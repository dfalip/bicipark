// BikeJump FLOW is a distinct, optional learning/arcade ruleset.
// All coordinates remain in the same physics world; no invented metres.
import {getLandingY,getLandingAngle,clamp} from "./physics.js";
export const FLOW_RUN_SECONDS=1.55;
export const RING_POINTS=350;
export function makeFlowRings(level){
  return [
    {x:level.takeoffPoint.x+170,y:level.takeoffPoint.y-44,r:25,collected:false},
    {x:level.takeoffPoint.x+318,y:level.takeoffPoint.y-8,r:26,collected:false},
    {x:level.takeoffPoint.x+465,y:level.takeoffPoint.y+66,r:27,collected:false}
  ];
}
export function collectFlowRings(rings,bike){
  let collected=0;
  for(const ring of rings){
    if(ring.collected)continue;
    const distance=Math.hypot(ring.x-bike.x,ring.y-bike.y);
    if(distance<ring.r+21){
      ring.collected=true;collected++;
    }
  }
  return collected;
}
export function predictLanding(level,bike,wind=0){
  if(!bike||!Number.isFinite(bike.velocityX)||!Number.isFinite(bike.velocityY))return null;
  let x=bike.x,y=bike.y,vx=bike.velocityX,vy=bike.velocityY;
  const dt=1/60;
  for(let i=0;i<300;i++){
    vy+=level.gravity*dt;
    vx+=(wind*.42-vx*level.airResistance)*dt;
    x+=vx*dt;y+=vy*dt;
    if(x>=level.landingStartX && vy>0 && y>=getLandingY(level,x)-8){
      return {x,y:getLandingY(level,x)-8,
        slopeAngle:getLandingAngle(level,x),
        distanceMeters:clamp((x-level.takeoffPoint.x)*level.distanceScale,0,level.maximumDistanceMeters)};
    }
    if(x>level.takeoffPoint.x+level.maximumDistanceMeters/level.distanceScale+270 ||
       y>1100)return null;
  }
  return null;
}
