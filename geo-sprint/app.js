import {cities} from "./data/cities.js";
import {chooseRoundCities, haversineKm, scoreForGuess, ROUNDS} from "./engine.js";

const copy = {
  ca: {
    language:"Idioma",allGames:"Tots els jocs",home:"Inici", eyebrow:"BiciPark · volta al món",
    intro:"5 ciutats. 5 oportunitats per descobrir el planeta. Com més a prop marquis, més punts guanyes!",
    round:"Ronda", score:"Punts", best:"Millor marca", question:"ON ÉS AQUESTA CIUTAT?",
    instruction:"Toca el mapa allà on creus que és aquesta ciutat.",
    hintButton:"💡 Pista (−20%)", centerButton:"📍 Marca el centre del mapa",
    guide:"Toca el mapa o mou-lo i prem «Marca el centre». Funciona també amb teclat.",
    next:"Següent ciutat →", finish:"Veure el resultat →", again:"🔄 Torna a jugar",
    mapHeading:"El món és el teu tauler", mapStatus:"Escull un punt",
    mapDone:"Resposta mostrada", mapFooter:"Sense cronòmetre. Juga al teu ritme.",
    disclaimer:"Ciutats reals amb coordenades aproximades del centre urbà. Joc educatiu; no és un mapa de serveis ciclistes.",
    explore:"Explora la ciutat ↗", distance:km=>`Has quedat a ${km} km del centre de la ciutat.`,
    correct:(name,country)=>`Era ${name}, ${country}.`,
    points:points=>`+${points} punts`, endTitle:"Volta al món completada!",
    endDetail:(score,best)=>`5 rondes · ${score} punts. Millor marca: ${best}.`,
    perfect:"L'has clavat! 🎯", great:"Molt a prop! 🚀", good:"Bon intent! 🙌", retry:"Segueix explorant! 🌍",
    hint:(continent,country)=>`Pista: ${continent} · ${country}`,
    continents:{"Europe":"Europa","Asia":"Àsia","Africa":"Àfrica","North America":"Amèrica del Nord","South America":"Amèrica del Sud","Oceania":"Oceania"}
  },
  es: {
    language:"Idioma",allGames:"Todos los juegos",home:"Inicio", eyebrow:"BiciPark · vuelta al mundo",
    intro:"5 ciudades. 5 oportunidades para descubrir el planeta. ¡Cuanto más cerca señales, más puntos consigues!",
    round:"Ronda",score:"Puntos",best:"Récord",question:"¿DÓNDE ESTÁ ESTA CIUDAD?",
    instruction:"Toca el mapa donde creas que está la ciudad.",
    hintButton:"💡 Pista (−20%)",centerButton:"📍 Marcar el centro del mapa",
    guide:"Toca el mapa o muévelo y pulsa «Marcar el centro». También funciona con teclado.",
    next:"Siguiente ciudad →",finish:"Ver resultado →",again:"🔄 Volver a jugar",
    mapHeading:"El mundo es tu tablero",mapStatus:"Elige un punto",
    mapDone:"Respuesta mostrada",mapFooter:"Sin cronómetro. Juega a tu ritmo.",
    disclaimer:"Ciudades reales con coordenadas aproximadas de su centro urbano. Juego educativo; no es un mapa de servicios ciclistas.",
    explore:"Explorar ciudad ↗",distance:km=>`Te has quedado a ${km} km del centro de la ciudad.`,
    correct:(name,country)=>`Era ${name}, ${country}.`,
    points:points=>`+${points} puntos`,endTitle:"¡Vuelta al mundo completada!",
    endDetail:(score,best)=>`5 rondas · ${score} puntos. Récord: ${best}.`,
    perfect:"¡En el blanco! 🎯",great:"¡Muy cerca! 🚀",good:"¡Buen intento! 🙌",retry:"¡Sigue explorando! 🌍",
    hint:(continent,country)=>`Pista: ${continent} · ${country}`,
    continents:{"Europe":"Europa","Asia":"Asia","Africa":"África","North America":"América del Norte","South America":"América del Sur","Oceania":"Oceanía"}
  },
  en: {
    language:"Language",allGames:"All games",home:"Home",eyebrow:"BiciPark · around the world",
    intro:"5 cities. 5 chances to discover the planet. The closer your guess, the more points you win!",
    round:"Round",score:"Points",best:"Personal best",question:"WHERE IS THIS CITY?",
    instruction:"Tap the map where you think the city is.",
    hintButton:"💡 Hint (−20%)",centerButton:"📍 Choose map centre",
    guide:"Tap the map, or pan it and choose its centre. Keyboard navigation works too.",
    next:"Next city →",finish:"See results →",again:"🔄 Play again",
    mapHeading:"The world is your playground",mapStatus:"Choose a spot",
    mapDone:"Answer revealed",mapFooter:"No timer. Play at your own pace.",
    disclaimer:"Real cities with approximate city-centre coordinates. Educational game, not a cycling services map.",
    explore:"Explore city ↗",distance:km=>`You were ${km} km from the city centre.`,
    correct:(name,country)=>`It was ${name}, ${country}.`,
    points:points=>`+${points} points`,endTitle:"World tour completed!",
    endDetail:(score,best)=>`5 rounds · ${score} points. Personal best: ${best}.`,
    perfect:"Bullseye! 🎯",great:"So close! 🚀",good:"Nice try! 🙌",retry:"Keep exploring! 🌍",
    hint:(continent,country)=>`Hint: ${continent} · ${country}`,
    continents:{"Europe":"Europe","Asia":"Asia","Africa":"Africa","North America":"North America","South America":"South America","Oceania":"Oceania"}
  },
  fr: {
    language:"Langue",allGames:"Tous les jeux",home:"Accueil",eyebrow:"BiciPark · tour du monde",
    intro:"5 villes. 5 occasions de découvrir le monde. Plus tu es proche, plus tu gagnes de points !",
    round:"Manche",score:"Points",best:"Record",question:"OÙ SE TROUVE CETTE VILLE ?",
    instruction:"Touche la carte là où tu penses que se trouve cette ville.",
    hintButton:"💡 Indice (−20 %)",centerButton:"📍 Choisir le centre de la carte",
    guide:"Touche la carte, ou déplace-la puis choisis son centre. Le clavier fonctionne aussi.",
    next:"Ville suivante →",finish:"Voir le résultat →",again:"🔄 Rejouer",
    mapHeading:"Le monde est ton terrain de jeu",mapStatus:"Choisis un point",
    mapDone:"Réponse affichée",mapFooter:"Sans chrono. Joue à ton rythme.",
    disclaimer:"Villes réelles et coordonnées approximatives de leur centre. Jeu éducatif, pas une carte des services cyclistes.",
    explore:"Explorer la ville ↗",distance:km=>`Tu étais à ${km} km du centre-ville.`,
    correct:(name,country)=>`C'était ${name}, ${country}.`,
    points:points=>`+${points} points`,endTitle:"Tour du monde terminé !",
    endDetail:(score,best)=>`5 manches · ${score} points. Record : ${best}.`,
    perfect:"En plein dans le mille ! 🎯",great:"Tout près ! 🚀",good:"Bien joué ! 🙌",retry:"Continue à explorer ! 🌍",
    hint:(continent,country)=>`Indice : ${continent} · ${country}`,
    continents:{"Europe":"Europe","Asia":"Asie","Africa":"Afrique","North America":"Amérique du Nord","South America":"Amérique du Sud","Oceania":"Océanie"}
  }
};

