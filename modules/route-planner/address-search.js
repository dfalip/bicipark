(() => {
 'use strict';
 for(const target of ['origin','destination']){
  const input=document.getElementById(target),block=document.createElement('div'),label=document.createElement('label'),query=document.createElement('input'),button=document.createElement('button'),results=document.createElement('div');
  label.textContent=target==='origin'?'Cerca l’origen per adreça':'Cerca el destí per adreça';query.type='search';query.placeholder='Les Corts, Barcelona';label.append(query);button.type='button';button.textContent='Cerca';results.setAttribute('role','status');block.append(label,button,results);input.closest('label').before(block);
  button.onclick=async()=>{button.disabled=true;results.textContent='Cercant…';try{const rows=await window.BiciParkGeocoder.search(query.value);results.replaceChildren();if(!rows.length)results.textContent='Cap resultat. Concreta la ciutat o tria el punt al mapa.';for(const row of rows){const pick=document.createElement('button');pick.type='button';pick.textContent=row.label;pick.style.cssText='display:block;width:100%;margin:6px 0;text-align:left';pick.onclick=()=>{input.value=`${row.lat}, ${row.lng}`;results.textContent=row.label;window.BiciParkCore?.emit('planner:address-selected',{target,...row})};results.append(pick)}}catch(e){results.textContent=e.name==='AbortError'?'La cerca ha trigat massa. Torna-ho a provar.':e.message}finally{button.disabled=false}};
  query.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();button.click()}};
 }
})();
