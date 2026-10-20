(() => {
  "use strict";
  if(window.__BICIPARK_RIDE_NAV__)return;
  window.__BICIPARK_RIDE_NAV__=true;

  const labels={
    ca:{title:"Ride",desc:"Grava velocitat, km i temps",short:"Ride"},
    es:{title:"Ride",desc:"Registra velocidad, km y tiempo",short:"Ride"},
    en:{title:"Ride",desc:"Track speed, distance and time",short:"Ride"},
    fr:{title:"Ride",desc:"Suivez vitesse, distance et temps",short:"Ride"}
  };
  const language=()=>window.BiciParkI18n?.getLanguage?.()||localStorage.getItem("bicipark.language.v1")||"ca";
  const text=()=>labels[language()]||labels.ca;

  function ensureSimple(rootSelector){
    const root=document.querySelector(rootSelector);if(!root)return;
    let link=root.querySelector('[data-bicipark-entry="ride"]');
    if(!link){link=document.createElement("a");link.href="/modules/ride/";link.dataset.biciparkEntry="ride";root.appendChild(link)}
    link.textContent=text().short;
  }

  function install(){
    const copy=text();
    const home=document.querySelector("#moreMenu");
    if(home){
      let link=home.querySelector('[data-bicipark-entry="ride"]');
      if(!link){link=document.createElement("a");link.href="/modules/ride/";link.dataset.biciparkEntry="ride";link.innerHTML='<strong></strong><small></small>';const bike=home.querySelector('[data-bicipark-entry="my-bike"]');bike?.insertAdjacentElement("afterend",link)||home.prepend(link)}
      link.querySelector("strong").textContent=copy.title;link.querySelector("small").textContent=copy.desc;
    }

    const menu=document.querySelector("#bp-global-nav .bp-nav-menu");
    if(menu){
      let link=menu.querySelector('[data-bicipark-entry="ride"]');
      if(!link){link=document.createElement("a");link.href="/modules/ride/";link.dataset.biciparkEntry="ride";link.innerHTML='<span class="bp-nav-menu-icon" aria-hidden="true">🚴</span><span class="bp-nav-menu-copy"><strong></strong><small></small></span>';menu.prepend(link)}
      link.querySelector("strong").textContent=copy.title;link.querySelector("small").textContent=copy.desc;
    }

    ensureSimple(".today-nav-links");
    ensureSimple(".bike-nav > div");
    ensureSimple(".market-topbar nav");
    ensureSimple(".passport-nav > div");
  }

  let tries=0;const timer=setInterval(()=>{tries++;install();if(tries>30)clearInterval(timer)},100);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.addEventListener("bicipark:language-changed",install);
})();
