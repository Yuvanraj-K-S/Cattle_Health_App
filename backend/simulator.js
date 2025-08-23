const axios = require("axios");
const BASE_URL = "http://localhost:3001/api/cattle";

// Healthy ranges for cattle
const HEALTHY_RANGES = {
  temperature: { min: 38.0, max: 39.0 },
  heartRate: { min: 60, max: 80 },
  sleep: { min: 6, max: 10 },
  lying: { min: 4, max: 8 }
};

class CattleSimulator {
  constructor(cattleId, tagId) {
    this.cattleId = cattleId;
    this.tagId = tagId;
    this.isHealthy = Math.random() > 0.2; // 80% chance healthy
    this.healthTrend = 0;
  }

  // Helper methods
  _randomInRange(range, variation) {
    const base = range.min + Math.random() * (range.max - range.min);
    const varied = base + (Math.random() * variation * 2 - variation);
    return Number(varied.toFixed(1));
  }

  _randomOutsideRange(range, minVariation, maxVariation, lessIsBad = false) {
    const variation = minVariation + Math.random() * (maxVariation - minVariation);
    if (lessIsBad) {
      return Math.max(0, range.min - variation * (0.5 + Math.random()));
    }
    return range.max + variation * (0.5 + Math.random());
  }

  generateReading() {
    // Randomly adjust health trend (10% chance to change)
    if (Math.random() < 0.1) {
      this.healthTrend = Math.floor(Math.random() * 3) - 1;
    }

    // Gradually change health status based on trend
    if (this.healthTrend !== 0 && Math.random() < 0.3) {
      this.isHealthy = this.healthTrend === 1;
    }

    // Generate data based on health status
    if (this.isHealthy) {
      return {
        body_temperature: this._randomInRange(HEALTHY_RANGES.temperature, 0.5),
        heart_rate: Math.round(this._randomInRange(HEALTHY_RANGES.heartRate, 5)),
        sleeping_duration: this._randomInRange(HEALTHY_RANGES.sleep, 1),
        lying_down_duration: this._randomInRange(HEALTHY_RANGES.lying, 1)
      };
    } else {
      return {
        body_temperature: this._randomOutsideRange(HEALTHY_RANGES.temperature, 0.5, 2.0),
        heart_rate: Math.round(this._randomOutsideRange(HEALTHY_RANGES.heartRate, 10, 20)),
        sleeping_duration: this._randomOutsideRange(HEALTHY_RANGES.sleep, 2, 4, true),
        lying_down_duration: this._randomOutsideRange(HEALTHY_RANGES.lying, 2, 4, true)
      };
    }
  }
}

class SimulationManager {
  constructor() {
    this.simulators = new Map();
  }

  async initialize() {
    await this._updateCattleList();
    setInterval(() => this._updateAndSimulate(), 5000); // Check every 5 seconds
  }

  async _updateCattleList() {
    try {
      const response = await axios.get(BASE_URL);
      const cattleList = response.data;

      cattleList.forEach(cattle => {
        if (!this.simulators.has(cattle._id)) {
          this.simulators.set(
            cattle._id,
            new CattleSimulator(cattle._id, cattle.tag_id)
          );
          console.log(`🐄 Added new cattle to simulation: ${cattle.tag_id}`);
        }
      });
    } catch (err) {
      console.error("Failed to update cattle list:", err.message);
    }
  }

  async _updateAndSimulate() {
    await this._updateCattleList();
    
    for (const [cattleId, simulator] of this.simulators) {
      try {
        const reading = simulator.generateReading();
        await axios.post(`${BASE_URL}/${cattleId}/readings`, reading);
        console.log(`📊 ${simulator.tagId}:`, 
          `Temp:${reading.body_temperature}°C`,
          `HR:${reading.heart_rate}bpm`,
          simulator.isHealthy ? '✅' : '⚠️'
        );
      } catch (err) {
        console.error(`Error for ${simulator.tagId}:`, err.message);
      }
    }
    console.log('-----');
  }
}

// Start the simulation
new SimulationManager().initialize().catch(err => console.error("Initialization failed:", err));