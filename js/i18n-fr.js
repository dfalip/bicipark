(() => {
  "use strict";
  const base = window.BiciParkI18n;
  if (!base || window.__BICIPARK_I18N_FR__) return;
  window.__BICIPARK_I18N_FR__ = true;

  const STORAGE_KEY = "bicipark.language.v1";
  const fr = {
    "lang.label":"Langue",
    "nav.today":"Aujourd’hui","nav.map":"Carte","nav.parking":"Stationnement","nav.routes":"Itinéraires","nav.bikeBases":"Bike Bases","nav.missions":"Missions","nav.more":"Plus","nav.profile":"Profil","nav.myBike":"Mon vélo","nav.plan":"Planifier",
    "home.hero.title":"Tout ce qu’il vous faut pour rouler","home.hero.desc":"Découvrez des itinéraires, Bike Bases, stationnements, missions et expériences cyclistes au même endroit.","home.hero.today":"Que faire aujourd’hui ?","home.hero.explore":"Explorer la carte","home.hero.route":"Trouver un itinéraire","home.hero.parking":"Trouver un stationnement",
    "home.explore":"Explorer","home.map.title":"Carte cycliste","home.map.desc":"Découvrez les itinéraires et points d’intérêt autour de vous.","home.routes.title":"Itinéraires","home.routes.desc":"Route / Gravel / VTT","home.bases.title":"Bike Bases","home.bases.desc":"Hébergements et services pensés pour les cyclistes.",
    "home.challenges":"Défis","home.missions.desc":"Relevez des défis et gagnez des points.","home.surprise":"Missions surprise","home.surprise.desc":"Des défis cachés pour découvrir davantage.","home.rewards":"Points et récompenses","home.rewards.desc":"Cumulez des points et préparez de futures récompenses.",
    "home.discover":"Découvrir","home.game":"Faites glisser le lieu","home.game.desc":"Jeu de géographie cycliste. Où se trouve ce lieu ?","home.tour":"Tour de France 2026","home.tour.desc":"Suivez les étapes, cartes et nouveautés.","home.jump":"Bike Jump","home.jump.desc":"Sautez, relevez les défis et tentez de battre votre record.",
    "home.partner.kicker":"POUR LES HÉBERGEMENTS","home.partner.title":"Devenez Bike Base BiciPark","home.partner.desc":"Présentez vos services pour cyclistes, connectez-vous aux itinéraires locaux et rejoignez le réseau Bike Bases.","home.partner.cta":"Plus d’informations",
    "today.eyebrow":"BICIPARK TODAY","today.title":"Quel itinéraire vous convient aujourd’hui ?","today.intro":"Nous combinons votre profil, votre vélo actif, votre activité récente et la météo pour classer de vrais itinéraires du catalogue BiciPark. Le score d’adéquation est un indicateur produit, pas une probabilité ni une indication de sécurité.","today.location":"Zone de départ","today.useLocation":"Utiliser ma position","today.profile":"Profil","today.editProfile":"Modifier le profil","today.bike":"Vélo actif","today.editBike":"Modifier le vélo","today.configureBike":"Configurer le vélo","today.history":"7 derniers jours","today.viewHistory":"Voir l’historique","today.mood":"De quoi avez-vous envie ?","today.refresh":"Actualiser la météo","today.normal":"🚲 Recommandez-moi","today.easy":"😌 Tranquille","today.train":"🔥 Entraînement","today.nature":"🌳 Nature","today.climb":"⛰️ Grimper","today.coffee":"☕ Sortie + café","today.quick":"⚡ Rapide","today.best":"RECOMMANDÉ AUJOURD’HUI","today.alt":"ALTERNATIVE","today.fit":"adéquation","today.viewRoute":"Voir l’itinéraire","today.planOther":"Planifier un autre",
    "bike.eyebrow":"MY BIKE","bike.title":"Votre vélo fait aussi partie de votre profil.","bike.intro":"Enregistrez la configuration de base, le kilométrage et les derniers entretiens. BiciPark Today peut utiliser le type de vélo actif pour mieux classer les itinéraires.","bike.active":"Vélo actif :","bike.none":"Aucun vélo configuré","bike.add":"Ajouter un vélo","bike.localNote":"Dans cette version, les données sont enregistrées uniquement dans ce navigateur.","bike.nickname":"Nom court","bike.modality":"Type","bike.brand":"Marque","bike.model":"Modèle","bike.year":"Année","bike.bikeWeight":"Poids du vélo (kg)","bike.riderWeight":"Poids du cycliste (kg)","bike.cargo":"Charge habituelle (kg)","bike.wheels":"Roues et pression habituelle","bike.wheelSize":"Taille de roue","bike.tireWidth":"Largeur du pneu (mm)","bike.tireType":"Type","bike.pressure":"Pression av./arr. (bar)","bike.passport":"Passeport et entretien","bike.serial":"4 derniers caractères du numéro de série","bike.odometer":"Kilométrage total","bike.chain":"Chaîne entretenue/remplacée au km","bike.tires":"Pneus entretenus/remplacés au km","bike.brakes":"Freins entretenus au km","bike.workshop":"Dernière visite à l’atelier","bike.save":"Enregistrer le vélo","bike.cancel":"Effacer / annuler","bike.empty":"Aucun vélo pour le moment","bike.emptyDesc":"Ajoutez-en un pour commencer votre Bike Passport local.","bike.edit":"Modifier le vélo","bike.saveChanges":"Enregistrer les modifications","bike.activeTag":"VÉLO ACTIF","bike.tag":"VÉLO","bike.mileage":"Kilométrage","bike.tiresLabel":"Pneus","bike.usualPressure":"Pression habituelle","bike.serialLabel":"Numéro de série","bike.notSet":"Non indiqué","bike.notSaved":"Non enregistré","bike.maintenance":"Entretien enregistré","bike.activate":"Définir actif","bike.editAction":"Modifier","bike.export":"Exporter le passeport","bike.remove":"Supprimer",
    "pressure.title":"Pressure Advisor · Bêta","pressure.intro":"Renseignez les variables qui influencent la pression avant tout calcul. BiciPark n’invente pas de valeur : il vérifie que la configuration est complète et permet de la comparer à un calculateur spécialisé.","pressure.surface":"Surface habituelle","pressure.smooth":"Asphalte lisse","pressure.mixed":"Asphalte irrégulier / mixte","pressure.gravel":"Gravel","pressure.trail":"Piste / VTT","pressure.speed":"Vitesse moyenne","pressure.slow":"< 20 km/h","pressure.medium":"20–30 km/h","pressure.fast":"30–40 km/h","pressure.veryFast":"> 40 km/h","pressure.frontPct":"% du poids à l’avant","pressure.rim":"Type de jante","pressure.hooked":"Hooked / conventionnelle","pressure.hookless":"Hookless","pressure.max":"Maximum fabricant (bar)","pressure.readiness":"Préparation de la configuration","pressure.complete":"Configuration complète pour comparer une pression de départ","pressure.missing":"Données manquantes","pressure.systemWeight":"Poids total du système","pressure.copy":"Copier le résumé","pressure.external":"Ouvrir un calculateur spécialisé","pressure.disclaimer":"Respectez toujours les limites du fabricant du pneu et de la jante. Avec un montage hookless/tubeless, dépasser la pression maximale autorisée peut être dangereux.",
    "common.noData":"Aucune donnée","common.kmSince":"{km} km depuis le dernier enregistrement","common.noHistory":"Aucune donnée d’historique","common.noActivity7":"Aucune activité enregistrée sur les 7 derniers jours","common.activity7":"{km} km sur {count} activités au cours des 7 derniers jours"
  };

  const originalT = base.t.bind(base);
  const originalSet = base.setLanguage.bind(base);
  const originalMount = base.mountSwitchers.bind(base);
  let language = localStorage.getItem(STORAGE_KEY) === "fr" ? "fr" : base.getLanguage();

  function interpolate(text, vars = {}) { return String(text).replace(/\{(\w+)\}/g, (_, key) => vars[key] == null ? `{${key}}` : String(vars[key])); }
  function t(key, vars) { return language === "fr" ? interpolate(fr[key] ?? originalT(key, vars), vars) : originalT(key, vars); }

  function renderSwitchers() {
    document.querySelectorAll("[data-bp-language-switcher]").forEach(host => {
      host.dataset.ready = "1";
      host.classList.add("bp-language");
      host.innerHTML = `<span aria-hidden="true">🌐</span><select aria-label="${t("lang.label")}"><option value="ca">CA</option><option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option></select>`;
      const select = host.querySelector("select"); select.value = language;
      select.addEventListener("change", () => setLanguage(select.value));
    });
  }

  function setLanguage(next) {
    if (next === "fr") {
      language = "fr"; localStorage.setItem(STORAGE_KEY, "fr");
      document.documentElement.lang = "fr";
      renderSwitchers();
      window.dispatchEvent(new CustomEvent("bicipark:language-changed", { detail: { language: "fr" } }));
      return;
    }
    language = next; originalSet(next); renderSwitchers();
  }

  base.t = t;
  base.getLanguage = () => language;
  base.setLanguage = setLanguage;
  base.supported = ["ca","es","en","fr"];
  base.mountSwitchers = () => { originalMount(); renderSwitchers(); };
  renderSwitchers();
})();
