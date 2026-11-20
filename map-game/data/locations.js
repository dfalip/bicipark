/*
 * On és això? — monuments reals i fotografies documentals; no es fan servir
 * els SVG de demo per plantejar preguntes de geolocalització.
 *
 * Cada fitxa conté un únic monument concret (no un barri o zona arbitrària).
 * Les coordenades són del monument/objecte, NO del fotògraf.
 * Font de fotografia: Wikimedia Commons amb autoria i llicència verificades.
 * Si no es pot carregar la fotografia, l'app ha de permetre ometre la pregunta,
 * sense mostrar la il·lustració inventada com si fos una prova fotogràfica.
 * L'enllaç a la pàgina de l'arxiu permet revisar la procedència i els drets.
 */
export const gameLocations=[
 {
  id:"barcelona-arc-triomf",
  title:"Arc de Triomf",
  lat:41.39112,lng:2.18070,
  description:"Monument de maó vermell a l'extrem del passeig de Lluís Companys.",
  difficulty:"Fàcil",
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Arc_de_Triomf%2C_Barcelona.jpg/800px-Arc_de_Triomf%2C_Barcelona.jpg",
  photoAuthor:"Carolinau",
  photoSource:"https://commons.wikimedia.org/wiki/File:Arc_de_Triomf,_Barcelona.jpg",
  photoLicense:"CC BY-SA 3.0",photoLicenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/",
  coordinateSource:"https://www2.poblesdecatalunya.cat/mapa_element.php?e=1713",
  photoVerifiedAt:"2026-11-20"
 },
 {
  id:"barcelona-casa-batllo",
  title:"Casa Batlló",
  lat:41.391705,lng:2.164994,
  description:"Façana modernista de Gaudí al passeig de Gràcia, 43.",
  difficulty:"Mitjana",
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Casa_Batllo_Facade.jpg/500px-Casa_Batllo_Facade.jpg",
  photoAuthor:"Daniel Kraft",
  photoSource:"https://commons.wikimedia.org/wiki/File:Casa_Batllo_Facade.jpg",
  photoLicense:"CC BY-SA 3.0",photoLicenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/",
  coordinateSource:"https://www.bcnsostenible.cat/web/punt/casa-batllo",
  photoVerifiedAt:"2026-11-20"
 },
 {
  id:"barcelona-sagrada-familia",
  title:"Sagrada Família",
  lat:41.40369,lng:2.17433,
  description:"La basílica de la Sagrada Família, obra d'Antoni Gaudí.",
  difficulty:"Fàcil",
  image:"https://upload.wikimedia.org/wikipedia/commons/e/e0/Facade_of_Sagrada_Familia_in_Barcelona.JPG",
  photoAuthor:"Image tube",
  photoSource:"https://commons.wikimedia.org/wiki/File:Facade_of_Sagrada_Familia_in_Barcelona.JPG",
  photoLicense:"CC BY-SA 4.0",photoLicenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  coordinateSource:"https://pares.cultura.gob.es/ParesBusquedas20/catalogo/autoridad/119885",
  photoVerifiedAt:"2026-11-20"
 },
 {
  id:"barcelona-parc-guell-drac",
  title:"El Drac del Park Güell",
  lat:41.41371,lng:2.15282,
  description:"Salamandra de trencadís a l'escalinata monumental del Park Güell.",
  difficulty:"Mitjana",
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Park_G%C3%BCell_-_main_steps_and_Drac_01.jpg/960px-Park_G%C3%BCell_-_main_steps_and_Drac_01.jpg",
  photoAuthor:"Joe Mabel",
  photoSource:"https://commons.wikimedia.org/wiki/File:Park_G%C3%BCell_-_main_steps_and_Drac_01.jpg",
  photoLicense:"CC BY-SA 4.0",photoLicenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  coordinateSource:"https://mapcarta.com/es/W295826465",
  photoVerifiedAt:"2026-11-20"
 },
 {
  id:"barcelona-sagrat-cor-tibidabo",
  title:"Temple del Sagrat Cor del Tibidabo",
  lat:41.422222,lng:2.118855,
  description:"Temple situat al cim del Tibidabo.",
  difficulty:"Mitjana",
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Tibidabo_Church.jpg/960px-Tibidabo_Church.jpg",
  photoAuthor:"Emma (EJ Bulmer)",
  photoSource:"https://commons.wikimedia.org/wiki/File:Tibidabo_Church.jpg",
  photoLicense:"CC BY 2.0",photoLicenseUrl:"https://creativecommons.org/licenses/by/2.0/",
  coordinateSource:"https://www.poblesdecatalunya.cat/mapa_element.php?e=14403",
  photoVerifiedAt:"2026-11-20"
 }
];
