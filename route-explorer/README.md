# Explorador progressiu de rutes

Mòdul independent de Bicipark.

## Funcionament visual

- Zoom general: agrupacions de Barcelona, Girona, Tarragona i Lleida.
- Zoom regional: només rutes destacades.
- Zoom local: rutes de la zona visible.
- Zoom detallat: catàleg ampliat.
- Color: dificultat.
- Regió: filtre i etiqueta.
- Modalitat: text.
- Selecció: més gruix i opacitat.

## Iniciar

```powershell
cd C:\projectes\bicipark\route-explorer
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## Localitzar rutes existents

```powershell
powershell -ExecutionPolicy Bypass -File .\scan-existing-routes.ps1
```

Això genera `route-candidates.csv` però no modifica res.

## Importar una ruta

```powershell
powershell -ExecutionPolicy Bypass -File .\import-route.ps1 `
  -FilePath C:\rutes\carrilet.gpx `
  -Name "Via Verda del Carrilet" `
  -Region girona `
  -Area "Gironès i Garrotxa" `
  -Modality greenway `
  -Difficulty facil `
  -Featured `
  -Priority 1 `
  -ElevationGain 320
```

L'importador:
- copia el GPX o GeoJSON dins del mòdul;
- calcula centre, límits i distància;
- actualitza `data/routes.json`;
- fa còpia de seguretat;
- no toca cap altre mòdul.

## Tour de France 2026

Si `tour-2026` ja existeix durant la instal·lació, apareix com a
col·lecció especial amb un enllaç al seu propi visor.
