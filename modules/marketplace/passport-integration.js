(() => {
  "use strict";
  const Store=window.BiciParkMarketplaceStore;
  const Proof=window.BiciParkBikePassportProof;
  if(!Store||!Proof||window.__BICIPARK_MARKET_PASSPORT__)return;
  window.__BICIPARK_MARKET_PASSPORT__=true;

  const BIKE_KEY="bicipark.myBike.v1";
  const copy={
    ca:{label:"Bike Passport vinculat",none:"Sense vincular",passport:"Bike Passport",verified:"✓ BiciPark Verified",transfer:"Transferència preparada"},
    es:{label:"Bike Passport vinculado",none:"Sin vincular",passport:"Bike Passport",verified:"✓ BiciPark Verified",transfer:"Transferencia preparada"},
    en:{label:"Linked Bike Passport",none:"Not linked",passport:"Bike Passport",verified:"✓ BiciPark Verified",transfer:"Transfer ready"},
    fr:{label:"Bike Passport lié",none:"Non lié",passport:"Bike Passport",verified:"✓ BiciPark Verified",transfer:"Transfert prêt"}
  };
  const lang=()=>window.BiciParkI18n?.getLanguage?.()||localStorage.getItem("bicipark.language.v1")||"ca";
  const tr=k=>(copy[lang()]||copy.ca)[k];
  function bikes(){try{const p=JSON.parse(localStorage.getItem(BIKE_KEY)||"null");return Array.isArray(p?.bikes)?p.bikes:[]}catch(_){return[]}}
  function title(b){return b.nickname||[b.brand,b.model].filter(Boolean).join(" ")||b.id}
  function selectedMeta(id){
    const state=Proof.read(localStorage),latest=Proof.latest(state,id),level=Proof.verificationLevel(state,id),proofs=Proof.forBike(state,id);
    return {level,digest:latest?.digest||"",transferReady:proofs.some(p=>p.type==="transfer-intent")};
  }
  function installField(){
    const form=document.getElementById("listingForm");if(!form||form.querySelector('[name="bikeId"]'))return;
    const category=form.querySelector('[name="category"]')?.closest("label");
    const label=document.createElement("label");label.className="passport-link-field";label.innerHTML=`<span>${tr("label")}</span><select name="bikeId"><option value="">${tr("none")}</option></select><input type="hidden" name="verificationLevel" value="none"><input type="hidden" name="proofDigest" value=""><input type="hidden" name="transferReady" value="">`;
    category?.insertAdjacentElement("afterend",label);
    refreshOptions();
    form.addEventListener("submit",()=>{
      const id=form.elements.bikeId.value,meta=id?selectedMeta(id):{level:"none",digest:"",transferReady:false};
      form.elements.verificationLevel.value=meta.level;form.elements.proofDigest.value=meta.digest;form.elements.transferReady.value=meta.transferReady?"1":"";
    },true);
  }
  function refreshOptions(){
    const select=document.querySelector('#listingForm [name="bikeId"]');if(!select)return;
    const current=select.value;select.innerHTML=`<option value="">${tr("none")}</option>`+bikes().map(b=>`<option value="${String(b.id).replace(/"/g,"&quot;")}">${title(b)}</option>`).join("");if([...select.options].some(o=>o.value===current))select.value=current;
    const span=select.closest("label")?.querySelector("span");if(span)span.textContent=tr("label");
  }
  function decorate(){
    const state=Store.read(localStorage);
    document.querySelectorAll(".listing-card").forEach(card=>{
      const id=card.querySelector("button[data-id]")?.dataset.id;if(!id)return;const item=state.items.find(x=>x.id===id);if(!item)return;
      card.querySelector(".passport-market-badges")?.remove();
      if(item.verificationLevel==="none"&&!item.transferReady)return;
      const box=document.createElement("div");box.className="passport-market-badges";
      if(item.verificationLevel==="verified")box.innerHTML+=`<span class="listing-badge verified">${tr("verified")}</span>`;
      else if(item.verificationLevel==="passport")box.innerHTML+=`<span class="listing-badge passport">${tr("passport")}</span>`;
      if(item.transferReady)box.innerHTML+=`<span class="listing-badge transfer">${tr("transfer")}</span>`;
      card.querySelector(".listing-meta")?.insertAdjacentElement("afterend",box);
    });
  }
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(decorate,25)});
  function init(){installField();decorate();const grid=document.getElementById("listingGrid");if(grid)observer.observe(grid,{childList:true,subtree:true});}
  window.addEventListener("bicipark:language-changed",()=>{refreshOptions();decorate()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
