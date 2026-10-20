(() => {
  'use strict';
  const valid = p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  function segments(route) {
    const lines = route?.geometry?.type === 'MultiLineString' ? route.geometry.coordinates : route?.geometry?.type === 'LineString' ? [route.geometry.coordinates] : [];
    if (!lines.length || lines.some(line => line.length < 2 || line.some(p => !valid(p))) || lines.flat().length > 100000) throw Error('Traçat invàlid o massa gran (màxim 100.000 punts).');
    return lines;
  }
  function parse(text) {
    if (text.length > 10 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('GPX no admès. Màxim 10 MB, sense entitats XML.');
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'gpx') throw Error('El fitxer no és un GPX vàlid.');
    const groups = [...doc.getElementsByTagNameNS('*', 'trkseg')];
    if (!groups.length) groups.push(...doc.getElementsByTagNameNS('*', 'rte'));
    const lines = groups.map(g => [...g.children].filter(n => ['trkpt','rtept'].includes(n.localName)).map(n => {
      if (!n.hasAttribute('lon') || !n.hasAttribute('lat') || !n.getAttribute('lon').trim() || !n.getAttribute('lat').trim()) throw Error('Punt sense coordenades.');
      const p = [Number(n.getAttribute('lon')), Number(n.getAttribute('lat'))];
      const el = n.getElementsByTagNameNS('*','ele')[0];
      if (el && el.textContent.trim() && Number.isFinite(Number(el.textContent))) p.push(Number(el.textContent));
      return p;
    }));
    const route = {type:'Feature',properties:{name:doc.getElementsByTagNameNS('*','name')[0]?.textContent.slice(0,160) || 'Ruta importada',source:'GPX'},geometry:{type:'MultiLineString',coordinates:lines}};
    segments(route); return route;
  }
  function distance(a,b) {
    const rad = n => n * Math.PI / 180;
    const h = Math.sin(rad(b[1]-a[1])/2)**2 + Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(rad(b[0]-a[0])/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }
  function stats(route) {
    let meters=0,up=0,elevation=true;
    for (const line of segments(route)) {
      if(line.some(p=>!Number.isFinite(p[2]))) elevation=false;
      for(let i=1;i<line.length;i++){meters+=distance(line[i-1],line[i]);if(Number.isFinite(line[i][2])&&Number.isFinite(line[i-1][2]))up+=Math.max(0,line[i][2]-line[i-1][2]);}
    }
    return {km:meters/1000,ascent:elevation?Math.round(up):null};
  }
  const escape = s => String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function serialize(route) {
    return '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="BiciPark" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>'+escape(route.properties?.name||'BiciPark')+'</name>'+segments(route).map(line=>'<trkseg>'+line.map(p=>`<trkpt lat="${p[1]}" lon="${p[0]}">${Number.isFinite(p[2])?`<ele>${p[2]}</ele>`:''}</trkpt>`).join('')+'</trkseg>').join('')+'</trk></gpx>';
  }
  window.BiciParkGPX={parse,stats,serialize,segments};
  window.BiciParkCore?.registerModule({id:'gpx',version:'1.0.0',api:window.BiciParkGPX});
})();
