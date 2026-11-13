// World-wide OSM bicycle services, small *user initiated* queries only.
// Not a global catalogue: absence of a result is NOT evidence of absence.
export const SEARCH_RADIUS_METERS = 900;
export const MAX_RESULTS = 150;
export const SERVICE_TYPES = Object.freeze({
  bicycle_parking:{label:"Aparcaments",icon:"🅿️"},
  bicycle_repair_station:{label:"Punts de reparació",icon:"🛠️"},
  drinking_water:{label:"Aigua potable",icon:"💧"},
  bicycle_rental:{label:"Lloguer de bicicletes",icon:"🚲"},
  bicycle_shop:{label:"Botigues de bicicletes",icon:"🏪"}
});
export function validateCoords(lat,lng) {
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
}
export function buildOverpassQuery(lat,lng,radius=SEARCH_RADIUS_METERS) {
  if(!validateCoords(lat,lng))throw new RangeError("Invalid coordinates");
  if(!Number.isInteger(radius)||radius<100||radius>1200)throw new RangeError("Unsafe search radius");
  const position=`${radius},${lat.toFixed(5)},${lng.toFixed(5)}`;
  return `[out:json][timeout:12][maxsize:16000000];
(
  nwr(around:${position})["amenity"~"^(bicycle_parking|bicycle_repair_station|drinking_water|bicycle_rental)$"];
  nwr(around:${position})["shop"="bicycle"];
);
out center ${MAX_RESULTS};`;
}
export function normalizeOsmElement(raw) {
  if(!raw||!["node","way","relation"].includes(raw.type)||!Number.isInteger(raw.id)||raw.id<=0)return null;
  const lat=raw.type==="node"?raw.lat:raw.center?.lat;
  const lng=raw.type==="node"?raw.lon:raw.center?.lon;
  if(!validateCoords(lat,lng))return null;
  const tags=raw.tags||{};
  const type=tags.shop==="bicycle" ? "bicycle_shop" :
    Object.hasOwn(SERVICE_TYPES,tags.amenity) ? tags.amenity : null;
  if(!type)return null;
  // Use a minimal allowlist; never interpret untrusted OSM text as HTML.
  const name=typeof tags.name==="string"&&tags.name.trim()?
    tags.name.trim().slice(0,120):SERVICE_TYPES[type].label;
  return {id:`${raw.type}/${raw.id}`,type,name,lat,lng,
    sourceUrl:`https://www.openstreetmap.org/${raw.type}/${raw.id}`};
}
export function normalizeOverpassResponse(data) {
  if(!data||!Array.isArray(data.elements))throw new TypeError("Invalid provider response");
  const seen=new Set();
  const places=[];
  for(const element of data.elements.slice(0,MAX_RESULTS)) {
    const item=normalizeOsmElement(element);
    if(item&&!seen.has(item.id)){seen.add(item.id);places.push(item);}
  }
  return {places,sourceTimestamp:typeof data.osm3s?.timestamp_osm_base==="string"?
    data.osm3s.timestamp_osm_base:null,
    truncated:data.elements.length>=MAX_RESULTS};
}
