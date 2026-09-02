window.BICIPARK_BIKE_BASES = [
  {
    id: "camping-izarpe",
    name: "Camping Izarpe",
    type: "C\u00E0mping \u00B7 Centre de cicloturisme",
    status: "public-unverified",
    affiliation: false,

    location: {
      address: "Carretera Gulina-Ar\u00F3stegi km 12,8, 31867 Ar\u00F3stegui, Navarra",
      lat: 42.93854,
      lng: -1.69241
    },

    links: {
      official: "https://campingizarpe.com/",
      cycling: "https://www.campingsnavarra.com/rutas-cicloturistas-izarpe/"
    },

    services: [
      { icon: "&#128274;", label: "Guarda-bicis" },
      { icon: "&#128295;", label: "Taller / autoreparaci\u00F3" },
      { icon: "&#128703;", label: "Neteja de bicicletes" },
      { icon: "&#9889;", label: "Lloguer de bicis / e-bikes" },
      { icon: "&#127869;", label: "Bar-restaurant" },
      { icon: "&#128722;", label: "Supermercat" },
      { icon: "&#127946;", label: "Piscina en temporada" }
    ],

    routes: [
      { number: 1, mode: "road",   name: "Ultzama y Basaburua",     biciparkUrl: "./route.html?id=1" },
      { number: 2, mode: "road",   name: "Ultzama y Esteribar",     biciparkUrl: "./route.html?id=2" },
      { number: 3, mode: "road",   name: "Irurtzun y Lekunberri",   biciparkUrl: "./route.html?id=3" },
      { number: 4, mode: "gravel", name: "Ezkabarte y Ultzama",     biciparkUrl: "./route.html?id=4" },
      { number: 5, mode: "gravel", name: "Camino del Plazaola",     biciparkUrl: "./route.html?id=5" },
      { number: 6, mode: "gravel", name: "Ruta integral a la zona", biciparkUrl: "./route.html?id=6" },
      { number: 7, mode: "mtb",    name: "Senderos de Atetz",       biciparkUrl: "./route.html?id=7" },
      { number: 8, mode: "mtb",    name: "Espaltza",                 biciparkUrl: "./route.html?id=8" },
      { number: 9, mode: "mtb",    name: "Atetz y Ultzama",          biciparkUrl: "./route.html?id=9" }
    ]
  }
];
