(() => {
  "use strict";
  const Store=window.BiciParkMarketplaceStore;if(!Store)return;
  let state=Store.read(localStorage);
  let filters={query:"",category:"all",mode:"all",favorites:false};

  const dict={
    ca:{title:"Ven, compra o intercanvia material ciclista.",intro:"Publica bicicletes, components i accessoris. En aquesta primera versió els anuncis que crees es guarden només en aquest navegador.",publish:"Publica un anunci",beta:"MVP local",betaText:"Encara no hi ha compte d’usuari, missatgeria ni pagament. No publiquis telèfons, adreces exactes ni dades sensibles. Quan afegim backend, els anuncis podran ser reals i compartits.",search:"Busca bici, rodes, casc...",allCat:"Totes les categories",allMode:"Venda + intercanvi",sale:"Venda",exchange:"Intercanvi",both:"Venda o intercanvi",favorites:"Favorits",results:"Anuncis",none:"No hi ha anuncis que coincideixin amb els filtres.",newListing:"Nou anunci",save:"Desa l’anunci",price:"Preu",swapFor:"Accepta canvi per",favorite:"Favorit",unfavorite:"Treu de favorits",delete:"Eliminar",mine:"EL MEU ANUNCI",demo:"MOSTRA",local:"Local al navegador",contact:"Contacte quan activem comptes",errorTitle:"Escriu un títol d’almenys 3 caràcters.",errorPrice:"Indica un preu per a la venda.",errorExchange:"Indica què acceptaries a canvi.",created:"anuncis",fieldTitle:"Títol",fieldCategory:"Categoria",fieldMode:"Modalitat",fieldCondition:"Estat",fieldPrice:"Preu (€)",fieldCity:"Zona aproximada",fieldExchange:"Què acceptaries a canvi?",fieldDescription:"Descripció",titlePh:"Rodes gravel 700C",cityPh:"Barcelona",exchangePh:"Ex. llum davantera, bici plegable...",descriptionPh:"Estat, ús, compatibilitat, mesures...",cat:{bike:"Bicicletes",components:"Components",accessories:"Accessoris",clothing:"Roba",tools:"Eines",other:"Altres"},cond:{new:"Nou / gairebé nou",excellent:"Excel·lent",good:"Bon estat",used:"Usat"}},
    es:{title:"Vende, compra o intercambia material ciclista.",intro:"Publica bicicletas, componentes y accesorios. En esta primera versión, los anuncios que creas se guardan solo en este navegador.",publish:"Publica un anuncio",beta:"MVP local",betaText:"Todavía no hay cuenta de usuario, mensajería ni pagos. No publiques teléfonos, direcciones exactas ni datos sensibles. Cuando añadamos backend, los anuncios podrán ser reales y compartidos.",search:"Busca bici, ruedas, casco...",allCat:"Todas las categorías",allMode:"Venta + intercambio",sale:"Venta",exchange:"Intercambio",both:"Venta o intercambio",favorites:"Favoritos",results:"Anuncios",none:"No hay anuncios que coincidan con los filtros.",newListing:"Nuevo anuncio",save:"Guardar anuncio",price:"Precio",swapFor:"Acepta cambio por",favorite:"Favorito",unfavorite:"Quitar de favoritos",delete:"Eliminar",mine:"MI ANUNCIO",demo:"MUESTRA",local:"Local en el navegador",contact:"Contacto cuando activemos cuentas",errorTitle:"Escribe un título de al menos 3 caracteres.",errorPrice:"Indica un precio para la venta.",errorExchange:"Indica qué aceptarías a cambio.",created:"anuncios",fieldTitle:"Título",fieldCategory:"Categoría",fieldMode:"Modalidad",fieldCondition:"Estado",fieldPrice:"Precio (€)",fieldCity:"Zona aproximada",fieldExchange:"¿Qué aceptarías a cambio?",fieldDescription:"Descripción",titlePh:"Ruedas gravel 700C",cityPh:"Barcelona",exchangePh:"Ej. luz delantera, bici plegable...",descriptionPh:"Estado, uso, compatibilidad, medidas...",cat:{bike:"Bicicletas",components:"Componentes",accessories:"Accesorios",clothing:"Ropa",tools:"Herramientas",other:"Otros"},cond:{new:"Nuevo / casi nuevo",excellent:"Excelente",good:"Buen estado",used:"Usado"}},
    en:{title:"Sell, buy or swap cycling gear.",intro:"List bikes, components and accessories. In this first version, listings you create are stored only in this browser.",publish:"Create listing",beta:"Local MVP",betaText:"There are no user accounts, messaging or payments yet. Do not post phone numbers, exact addresses or sensitive data. Once the backend is added, listings can become real and shared.",search:"Search bikes, wheels, helmet...",allCat:"All categories",allMode:"Sale + swap",sale:"For sale",exchange:"Swap",both:"Sale or swap",favorites:"Favorites",results:"Listings",none:"No listings match your filters.",newListing:"New listing",save:"Save listing",price:"Price",swapFor:"Would swap for",favorite:"Favorite",unfavorite:"Remove favorite",delete:"Delete",mine:"MY LISTING",demo:"SAMPLE",local:"Local to this browser",contact:"Contact when accounts are enabled",errorTitle:"Enter a title with at least 3 characters.",errorPrice:"Enter a price for a sale listing.",errorExchange:"Say what you would accept in exchange.",created:"listings",fieldTitle:"Title",fieldCategory:"Category",fieldMode:"Listing type",fieldCondition:"Condition",fieldPrice:"Price (€)",fieldCity:"Approximate area",fieldExchange:"What would you accept in exchange?",fieldDescription:"Description",titlePh:"700C gravel wheels",cityPh:"Barcelona",exchangePh:"E.g. front light, folding bike...",descriptionPh:"Condition, use, compatibility, dimensions...",cat:{bike:"Bikes",components:"Components",accessories:"Accessories",clothing:"Clothing",tools:"Tools",other:"Other"},cond:{new:"New / almost new",excellent:"Excellent",good:"Good",used:"Used"}},
    fr:{title:"Vendez, achetez ou échangez du matériel cycliste.",intro:"Publiez des vélos, composants et accessoires. Dans cette première version, les annonces créées sont enregistrées uniquement dans ce navigateur.",publish:"Publier une annonce",beta:"MVP local",betaText:"Il n’y a pas encore de compte utilisateur, messagerie ni paiement. Ne publiez pas de numéro de téléphone, d’adresse exacte ni de données sensibles. Avec le backend, les annonces pourront devenir réelles et partagées.",search:"Rechercher vélo, roues, casque...",allCat:"Toutes les catégories",allMode:"Vente + échange",sale:"Vente",exchange:"Échange",both:"Vente ou échange",favorites:"Favoris",results:"Annonces",none:"Aucune annonce ne correspond aux filtres.",newListing:"Nouvelle annonce",save:"Enregistrer l’annonce",price:"Prix",swapFor:"Échange souhaité contre",favorite:"Favori",unfavorite:"Retirer des favoris",delete:"Supprimer",mine:"MON ANNONCE",demo:"EXEMPLE",local:"Local dans ce navigateur",contact:"Contact disponible avec les comptes",errorTitle:"Saisissez un titre d’au moins 3 caractères.",errorPrice:"Indiquez un prix pour une vente.",errorExchange:"Indiquez ce que vous accepteriez en échange.",created:"annonces",fieldTitle:"Titre",fieldCategory:"Catégorie",fieldMode:"Modalité",fieldCondition:"État",fieldPrice:"Prix (€)",fieldCity:"Zone approximative",fieldExchange:"Qu’accepteriez-vous en échange ?",fieldDescription:"Description",titlePh:"Roues gravel 700C",cityPh:"Barcelone",exchangePh:"Ex. éclairage avant, vélo pliant...",descriptionPh:"État, utilisation, compatibilité, dimensions...",cat:{bike:"Vélos",components:"Composants",accessories:"Accessoires",clothing:"Vêtements",tools:"Outils",other:"Autres"},cond:{new:"Neuf / presque neuf",excellent:"Excellent",good:"Bon état",used:"Utilisé"}}
  };
  const lang=()=>window.BiciParkI18n?.getLanguage?.()||localStorage.getItem("bicipark.language.v1")||"ca";
  const tr=key=>{const d=dict[lang()]||dict.ca;return key.split(".").reduce((v,k)=>v?.[k],d)??key};
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const el=id=>document.getElementById(id);

  function modeLabel(mode){return mode==="sale"?tr("sale"):mode==="exchange"?tr("exchange"):tr("both")}
  function priceLabel(item){return item.price==null?"":`${Number(item.price).toLocaleString(lang(),{maximumFractionDigits:0})} €`}
  function renderCard(item){
    const exchange=(item.mode==="exchange"||item.mode==="both")&&item.exchangeFor;
    return `<article class="listing-card">
      <div class="listing-card-head"><div><span class="listing-badge ${item.mode==="exchange"?"exchange":""}">${esc(modeLabel(item.mode))}</span><h3>${esc(item.title)}</h3></div><span class="listing-badge">${esc(item.isMine?tr("mine"):tr("demo"))}</span></div>
      ${item.price!=null?`<div class="listing-price">${esc(priceLabel(item))}</div>`:""}
      <div class="listing-meta"><span>${esc(tr(`cat.${item.category}`))}</span><span>·</span><span>${esc(tr(`cond.${item.condition}`))}</span>${item.city?`<span>·</span><span>${esc(item.city)}</span>`:""}</div>
      ${item.description?`<div class="listing-description">${esc(item.description)}</div>`:""}
      ${exchange?`<div class="listing-exchange"><strong>${esc(tr("swapFor"))}:</strong> ${esc(item.exchangeFor)}</div>`:""}
      <div class="listing-actions">
        <button data-action="favorite" data-id="${esc(item.id)}">${esc(item.favorite?tr("unfavorite"):tr("favorite"))}</button>
        ${item.isMine?`<button class="danger" data-action="remove" data-id="${esc(item.id)}">${esc(tr("delete"))}</button>`:`<button type="button" disabled title="${esc(tr("contact"))}">${esc(tr("contact"))}</button>`}
      </div>
    </article>`;
  }

  function render(){
    const items=Store.filter(state.items,filters);el("listingGrid").innerHTML=items.map(renderCard).join("");el("emptyResults").hidden=items.length>0;el("resultsCount").textContent=`${items.length} ${tr("created")}`;
  }

  function setLabel(name,text){
    const input=document.querySelector(`#listingForm [name="${name}"]`);const label=input?.closest("label");if(!label)return;
    let node=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(!node){node=document.createTextNode("");label.prepend(node)}node.textContent=`${text} `;
  }

  function translate(){
    el("marketTitle").textContent=tr("title");el("marketIntro").textContent=tr("intro");el("openPublishBtn").textContent=tr("publish");el("marketBetaTitle").textContent=tr("beta");el("marketBetaText").textContent=tr("betaText");el("searchInput").placeholder=tr("search");el("resultsTitle").textContent=tr("results");el("emptyResults").textContent=tr("none");el("publishTitle").textContent=tr("newListing");
    const cf=el("categoryFilter");cf.options[0].textContent=tr("allCat");["bike","components","accessories","clothing","tools","other"].forEach((v,i)=>cf.options[i+1].textContent=tr(`cat.${v}`));
    const mf=el("modeFilter");mf.options[0].textContent=tr("allMode");mf.options[1].textContent=tr("sale");mf.options[2].textContent=tr("exchange");document.querySelector(".fav-filter").lastChild.textContent=` ${tr("favorites")}`;
    const form=el("listingForm");
    [["title","fieldTitle"],["category","fieldCategory"],["mode","fieldMode"],["condition","fieldCondition"],["price","fieldPrice"],["city","fieldCity"],["exchangeFor","fieldExchange"],["description","fieldDescription"]].forEach(([name,key])=>setLabel(name,tr(key)));
    form.elements.title.placeholder=tr("titlePh");form.elements.city.placeholder=tr("cityPh");form.elements.exchangeFor.placeholder=tr("exchangePh");form.elements.description.placeholder=tr("descriptionPh");
    ["bike","components","accessories","clothing","tools","other"].forEach((v,i)=>form.elements.category.options[i].textContent=tr(`cat.${v}`));
    form.elements.mode.options[0].textContent=tr("sale");form.elements.mode.options[1].textContent=tr("exchange");form.elements.mode.options[2].textContent=tr("both");
    ["new","excellent","good","used"].forEach((v,i)=>form.elements.condition.options[i].textContent=tr(`cond.${v}`));
    form.querySelector('button[type="submit"]').textContent=tr("save");
    const nav=[...document.querySelectorAll(".market-topbar nav a")];if(nav[0])nav[0].textContent=window.BiciParkI18n?.t("nav.today")||"Avui";if(nav[1])nav[1].textContent=window.BiciParkI18n?.t("nav.myBike")||"La meva bici";if(nav[2])nav[2].textContent=window.BiciParkI18n?.t("nav.routes")||"Rutes";
    render();
  }

  function save(){Store.write(localStorage,state)}
  function openPanel(open=true){el("publishPanel").hidden=!open;if(open)el("publishPanel").scrollIntoView({behavior:"smooth",block:"start"})}

  el("openPublishBtn").addEventListener("click",()=>openPanel(true));el("closePublishBtn").addEventListener("click",()=>openPanel(false));
  el("searchInput").addEventListener("input",e=>{filters.query=e.target.value;render()});el("categoryFilter").addEventListener("change",e=>{filters.category=e.target.value;render()});el("modeFilter").addEventListener("change",e=>{filters.mode=e.target.value;render()});el("favoritesOnly").addEventListener("change",e=>{filters.favorites=e.target.checked;render()});
  el("listingGrid").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(!b)return;if(b.dataset.action==="favorite")Store.toggleFavorite(state,b.dataset.id);if(b.dataset.action==="remove")Store.remove(state,b.dataset.id);save();render()});
  el("listingForm").addEventListener("submit",e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const result=Store.add(state,Object.fromEntries(fd.entries()));const err=el("formError");
    if(!result.valid){const first=result.errors[0];err.textContent=first==="title"?tr("errorTitle"):first==="price"?tr("errorPrice"):tr("errorExchange");err.hidden=false;return}
    err.hidden=true;state=result.state;save();e.currentTarget.reset();openPanel(false);render();
  });
  window.addEventListener("bicipark:language-changed",translate);
  translate();
})();
