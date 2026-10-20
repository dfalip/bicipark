(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.BiciParkRideStore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const ACTIVITY_KEY="bicipark.activityHistory.v1";
  const BIKE_KEY="bicipark.myBike.v1";

  const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
  const round=(value,digits=1)=>{const p=10**digits;return Math.round(Number(value||0)*p)/p};
  const pad=value=>String(value).padStart(2,"0");

  function readJson(storage,key,fallback){
    try{const raw=storage.getItem(key);return raw?JSON.parse(raw):fallback}catch(_){return fallback}
  }

  function readActivities(storage){
    const raw=readJson(storage,ACTIVITY_KEY,[]);
    if(Array.isArray(raw))return raw;
    if(Array.isArray(raw?.activities))return raw.activities;
    if(Array.isArray(raw?.items))return raw.items;
    return [];
  }

  function writeActivities(storage,list){
    storage.setItem(ACTIVITY_KEY,JSON.stringify(list));
    if(typeof window!=="undefined"&&window.dispatchEvent){
      window.dispatchEvent(new CustomEvent("bicipark:activity-history:updated",{detail:{activities:list}}));
    }
    return list;
  }

  function localParts(timestamp){
    const d=new Date(timestamp);
    return {
      date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
      time:`${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  }

  function formatDuration(ms){
    const total=Math.max(0,Math.round(Number(ms||0)/60000));
    const h=Math.floor(total/60),m=total%60;
    return h?`${h}:${pad(m)} h`:`${m} min`;
  }

  function compressTrack(points=[]){
    if(!Array.isArray(points)||!points.length)return [];
    const out=[];
    let last=null;
    for(const point of points){
      if(!point||!finite(point.lat)||!finite(point.lng)||!finite(point.timestamp))continue;
      const current={
        lat:round(point.lat,5),
        lng:round(point.lng,5),
        t:Math.round(Number(point.timestamp)),
        ...(finite(point.altitude)?{ele:round(point.altitude,1)}:{})
      };
      if(!last||current.t-last.t>=5000||Math.abs(current.lat-last.lat)>=0.00012||Math.abs(current.lng-last.lng)>=0.00012){
        out.push(current);last=current;
      }
    }
    const finalPoint=points[points.length-1];
    if(finalPoint&&finite(finalPoint.lat)&&finite(finalPoint.lng)&&finite(finalPoint.timestamp)){
      const final={lat:round(finalPoint.lat,5),lng:round(finalPoint.lng,5),t:Math.round(Number(finalPoint.timestamp)),...(finite(finalPoint.altitude)?{ele:round(finalPoint.altitude,1)}:{})};
      if(!out.length||out[out.length-1].t!==final.t)out.push(final);
    }
    return out;
  }

  function buildActivity(summary,bike=null,name="BiciPark Ride"){
    const startedAt=summary.startedAt||Date.now();
    const endedAt=summary.endedAt||Date.now();
    const parts=localParts(startedAt);
    const id=`ride-${startedAt}-${Math.random().toString(16).slice(2,8)}`;
    return {
      id,
      demo:false,
      source:"bicipark-ride",
      date:parts.date,
      time:parts.time,
      startedAt:new Date(startedAt).toISOString(),
      endedAt:new Date(endedAt).toISOString(),
      name:String(name||"BiciPark Ride").trim().slice(0,90),
      location:"GPS",
      type:bike?.modality||"Ciclisme",
      bikeId:bike?.id||null,
      distanceKm:round(summary.distanceKm,2),
      ascentM:Math.max(0,Math.round(Number(summary.ascentM||0))),
      duration:formatDuration(summary.movingMs),
      elapsedDuration:formatDuration(summary.elapsedMs),
      movingSeconds:Math.round(Number(summary.movingMs||0)/1000),
      stoppedSeconds:Math.round(Number(summary.stoppedMs||0)/1000),
      avgSpeedKmh:round(summary.avgSpeedKmh,1),
      maxSpeedKmh:round(summary.maxSpeedKmh,1),
      difficulty:"",
      feeling:4,
      matchScore:75,
      planRelation:"",
      planSession:"",
      track:compressTrack(summary.points)
    };
  }

  function appendActivity(storage,activity){
    let list=readActivities(storage).filter(item=>item&&item.demo!==true);
    if(!list.some(item=>item.id===activity.id))list.push(activity);
    writeActivities(storage,list);
    return list;
  }

  function readBikeStore(storage){
    const raw=readJson(storage,BIKE_KEY,null);
    return raw&&Array.isArray(raw.bikes)?raw:null;
  }

  function activeBike(storage){
    const store=readBikeStore(storage);
    if(!store)return null;
    return store.bikes.find(b=>b.id===store.activeBikeId)||store.bikes[0]||null;
  }

  function applyMileage(storage,bikeId,distanceKm,activityId){
    const store=readBikeStore(storage);
    if(!store||!bikeId||!finite(distanceKm)||Number(distanceKm)<0)return {updated:false,reason:"invalid",store};
    const bike=store.bikes.find(item=>item.id===bikeId);
    if(!bike)return {updated:false,reason:"bike-not-found",store};
    const applied=Array.isArray(bike.rideActivityIds)?bike.rideActivityIds.slice():[];
    if(activityId&&applied.includes(activityId))return {updated:false,reason:"already-applied",store};
    const current=finite(bike.odometerKm)?Number(bike.odometerKm):0;
    bike.odometerKm=round(current+Number(distanceKm),2);
    if(activityId)applied.push(activityId);
    bike.rideActivityIds=applied.slice(-200);
    bike.updatedAt=new Date().toISOString();
    storage.setItem(BIKE_KEY,JSON.stringify(store));
    if(typeof window!=="undefined"&&window.dispatchEvent){
      window.dispatchEvent(new CustomEvent("bicipark:my-bike:changed",{detail:store}));
    }
    return {updated:true,bike,store};
  }

  return {ACTIVITY_KEY,BIKE_KEY,readActivities,writeActivities,compressTrack,buildActivity,appendActivity,readBikeStore,activeBike,applyMileage,formatDuration};
});
