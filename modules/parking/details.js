(() => {
  'use strict';
  function yesNo(value){return value===true||value==='yes'?'Sí':value===false||value==='no'?'No':'Sense dades'}
  function append(card,parking){
    const raw=parking.raw?.properties||parking.raw||{}, details=document.createElement('p');
    details.className='parking-detail-note';
    const covered=yesNo(raw.covered ?? raw.tags?.covered), surveillance=yesNo(raw.surveillance ?? raw.tags?.surveillance);
    details.textContent=`Cobert: ${covered} · Vigilància: ${surveillance}. Font: ${parking.source||'No indicada'}. Actualització: ${raw.updated_at||raw.last_updated||'No indicada'}.`;
    const actions=document.createElement('div');actions.className='parking-card-actions';
    const go=document.createElement('a');go.textContent='Com arribar';go.href='/modules/route-planner/?to='+encodeURIComponent(parking.lat+','+parking.lng);go.onclick=e=>e.stopPropagation();
    actions.append(go);card.append(details,actions);
  }
  window.BiciParkParkingDetails={append,yesNo};
  window.BiciParkCore?.registerModule({id:'parking-details',version:'1.0.0',api:window.BiciParkParkingDetails});
})();
