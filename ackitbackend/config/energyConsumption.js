// Energy Consumption Rates (kWh per hour) for different AC capacities and modes

const ENERGY_RATES = {
  "0.5": {
    eco: 0.4,      // kWh/hr
    normal: 0.5,   // kWh/hr
    high: 0.7,     // kWh/hr
    startup: 0.9,  // kWh/hr (high consumption during startup)
  },
  "1": {
    eco: 0.8,
    normal: 1.0,
    high: 1.4,
    startup: 1.6,
  },
  "1.5": {
    eco: 1.2,
    normal: 1.5,
    high: 1.8,
    startup: 2.1,
  },
  "2": {
    eco: 1.6,
    normal: 2.0,
    high: 2.4,
    startup: 2.8,
  },
};

// Startup duration in minutes (high consumption period when AC first turns on)
const STARTUP_DURATION_MINUTES = 15;

// Energy calculation interval in minutes (how often to update energy consumption)
const CALCULATION_INTERVAL_MINUTES = 10;

// Get energy rate for specific AC ton and mode
function getEnergyRate(ton, mode = "normal") {
  const rates = ENERGY_RATES[ton];
  if (!rates) {
    console.warn(`⚠️  No energy rates found for ton: ${ton}, using default 1 ton rates`);
    return ENERGY_RATES["1"][mode] || ENERGY_RATES["1"].normal;
  }
  return rates[mode] || rates.normal;
}

// Get startup rate for specific AC ton
function getStartupRate(ton) {
  const rates = ENERGY_RATES[ton];
  if (!rates) {
    return ENERGY_RATES["1"].startup;
  }
  return rates.startup;
}

/**
 * Calculate temperature multiplier for energy consumption
 * Base temperature: 24°C (normal consumption)
 * For every 1°C below 24°C: +5-10% energy increase
 * For every 1°C above 24°C: energy decrease (more efficient)
 * 
 * @param {Number} temperature - Set temperature in Celsius
 * @returns {Number} - Multiplier (1.0 = normal, >1.0 = more energy, <1.0 = less energy)
 */
function getTemperatureMultiplier(temperature) {
  const baseTemp = 24; // 24°C is the baseline
  const tempDiff = baseTemp - temperature;
  
  // If temperature is below 24°C, increase energy consumption
  if (tempDiff > 0) {
    // For every 1°C below 24°C, increase by 7.5% (average of 5-10%)
    const multiplier = 1 + (tempDiff * 0.075);
    return Math.max(1.0, multiplier); // Minimum 1.0 (no reduction)
  }
  
  // If temperature is above 24°C, decrease energy consumption
  if (tempDiff < 0) {
    // For every 1°C above 24°C, decrease by 5% (more efficient)
    const multiplier = 1 + (tempDiff * 0.05);
    return Math.max(0.7, multiplier); // Minimum 0.7 (30% reduction max)
  }
  
  // Exactly 24°C - normal consumption
  return 1.0;
}

/**
 * Get energy rate adjusted for temperature
 * @param {String} ton - AC ton capacity
 * @param {String} mode - AC mode (eco/normal/high)
 * @param {Number} temperature - Set temperature in Celsius
 * @returns {Number} - Adjusted energy rate in kWh/hr
 */
function getEnergyRateWithTemperature(ton, mode = "normal", temperature = 24) {
  const baseRate = getEnergyRate(ton, mode);
  const tempMultiplier = getTemperatureMultiplier(temperature);
  return baseRate * tempMultiplier;
}

module.exports = {
  ENERGY_RATES,
  STARTUP_DURATION_MINUTES,
  CALCULATION_INTERVAL_MINUTES,
  getEnergyRate,
  getStartupRate,
  getTemperatureMultiplier,
  getEnergyRateWithTemperature,
};

