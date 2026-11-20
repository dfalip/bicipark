/*
 * Registre central dels accessos de Bicipark.
 *
 * Aquest fitxer només defineix enllaços. No importa codi dels mòduls.
 *
 * enabled: true
 *   La targeta té un botó per obrir el mòdul.
 *
 * enabled: false
 *   La targeta es mostra com a properament disponible.
 *
 * Pots canviar els href sense tocar app.js.
 */

export const moduleCategories = [
  {
    id: "all",
    label: "Tot"
  },
  {
    id: "map",
    label: "Mapa"
  },
  {
    id: "routes",
    label: "Rutes"
  },
  {
    id: "missions",
    label: "Missions"
  },
  {
    id: "games",
    label: "Jocs"
  }
];

export const biciparkModules = [
  {
    id: "main-map",
    category: "map",
    title: "Mapa i aparcaments",
    description:
      "Consulta aparcaments, carrils bici, punts d'interès i serveis ciclistes.",
    href: "../index.html",
    icon: "🗺️",
    status: "Principal",
    statusType: "default",
    tags: ["Aparcaments", "Carrils bici", "POI"],
    enabled: true
  },
  {
    id: "routes",
    category: "routes",
    title: "Rutes ciclistes",
    description:
      "Descobreix rutes, dificultat, distància, desnivell i informació pràctica.",
    href: "../rutes.html",
    icon: "🚴",
    status: "Configurable",
    statusType: "development",
    tags: ["Carretera", "BTT", "Desnivell"],
    enabled: false
  },
  {
    id: "missions",
    category: "missions",
    title: "Missions",
    description:
      "Completa recorreguts, arriba als checkpoints i acumula recompenses.",
    href: "../missions.html",
    icon: "🎯",
    status: "Disponible",
    statusType: "default",
    tags: ["GPS", "Checkpoints", "Punts"],
    enabled: true
  },
  {
    id: "surprise-missions",
    category: "missions",
    title: "Missions sorpresa",
    description:
      "Accepta un repte inesperat i descobreix una nova zona sobre la marxa.",
    href: "../missions-sorpresa.html",
    icon: "🎁",
    status: "Experimental",
    statusType: "development",
    tags: ["Sorpresa", "Exploració", "Reptes"],
    enabled: true
  },
  {
    id: "map-game",
    category: "games",
    title: "On és això?",
    description:
      "Observa una imatge, marca una ubicació i aconsegueix punts per proximitat.",
    href: "../map-game/",
    icon: "📍",
    status: "Prototip",
    statusType: "development",
    tags: ["Imatges", "Mapa", "Precisió"],
    enabled: true
  },
  {
    id: "drag-map-game",
    category: "games",
    title: "Arrossega el lloc",
    description:
      "Arrossega un nom o una fotografia al mapa. La precisió i la rapidesa puntuen.",
    href: "../drag-map-game/",
    icon: "🧩",
    status: "Nou",
    statusType: "new",
    tags: ["Drag & drop", "Temporitzador", "Puntuació"],
    enabled: true
  },
  {
    id: "tour-2026",
    category: "routes",
    title: "Tour de France 2026",
    description:
      "Consulta les 21 etapes oficials i les geometries GPX disponibles i validades.",
    href: "../tour-2026/",
    icon: "🟨",
    status: "Nou",
    statusType: "new",
    tags: ["21 etapes", "GPX", "Tour 2026"],
    enabled: true
  },
  {
    id: "route-explorer",
    category: "routes",
    title: "Explorador de rutes",
    description:
      "Descobreix rutes progressivament segons la regió, el zoom, la modalitat i la dificultat.",
    href: "../route-explorer/",
    icon: "🧭",
    status: "Nou",
    statusType: "new",
    tags: ["Zoom progressiu", "Regions", "GeoJSON i GPX"],
    enabled: true
  },
  {
    id: "joc-3clics",
    category: "games",
    title: "El joc dels 3 clics",
    description:
      "Troba monuments i llocs al mapa amb un màxim de tres intents.",
    href: "../joc-3clics.html",
    icon: "🌍",
    status: "Disponible",
    statusType: "default",
    tags: ["Geografia", "Mapa", "3 intents"],
    enabled: true
  },
  {
    id: "bike-cannon",
    category: "games",
    title: "Bike Cannon",
    description:
      "Un prototip experimental: ajusta l'angle i la potència i llança la bicicleta.",
    href: "../modules/bike-cannon/",
    icon: "🚀",
    status: "Prototip",
    statusType: "development",
    tags: ["Arcade", "Llançament", "Experimental"],
    enabled: true
  },
  {
    id: "geo-sprint",
    category: "games",
    title: "GeoSprint · Volta al món",
    description:
      "Cinc ciutats de cinc continents: encerta on són, guanya punts i viatja pel planeta amb el mapa.",
    href: "../geo-sprint/",
    icon: "🌍",
    status: "Prototip jugable",
    statusType: "development",
    tags: ["Món", "Geografia", "5 rondes", "CA · ES · EN · FR"],
    enabled: true
  },
  {
    id: "zombiepedal",
    category: "games",
    title: "ZombiePedal · Escapa de la ciutat",
    description:
      "Escapa de la ciutat en 4 zones o sobreviu en un circuit infinit d'onades progressives. Salta, recull estrelles, frena zombis amb pintura i bat els teus rècords!",
    href: "../zombiepedal/",
    icon: "🧟",
    status: "Nou joc",
    statusType: "new",
    tags: ["Arcade", "Persecució", "Salts", "Zombis", "4 zones", "Paintball"],
    enabled: true
  },
  {
    id: "snowbike-downhill",
    category: "games",
    title: "SnowBike Downhill · Descens alpí",
    description:
      "Competeix en quatre proves de descens amb una bicicleta d'esquí. Porta l'eslàlom al límit, esquiva animals que creuen la pista i bat el cronòmetre.",
    href: "../snowbike-downhill/",
    icon: "⛷️",
    status: "Nou joc",
    statusType: "new",
    tags: ["Descens", "Arcade", "Esquí", "Animals", "Contrarellotge", "4 pistes"],
    enabled: true
  },
  {
    id: "bike-parking-puzzle",
    category: "games",
    title: "BiciPark Puzzle · Aparca-les!",
    description:
      "Dotze nivells de lògica en quatre capítols: mou bicicletes, allibera passadissos i aparca-les amb moviments limitats. Pistes reals i desfés!",
    href: "../bike-parking-puzzle/",
    icon: "🧩",
    status: "Nou joc",
    statusType: "new",
    tags: ["Lògica", "Aparcament", "Bicicletes", "12 nivells", "Estratègia"],
    enabled: true
  },
  {
    id: "roda-rumble",
    category: "games",
    title: "RodaRumble · Destrueix les torres",
    description:
      "Apunta una llançadora, dispara rodes i fes caure estructures de fusta, vidre i acer. Deu nivells de física i explosions!",
    href: "../roda-rumble/",
    icon: "💥",
    status: "Nou joc",
    statusType: "new",
    tags: ["Demolició", "Arcade", "Física", "10 nivells", "Puzle"],
    enabled: true
  },
  {
    id: "bike-jump-ride",
    category: "games",
    title: "BikeJump Ride · Circuit principal",
    description:
      "Condueix la bicicleta per un recorregut continu de 1,2 km amb quatre rampes, barrancs, anelles, punts de control i meta.",
    href: "../bike-jump-ride/",
    icon: "🚵",
    status: "Destacat",
    statusType: "new",
    tags: ["Conducció", "Salt", "Circuit", "Muntanya", "Arcade"],
    enabled: true
  },
  {
    id: "bike-jump",
    category: "games",
    title: "BikeJump clàssic · Salts",
    description:
      "Versió original: tres salts de precisió, control de l'equilibri i aterratges.",
    href: "../bike-jump/",
    icon: "🚵",
    status: "Clàssic",
    statusType: "development",
    tags: ["Arcade", "Salt", "3 intents"],
    enabled: true
  }
];



