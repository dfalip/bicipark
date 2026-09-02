# Bike Jump

Joc independent de Bicipark.

## Mecànica

1. Mantén premut el botó o la barra espai.
2. La bicicleta baixa automàticament pel trampolí.
3. Deixa anar prop de la vora.
4. Ajusta la inclinació amb les fletxes o els botons.
5. Alinea la bicicleta amb la pendent.

## Puntuació

- Distància: fins a 5.000 punts.
- Sortida: fins a 1.000 punts.
- Control: fins a 1.000 punts.
- Aterratge: fins a 2.000 punts.
- Caiguda: penalització de 2.500 punts.

Tres salts per partida.

## Arquitectura

- `app.js`: estat, interfície, dibuix i controls.
- `physics.js`: física i avaluació.
- `levels.js`: configuració dels trampolins.
- `styles.css`: estils exclusius.

No importa cap fitxer del web principal.

## Iniciar

```powershell
cd C:\projectes\bicipark\bike-jump
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## Ampliar

Per crear més trampolins, afegeix objectes a `levels.js`.
