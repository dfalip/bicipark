(() => {
  "use strict";

  const KEY = "bicipark.myBike.v1";
  const VERSION = 1;
  const t = (key, vars) => window.BiciParkI18n?.t(key, vars) || ({
    "bike.none":"Cap bici configurada","bike.notSet":"No indicat","bike.notSaved":"No desat","bike.activeTag":"BICI ACTIVA","bike.tag":"BICI","bike.mileage":"Quilometratge","bike.tiresLabel":"Pneumàtics","bike.usualPressure":"Pressió habitual","bike.serialLabel":"Número de sèrie","bike.maintenance":"Manteniment registrat","bike.activate":"Fer activa","bike.editAction":"Editar","bike.export":"Exportar passaport","bike.remove":"Eliminar","bike.add":"Afegeix una bicicleta","bike.edit":"Edita la bicicleta","bike.save":"Desa la bicicleta","bike.saveChanges":"Desa els canvis","pressure.title":"Pressure Advisor · Beta","pressure.readiness":"Preparació del setup","pressure.complete":"Setup complet per contrastar una pressió de partida","pressure.missing":"Falten dades","pressure.systemWeight":"Pes total del sistema","pressure.copy":"Copia resum","pressure.external":"Obre calculador especialitzat","pressure.surface":"Superfície habitual","pressure.speed":"Velocitat mitjana","pressure.frontPct":"% pes davant","pressure.rim":"Tipus de llanta","pressure.max":"Màxim fabricant (bar)","bike.riderWeight":"Pes ciclista (kg)","bike.bikeWeight":"Pes bici (kg)","bike.tireWidth":"Amplada pneumàtic (mm)","bike.wheelSize":"Mida roda","bike.tireType":"Tipus"
  }[key] || key);

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
      if (parsed && Array.isArray(parsed.bikes)) return { version: VERSION, activeBikeId: parsed.activeBikeId || null, bikes: parsed.bikes };
    } catch (_) {}
    return { version: VERSION, activeBikeId: null, bikes: [] };
  }

  function writeStore(store) {
    localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("bicipark:my-bike:changed", { detail: store }));
  }

  function id() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return `BP-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return `BP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
  }

  function num(value) {
    if (value == null || String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  let store = readStore();
  let editingId = null;

  const form = document.getElementById("bikeForm");
  const list = document.getElementById("bikeList");
  const empty = document.getElementById("bikeEmpty");

  function activeBike() {
    return store.bikes.find(bike => bike.id === store.activeBikeId) || store.bikes[0] || null;
  }

  function kmSince(bike, field) {
    const odo = num(bike.odometerKm);
    const serviceAt = num(bike[field]);
    if (odo == null || serviceAt == null || serviceAt > odo) return t("bike.notSet");
    return window.BiciParkI18n ? window.BiciParkI18n.t("common.kmSince", { km: Math.max(0, Math.round(odo - serviceAt)) }) : `${Math.max(0, Math.round(odo - serviceAt))} km des de l'últim registre`;
  }

  function missingPressureLabel(code) {
    const map = {
      riderWeight:"bike.riderWeight", bikeWeight:"bike.bikeWeight", tireWidth:"bike.tireWidth", wheelSize:"bike.wheelSize", tireType:"bike.tireType",
      surface:"pressure.surface", speed:"pressure.speed", frontWeight:"pressure.frontPct", rimType:"pressure.rim", manufacturerMax:"pressure.max"
    };
    return t(map[code] || code);
  }

  function pressureBlock(bike) {
    if (!window.BiciParkPressureAdvisor) return "";
    const result = window.BiciParkPressureAdvisor.analyze(bike);
    const missing = result.missing.map(missingPressureLabel).join(" · ");
    return `
      <section class="pressure-card" aria-label="${escapeHtml(t("pressure.title"))}">
        <div class="pressure-card-head"><strong>${escapeHtml(t("pressure.title"))}</strong><span>${result.readiness}%</span></div>
        <div class="pressure-progress"><span style="width:${result.readiness}%"></span></div>
        ${result.systemWeightKg != null ? `<p><b>${escapeHtml(t("pressure.systemWeight"))}:</b> ${result.systemWeightKg} kg</p>` : ""}
        <p>${escapeHtml(result.complete ? t("pressure.complete") : `${t("pressure.missing")}: ${missing}`)}</p>
        ${result.warnings.includes("hooklessNeedsMax") ? `<p class="pressure-alert">Hookless: ${escapeHtml(t("pressure.max"))}</p>` : ""}
        <div class="pressure-actions">
          <button type="button" data-action="copy-pressure" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("pressure.copy"))}</button>
          <button type="button" data-action="external-pressure" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("pressure.external"))}</button>
        </div>
      </section>`;
  }

  function render() {
    empty.hidden = store.bikes.length > 0;
    list.innerHTML = store.bikes.map(bike => {
      const active = bike.id === (store.activeBikeId || store.bikes[0]?.id);
      const title = bike.nickname || [bike.brand, bike.model].filter(Boolean).join(" ") || "La meva bici";
      return `
        <article class="bike-card ${active ? "is-active" : ""}">
          <div class="bike-card-head">
            <div><span>${escapeHtml(t(active ? "bike.activeTag" : "bike.tag"))}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml([bike.modality, bike.year].filter(Boolean).join(" · "))}</p></div>
            <strong class="bike-id">${escapeHtml(bike.id)}</strong>
          </div>
          <div class="bike-grid">
            <div><span>${escapeHtml(t("bike.mileage"))}</span><strong>${num(bike.odometerKm) == null ? escapeHtml(t("bike.notSet")) : `${Math.round(bike.odometerKm)} km`}</strong></div>
            <div><span>${escapeHtml(t("bike.tiresLabel"))}</span><strong>${bike.tireWidthMm ? `${escapeHtml(bike.tireWidthMm)} mm · ${escapeHtml(bike.tireType || t("bike.notSet"))}` : escapeHtml(t("bike.notSet"))}</strong></div>
            <div><span>${escapeHtml(t("bike.usualPressure"))}</span><strong>${bike.frontBar && bike.rearBar ? `${escapeHtml(bike.frontBar)} / ${escapeHtml(bike.rearBar)} bar` : escapeHtml(t("bike.notSet"))}</strong></div>
            <div><span>${escapeHtml(t("bike.serialLabel"))}</span><strong>${bike.serialHint ? `•••• ${escapeHtml(bike.serialHint)}` : escapeHtml(t("bike.notSaved"))}</strong></div>
          </div>
          ${pressureBlock(bike)}
          <details class="maintenance"><summary>${escapeHtml(t("bike.maintenance"))}</summary>
            <p>Cadena: ${escapeHtml(kmSince(bike, "chainServiceKm"))}</p>
            <p>Cobertes: ${escapeHtml(kmSince(bike, "tiresServiceKm"))}</p>
            <p>Frens: ${escapeHtml(kmSince(bike, "brakesServiceKm"))}</p>
            <p>Taller: ${escapeHtml(bike.lastWorkshopDate || t("bike.notSet"))}</p>
            <small>BiciPark mostra quilòmetres des de l'últim registre; no substitueix els intervals del fabricant ni una inspecció mecànica.</small>
          </details>
          <div class="bike-actions">
            ${active ? "" : `<button type="button" data-action="activate" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("bike.activate"))}</button>`}
            <button type="button" data-action="edit" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("bike.editAction"))}</button>
            <button type="button" data-action="export" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("bike.export"))}</button>
            <button class="danger" type="button" data-action="remove" data-id="${escapeHtml(bike.id)}">${escapeHtml(t("bike.remove"))}</button>
          </div>
        </article>`;
    }).join("");
    const active = activeBike();
    document.getElementById("activeBikeLabel").textContent = active ? (active.nickname || active.model || active.id) : t("bike.none");
    window.BiciParkI18n?.translateDom();
  }

  function formValue(name) {
    return form.elements[name]?.value?.trim?.() || "";
  }

  function bikeFromForm(existing) {
    const serialRaw = formValue("serialHint").replace(/\s+/g, "");
    return {
      ...(existing || {}), id: existing?.id || id(), nickname: formValue("nickname"), brand: formValue("brand"), model: formValue("model"), year: formValue("year"), modality: formValue("modality"),
      bikeWeightKg: num(formValue("bikeWeightKg")), riderWeightKg: num(formValue("riderWeightKg")), cargoKg: num(formValue("cargoKg")), wheelSize: formValue("wheelSize"), tireWidthMm: num(formValue("tireWidthMm")), tireType: formValue("tireType"), frontBar: num(formValue("frontBar")), rearBar: num(formValue("rearBar")),
      pressureSurface: formValue("pressureSurface"), pressureSpeed: formValue("pressureSpeed"), frontWeightPct: num(formValue("frontWeightPct")), rimType: formValue("rimType"), manufacturerMaxBar: num(formValue("manufacturerMaxBar")),
      serialHint: serialRaw.slice(-4), odometerKm: num(formValue("odometerKm")), chainServiceKm: num(formValue("chainServiceKm")), tiresServiceKm: num(formValue("tiresServiceKm")), brakesServiceKm: num(formValue("brakesServiceKm")), lastWorkshopDate: formValue("lastWorkshopDate"), updatedAt: new Date().toISOString()
    };
  }

  function resetForm() {
    editingId = null; form.reset();
    document.getElementById("formTitle").textContent = t("bike.add");
    const save = document.getElementById("saveBikeBtn"); save.dataset.editing = "0"; save.textContent = t("bike.save");
  }

  function fillForm(bike) {
    editingId = bike.id;
    ["nickname","brand","model","year","modality","bikeWeightKg","riderWeightKg","cargoKg","wheelSize","tireWidthMm","tireType","frontBar","rearBar","pressureSurface","pressureSpeed","frontWeightPct","rimType","manufacturerMaxBar","serialHint","odometerKm","chainServiceKm","tiresServiceKm","brakesServiceKm","lastWorkshopDate"].forEach(name => { if (form.elements[name]) form.elements[name].value = bike[name] ?? ""; });
    document.getElementById("formTitle").textContent = t("bike.edit");
    const save = document.getElementById("saveBikeBtn"); save.dataset.editing = "1"; save.textContent = t("bike.saveChanges");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportPassport(bike) {
    const safePassport = { schema: "bicipark-bike-passport-v1", exportedAt: new Date().toISOString(), bike: { id: bike.id, nickname: bike.nickname, brand: bike.brand, model: bike.model, year: bike.year, modality: bike.modality, wheelSize: bike.wheelSize, tireWidthMm: bike.tireWidthMm, tireType: bike.tireType, serialHint: bike.serialHint, odometerKm: bike.odometerKm, lastWorkshopDate: bike.lastWorkshopDate, pressureSetup: window.BiciParkPressureAdvisor?.setupSummary(bike) || null } };
    const blob = new Blob([JSON.stringify(safePassport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${bike.id.toLowerCase()}-passport.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyPressure(bike) {
    const setup = window.BiciParkPressureAdvisor?.setupSummary(bike); if (!setup) return;
    const text = JSON.stringify({ bike: bike.nickname || bike.model || bike.id, ...setup }, null, 2);
    try { await navigator.clipboard.writeText(text); } catch (_) {}
  }

  form.addEventListener("submit", event => {
    event.preventDefault(); const existing = store.bikes.find(bike => bike.id === editingId) || null; const bike = bikeFromForm(existing);
    if (existing) store.bikes = store.bikes.map(item => item.id === bike.id ? bike : item); else store.bikes.push(bike);
    if (!store.activeBikeId) store.activeBikeId = bike.id; writeStore(store); resetForm(); render();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
  list.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const bike = store.bikes.find(item => item.id === button.dataset.id); if (!bike) return;
    if (button.dataset.action === "activate") store.activeBikeId = bike.id;
    if (button.dataset.action === "edit") return fillForm(bike);
    if (button.dataset.action === "export") return exportPassport(bike);
    if (button.dataset.action === "copy-pressure") return copyPressure(bike);
    if (button.dataset.action === "external-pressure") return window.open("https://silca.cc/pages/sppc-lite", "_blank", "noopener,noreferrer");
    if (button.dataset.action === "remove") {
      if (!confirm(`Eliminar ${bike.nickname || bike.model || "aquesta bicicleta"}?`)) return;
      store.bikes = store.bikes.filter(item => item.id !== bike.id); if (store.activeBikeId === bike.id) store.activeBikeId = store.bikes[0]?.id || null;
    }
    writeStore(store); render();
  });

  window.addEventListener("bicipark:language-changed", () => { render(); if (editingId) { document.getElementById("formTitle").textContent=t("bike.edit"); document.getElementById("saveBikeBtn").textContent=t("bike.saveChanges"); } else resetForm(); });
  render();
})();
