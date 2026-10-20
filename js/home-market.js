(() => {
  "use strict";
  if(window.__BICIPARK_HOME_MARKET__)return;
  window.__BICIPARK_HOME_MARKET__=true;

  const copy={
    ca:{kicker:"MERCAT CIRCULAR",title:"Mercat BiciPark",intro:"Dona una segona vida a bicicletes, components i equipament. Les bicicletes poden vincular el seu Bike Passport.",cta:"Veure tot el Mercat",sale:"Venda",exchange:"Intercanvi",both:"Venda o intercanvi",swap:"Canvi per",verified:"✓ BiciPark Verified",passport:"Bike Passport",passportMenu:"Identitat, proves i transferència",sample:"Mostra",cond:{new:"Nou",excellent:"Excel·lent",good:"Bon estat",used:"Usat"}},
    es:{kicker:"MERCADO CIRCULAR",title:"Mercado BiciPark",intro:"Da una segunda vida a bicicletas, componentes y equipamiento. Las bicicletas pueden vincular su Bike Passport.",cta:"Ver todo el Mercado",sale:"Venta",exchange:"Intercambio",both:"Venta o intercambio",swap:"Cambio por",verified:"✓ BiciPark Verified",passport:"Bike Passport",passportMenu:"Identidad, pruebas y transferencia",sample:"Muestra",cond:{new:"Nuevo",excellent:"Excelente",good:"Buen estado",used:"Usado"}},
    en:{kicker:"CIRCULAR MARKET",title:"BiciPark Market",intro:"Give bikes, components and gear a second life. Bikes can link their Bike Passport.",cta:"View full Market",sale:"For sale",exchange:"Swap",both:"Sale or swap",swap:"Swap for",verified:"✓ BiciPark Verified",passport:"Bike Passport",passportMenu:"Identity, proofs and ownership transfer",sample:"Sample",cond:{new:"New",excellent:"Excellent",good:"Good",used:"Used"}},
    fr:{kicker:"MARCHÉ CIRCULAIRE",title:"Marché BiciPark",intro:"Donnez une seconde vie aux vélos, composants et équipements. Les vélos peuvent lier leur Bike Passport.",cta:"Voir tout le Marché",sale:"Vente",exchange:"Échange",both:"Vente ou échange",swap:"Échange contre",verified:"✓ BiciPark Verified",passport:"Bike Passport",passportMenu:"Identité, preuves et transfert de propriété",sample:"Exemple",cond:{new:"Neuf",excellent:"Excellent",good:"Bon état",used:"Utilisé"}}
  };
  const lang=()=>window.BiciParkI18n?.getLanguage?.()||localStorage.getItem("bicipark.language.v1")||"ca";
  const dict=()=>copy[lang()]||copy.ca;
  const tr=k=>dict()[k];
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=cat=>cat==="bike"?"🚲":cat==="components"?"⚙️":cat==="accessories"?"🪖":cat==="clothing"?"👕":cat==="tools"?"🛠️":"♻️";
  const mode=m=>m==="sale"?tr("sale"):m==="exchange"?tr("exchange"):tr("both");
  const condition=c=>dict().cond?.[c]||c||"";
  const price=item=>item.price==null?"":`${Number(item.price).toLocaleString(lang(),{maximumFractionDigits:0})} €`;
  function loadScript(src){return new Promise(resolve=>{if(window.BiciParkMarketplaceStore)return resolve();const old=document.querySelector(`script[src="${src}"]`);if(old){old.addEventListener("load",resolve,{once:true});return}const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)})}
  function ensureCss(){if(document.querySelector('link[data-home-market]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href="/css/home-market.css?v=1";l.dataset.homeMarket="1";document.head.appendChild(l)}
  function translateMenu(){const p=document.querySelector('#moreMenu [data-bicipark-entry="passport"]');if(p){const strong=p.querySelector("strong"),small=p.querySelector("small");if(strong)strong.textContent=tr("passport");if(small)small.textContent=tr("passportMenu")}}
  function mount(){
    document.querySelector('[data-bicipark-entry="market-card"]')?.remove();translateMenu();
    let section=document.querySelector('[data-bicipark-market-home]');
    if(!section){const discover=document.querySelector('.content-card[href*="bike-jump"]')?.closest('.content-section');if(!discover)return;section=document.createElement("section");section.className="content-section market-home-section";section.dataset.biciparkMarketHome="1";discover.insertAdjacentElement("afterend",section)}
    const Store=window.BiciParkMarketplaceStore;if(!Store)return;
    const state=Store.read(localStorage);const items=[...state.items].sort((a,b)=>{const rank=x=>x.verificationLevel==="verified"?3:x.verificationLevel==="passport"?2:1;return rank(b)-rank(a)||String(b.createdAt).localeCompare(String(a.createdAt))}).slice(0,3);
    section.innerHTML=`<div class="market-home-head"><div><span class="market-home-kicker">${esc(tr("kicker"))}</span><h3>${esc(tr("title"))}</h3><p>${esc(tr("intro"))}</p></div><a class="btn btn-secondary" href="/modules/marketplace/">${esc(tr("cta"))}</a></div><div class="market-home-grid">${items.map(card).join("")}</div>`;
  }
  function card(item){
    const verification=item.verificationLevel==="verified"?`<span class="market-verified">${esc(tr("verified"))}</span>`:item.verificationLevel==="passport"?`<span class="market-passport">${esc(tr("passport"))}</span>`:"";
    return `<a class="market-home-card" href="/modules/marketplace/"><div class="market-home-media" data-category="${esc(item.category)}"><span class="market-home-icon">${icon(item.category)}</span><span class="market-home-mode">${esc(mode(item.mode))}</span></div><div class="market-home-body"><div class="market-home-topline"><h4 class="market-home-title">${esc(item.title)}</h4>${item.price!=null?`<span class="market-home-price">${esc(price(item))}</span>`:""}</div><div class="market-home-meta"><span>${esc(item.city||"BiciPark")}</span><span>·</span><span>${esc(condition(item.condition))}</span></div><div class="market-home-badges">${verification}</div>${item.exchangeFor?`<div class="market-home-exchange"><strong>${esc(tr("swap"))}:</strong> ${esc(item.exchangeFor)}</div>`:""}<div class="market-home-footer"><span>${item.isMine?"BiciPark":"BiciPark · "+esc(tr("sample"))}</span>${item.bikeId?`<strong>${esc(item.bikeId)}</strong>`:""}</div></div></a>`;
  }
  async function init(){ensureCss();await loadScript("/modules/marketplace/store.js");mount()}
  window.addEventListener("bicipark:language-changed",mount);window.addEventListener("storage",e=>{if(e.key==="bicipark.marketplace.v1")mount()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