const $ = id=>document.getElementById(id);
const ids = [
  "languageSelect","languageLabel","allGamesLink","homeLink","eyebrow","intro","roundLabel","roundValue",
  "scoreLabel","scoreValue","bestLabel","bestValue","stepLabel","cityName",
  "instructions","hintText","hintButton","centerButton","mapGuide",
  "resultCard","resultLabel","pointsAwarded","distanceText","correctPlaceText",
  "osmLink","nextButton","endCard","endTitle","endDetail","againButton",
  "mapHeading","mapStatus","mapFooter","disclaimer","gameMap","mapFailure","questionCard"
];
const ui = Object.fromEntries(ids.map(id=>[id,$(id)]));
const localeDefault = (navigator.language||"ca").split("-")[0].toLowerCase();
const paramLanguage = new URLSearchParams(window.location.search).get("lang");
let language = copy[paramLanguage] ? paramLanguage : copy[localeDefault] ? localeDefault : "ca";
let rounds = [];
let roundIndex = 0;
let total = 0;
let usedHint = false;
let answered = false;
let finished = false;
const recordKey = "bicipark-geosprint-best-v1";
function getRecord(){
  try{
    const value=Number(localStorage.getItem(recordKey)||0);
    return Number.isFinite(value)&&value>=0 ? value : 0;
  }catch{return 0;}
}
function saveRecord(value){
  try{localStorage.setItem(recordKey,String(value));}catch{/* private browsing may block local storage */}
}
let best = getRecord();
const mapAvailable = typeof window.L !== "undefined";
let map = null;
let feedbackLayer = null;
function t(){return copy[language];}
function localizedNumber(n){return Number(n).toLocaleString(language==="en"?"en-GB":language);}
function countryName(code){
  try{return new Intl.DisplayNames([language],{type:"region"}).of(code)||code;}
  catch{return code;}
}
function setText(id,value){ui[id].textContent=value;}
function updateLanguage(){
  const txt=t();
  document.documentElement.lang=language;
  ui.languageSelect.value=language;
  for(const [id,value] of Object.entries({
    languageLabel:txt.language,allGamesLink:txt.allGames,homeLink:txt.home,eyebrow:txt.eyebrow,intro:txt.intro,
    roundLabel:txt.round,scoreLabel:txt.score,bestLabel:txt.best,
    stepLabel:txt.question,instructions:txt.instruction,
    hintButton:txt.hintButton,centerButton:txt.centerButton,
    mapGuide:txt.guide,againButton:txt.again,
    mapHeading:txt.mapHeading,mapFooter:txt.mapFooter,disclaimer:txt.disclaimer,
    osmLink:txt.explore
  }))setText(id,value);
  setText("nextButton",roundIndex===ROUNDS-1?txt.finish:txt.next);
  if(!answered)setText("mapStatus",txt.mapStatus);
  else setText("mapStatus",txt.mapDone);
  if(usedHint)showHint();
  setText("roundValue",`${Math.min(ROUNDS,roundIndex+1)} / ${ROUNDS}`);
  setText("scoreValue",localizedNumber(total));
  setText("bestValue",localizedNumber(best));
}
function currentCity(){return rounds[roundIndex];}
function showHint(){
  const city=currentCity();
  const country=countryName(city.country);
  ui.hintText.textContent=t().hint(t().continents[city.continent],country);
  ui.hintText.hidden=false;
}
function clearFeedback(){
  if(feedbackLayer)feedbackLayer.clearLayers();
  ui.resultCard.hidden=true;
  ui.hintText.hidden=true;
  ui.hintButton.disabled=false;
  ui.centerButton.disabled=false;
  ui.hintButton.hidden=false;
  ui.centerButton.hidden=false;
}
function renderRound(){
  answered=false;
  usedHint=false;
  clearFeedback();
  ui.questionCard.hidden=false;
  ui.endCard.hidden=true;
  setText("cityName",currentCity().name);
  setText("roundValue",`${roundIndex+1} / ${ROUNDS}`);
  setText("scoreValue",localizedNumber(total));
  updateLanguage();
  if(map){map.setView([16,12],2,{animate:false});requestAnimationFrame(()=>map.invalidateSize());}
}
function startNewGame(){
  rounds=chooseRoundCities(cities);
  roundIndex=0;
  total=0;
  answered=false;
  finished=false;
  renderRound();
}
function scoreTitle(score,km){
  if(km<=50)return t().perfect;
  if(km<=250)return t().great;
  if(km<=950)return t().good;
  return t().retry;
}
function guessAt(location){
  if(!map||answered||finished)return;
  const target=currentCity();
  const km=haversineKm(location,target);
  const points=scoreForGuess(km,usedHint);
  total+=points;
  answered=true;
  ui.hintButton.disabled=true;
  ui.centerButton.disabled=true;
  ui.hintButton.hidden=true;
  ui.centerButton.hidden=true;
  ui.resultCard.hidden=false;
  setText("resultLabel",scoreTitle(points,km));
  setText("pointsAwarded",t().points(localizedNumber(points)));
  setText("distanceText",t().distance(localizedNumber(Math.round(km))));
  setText("correctPlaceText",t().correct(target.name,countryName(target.country)));
  setText("nextButton",roundIndex===ROUNDS-1?t().finish:t().next);
  ui.osmLink.href=`https://www.openstreetmap.org/#map=12/${target.lat}/${target.lng}`;
  setText("mapStatus",t().mapDone);
  setText("scoreValue",localizedNumber(total));

  const userPoint=[location.lat,location.lng];
  const actualPoint=[target.lat,target.lng];
  feedbackLayer.addLayer(L.circleMarker(userPoint,{
    radius:9,color:"#174ab9",fillColor:"#93bbff",fillOpacity:.95,weight:3
  }).bindTooltip("📍"));
  feedbackLayer.addLayer(L.circleMarker(actualPoint,{
    radius:10,color:"#076744",fillColor:"#b1f1c7",fillOpacity:.95,weight:3
  }).bindTooltip(target.name));
  feedbackLayer.addLayer(L.polyline([userPoint,actualPoint],{
    color:"#0f7460",weight:3,opacity:.85,dashArray:"8,8"
  }));
  map.fitBounds(L.latLngBounds([userPoint,actualPoint]).pad(.18),{animate:false,maxZoom:7});
}
function finishGame(){
  finished=true;
  ui.resultCard.hidden=true;
  ui.questionCard.hidden=true;
  ui.hintButton.hidden=true;
  ui.centerButton.hidden=true;
  ui.endCard.hidden=false;
  if(total>best){best=total;saveRecord(best);}
  setText("bestValue",localizedNumber(best));
  setText("endTitle",t().endTitle);
  setText("endDetail",t().endDetail(localizedNumber(total),localizedNumber(best)));
}
ui.hintButton.addEventListener("click",()=>{
  if(answered||usedHint||finished)return;
  usedHint=true;
  ui.hintButton.disabled=true;
  showHint();
});
ui.centerButton.addEventListener("click",()=>{
  if(map&&!answered&&!finished)guessAt(map.getCenter());
});
ui.nextButton.addEventListener("click",()=>{
  if(!answered)return;
  if(roundIndex>=ROUNDS-1)finishGame();
  else{roundIndex+=1;renderRound();}
});
ui.againButton.addEventListener("click",startNewGame);
ui.languageSelect.addEventListener("change",event=>{
  if(!copy[event.target.value])return;
  language=event.target.value;
  const url=new URL(window.location.href);
  url.searchParams.set("lang",language);
  window.history.replaceState(null,"",url);
  updateLanguage();
  if(answered&&!finished){
    const city=currentCity();
    setText("correctPlaceText",t().correct(city.name,countryName(city.country)));
    setText("nextButton",roundIndex===ROUNDS-1?t().finish:t().next);
  }
  if(finished)finishGame();
});

if(mapAvailable){
  map=L.map("gameMap",{minZoom:2,maxZoom:12,worldCopyJump:true,keyboard:true,zoomControl:true})
    .setView([16,12],2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  feedbackLayer=L.layerGroup().addTo(map);
  map.on("click",event=>guessAt(event.latlng));
}else{
  ui.mapFailure.hidden=false;
  ui.centerButton.disabled=true;
  ui.hintButton.disabled=true;
  setText("mapStatus","Mapa no disponible");
}
startNewGame();
