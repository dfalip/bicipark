(() => {
 'use strict';
 const shapes={sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',cloud:'<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11Z"/>',partly:'<circle cx="7" cy="6" r="4"/><path d="M6 20a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10Z"/>',rain:'<path d="M4 13a4 4 0 0 1 0-8 6 6 0 0 1 11-1 5 5 0 0 1 3 9M6 17l-1 4m7-4-1 4m7-4-1 4"/>',storm:'<path d="M4 13a4 4 0 0 1 0-8 6 6 0 0 1 11-1 5 5 0 0 1 3 9M13 12l-4 6h5l-3 6"/>',snow:'<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3"/>',fog:'<path d="M4 10a4 4 0 0 1 0-8 6 6 0 0 1 11 0 5 5 0 0 1 4 8M2 14h20M4 18h16M7 22h10"/>',wind:'<path d="M2 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 17h6a3 3 0 1 1-3 3"/>',unknown:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 2l-2 2v2m0 3v1"/>'};
 function condition(code,isDay=true){
  if(code===null||code===undefined||code==='')return {key:'unknown',label:'Previsió no disponible'};
  const c=Number(code);if(!Number.isInteger(c))return {key:'unknown',label:'Previsió no disponible'};
  if(c===0)return isDay?{key:'sun',label:'Sol'}:{key:'moon',label:'Cel serè de nit'};
  if(c===1||c===2)return {key:'partly',label:'Parcialment ennuvolat'};
  if(c===3)return {key:'cloud',label:'Ennuvolat'};
  if([45,48].includes(c))return {key:'fog',label:'Boira'};
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c))return {key:'rain',label:'Pluja'};
  if([71,73,75,77,85,86].includes(c))return {key:'snow',label:'Neu'};
  if([95,96,99].includes(c))return {key:'storm',label:'Tempesta'};
  return {key:'unknown',label:'Previsió no disponible'};
 }
 function icon(key,label){return `<svg class="bp-weather-icon" role="img" aria-label="${label}" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0"><title>${label}</title>${shapes[key]||shapes.unknown}</svg>`}
 function html(code,wind,isDay=true){const c=condition(code,isDay);return `<span class="bp-weather-condition" style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">${icon(c.key,c.label)}<span>${c.label}</span>${wind!==null&&wind!==undefined&&Number.isFinite(Number(wind))&&Number(wind)>=30?icon('wind','Vent igual o superior a 30 km/h'):''}</span>`}
 window.BiciParkWeatherIcons={condition,icon,html};
})();
