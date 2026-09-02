# Tour de France 2026 · Bicipark

Mòdul independent per consultar les 21 etapes oficials i mostrar
les geometries GPX disponibles i validades.

## Posada en marxa

```powershell
cd C:\projectes\bicipark\tour-2026
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

Adreça:

```text
http://localhost:8000/tour-2026/
```

## Què és oficial

Són oficials:
- les 21 etapes;
- les dates;
- les sortides i arribades;
- les distàncies finals;
- els tipus d'etapa;
- els enllaços a les fitxes oficials i al Race Center.

## Què no es considera oficial

Els GPX descarregats de fonts externes són geometries de referència.

El mòdul:
1. calcula la distància del GPX;
2. la compara amb la distància final oficial;
3. rebutja el fitxer si la diferència supera 5 km o el 5%.

Aquesta comprovació redueix errors, però no converteix el GPX en un
fitxer oficial.

## Importar un GPX final corregit

```powershell
powershell -ExecutionPolicy Bypass -File .\import-stage-gpx.ps1 `
  -Stage 9 `
  -FilePath C:\rutes\tour-stage-9-final.gpx
```

## Integració amb Explora

L'instal·lador pot registrar el mòdul automàticament:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-tour-2026.ps1 `
  -RegisterInHub
```

L'enllaç és:

```html
<a href="../tour-2026/">Tour de France 2026</a>
```

## Arquitectura

El mòdul té:
- HTML propi;
- CSS propi;
- JavaScript propi;
- mapa Leaflet propi;
- dades pròpies;
- GPX propis.

No importa ni modifica el codi principal de Bicipark.
