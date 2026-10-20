(() => {
  "use strict";
  if (window.__BICIPARK_MARKETPLACE_NAV__) return;
  window.__BICIPARK_MARKETPLACE_NAV__ = true;

  const labels = {
    ca: { market: "Mercat", marketDesc: "Compra, ven o intercanvia material.", passport: "Bike Passport", passportDesc: "Identitat, proves i transferència." },
    es: { market: "Mercado", marketDesc: "Compra, vende o intercambia material.", passport: "Bike Passport", passportDesc: "Identidad, pruebas y transferencia." },
    en: { market: "Market", marketDesc: "Buy, sell or swap cycling gear.", passport: "Bike Passport", passportDesc: "Identity, proofs and ownership transfer." },
    fr: { market: "Marché", marketDesc: "Achetez, vendez ou échangez du matériel.", passport: "Bike Passport", passportDesc: "Identité, preuves et transfert de propriété." }
  };

  function language() { return window.BiciParkI18n?.getLanguage?.() || localStorage.getItem("bicipark.language.v1") || "ca"; }
  function text() { return labels[language()] || labels.ca; }
  function entry(menu,key,href,icon){
    let link=menu.querySelector(`[data-bicipark-entry="${key}"]`);
    if(!link){link=document.createElement("a");link.href=href;link.dataset.biciparkEntry=key;link.innerHTML=`<span class="bp-nav-menu-icon" aria-hidden="true">${icon}</span><span class="bp-nav-menu-copy"><strong></strong><small></small></span>`;menu.insertBefore(link,menu.firstElementChild)}
    return link;
  }
  function install() {
    const menu = document.querySelector("#bp-global-nav .bp-nav-menu");
    if (!menu) return false;
    const copy=text();
    const market=entry(menu,"market","/modules/marketplace/","↔");market.querySelector("strong").textContent=copy.market;market.querySelector("small").textContent=copy.marketDesc;
    const passport=entry(menu,"passport","/modules/bike-passport/","✓");passport.querySelector("strong").textContent=copy.passport;passport.querySelector("small").textContent=copy.passportDesc;
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries+=1;if(install()||tries>40)clearInterval(timer)},100);
  window.addEventListener("bicipark:language-changed", install);
})();
