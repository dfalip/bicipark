export class BikeTagAdapter {
  constructor() {
    this.demoPresent = false;
  }

  setDemoPresent(isPresent) {
    this.demoPresent = Boolean(isPresent);
  }

  async getStatus() {
    return {
      supported: false,
      present: this.demoPresent,
      moving: this.demoPresent,
      source: this.demoPresent ? "demo" : "none",
      label: this.demoPresent ? "Simulat" : "No detectat"
    };
  }
}

/*
 * Punt d'extensió:
 * més endavant aquesta classe es pot substituir per un adaptador natiu
 * de Capacitor/Bluetooth sense modificar la lògica principal de missions.
 */
export const bikeTagAdapter = new BikeTagAdapter();
