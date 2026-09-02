Aquesta carpeta conté les geometries GPX acceptades pel mòdul.

No substitueixis manualment els fitxers sense actualitzar:
  ../geometry-status.json

Per importar o substituir una etapa utilitza:
  ../../import-stage-gpx.ps1

Exemple:
  powershell -ExecutionPolicy Bypass -File ..\..\import-stage-gpx.ps1 `
    -Stage 9 `
    -FilePath C:\rutes\stage-9.gpx
