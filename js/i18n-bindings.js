(() => {
  "use strict";
  if (window.__BICIPARK_I18N_BINDINGS__) return;
  window.__BICIPARK_I18N_BINDINGS__ = true;

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const i18n = () => window.BiciParkI18n;
  const set = (selector, key) => { const el = q(selector); if (el) el.textContent = i18n().t(key); };
  const byHref = (root, part, key) => { const el = q(`${root} a[href*="${part}"]`); if (el) el.textContent = i18n().t(key); };
  const label = (name, key) => {
    const input = document.querySelector(`[name="${name}"]`);
    const el = input?.closest("label");
    if (!el) return;
    let node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) { node = document.createTextNode(""); el.prepend(node); }
    node.textContent = `${i18n().t(key)} `;
  };

  function home() {
    const todayNav=q('.board-nav [data-bicipark-entry="today"]'); if(todayNav)todayNav.textContent=i18n().t("nav.today");
    byHref(".board-nav","mapa-ciclista","nav.map"); byHref(".board-nav","aparcaments","nav.parking"); byHref(".board-nav","route-explorer","nav.routes"); byHref(".board-nav","bike-bases","nav.bikeBases"); byHref(".board-nav","missions","nav.missions");
    const more=q("#moreMenuBtn"); if(more?.firstChild)more.firstChild.textContent=`${i18n().t("nav.more")} `;
    const myBike=q('#moreMenu [data-bicipark-entry="my-bike"] strong'); if(myBike)myBike.textContent=i18n().t("nav.myBike");
    const planner=q('#moreMenu [data-bicipark-entry="planner"] strong'); if(planner)planner.textContent=i18n().t("nav.plan");
    set(".hero-copy h2","home.hero.title"); set(".hero-copy p","home.hero.desc");
    const todayHero=q('.hero-actions [data-bicipark-entry="today"]'); if(todayHero)todayHero.textContent=i18n().t("home.hero.today");
    byHref(".hero-actions","mapa-ciclista","home.hero.explore"); byHref(".hero-actions","route-explorer","home.hero.route"); byHref(".hero-actions","aparcaments","home.hero.parking");
    const headings=qa(".content-section > h3"); if(headings[0])headings[0].textContent=i18n().t("home.explore"); if(headings[1])headings[1].textContent=i18n().t("home.challenges"); if(headings[2])headings[2].textContent=i18n().t("home.discover");
    const cardMap=[
      ["mapa-ciclista","home.map.title","home.map.desc"],["route-explorer","home.routes.title","home.routes.desc"],["bike-bases","home.bases.title","home.bases.desc"],["drag-map-game","home.game","home.game.desc"],["tour-2026","home.tour","home.tour.desc"],["bike-jump","home.jump","home.jump.desc"]
    ];
    cardMap.forEach(([href,title,desc])=>{const c=q(`.content-card[href*="${href}"]`);if(!c)return;const h=c.querySelector("h4"),p=c.querySelector("p");if(h)h.textContent=i18n().t(title);if(p)p.textContent=i18n().t(desc)});
    const challenges=qa(".challenge-card"); const cKeys=[["nav.missions","home.missions.desc"],["home.surprise","home.surprise.desc"],["home.rewards","home.rewards.desc"]]; challenges.forEach((c,i)=>{const [a,b]=cKeys[i]||[];if(!a)return;const strong=c.querySelector("strong"),small=c.querySelector("small");if(strong)strong.textContent=i18n().t(a);if(small)small.textContent=i18n().t(b)});
    set(".partner-kicker","home.partner.kicker"); set(".partner-copy h3","home.partner.title"); set(".partner-copy p","home.partner.desc"); set(".partner-banner > a","home.partner.cta");
  }

  function today() {
    set(".today-eyebrow","today.eyebrow"); set(".today-hero h1","today.title"); set(".today-hero p","today.intro"); set(".today-location span","today.location"); set("#locationBtn","today.useLocation");
    byHref(".today-nav-links","route-match","nav.profile"); byHref(".today-nav-links","my-bike","nav.myBike"); byHref(".today-nav-links","route-planner","nav.plan");
    const cards=qa(".context-card"); const heads=["today.profile","today.bike","today.history"],links=["today.editProfile","today.editBike","today.viewHistory"];cards.forEach((c,i)=>{const s=c.querySelector("span"),a=c.querySelector("a");if(s&&heads[i])s.textContent=i18n().t(heads[i]);if(a&&links[i])a.textContent=i18n().t(links[i])});
    set(".today-choice h2","today.mood"); set("#refreshBtn","today.refresh");
    const moodMap={normal:"today.normal",easy:"today.easy",train:"today.train",nature:"today.nature",climb:"today.climb",coffee:"today.coffee",quick:"today.quick"}; qa("[data-mood]").forEach(b=>{if(moodMap[b.dataset.mood])b.textContent=i18n().t(moodMap[b.dataset.mood])});
    qa(".today-card").forEach((card,i)=>{const kicker=card.querySelector(".today-kicker"),score=card.querySelector(".today-score small"),acts=card.querySelectorAll(".today-actions a");if(kicker)kicker.textContent=i18n().t(i===0?"today.best":"today.alt");if(score)score.textContent=i18n().t("today.fit");if(acts[0])acts[0].textContent=i18n().t("today.viewRoute");if(acts[1])acts[1].textContent=i18n().t("today.planOther")});
  }

  function myBike() {
    byHref(".bike-nav","modules/today","nav.today"); byHref(".bike-nav","route-match","nav.profile");
    set(".bike-hero > span","bike.eyebrow"); set(".bike-hero h1","bike.title"); set(".bike-hero p","bike.intro");
    const activeText=q(".bike-active")?.firstChild;if(activeText)activeText.textContent=`${i18n().t("bike.active")} `;
    set("#formTitle",q("#saveBikeBtn")?.dataset.editing==="1"?"bike.edit":"bike.add");set(".bike-panel > p","bike.localNote");
    [["nickname","bike.nickname"],["modality","bike.modality"],["brand","bike.brand"],["model","bike.model"],["year","bike.year"],["bikeWeightKg","bike.bikeWeight"],["riderWeightKg","bike.riderWeight"],["cargoKg","bike.cargo"],["wheelSize","bike.wheelSize"],["tireWidthMm","bike.tireWidth"],["tireType","bike.tireType"],["frontBar","bike.pressure"],["serialHint","bike.serial"],["odometerKm","bike.odometer"],["chainServiceKm","bike.chain"],["tiresServiceKm","bike.tires"],["brakesServiceKm","bike.brakes"],["lastWorkshopDate","bike.workshop"],["pressureSurface","pressure.surface"],["pressureSpeed","pressure.speed"],["frontWeightPct","pressure.frontPct"],["rimType","pressure.rim"],["manufacturerMaxBar","pressure.max"]].forEach(([n,k])=>label(n,k));
    const legends=qa(".bike-form legend");if(legends[0])legends[0].textContent=i18n().t("bike.wheels");if(legends[1])legends[1].textContent=i18n().t("pressure.title");if(legends[2])legends[2].textContent=i18n().t("bike.passport");
    const save=q("#saveBikeBtn");if(save)save.textContent=i18n().t(save.dataset.editing==="1"?"bike.saveChanges":"bike.save");set("#cancelEditBtn","bike.cancel");set("#bikeEmpty h2","bike.empty");set("#bikeEmpty p","bike.emptyDesc");
    set("#pressureAdvisorTitle","pressure.title");set("#pressureAdvisorIntro","pressure.intro");set("#pressureDisclaimer","pressure.disclaimer");
  }

  function apply(){if(!i18n())return;const p=location.pathname;if(p==="/"||/index\.html$/.test(p))home();if(p.includes("/modules/today"))today();if(p.includes("/modules/my-bike"))myBike()}
  window.addEventListener("bicipark:language-changed",apply);
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(apply,20)});
  document.addEventListener("DOMContentLoaded",()=>{apply();observer.observe(document.body,{subtree:true,childList:true})},{once:true});
  if(document.readyState!=="loading"){apply();observer.observe(document.body,{subtree:true,childList:true})}
})();
