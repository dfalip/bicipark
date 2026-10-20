(() => {
  "use strict";
  if (window.__BICIPARK_I18N_BINDINGS__) return;
  window.__BICIPARK_I18N_BINDINGS__ = true;

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const i18n = () => window.BiciParkI18n;
  const set = (selector, key) => { const el = q(selector); if (el) el.textContent = i18n().t(key); };
  const setAll = (selector, key) => qa(selector).forEach(el => { el.textContent = i18n().t(key); });
  const label = (name, key) => {
    const input = document.querySelector(`[name="${name}"]`);
    const el = input?.closest("label");
    if (!el) return;
    let node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) { node = document.createTextNode(""); el.prepend(node); }
    node.textContent = `${i18n().t(key)} `;
  };

  function home() {
    const nav = qa(".board-nav > a");
    [[0,"nav.map"],[1,"nav.parking"],[2,"nav.routes"],[3,"nav.bikeBases"],[4,"nav.missions"]].forEach(([i,k]) => { if(nav[i]) nav[i].textContent=i18n().t(k); });
    const more = q("#moreMenuBtn"); if (more?.firstChild) more.firstChild.textContent = `${i18n().t("nav.more")} `;
    set(".hero-copy h2","home.hero.title"); set(".hero-copy p","home.hero.desc");
    const actions=qa(".hero-actions a"); [[0,"home.hero.explore"],[1,"home.hero.route"],[2,"home.hero.parking"]].forEach(([i,k])=>{if(actions[i])actions[i].textContent=i18n().t(k)});
    const h3=qa(".content-section > h3"); if(h3[0])h3[0].textContent=i18n().t("home.explore"); if(h3[1])h3[1].textContent=i18n().t("home.challenges"); if(h3[2])h3[2].textContent=i18n().t("home.discover");
    const cards=qa(".content-card"); const cardKeys=[["home.map.title","home.map.desc"],["home.routes.title","home.routes.desc"],["home.bases.title","home.bases.desc"],["home.game","home.game.desc"],["home.tour","home.tour.desc"],["home.jump","home.jump.desc"]]; cards.forEach((c,i)=>{if(!cardKeys[i])return; const [a,b]=cardKeys[i]; const h=c.querySelector("h4"),p=c.querySelector("p"); if(h)h.textContent=i18n().t(a); if(p)p.textContent=i18n().t(b)});
    const challenges=qa(".challenge-card"); const cKeys=[["nav.missions","home.missions.desc"],["home.surprise","home.surprise.desc"],["home.rewards","home.rewards.desc"]]; challenges.forEach((c,i)=>{const [a,b]=cKeys[i]||[]; if(!a)return; c.querySelector("strong").textContent=i18n().t(a); c.querySelector("small").textContent=i18n().t(b)});
    set(".partner-kicker","home.partner.kicker"); set(".partner-copy h3","home.partner.title"); set(".partner-copy p","home.partner.desc"); set(".partner-banner > a","home.partner.cta");
  }

  function today() {
    set(".today-eyebrow","today.eyebrow"); set(".today-hero h1","today.title"); set(".today-hero p","today.intro"); set(".today-location span","today.location"); set("#locationBtn","today.useLocation");
    const nav=qa(".today-nav-links a"); [[0,"nav.profile"],[1,"nav.myBike"],[2,"nav.plan"]].forEach(([i,k])=>{if(nav[i])nav[i].textContent=i18n().t(k)});
    const cards=qa(".context-card"); const heads=["today.profile","today.bike","today.history"], links=["today.editProfile","today.editBike","today.viewHistory"]; cards.forEach((c,i)=>{const s=c.querySelector("span"),a=c.querySelector("a"); if(s&&heads[i])s.textContent=i18n().t(heads[i]); if(a&&links[i])a.textContent=i18n().t(links[i])});
    set(".today-choice h2","today.mood"); set("#refreshBtn","today.refresh");
    const moods=qa("[data-mood]"); const keys=["today.normal","today.easy","today.train","today.nature","today.climb","today.coffee","today.quick"]; moods.forEach((b,i)=>{if(keys[i])b.textContent=i18n().t(keys[i])});
    qa(".today-card").forEach((card,i)=>{const kicker=card.querySelector(".today-kicker"), score=card.querySelector(".today-score small"), acts=card.querySelectorAll(".today-actions a"); if(kicker)kicker.textContent=i18n().t(i===0?"today.best":"today.alt"); if(score)score.textContent=i18n().t("today.fit"); if(acts[0])acts[0].textContent=i18n().t("today.viewRoute"); if(acts[1])acts[1].textContent=i18n().t("today.planOther")});
  }

  function myBike() {
    const nav=qa(".bike-nav div a"); if(nav[0])nav[0].textContent=i18n().t("nav.today"); if(nav[1])nav[1].textContent=i18n().t("nav.profile");
    set(".bike-hero > span","bike.eyebrow"); set(".bike-hero h1","bike.title"); set(".bike-hero p","bike.intro");
    const activeText=q(".bike-active")?.firstChild; if(activeText)activeText.textContent=`${i18n().t("bike.active")} `;
    set("#formTitle", q("#formTitle")?.textContent.includes("Edit") ? "bike.edit" : "bike.add"); set(".bike-panel > p","bike.localNote");
    [["nickname","bike.nickname"],["modality","bike.modality"],["brand","bike.brand"],["model","bike.model"],["year","bike.year"],["bikeWeightKg","bike.bikeWeight"],["riderWeightKg","bike.riderWeight"],["cargoKg","bike.cargo"],["wheelSize","bike.wheelSize"],["tireWidthMm","bike.tireWidth"],["tireType","bike.tireType"],["frontBar","bike.pressure"],["serialHint","bike.serial"],["odometerKm","bike.odometer"],["chainServiceKm","bike.chain"],["tiresServiceKm","bike.tires"],["brakesServiceKm","bike.brakes"],["lastWorkshopDate","bike.workshop"],["pressureSurface","pressure.surface"],["pressureSpeed","pressure.speed"],["frontWeightPct","pressure.frontPct"],["rimType","pressure.rim"],["manufacturerMaxBar","pressure.max"]].forEach(([n,k])=>label(n,k));
    const legends=qa(".bike-form legend"); if(legends[0])legends[0].textContent=i18n().t("bike.wheels"); if(legends[1])legends[1].textContent=i18n().t("pressure.title"); if(legends[2])legends[2].textContent=i18n().t("bike.passport");
    const save=q("#saveBikeBtn"); if(save)save.textContent=i18n().t(save.dataset.editing==="1"?"bike.saveChanges":"bike.save"); set("#cancelEditBtn","bike.cancel"); set("#bikeEmpty h2","bike.empty"); set("#bikeEmpty p","bike.emptyDesc");
    qa(".bike-card").forEach(card=>{const active=card.classList.contains("is-active"); const tag=card.querySelector(".bike-card-head span"); if(tag)tag.textContent=i18n().t(active?"bike.activeTag":"bike.tag"); const labels=card.querySelectorAll(".bike-grid span"); ["bike.mileage","bike.tiresLabel","bike.usualPressure","bike.serialLabel"].forEach((k,i)=>{if(labels[i])labels[i].textContent=i18n().t(k)}); const summary=card.querySelector(".maintenance summary"); if(summary)summary.textContent=i18n().t("bike.maintenance"); card.querySelectorAll("button[data-action]").forEach(b=>{const map={activate:"bike.activate",edit:"bike.editAction",export:"bike.export",remove:"bike.remove"}; if(map[b.dataset.action])b.textContent=i18n().t(map[b.dataset.action])});});
    set("#pressureAdvisorTitle","pressure.title"); set("#pressureAdvisorIntro","pressure.intro"); set("#pressureDisclaimer","pressure.disclaimer");
  }

  function apply(){ if(!i18n())return; const p=location.pathname; if(p==="/"||/index\.html$/.test(p))home(); if(p.includes("/modules/today"))today(); if(p.includes("/modules/my-bike"))myBike(); }
  window.addEventListener("bicipark:language-changed",apply);
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(apply,20)});
  document.addEventListener("DOMContentLoaded",()=>{apply();observer.observe(document.body,{subtree:true,childList:true})},{once:true});
  if(document.readyState!=="loading"){apply();observer.observe(document.body,{subtree:true,childList:true})}
})();
