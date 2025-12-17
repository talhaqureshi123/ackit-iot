// Services Module - ACKit IoT Services Gateway
// This module provides centralized access to all core services

const ESPService = require("./esp");

// Lazy-load scheduler services to avoid circular dependencies
// Schedulers are imported only when needed (in initialize.schedulers)

module.exports = {
    // WebSocket Services (Native WebSocket only)
    espNative: ESPService,

    // Global service accessors (for cross-module usage)
    getESPService: () => ESPService,

    // Service initialization methods
    initialize: {
        // Initialize ESP service (native WebSocket server for ESP32 and frontend connections)
        esp: (server) => {
            console.log(" [SERVICES] Initializing ESP service through gateway");
            ESPService.initialize(server);
        },

        // Initialize all schedulers (lazy-loaded to avoid circular dependencies)
        schedulers: () => {
            console.log(" [SERVICES] Starting all schedulers through gateway");
            // Lazy-load schedulers here to avoid circular dependencies
            const AlertScheduler = require("../rolebaseaccess/admin/services/alertScheduler");
            const EnergyScheduler = require("../rolebaseaccess/admin/services/energyScheduler");
            const EventScheduler = require("../realtimes/events/eventScheduler");
            const CleanupScheduler = require("../realtimes/cleanup/cleanupScheduler");
            
            AlertScheduler.start(); // Handles room temperature requests AND alert creation
            // RoomTemperatureScheduler removed - AlertScheduler handles both
            EnergyScheduler.start();
            EventScheduler.start();
            CleanupScheduler.start(); // Handles cleanup of old activity logs
        }
    },

    // Direct service access
    Services: {
        // ESP Native Service methods (handles both ESP32 and frontend)
        ESP: {
            sendTemperatureCommand: ESPService.sendTemperatureCommand,
            sendPowerCommand: ESPService.sendPowerCommand,
            getConnections: () => ESPService.esp32Connections,
            initialize: ESPService.initialize
        },

        // Scheduler Services (lazy-loaded to avoid circular dependencies)
        Schedulers: {
            get alert() {
                return require("../rolebaseaccess/admin/services/alertScheduler");
            },
            get energy() {
                return require("../rolebaseaccess/admin/services/energyScheduler");
            },
            get event() {
                return require("../realtimes/events/eventScheduler");
            },
            get cleanup() {
                return require("../realtimes/cleanup/cleanupScheduler");
            },
            startAll: () => {
                const AlertScheduler = require("../rolebaseaccess/admin/services/alertScheduler");
                const EnergyScheduler = require("../rolebaseaccess/admin/services/energyScheduler");
                const EventScheduler = require("../realtimes/events/eventScheduler");
                const CleanupScheduler = require("../realtimes/cleanup/cleanupScheduler");
                
                AlertScheduler.start(); // Handles room temperature requests AND alert creation
                // RoomTemperatureScheduler removed - AlertScheduler handles both
                EnergyScheduler.start();
                EventScheduler.start();
                CleanupScheduler.start(); // Handles cleanup of old activity logs
            }
        }
    }
};