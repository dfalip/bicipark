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
    id: "bike-jump",
    category: "games",
    title: "Bike Jump",
    description:
      "Baixa pel trampolí, calcula la sortida, controla la bicicleta en vol i aterra sobre la pendent.",
    href: "../bike-jump/",
    icon: "🚵",
    status: "Nou",
    statusType: "new",
    tags: ["Física", "Salt", "3 intents"],
    enabled: true
  }
];



