window.BiciParkRouteDetailData = {
  "carretera-aigues": {
    id: "carretera-aigues",
    name: "Carretera de les Aig\u00fces",
    area: "Barcelona \u00b7 Collserola",
    distanceKm: 18.4,
    ascentM: 270,
    estimatedTime: "2:15 h",
    difficulty: "medium",
    modality: "Carretera",
    routeType: "Circular",
    safety: 88,
    quality: 92,
    compatibility: 93,
    compatibilityText:
      "Excel\u00b7lent opci\u00f3 per al teu nivell. Dist\u00e0ncia adequada i desnivell assumible.",
    geometryCandidates: [
      "../../data/gpx/carretera-aigues.geojson",
      "../../data/rutes/carretera-aigues.geojson",
      "../../data/gpx/carretera-aigues.gpx"
    ],
    highlights: [
      "Collserola",
      "Vistes sobre Barcelona",
      "Entorn de Vallvidrera"
    ],
    weatherRouteId: "carretera-aigues"
  },

  "front-maritim": {
    id: "front-maritim",
    name: "Front Mar\u00edtim de Barcelona",
    area: "Barcelona \u00b7 Litoral",
    distanceKm: 14.2,
    ascentM: 40,
    estimatedTime: "1:10 h",
    difficulty: "easy",
    modality: "Urbana",
    routeType: "Lineal",
    safety: 83,
    quality: 86,
    compatibility: 96,
    compatibilityText:
      "Ruta molt accessible, plana i adequada per passejar o fer una sortida suau.",
    geometryCandidates: [
      "../../data/gpx/front-maritim-hotel-vela-rompeolas.geojson",
      "../../data/gpx/front-maritim-hotel-vela-rompeolas.gpx"
    ],
    highlights: [
      "Front Mar\u00edtim",
      "Barceloneta",
      "Port de Barcelona"
    ],
    weatherRouteId: "front-maritim"
  },

  "riu-besos": {
    id: "riu-besos",
    name: "Ruta del riu Bes\u00f2s",
    area: "Barcelona \u00b7 Bes\u00f2s",
    distanceKm: 20.1,
    ascentM: 65,
    estimatedTime: "1:30 h",
    difficulty: "easy",
    modality: "Urbana / Gravel",
    routeType: "Lineal",
    safety: 91,
    quality: 84,
    compatibility: 95,
    compatibilityText:
      "Ruta f\u00e0cil i progressiva, amb poc desnivell i adequada per acumular quil\u00f2metres.",
    geometryCandidates: [
      "../../data/gpx/via-verda-riera-de-caldes-i-ruta-fluvial-del-riu-besos.geojson",
      "../../data/gpx/via-verda-riera-de-caldes-i-ruta-fluvial-del-riu-besos.gpx"
    ],
    highlights: [
      "Parc Fluvial del Bes\u00f2s",
      "Trams metropolitans",
      "Connexi\u00f3 amb el litoral"
    ],
    weatherRouteId: "riu-besos"
  },

  "volta-integral-collserola": {
    id: "volta-integral-collserola",
    name: "Volta integral de Collserola",
    area: "Barcelona \u00b7 Parc Natural de Collserola",
    distanceKm: 67.9,
    ascentM: null,
    estimatedTime: "7:30 h",
    difficulty: "hard",
    modality: "BTT",
    routeType: "Circular",
    safety: null,
    quality: null,
    compatibility: 68,
    compatibilityText:
      "Ruta exigent. Recomanada per a ciclistes amb bona base f\u00edsica i experi\u00e8ncia en BTT.",
    geometryCandidates: [
      "../main-map-difficult-route/data/volta-integral-collserola.kml"
    ],
    highlights: [
      "Parc Natural de Collserola",
      "Trams de muntanya",
      "Ruta de llarga dist\u00e0ncia"
    ],
    weatherRouteId: "volta-integral-collserola",
    source:
      "Parc Natural de la Serra de Collserola"
  }
};
window.BiciParkAdaptiveRouteCatalogV11 = window.BiciParkRouteDetailData || {};
