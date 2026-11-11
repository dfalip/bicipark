import {loadRouteGeometry} from '../modules/geometry-loader.js';
import {deriveRouteElevationDisplay} from '../modules/elevation-profile-v2.mjs';

const details=document.getElementById('routeDetails');
const COPY={
 ca:{title:"Perfil d'elevació",loading:"Carregant altitud del track…",missing:"Aquest fitxer no inclou altitud. No es mostra un perfil inventat.",partial:"Altitud disponible només en part de la ruta. No es dibuixa un perfil incomplet.",invalid:"Geometria no vàlida per dibuixar un perfil fiable.",stationary:"El track no té prou distància horitzontal.",error:"No s'ha pogut carregar el perfil.",source:"Altitud inclosa al fitxer de ruta; no contrastada independentment.",gaps:"Hi ha trams desconnectats: no es dibuixa una connexió fictícia.",label:"Punt del perfil. Utilitza les fletxes per explorar el track."},
 es:{title:"Perfil de elevación",loading:"Cargando altitud del track…",missing:"El archivo no incluye altitud. No se muestra un perfil inventado.",partial:"Altitud disponible solo en parte de la ruta. No se dibuja un perfil incompleto.",invalid:"Geometría no válida para un perfil fiable.",stationary:"El track no tiene distancia horizontal suficiente.",error:"No se pudo cargar el perfil.",source:"Altitud incluida en el archivo de ruta; no contrastada independientemente.",gaps:"Hay tramos desconectados: no se dibuja una conexión ficticia.",label:"Punto del perfil. Usa las flechas para explorar el track."},
 en:{title:"Elevation profile",loading:"Loading track elevation…",missing:"The track has no elevation. No invented profile is displayed.",partial:"Elevation is only available for part of the route. The incomplete profile is hidden.",invalid:"Invalid track geometry; no reliable profile is shown.",stationary:"The track has insufficient horizontal distance.",error:"Could not load the profile.",source:"Elevation included in the route file; not independently verified.",gaps:"Disconnected segments are not joined.",label:"Profile point. Use arrow keys to explore the track."},
 fr:{title:"Profil altimétrique",loading:"Chargement de l'altitude…",missing:"Le fichier ne contient pas d'altitude. Aucun profil inventé.",partial:"L'altitude n'est disponible que sur une partie de la trace. Le profil incomplet est masqué.",invalid:"Géométrie invalide pour un profil fiable.",stationary:"La trace n'a pas de distance horizontale suffisante.",error:"Impossible de charger le profil.",source:"Altitude du fichier, non vérifiée indépendamment.",gaps:"Les tronçons discontinus ne sont pas reliés.",label:"Point du profil. Utilisez les flèches pour explorer la trace."}
};
const language=(document.documentElement.lang||'ca').slice(0,2).toLowerCase();
const t=COPY[language]||COPY.ca;
const locale={ca:'ca-ES',es:'es-ES',en:'en-GB',fr:'fr-FR'}[language]||'ca-ES';
const fmt=(v,decimals=0)=>Number(v).toLocaleString(locale,{maximumFractionDigits:decimals});
let requestId=0,chart=null;
function element(tag,css,text) {
  const node=document.createElement(tag);
  if(css)node.className=css;
  if(text!==undefined)node.textContent=text;
  return node;
}

