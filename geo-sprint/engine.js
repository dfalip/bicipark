// Pure, side-effect-free GeoSprint rules; used by the browser and regression tests.
const EARTH_RADIUS_KM = 6371;
export const ROUNDS = 5;

export function haversineKm(a, b) {
  if (![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite)) {
    throw new TypeError("Coordinates must be finite numbers");
  }
  if (Math.abs(a.lat)>90 || Math.abs(b.lat)>90 || Math.abs(a.lng)>180 || Math.abs(b.lng)>180) {
    throw new RangeError("Coordinates outside WGS84 limits");
  }
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(b.lat-a.lat);
  const dLon = rad(b.lng-a.lng);
  const hav = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1,Math.sqrt(Math.max(0,hav))));
}

export function scoreForGuess(kilometres, usedHint=false) {
  if (!Number.isFinite(kilometres) || kilometres<0) throw new RangeError("Invalid distance");
  const base = kilometres<=20 ? 1000 : Math.round(1000 / (1 + (kilometres/500)**1.2));
  return Math.max(0,Math.min(1000,Math.round(base*(usedHint ? 0.8 : 1))));
}

export function chooseRoundCities(cities, count=ROUNDS, random=Math.random) {
  if (!Array.isArray(cities) || cities.length<count || count<1) throw new RangeError("Not enough cities");
  const byContinent = new Map();
  for (const city of cities) {
    if (!city?.id || !city.continent) throw new TypeError("Invalid city entry");
    const pool=byContinent.get(city.continent)||[];
    pool.push(city);
    byContinent.set(city.continent,pool);
  }
  const shuffled = array => {
    const output=array.slice();
    for (let i=output.length-1;i>0;i--) {
      const r=random();
      if (!Number.isFinite(r) || r<0 || r>=1) throw new RangeError("Random source must return [0, 1)");
      const j=Math.floor(r*(i+1));
      [output[i],output[j]]=[output[j],output[i]];
    }
    return output;
  };
  const continents=shuffled([...byContinent.keys()]);
  const result=[];
  for (const continent of continents) {
    if (result.length===count) break;
    result.push(shuffled(byContinent.get(continent))[0]);
  }
  if(result.length<count) {
    const picked=new Set(result.map(city=>city.id));
    const remaining=shuffled(cities.filter(city=>!picked.has(city.id)));
    result.push(...remaining.slice(0,count-result.length));
  }
  return result;
}
