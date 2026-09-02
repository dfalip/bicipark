(() => {
  "use strict";
  if (window.BiciParkCore) return;

  const modules = new Map();
  const listeners = new Map();

  function on(eventName, handler) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return () => listeners.get(eventName)?.delete(handler);
  }

  function emit(eventName, detail) {
    listeners.get(eventName)?.forEach(handler => {
      try { handler(detail); }
      catch (error) { console.error("[BiciParkCore]", eventName, error); }
    });
    window.dispatchEvent(new CustomEvent("bicipark:" + eventName, { detail }));
  }

  function registerModule(definition) {
    if (!definition || !definition.id) throw new Error("Module id required");
    if (modules.has(definition.id)) return modules.get(definition.id);
    const module = {
      id: definition.id,
      version: definition.version || "0.0.0",
      api: definition.api || {},
      meta: definition.meta || {}
    };
    modules.set(module.id, module);
    emit("module:registered", module);
    return module;
  }

  window.BiciParkCore = {
    version: "1.0.0",
    modules,
    on,
    emit,
    registerModule,
    getModule: id => modules.get(id) || null
  };
})();