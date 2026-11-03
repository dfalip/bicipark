(function(root){
'use strict';
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const norm=v=>String(v??'').trim().toLocaleLowerCase();
const REASON_CODES=Object.freeze({MODALITY:'same_modality',REGION:'same_region',DISTANCE:'similar_distance',ELEVATION:'similar_elevation',DIFFICULTY:'similar_difficulty'});
function ratio(a,b){const x=finite(a),y=finite(b);if(x===null||y===null||x<0||y<0)return null;const max=Math.max(x,y);return max===0?1:Math.min(x,y)/max}
function scoreRouteSimilarity(origin,candidate){
 if(!origin||!candidate||origin.id===candidate.id)return null;
 let score=0,weight=0;const reasons=[];
 const add=(value,w,reason)=>{if(value===null)return;score+=value*w;weight+=w;if(value>=0.7&&reason)reasons.push(reason)};
 if(norm(origin.modality)&&norm(candidate.modality)){const same=norm(origin.modality)===norm(candidate.modality);add(same?1:0,4,same?REASON_CODES.MODALITY:null)}
 if(norm(origin.region)&&norm(candidate.region)){const same=norm(origin.region)===norm(candidate.region);add(same?1:0,2,same?REASON_CODES.REGION:null)}
 add(ratio(origin.distanceKm,candidate.distanceKm),3,REASON_CODES.DISTANCE);
 add(ratio(origin.elevationGain,candidate.elevationGain),2,REASON_CODES.ELEVATION);
 const od=norm(origin.difficulty||origin.difficultyLevel),cd=norm(candidate.difficulty||candidate.difficultyLevel);
 if(od&&cd){const same=od===cd;add(same?1:0,1,same?REASON_CODES.DIFFICULTY:null)}
 if(!weight)return null;
 return {route:candidate,score:Math.round(score/weight*100),reasons:[...new Set(reasons)]};
}
function findSimilarRoutes(origin,routes,{limit=4,minScore=45}={}){
 if(!origin||!Array.isArray(routes))return [];
 return routes.filter(route=>route&&route.enabled!==false).map(r=>scoreRouteSimilarity(origin,r)).filter(Boolean).filter(x=>x.score>=minScore).sort((a,b)=>b.score-a.score||String(a.route.name||'').localeCompare(String(b.route.name||''),'ca')).slice(0,Math.max(0,limit));
}
const api={REASON_CODES,scoreRouteSimilarity,findSimilarRoutes};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BiciParkRouteSimilarity=api;
})(typeof window!=='undefined'?window:globalThis);
