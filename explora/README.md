# Explora Bicipark

Pàgina central d'accés als mòduls del projecte.

## Principi d'arquitectura

El hub no importa el JavaScript ni el CSS dels altres mòduls. Només utilitza
enllaços normals. Això evita:

- col·lisions de variables;
- col·lisions d'estils;
- errors en un mòdul que afectin els altres;
- carregar recursos que l'usuari no necessita.

## Provar-lo

```powershell
cd C:\projectes\bicipark\explora
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

Obre:

```text
http://localhost:8000/explora/
```

## Afegir-lo a la portada

Afegeix al menú principal:

```html
<a href="explora/">Explora</a>
```

També pots utilitzar un botó:

```html
<a href="explora/" class="bicipark-explore-link">
  Explora Bicipark
</a>
```

## Configurar mòduls

Edita:

```text
explora/data/modules.js
```

Per activar el mòdul de rutes, revisa el seu camí i canvia:

```javascript
enabled: false
```

per:

```javascript
enabled: true
```

## Estructura de navegació recomanada

Menú principal:

```text
Mapa | Explora | Favorits
```

Dins d'Explora:

```text
Mapa | Rutes | Missions | Jocs
```

Aquesta estructura manté la portada centrada en el mapa i concentra les
funcionalitats addicionals en una sola pàgina.
