(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.BiciParkRideEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const DEFAULTS={
    maxAccuracyM:60,
    maxPlausibleSpeedKmh:120,
    movingThresholdKmh:2.5,
    jitterDistanceM:2,
    smoothingSamples:5,
    elevationNoiseM:3
  };

  const rad=deg=>deg*Math.PI/180;
  const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));

  function haversineMeters(a,b){
    const R=6371000;
    const dLat=rad(Number(b.lat)-Number(a.lat));
    const dLng=rad(Number(b.lng)-Number(a.lng));
    const x=Math.sin(dLat/2)**2+Math.cos(rad(Number(a.lat)))*Math.cos(rad(Number(b.lat)))*Math.sin(dLng/2)**2;
    return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
  }

  function normalizePoint(point={}){
    const lat=Number(point.lat??point.latitude);
    const lng=Number(point.lng??point.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
    const accuracy=finite(point.accuracy)?Math.max(0,Number(point.accuracy)):null;
    const speedMps=finite(point.speed)?Math.max(0,Number(point.speed)):null;
    const altitude=finite(point.altitude)?Number(point.altitude):null;
    const timestamp=finite(point.timestamp)?Number(point.timestamp):Date.now();
    return {lat,lng,accuracy,speedMps,altitude,timestamp};
  }

  function round(value,digits=1){
    const n=Number(value);
    if(!Number.isFinite(n))return 0;
    const p=10**digits;
    return Math.round(n*p)/p;
  }

  class RideTracker{
    constructor(options={}){
      this.options={...DEFAULTS,...options};
      this.reset();
    }

    reset(){
      this.startedAt=null;
      this.endedAt=null;
      this.lastPoint=null;
      this.points=[];
      this.distanceM=0;
      this.movingMs=0;
      this.stoppedMs=0;
      this.ascentM=0;
      this.maxSpeedKmh=0;
      this.currentSpeedKmh=0;
      this.speedWindow=[];
      this.paused=false;
      this.finished=false;
      this.acceptedCount=0;
      this.rejectedCount=0;
      return this;
    }

    start(timestamp=Date.now()){
      if(this.startedAt==null)this.startedAt=Number(timestamp)||Date.now();
      this.finished=false;
      return this.snapshot(timestamp);
    }

    pause(timestamp=Date.now()){
      if(this.finished||this.paused)return this.snapshot(timestamp);
      this.paused=true;
      this.currentSpeedKmh=0;
      this.speedWindow=[];
      this.lastPoint=null;
      return this.snapshot(timestamp);
    }

    resume(timestamp=Date.now()){
      if(this.finished||!this.paused)return this.snapshot(timestamp);
      this.paused=false;
      this.lastPoint=null;
      return this.snapshot(timestamp);
    }

    finish(timestamp=Date.now()){
      if(this.startedAt==null)this.start(timestamp);
      this.endedAt=Number(timestamp)||Date.now();
      this.finished=true;
      this.paused=false;
      this.currentSpeedKmh=0;
      return this.snapshot(this.endedAt);
    }

    ingest(rawPoint){
      if(this.finished)return {accepted:false,reason:"finished",snapshot:this.snapshot()};
      const point=normalizePoint(rawPoint);
      if(!point){this.rejectedCount++;return {accepted:false,reason:"invalid",snapshot:this.snapshot()};}
      if(this.startedAt==null)this.start(point.timestamp);
      if(point.accuracy!=null&&point.accuracy>this.options.maxAccuracyM){
        this.rejectedCount++;
        return {accepted:false,reason:"accuracy",snapshot:this.snapshot(point.timestamp)};
      }
      if(this.paused){
        this.currentSpeedKmh=0;
        return {accepted:false,reason:"paused",snapshot:this.snapshot(point.timestamp)};
      }

      if(!this.lastPoint){
        this.lastPoint=point;
        this.points.push(point);
        this.acceptedCount++;
        return {accepted:true,reason:"first",point,snapshot:this.snapshot(point.timestamp)};
      }

      const dtMs=point.timestamp-this.lastPoint.timestamp;
      if(dtMs<=0){this.rejectedCount++;return {accepted:false,reason:"timestamp",snapshot:this.snapshot(point.timestamp)};}
      const segmentM=haversineMeters(this.lastPoint,point);
      const segmentSpeedKmh=(segmentM/(dtMs/1000))*3.6;
      if(!Number.isFinite(segmentSpeedKmh)||segmentSpeedKmh>this.options.maxPlausibleSpeedKmh){
        this.rejectedCount++;
        return {accepted:false,reason:"jump",snapshot:this.snapshot(point.timestamp)};
      }

      let rawSpeedKmh=point.speedMps!=null?point.speedMps*3.6:segmentSpeedKmh;
      if(rawSpeedKmh>this.options.maxPlausibleSpeedKmh)rawSpeedKmh=segmentSpeedKmh;
      rawSpeedKmh=Math.max(0,rawSpeedKmh);
      const moving=rawSpeedKmh>=this.options.movingThresholdKmh||segmentSpeedKmh>=this.options.movingThresholdKmh;

      if(moving&&segmentM>=this.options.jitterDistanceM)this.distanceM+=segmentM;
      if(moving)this.movingMs+=dtMs;else this.stoppedMs+=dtMs;

      if(moving&&point.altitude!=null&&this.lastPoint.altitude!=null){
        const gain=point.altitude-this.lastPoint.altitude;
        if(gain>=this.options.elevationNoiseM&&gain<60)this.ascentM+=gain;
      }

      this.speedWindow.push(moving?rawSpeedKmh:0);
      while(this.speedWindow.length>this.options.smoothingSamples)this.speedWindow.shift();
      this.currentSpeedKmh=this.speedWindow.reduce((a,b)=>a+b,0)/Math.max(1,this.speedWindow.length);
      if(moving)this.maxSpeedKmh=Math.max(this.maxSpeedKmh,rawSpeedKmh);

      this.lastPoint=point;
      this.points.push(point);
      this.acceptedCount++;
      return {accepted:true,reason:moving?"moving":"stopped",point,segmentM,rawSpeedKmh,snapshot:this.snapshot(point.timestamp)};
    }

    snapshot(now=Date.now()){
      const reference=this.endedAt??Number(now)??Date.now();
      const elapsedMs=this.startedAt==null?0:Math.max(0,reference-this.startedAt);
      const avgSpeedKmh=this.movingMs>0?(this.distanceM/(this.movingMs/1000))*3.6:0;
      return {
        startedAt:this.startedAt,
        endedAt:this.endedAt,
        paused:this.paused,
        finished:this.finished,
        distanceKm:round(this.distanceM/1000,2),
        distanceM:round(this.distanceM,1),
        currentSpeedKmh:round(this.currentSpeedKmh,1),
        avgSpeedKmh:round(avgSpeedKmh,1),
        maxSpeedKmh:round(this.maxSpeedKmh,1),
        ascentM:Math.round(this.ascentM),
        elapsedMs,
        movingMs:this.movingMs,
        stoppedMs:this.stoppedMs,
        acceptedCount:this.acceptedCount,
        rejectedCount:this.rejectedCount,
        points:this.points.slice()
      };
    }
  }

  return {DEFAULTS,haversineMeters,normalizePoint,RideTracker};
});
