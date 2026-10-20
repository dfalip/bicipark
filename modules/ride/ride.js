(() => {
  "use strict";
  if(window.__BICIPARK_RIDE_V1__)return;
  window.__BICIPARK_RIDE_V1__=true;

  const Engine=window.BiciParkRideEngine;
  const Store=window.BiciParkRideStore;
  if(!Engine||!Store)return;

  const copy={
    ca:{today:"Avui",bike:"La meva bici",history:"Historial",eyebrow:"BICIPARK RIDE",title:"La teva sortida, en temps real.",intro:"Utilitza el GPS del mòbil per calcular distància, velocitat i temps en moviment. La velocitat mostrada és una estimació GPS suavitzada, no una lectura d’un sensor de roda.",bikeTitle:"Bici activa",noBike:"Cap bici configurada",configure:"Configura-la",speed:"VELOCITAT GPS",ready:"Preparat per començar.",accuracy:"Precisió GPS",distance:"Distància",avg:"Mitjana en moviment",max:"Velocitat màxima",moving:"Temps en moviment",stopped:"Temps aturat",total:"Temps total",trackEye:"TRAÇAT",track:"Ruta GPS",points:"{n} punts",mapNote:"El mapa base necessita connexió. El seguiment GPS i les mètriques poden continuar sense mapa base mentre la pàgina segueixi activa.",start:"▶ Comença Ride",pause:"⏸ Pausa",resume:"▶ Reprèn",finish:"■ Finalitza",summaryEye:"SORTIDA FINALITZADA",summary:"Resum de la sortida",rideName:"Nom de la sortida",save:"Desa activitat",discard:"Descarta i reinicia",important:"Important",background:"En una PWA, iOS o Android poden suspendre el GPS si bloqueges la pantalla o deixes l’app en segon pla. Per aquesta V1, mantén BiciPark Ride visible durant la sortida. Si el navegador ho permet, BiciPark intentarà mantenir la pantalla activa.",locating:"Buscant senyal GPS…",tracking:"Gravant la sortida.",poor:"Senyal GPS poc precís; esperant una lectura millor.",jump:"Lectura GPS descartada per salt impossible.",paused:"Ride en pausa.",finished:"Ride finalitzat. Revisa el resum i desa’l.",permission:"No s’ha pogut accedir al GPS. Comprova els permisos d’ubicació.",unsupported:"Aquest navegador no ofereix geolocalització.",hidden:"Mantén Ride visible: el navegador pot suspendre el GPS en segon pla.",saved:"Activitat desada. L’Historial i BiciPark Today ja poden utilitzar-la.",savedBike:" També s’han afegit {km} km a la bici activa.",noTrack:"No hi ha prou recorregut GPS per desar aquesta sortida.",gps:"GPS",rideDefault:"BiciPark Ride",viewHistory:"Veure historial",viewToday:"Obrir Today"},
    es:{today:"Hoy",bike:"Mi bici",history:"Historial",eyebrow:"BICIPARK RIDE",title:"Tu salida, en tiempo real.",intro:"Usa el GPS del móvil para calcular distancia, velocidad y tiempo en movimiento. La velocidad mostrada es una estimación GPS suavizada, no la lectura de un sensor de rueda.",bikeTitle:"Bici activa",noBike:"Ninguna bici configurada",configure:"Configúrala",speed:"VELOCIDAD GPS",ready:"Preparado para empezar.",accuracy:"Precisión GPS",distance:"Distancia",avg:"Media en movimiento",max:"Velocidad máxima",moving:"Tiempo en movimiento",stopped:"Tiempo parado",total:"Tiempo total",trackEye:"TRAZADO",track:"Ruta GPS",points:"{n} puntos",mapNote:"El mapa base necesita conexión. El seguimiento GPS y las métricas pueden continuar sin mapa base mientras la página siga activa.",start:"▶ Inicia Ride",pause:"⏸ Pausa",resume:"▶ Reanuda",finish:"■ Finaliza",summaryEye:"SALIDA FINALIZADA",summary:"Resumen de la salida",rideName:"Nombre de la salida",save:"Guardar actividad",discard:"Descartar y reiniciar",important:"Importante",background:"En una PWA, iOS o Android pueden suspender el GPS si bloqueas la pantalla o dejas la app en segundo plano. En esta V1, mantén BiciPark Ride visible durante la salida. Si el navegador lo permite, BiciPark intentará mantener la pantalla activa.",locating:"Buscando señal GPS…",tracking:"Grabando la salida.",poor:"Señal GPS poco precisa; esperando una lectura mejor.",jump:"Lectura GPS descartada por salto imposible.",paused:"Ride en pausa.",finished:"Ride finalizado. Revisa el resumen y guárdalo.",permission:"No se ha podido acceder al GPS. Comprueba los permisos de ubicación.",unsupported:"Este navegador no ofrece geolocalización.",hidden:"Mantén Ride visible: el navegador puede suspender el GPS en segundo plano.",saved:"Actividad guardada. El Historial y BiciPark Today ya pueden utilizarla.",savedBike:" También se han añadido {km} km a la bici activa.",noTrack:"No hay suficiente recorrido GPS para guardar esta salida.",gps:"GPS",rideDefault:"BiciPark Ride",viewHistory:"Ver historial",viewToday:"Abrir Today"},
    en:{today:"Today",bike:"My bike",history:"History",eyebrow:"BICIPARK RIDE",title:"Your ride, live.",intro:"Use your phone GPS to calculate distance, speed and moving time. Displayed speed is a smoothed GPS estimate, not a wheel-sensor reading.",bikeTitle:"Active bike",noBike:"No bike configured",configure:"Configure it",speed:"GPS SPEED",ready:"Ready to start.",accuracy:"GPS accuracy",distance:"Distance",avg:"Moving average",max:"Maximum speed",moving:"Moving time",stopped:"Stopped time",total:"Total time",trackEye:"TRACK",track:"GPS route",points:"{n} points",mapNote:"The base map needs a connection. GPS tracking and metrics can continue without it while the page remains active.",start:"▶ Start Ride",pause:"⏸ Pause",resume:"▶ Resume",finish:"■ Finish",summaryEye:"RIDE FINISHED",summary:"Ride summary",rideName:"Ride name",save:"Save activity",discard:"Discard and reset",important:"Important",background:"In a PWA, iOS or Android may suspend GPS when you lock the screen or leave the app in the background. For this V1, keep BiciPark Ride visible during the ride. When supported, BiciPark will try to keep the screen awake.",locating:"Looking for GPS signal…",tracking:"Recording ride.",poor:"GPS accuracy is weak; waiting for a better reading.",jump:"GPS reading discarded as an impossible jump.",paused:"Ride paused.",finished:"Ride finished. Review the summary and save it.",permission:"GPS access failed. Check location permissions.",unsupported:"This browser does not provide geolocation.",hidden:"Keep Ride visible: the browser may suspend GPS in the background.",saved:"Activity saved. History and BiciPark Today can now use it.",savedBike:" {km} km were also added to the active bike.",noTrack:"There is not enough GPS track to save this ride.",gps:"GPS",rideDefault:"BiciPark Ride",viewHistory:"View history",viewToday:"Open Today"},
    fr:{today:"Aujourd’hui",bike:"Mon vélo",history:"Historique",eyebrow:"BICIPARK RIDE",title:"Votre sortie, en direct.",intro:"Utilisez le GPS du téléphone pour calculer distance, vitesse et temps en mouvement. La vitesse affichée est une estimation GPS lissée, pas une lecture d’un capteur de roue.",bikeTitle:"Vélo actif",noBike:"Aucun vélo configuré",configure:"Configurer",speed:"VITESSE GPS",ready:"Prêt à démarrer.",accuracy:"Précision GPS",distance:"Distance",avg:"Moyenne en mouvement",max:"Vitesse maximale",moving:"Temps en mouvement",stopped:"Temps à l’arrêt",total:"Temps total",trackEye:"TRACE",track:"Parcours GPS",points:"{n} points",mapNote:"Le fond de carte nécessite une connexion. Le suivi GPS et les métriques peuvent continuer sans fond de carte tant que la page reste active.",start:"▶ Démarrer Ride",pause:"⏸ Pause",resume:"▶ Reprendre",finish:"■ Terminer",summaryEye:"SORTIE TERMINÉE",summary:"Résumé de la sortie",rideName:"Nom de la sortie",save:"Enregistrer l’activité",discard:"Supprimer et recommencer",important:"Important",background:"Dans une PWA, iOS ou Android peuvent suspendre le GPS si vous verrouillez l’écran ou passez l’app en arrière-plan. Pour cette V1, gardez BiciPark Ride visible pendant la sortie. Si le navigateur le permet, BiciPark tentera de maintenir l’écran actif.",locating:"Recherche du signal GPS…",tracking:"Enregistrement de la sortie.",poor:"Précision GPS insuffisante ; attente d’une meilleure lecture.",jump:"Lecture GPS ignorée car le saut est impossible.",paused:"Ride en pause.",finished:"Ride terminé. Vérifiez le résumé puis enregistrez-le.",permission:"Impossible d’accéder au GPS. Vérifiez les autorisations de localisation.",unsupported:"Ce navigateur ne fournit pas la géolocalisation.",hidden:"Gardez Ride visible : le navigateur peut suspendre le GPS en arrière-plan.",saved:"Activité enregistrée. L’Historique et BiciPark Today peuvent maintenant l’utiliser.",savedBike:" {km} km ont aussi été ajoutés au vélo actif.",noTrack:"Le parcours GPS est insuffisant pour enregistrer cette sortie.",gps:"GPS",rideDefault:"BiciPark Ride",viewHistory:"Voir l’historique",viewToday:"Ouvrir Today"}
  };

  const localeMap={ca:"ca-ES",es:"es-ES",en:"en-GB",fr:"fr-FR"};
  const el=id=>document.getElementById(id);
  const lang=()=>window.BiciParkI18n?.getLanguage?.()||localStorage.getItem("bicipark.language.v1")||"ca";
  const tr=(key,vars={})=>String((copy[lang()]||copy.ca)[key]??key).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??`{${k}}`);
  const locale=()=>localeMap[lang()]||"ca-ES";

  let tracker=new Engine.RideTracker();
  let watchId=null;
  let ticker=null;
  let wakeLock=null;
  let map=null;
  let polyline=null;
  let marker=null;
  let finalSummary=null;
  let saved=false;
  let lastAccuracy=null;

  function activeBike(){return Store.activeBike(localStorage)}
  function bikeTitle(bike){return bike?(bike.nickname||[bike.brand,bike.model].filter(Boolean).join(" ")||bike.id):tr("noBike")}
  function number(value,digits=1){return Number(value||0).toLocaleString(locale(),{minimumFractionDigits:digits,maximumFractionDigits:digits})}
  function clock(ms){
    const total=Math.max(0,Math.floor(Number(ms||0)/1000));
    const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
    return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
  }

  function initMap(){
    if(!window.L||map)return;
    map=L.map("rideMap",{zoomControl:true}).setView([41.3874,2.1686],13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
    polyline=L.polyline([],{weight:5,opacity:.85}).addTo(map);
  }

  function setGpsStatus(text){el("gpsStatus").textContent=text}

  function render(snapshot=tracker.snapshot()){
    el("speedNow").textContent=number(snapshot.currentSpeedKmh,1);
    el("distanceValue").textContent=`${number(snapshot.distanceKm,2)} km`;
    el("avgValue").textContent=`${number(snapshot.avgSpeedKmh,1)} km/h`;
    el("maxValue").textContent=`${number(snapshot.maxSpeedKmh,1)} km/h`;
    el("movingValue").textContent=clock(snapshot.movingMs);
    el("stoppedValue").textContent=clock(snapshot.stoppedMs);
    el("totalValue").textContent=clock(snapshot.elapsedMs);
    el("pointCount").textContent=tr("points",{n:snapshot.acceptedCount});
    el("accuracyValue").textContent=lastAccuracy==null?"—":`±${Math.round(lastAccuracy)} m`;
  }

  function renderBike(){
    const bike=activeBike();
    el("bikeLabel").textContent=bikeTitle(bike);
    el("configureBikeLink").hidden=Boolean(bike);
  }

  function applyTranslations(){
    const ids={rideEyebrow:"eyebrow",rideTitle:"title",rideIntro:"intro",bikeLabelTitle:"bikeTitle",configureBikeLink:"configure",speedLabel:"speed",accuracyLabel:"accuracy",distanceLabel:"distance",avgLabel:"avg",maxLabel:"max",movingLabel:"moving",stoppedLabel:"stopped",totalLabel:"total",trackEyebrow:"trackEye",trackTitle:"track",mapNote:"mapNote",startBtn:"start",finishBtn:"finish",summaryEyebrow:"summaryEye",summaryTitle:"summary",rideNameLabel:"rideName",saveBtn:"save",discardBtn:"discard",importantTitle:"important",backgroundNote:"background"};
    Object.entries(ids).forEach(([id,key])=>{const node=el(id);if(node)node.textContent=tr(key)});
    const nav=[...document.querySelectorAll(".ride-nav>div a")];
    if(nav[0])nav[0].textContent=tr("today");if(nav[1])nav[1].textContent=tr("bike");if(nav[2])nav[2].textContent=tr("history");
    el("pauseBtn").textContent=tracker.paused?tr("resume"):tr("pause");
    if(!tracker.startedAt&&!tracker.finished)setGpsStatus(tr("ready"));
    renderBike();render(finalSummary||tracker.snapshot());
    if(finalSummary)renderSummary(finalSummary);
  }

  async function requestWakeLock(){
    try{if("wakeLock" in navigator)wakeLock=await navigator.wakeLock.request("screen")}catch(_){wakeLock=null}
  }
  async function releaseWakeLock(){try{await wakeLock?.release?.()}catch(_){}wakeLock=null}

  function resetMap(){
    polyline?.setLatLngs([]);
    if(marker){marker.remove();marker=null}
  }

  function addMapPoint(point){
    if(!map||!polyline)return;
    const latlng=[point.lat,point.lng];
    polyline.addLatLng(latlng);
    if(!marker)marker=L.circleMarker(latlng,{radius:7,weight:3,fillOpacity:.9}).addTo(map);else marker.setLatLng(latlng);
    const count=polyline.getLatLngs().length;
    if(count===1)map.setView(latlng,16);else map.panTo(latlng,{animate:false});
  }

  function clearTracking(){
    if(watchId!=null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);
    watchId=null;
    if(ticker)clearInterval(ticker);ticker=null;
    releaseWakeLock();
  }

  function onPosition(position){
    const c=position.coords;
    lastAccuracy=Number.isFinite(c.accuracy)?c.accuracy:null;
    const result=tracker.ingest({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,speed:c.speed,altitude:c.altitude,timestamp:position.timestamp});
    if(result.accepted&&result.point)addMapPoint(result.point);
    if(result.reason==="accuracy")setGpsStatus(tr("poor"));
    else if(result.reason==="jump")setGpsStatus(tr("jump"));
    else if(result.reason==="paused")setGpsStatus(tr("paused"));
    else setGpsStatus(tr("tracking"));
    render(result.snapshot);
  }

  function onPositionError(){
    setGpsStatus(tr("permission"));
  }

  async function startRide(){
    if(!navigator.geolocation){setGpsStatus(tr("unsupported"));return}
    clearTracking();
    tracker=new Engine.RideTracker();
    tracker.start(Date.now());
    finalSummary=null;saved=false;lastAccuracy=null;
    resetMap();
    el("summaryPanel").hidden=true;
    el("saveStatus").textContent="";
    el("startBtn").disabled=true;
    el("pauseBtn").disabled=false;
    el("finishBtn").disabled=false;
    el("pauseBtn").textContent=tr("pause");
    setGpsStatus(tr("locating"));
    render();
    await requestWakeLock();
    watchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
    ticker=setInterval(()=>render(tracker.snapshot(Date.now())),1000);
  }

  function togglePause(){
    if(!tracker.startedAt||tracker.finished)return;
    if(tracker.paused){tracker.resume(Date.now());setGpsStatus(tr("tracking"))}else{tracker.pause(Date.now());setGpsStatus(tr("paused"))}
    el("pauseBtn").textContent=tracker.paused?tr("resume"):tr("pause");
    render();
  }

  function finishRide(){
    if(!tracker.startedAt||tracker.finished)return;
    finalSummary=tracker.finish(Date.now());
    clearTracking();
    render(finalSummary);
    el("pauseBtn").disabled=true;
    el("finishBtn").disabled=true;
    el("startBtn").disabled=false;
    el("summaryPanel").hidden=false;
    setGpsStatus(tr("finished"));
    renderSummary(finalSummary);
    if(map&&polyline?.getLatLngs().length>1){try{map.fitBounds(polyline.getBounds(),{padding:[24,24]})}catch(_){}}
    el("summaryPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }

  function summaryItem(label,value){return `<div><span>${label}</span><strong>${value}</strong></div>`}
  function renderSummary(summary){
    if(!summary)return;
    el("summaryMetrics").innerHTML=[
      summaryItem(tr("distance"),`${number(summary.distanceKm,2)} km`),
      summaryItem(tr("avg"),`${number(summary.avgSpeedKmh,1)} km/h`),
      summaryItem(tr("max"),`${number(summary.maxSpeedKmh,1)} km/h`),
      summaryItem(tr("moving"),clock(summary.movingMs)),
      summaryItem(tr("stopped"),clock(summary.stoppedMs)),
      summaryItem(tr("total"),clock(summary.elapsedMs))
    ].join("");
    el("saveBtn").disabled=saved||summary.acceptedCount<2||summary.distanceKm<=0;
  }

  function saveRide(){
    if(!finalSummary||saved)return;
    if(finalSummary.acceptedCount<2||finalSummary.distanceKm<=0){el("saveStatus").textContent=tr("noTrack");return}
    const bike=activeBike();
    const name=el("rideNameInput").value.trim()||tr("rideDefault");
    try{
      const activity=Store.buildActivity(finalSummary,bike,name);
      Store.appendActivity(localStorage,activity);
      const mileage=bike?Store.applyMileage(localStorage,bike.id,activity.distanceKm,activity.id):{updated:false};
      saved=true;
      el("saveBtn").disabled=true;
      let message=tr("saved");
      if(mileage.updated)message+=tr("savedBike",{km:number(activity.distanceKm,2)});
      el("saveStatus").innerHTML=`${message} <a href="/modules/activity-history/">${tr("viewHistory")}</a> · <a href="/modules/today/">${tr("viewToday")}</a>`;
      renderBike();
    }catch(error){
      console.error("[BiciPark Ride] save",error);
      el("saveStatus").textContent="No s’ha pogut desar l’activitat en aquest navegador.";
    }
  }

  function resetRide(){
    clearTracking();
    tracker=new Engine.RideTracker();finalSummary=null;saved=false;lastAccuracy=null;
    resetMap();
    el("summaryPanel").hidden=true;
    el("startBtn").disabled=false;el("pauseBtn").disabled=true;el("finishBtn").disabled=true;
    el("pauseBtn").textContent=tr("pause");el("rideNameInput").value=tr("rideDefault");
    setGpsStatus(tr("ready"));render();
  }

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&tracker.startedAt&&!tracker.finished&&!tracker.paused)setGpsStatus(tr("hidden"));
    if(!document.hidden&&wakeLock==null&&tracker.startedAt&&!tracker.finished)requestWakeLock();
  });
  window.addEventListener("beforeunload",event=>{if(tracker.startedAt&&!tracker.finished){event.preventDefault();event.returnValue=""}});
  window.addEventListener("bicipark:language-changed",applyTranslations);
  window.addEventListener("bicipark:my-bike:changed",renderBike);
  el("startBtn").addEventListener("click",startRide);
  el("pauseBtn").addEventListener("click",togglePause);
  el("finishBtn").addEventListener("click",finishRide);
  el("saveBtn").addEventListener("click",saveRide);
  el("discardBtn").addEventListener("click",resetRide);

  initMap();
  renderBike();
  resetRide();
  applyTranslations();
})();
