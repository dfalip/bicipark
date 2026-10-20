(() => {
  "use strict";

  const KEY = "bicipark.myBike.v1";
  const VERSION = 1;

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
    if (odo == null || serviceAt == null || serviceAt > odo) return "No indicat";
    return `${Math.max(0, Math.round(odo - serviceAt))} km des de l'últim registre`;
  }

  function render() {
    empty.hidden = store.bikes.length > 0;
    list.innerHTML = store.bikes.map(bike => {
      const active = bike.id === (store.activeBikeId || store.bikes[0]?.id);
      const title = bike.nickname || [bike.brand, bike.model].filter(Boolean).join(" ") || "La meva bici";
      return `
        <article class="bike-card ${active ? "is-active" : ""}">
          <div class="bike-card-head">
            <div><span>${active ? "BICI ACTIVA" : "BICI"}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml([bike.modality, bike.year].filter(Boolean).join(" · "))}</p></div>
            <strong class="bike-id">${escapeHtml(bike.id)}</strong>
          </div>
          <div class="bike-grid">
            <div><span>Quilometratge</span><strong>${num(bike.odometerKm) == null ? "No indicat" : `${Math.round(bike.odometerKm)} km`}</strong></div>
            <div><span>Pneumàtics</span><strong>${bike.tireWidthMm ? `${escapeHtml(bike.tireWidthMm)} mm · ${escapeHtml(bike.tireType || "tipus no indicat")}` : "No indicat"}</strong></div>
            <div><span>Pressió habitual</span><strong>${bike.frontBar && bike.rearBar ? `${escapeHtml(bike.frontBar)} / ${escapeHtml(bike.rearBar)} bar` : "No indicada"}</strong></div>
            <div><span>Número de sèrie</span><strong>${bike.serialHint ? `•••• ${escapeHtml(bike.serialHint)}` : "No desat"}</strong></div>
          </div>
          <details class="maintenance"><summary>Manteniment registrat</summary>
            <p>Cadena: ${escapeHtml(kmSince(bike, "chainServiceKm"))}</p>
            <p>Cobertes: ${escapeHtml(kmSince(bike, "tiresServiceKm"))}</p>
            <p>Frens: ${escapeHtml(kmSince(bike, "brakesServiceKm"))}</p>
            <p>Taller: ${escapeHtml(bike.lastWorkshopDate || "No indicat")}</p>
            <small>BiciPark mostra quilòmetres des de l'últim registre; no substitueix els intervals del fabricant ni una inspecció mecànica.</small>
          </details>
          <div class="bike-actions">
            ${active ? "" : `<button type="button" data-action="activate" data-id="${escapeHtml(bike.id)}">Fer activa</button>`}
            <button type="button" data-action="edit" data-id="${escapeHtml(bike.id)}">Editar</button>
            <button type="button" data-action="export" data-id="${escapeHtml(bike.id)}">Exportar passaport</button>
            <button class="danger" type="button" data-action="remove" data-id="${escapeHtml(bike.id)}">Eliminar</button>
          </div>
        </article>`;
    }).join("");
    const active = activeBike();
    document.getElementById("activeBikeLabel").textContent = active ? (active.nickname || active.model || active.id) : "Cap bici configurada";
  }

  function formValue(name) {
    return form.elements[name]?.value?.trim?.() || "";
  }

  function bikeFromForm(existing) {
    const serialRaw = formValue("serialHint").replace(/\s+/g, "");
    return {
      ...(existing || {}),
      id: existing?.id || id(),
      nickname: formValue("nickname"),
      brand: formValue("brand"),
      model: formValue("model"),
      year: formValue("year"),
      modality: formValue("modality"),
      bikeWeightKg: num(formValue("bikeWeightKg")),
      riderWeightKg: num(formValue("riderWeightKg")),
      cargoKg: num(formValue("cargoKg")),
      wheelSize: formValue("wheelSize"),
      tireWidthMm: num(formValue("tireWidthMm")),
      tireType: formValue("tireType"),
      frontBar: num(formValue("frontBar")),
      rearBar: num(formValue("rearBar")),
      serialHint: serialRaw.slice(-4),
      odometerKm: num(formValue("odometerKm")),
      chainServiceKm: num(formValue("chainServiceKm")),
      tiresServiceKm: num(formValue("tiresServiceKm")),
      brakesServiceKm: num(formValue("brakesServiceKm")),
      lastWorkshopDate: formValue("lastWorkshopDate"),
      updatedAt: new Date().toISOString()
    };
  }

  function resetForm() {
    editingId = null;
    form.reset();
    document.getElementById("formTitle").textContent = "Afegeix una bicicleta";
    document.getElementById("saveBikeBtn").textContent = "Desa la bicicleta";
  }

  function fillForm(bike) {
    editingId = bike.id;
    ["nickname","brand","model","year","modality","bikeWeightKg","riderWeightKg","cargoKg","wheelSize","tireWidthMm","tireType","frontBar","rearBar","serialHint","odometerKm","chainServiceKm","tiresServiceKm","brakesServiceKm","lastWorkshopDate"].forEach(name => {
      if (form.elements[name]) form.elements[name].value = bike[name] ?? "";
    });
    document.getElementById("formTitle").textContent = "Edita la bicicleta";
    document.getElementById("saveBikeBtn").textContent = "Desa els canvis";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportPassport(bike) {
    const safePassport = {
      schema: "bicipark-bike-passport-v1",
      exportedAt: new Date().toISOString(),
      bike: {
        id: bike.id, nickname: bike.nickname, brand: bike.brand, model: bike.model, year: bike.year,
        modality: bike.modality, wheelSize: bike.wheelSize, tireWidthMm: bike.tireWidthMm,
        tireType: bike.tireType, serialHint: bike.serialHint, odometerKm: bike.odometerKm,
        lastWorkshopDate: bike.lastWorkshopDate
      }
    };
    const blob = new Blob([JSON.stringify(safePassport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bike.id.toLowerCase()}-passport.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const existing = store.bikes.find(bike => bike.id === editingId) || null;
    const bike = bikeFromForm(existing);
    if (existing) store.bikes = store.bikes.map(item => item.id === bike.id ? bike : item);
    else store.bikes.push(bike);
    if (!store.activeBikeId) store.activeBikeId = bike.id;
    writeStore(store);
    resetForm();
    render();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
  list.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const bike = store.bikes.find(item => item.id === button.dataset.id);
    if (!bike) return;
    if (button.dataset.action === "activate") store.activeBikeId = bike.id;
    if (button.dataset.action === "edit") return fillForm(bike);
    if (button.dataset.action === "export") return exportPassport(bike);
    if (button.dataset.action === "remove") {
      if (!confirm(`Eliminar ${bike.nickname || bike.model || "aquesta bicicleta"}?`)) return;
      store.bikes = store.bikes.filter(item => item.id !== bike.id);
      if (store.activeBikeId === bike.id) store.activeBikeId = store.bikes[0]?.id || null;
    }
    writeStore(store);
    render();
  });

  render();
})();
