# Mòdul Map Game de Bicipark

Aquest directori és un mòdul autònom. No importa ni modifica el JavaScript,
els estils o les dades de la web principal.

## Provar-lo en local

Des de PowerShell:

```powershell
cd C:\projectes\bicipark\map-game
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

O, des de l'arrel del projecte:

```powershell
python -m http.server 8000
```

I obre:

http://localhost:8000/map-game/

## Afegir fotografies

1. Copia la fotografia a `map-game/images/`.
2. Elimina les metadades EXIF/GPS.
3. Afegeix la ubicació a `map-game/data/locations.js`.
4. Utilitza una ruta relativa, per exemple:

```javascript
{
  id: "pedralbes-01",
  image: "./images/pedralbes-01.jpg",
  lat: 41.389,
  lng: 2.112,
  title: "Pedralbes",
  description: "Descripció que es mostra després de respondre.",
  difficulty: "Mitjana"
}
```

## Integració posterior

Quan el joc estigui validat, només caldrà afegir a Bicipark un enllaç:

```html
<a href="map-game/">On és això?</a>
```

Aquesta és l'única modificació necessària a la web principal.
