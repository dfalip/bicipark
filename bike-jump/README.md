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


## BikeJump v2 · millores experimentals (PR #44)

- Controls arcade: mantén premut per baixar el trampolí; deixa anar a la franja groga; equilibra la bici en vol. Botó i barra espai; fletxes o botons tàctils.
- Corba de control suavitzada i ajuda d'estabilització molt lleu; els aterratges continuen depenent de l'angle final.
- Valoració visual d'1–3 estrelles, estela de vol, efecte d'impacte i resum final de tres salts amb rècord guardat localment.
- El canvi visual només afecta aquest joc, sense dependències d'imatges externes.

### Comprovar

Des de l'arrel del repositori:

```bash
npm test
```

Comprovar manualment en navegador d'escriptori i mòbil abans de fusionar/publicar:
1. Mantén i deixa anar aviat, a la zona groga i tard; verifica que el resultat canvia.
2. Corregeix la bici en vol amb tecles i botons tàctils; prova també Tab i Enter/Espai amb botons enfocats.
3. Canvia de pestanya o finestra durant descens/vol; comprova que no queda cap control enganxat.
4. Reinicia a mig descens i a mig vol; confirma que dibuixa una partida nova immediatament.
5. Completa els tres salts, comprova estrelles, puntuació acumulada i rècord, i prem «Torna-hi!».
6. Valida a 320–390 px que el canvas, les dades i els controls siguin utilitzables sense desplaçament horitzontal de la pàgina.

**Estat:** proves automàtiques i sintaxi via CI. La validació visual i tàctil real encara és necessària; la PR continua en esborrany.
