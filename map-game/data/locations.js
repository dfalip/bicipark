/*
 * Aquest fitxer només conté les dades del joc.
 *
 * Per afegir una ubicació:
 * 1. Copia una imatge a ./images/
 * 2. Afegeix un objecte amb coordenades exactes.
 * 3. Mantén un id únic.
 *
 * Les dades següents són de demostració.
 */

export const gameLocations = [
  {
    id: "demo-diagonal",
    image: "./images/demo-diagonal.svg",
    lat: 41.38945,
    lng: 2.13286,
    title: "Avinguda Diagonal",
    description: "Zona del carril bici de l'avinguda Diagonal.",
    difficulty: "Fàcil"
  },
  {
    id: "demo-arc-triomf",
    image: "./images/demo-arc-triomf.svg",
    lat: 41.39112,
    lng: 2.18070,
    title: "Arc de Triomf",
    description: "Passeig de Lluís Companys, davant de l'Arc de Triomf.",
    difficulty: "Fàcil"
  },
  {
    id: "demo-forum",
    image: "./images/demo-forum.svg",
    lat: 41.41166,
    lng: 2.22035,
    title: "Parc del Fòrum",
    description: "Entorn del Parc del Fòrum de Barcelona.",
    difficulty: "Mitjana"
  },
  {
    id: "demo-montjuic",
    image: "./images/demo-montjuic.svg",
    lat: 41.36571,
    lng: 2.15499,
    title: "Anella Olímpica",
    description: "Entorn de l'Anella Olímpica de Montjuïc.",
    difficulty: "Mitjana"
  },
  {
    id: "demo-collserola",
    image: "./images/demo-collserola.svg",
    lat: 41.41945,
    lng: 2.11867,
    title: "Collserola",
    description: "Un dels accessos ciclistes a la serra de Collserola.",
    difficulty: "Difícil"
  }
];
