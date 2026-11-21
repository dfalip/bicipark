/**
 * Browser-safe, read-only elevation profile from actual track coordinates.
 * Never interpolates elevation or draws a line between different segments.
 */
const EARTH_METERS = 6371008.8;
const fail = reason => ({ status: 'invalid', reason, samples: [],
  distanceMeters: null, elevationPointCount: null, pointCount: null,
  segmentCount: null, hasCompleteElevation: false, hasDiscontinuities: null,
  minimumElevation: null, maximumElevation: null });
function segmentsFrom(geometry) {
  if (geometry?.kind === 'polylines') {
    if (!Array.isArray(geometry.profileSegments)) return null;
    return geometry.profileSegments.map(s => Array.isArray(s)
      ? s.map(p => p && [p.lng, p.lat, p.elevation == null ? null : p.elevation]) : null);
  }
  if (geometry?.kind !== 'geojson') return null;
  let g = geometry.data;
  if (g?.type === 'FeatureCollection') {
    if (!Array.isArray(g.features) || g.features.length !== 1) return null;
    g = g.features[0];
  }
  if (g?.type === 'Feature') g = g.geometry;
  if (g?.type === 'LineString') return [g.coordinates];
  if (g?.type === 'MultiLineString') return g.coordinates;
  return null;
}
function horizontalDistance(a,b) {
  const rad=Math.PI/180;
  const h=Math.sin((b[1]-a[1])*rad/2)**2+
    Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2;
  return 2*EARTH_METERS*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function deriveRouteElevationDisplay(input, options = {}) {
  const maxPoints=options?.maxPoints === undefined ? 100000 : options.maxPoints;
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 2) return fail('invalid_limit');
  const lines=segmentsFrom(input);
  if (!Array.isArray(lines) || lines.length===0) return fail('unsupported_geometry');
  const clean=[];let count=0;
  for(const segment of lines) {
    if(!Array.isArray(segment)||segment.length<2) return fail('short_segment');
    count += segment.length;
    if(count>maxPoints) return fail('point_limit');
    const points=[];
    for(const p of segment) {
      if(!Array.isArray(p)||(p.length!==2&&p.length!==3)||
         !Number.isFinite(p[0])||!Number.isFinite(p[1])||
         p[0]<-180||p[0]>180||p[1]<-90||p[1]>90||
         (p.length===3&&p[2]!==null&&!Number.isFinite(p[2]))) return fail('invalid_coordinate');
      points.push([p[0],p[1],p.length===3?p[2]:null]);
    }
    clean.push(points);
  }
  const samples=[];let cumulative=0,gotElevation=0,min=Infinity,max=-Infinity;
  let lastEnd=null,hasDiscontinuities=false;
  clean.forEach((line,segmentIndex)=>{
    let segmentDistance=0;
    line.forEach((p,pointIndex)=>{
      if(pointIndex) {
        const step=horizontalDistance(line[pointIndex-1],p);
        segmentDistance+=step;cumulative+=step;
      }
      const startsDiscontinuity=pointIndex===0&&lastEnd!==null&&
        (lastEnd[0]!==p[0]||lastEnd[1]!==p[1]);
      if(startsDiscontinuity)hasDiscontinuities=true;
      if(p[2]!==null) {gotElevation++;min=Math.min(min,p[2]);max=Math.max(max,p[2]);}
      samples.push({longitude:p[0],latitude:p[1],elevationMeters:p[2],
        distanceMeters:cumulative,segmentDistanceMeters:segmentDistance,
        segmentIndex,pointIndex,startsDiscontinuity});
    });
    lastEnd=line[line.length-1];
  });
  const status=gotElevation===0?'missing':gotElevation<count?'partial':
    cumulative<=0?'stationary':'complete';
  return {status,reason:null,samples,distanceMeters:cumulative,
    elevationPointCount:gotElevation,pointCount:count,segmentCount:clean.length,
    hasCompleteElevation:gotElevation===count,hasDiscontinuities,
    minimumElevation:gotElevation?min:null,maximumElevation:gotElevation?max:null};
}