function mountChart(profile,canvas,readout,routeId) {
  const points=profile.samples;
  const h=165,pad=16,range=Math.max(1,profile.maximumElevation-profile.minimumElevation);
  let index=0;
  function redraw(){
    if(!canvas.isConnected)return;
    const width=Math.max(240,Math.floor(canvas.parentElement?.clientWidth||500));
    const pixelRatio=Math.min(3,window.devicePixelRatio||1);
    canvas.width=Math.round(width*pixelRatio);
    canvas.height=Math.round(h*pixelRatio);
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    ctx.clearRect(0,0,width,h);
    const x=p=>pad+(p.distanceMeters/profile.distanceMeters)*(width-2*pad);
    const y=p=>h-pad-(p.elevationMeters-profile.minimumElevation)/range*(h-2*pad);
    ctx.strokeStyle='#176b45';
    ctx.lineWidth=2.5;
    ctx.beginPath();
    points.forEach((p,i)=>{
      // A new track segment always begins a new path.
      if(i===0||p.pointIndex===0||p.startsDiscontinuity)ctx.moveTo(x(p),y(p));
      else ctx.lineTo(x(p),y(p));
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x(points[index]),y(points[index]),4,0,2*Math.PI);
    ctx.fillStyle='#176b45';
    ctx.fill();
  }
  function select(next,sendMarker) {
    index=Math.max(0,Math.min(points.length-1,next));
    const p=points[index];
    const message=fmt(p.distanceMeters/1000,2)+' km · '+fmt(p.elevationMeters)+' m';
    readout.textContent=message;
    canvas.setAttribute('aria-valuenow',String(index));
    canvas.setAttribute('aria-valuetext',message);
    redraw();
    if(sendMarker)window.dispatchEvent(new CustomEvent('bicipark:elevation-point',{
      detail:{routeId,lat:p.latitude,lng:p.longitude,elevation:p.elevationMeters,
        distanceKm:p.distanceMeters/1000}
    }));
  }
  function selectPointer(e) {
    const rect=canvas.getBoundingClientRect();
    if(!(rect.width>0))return;
    const target=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*profile.distanceMeters;
    let best=0,delta=Infinity;
    for(let i=0;i<points.length;i++){
      const d=Math.abs(points[i].distanceMeters-target);
      if(d<delta){best=i;delta=d;}
    }
    select(best,true);
  }
  canvas.addEventListener('pointerdown',selectPointer);
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')selectPointer(e);});
  canvas.addEventListener('keydown',e=>{
    const next=e.key==='ArrowLeft'?index-1:e.key==='ArrowRight'?index+1:
      e.key==='Home'?0:e.key==='End'?points.length-1:null;
    if(next===null)return;
    e.preventDefault();select(next,true);
  });
  canvas.setAttribute('role','slider');
  canvas.setAttribute('aria-label',t.label);
  canvas.setAttribute('aria-valuemin','0');
  canvas.setAttribute('aria-valuemax',String(points.length-1));
  canvas.tabIndex=0;
  select(0,false);
  return redraw;
}

if(details) {
  window.addEventListener('bicipark:route-selected',async event=>{
    const route=event.detail?.route;
    const current=++requestId;
    details.querySelector('.route-elevation-profile')?.remove();
    chart=null;
    if(!route?.id)return;
    const section=element('section','route-elevation-profile');
    section.dataset.routeId=route.id;
    section.append(element('h3',null,t.title));
    const status=element('p','route-elevation-profile-note',t.loading);
    status.setAttribute('role','status');
    section.append(status);
    details.append(section);
    if(!route.geometryFile){status.textContent=t.missing;return;}
    try{
      const geometry=await loadRouteGeometry(route);
      if(current!==requestId||!section.isConnected)return;
      const profile=deriveRouteElevationDisplay(geometry);
      section.dataset.quality=profile.status;
      if(profile.status!=='complete'){
        status.textContent=t[profile.status]||t.invalid;
        return;
      }
      status.textContent=t.source;
      section.append(element('p','route-elevation-profile-range',
        fmt(profile.minimumElevation)+'–'+fmt(profile.maximumElevation)+' m'));
      if(profile.hasDiscontinuities)section.append(element('p','route-elevation-profile-note',t.gaps));
      const canvas=element('canvas','route-elevation-profile-chart');
      const readout=element('p','route-elevation-profile-readout');
      readout.setAttribute('aria-live','polite');
      section.append(canvas,readout);
      chart={routeId:route.id,redraw:mountChart(profile,canvas,readout,route.id)};
    }catch(error){
      if(current!==requestId||!section.isConnected)return;
      status.textContent=t.error;
      console.warn('[Elevation profile]',error);
    }
  });
  window.addEventListener('resize',()=>{
    if(chart&&details.querySelector('.route-elevation-profile-chart'))chart.redraw();
  });
}
