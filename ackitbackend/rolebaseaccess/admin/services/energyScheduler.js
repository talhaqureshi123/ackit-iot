const cron = require("node-cron");
const EnergyConsumptionService = require("./energyConsumptionService");
const { CALCULATION_INTERVAL_MINUTES } = require("../../../config/energyConsumption");

class EnergyScheduler {
  static start() {
    console.log("⚡ Starting energy consumption scheduler...");

    // Run every 10 minutes (configurable via CALCULATION_INTERVAL_MINUTES)
    // Cron expression: "*/10 * * * *" means every 10 minutes
    const cronExpression = `*/${CALCULATION_INTERVAL_MINUTES} * * * *`;
    
    cron.schedule(cronExpression, async () => {
      console.log(`⚡ Running scheduled energy consumption calculation...`);
      try {
        const results = await EnergyConsumptionService.updateAllActiveACsEnergy();
        console.log(`✅ Energy calculation completed for ${results.length} ACs`);
      } catch (error) {
        console.error("❌ Error in scheduled energy calculation:", error);
      }
    });

    console.log(`✅ Energy scheduler started (runs every ${CALCULATION_INTERVAL_MINUTES} minutes)`);
  }

  static stop() {
    console.log("🛑 Stopping energy scheduler...");
    // Note: node-cron doesn't have a built-in stop method
    // If needed, we can store the task and stop it
  }
}

module.exports = EnergyScheduler;

