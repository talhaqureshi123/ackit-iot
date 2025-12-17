const WebSocket = require("ws");
const AC = require("../models/AC/ac");

class ESPService {
  constructor() {
    this.esp32Connections = new Map(); // { serialNumber: WebSocket }
    this.deviceStates = new Map(); // { serialNumber: { power, temp, locked } }
    this.recentIRPowerChanges = new Map(); // Track recent IR power changes
  }

  // Initialize WebSocket servers
  initialize(server) {
    // Unified WebSocket Server attached to Express HTTP server
    // Handles both /esp32 and /frontend paths
    // URL Format:
    //   - ESP32: ws://SERVER_IP:5050/esp32
    //   - Frontend: ws://SERVER_IP:5050/frontend
    // IMPORTANT: Attach to existing HTTP server, don't create standalone server
    this.esp32WSS = new WebSocket.Server({
      server: server, // Attach to Express HTTP server
      path: "/esp32", // Default path (we'll handle /frontend in verifyClient)
      clientTracking: true,
      perMessageDeflate: false, // Disable compression for simplicity
      verifyClient: (info) => {
        // Verify path is /esp32 or /frontend
        const path = info.req.url;
        console.log(`🔍 [WS] Connection attempt - Path: ${path}`);

        // Accept /esp32, /frontend paths or root path (for compatibility)
        if (
          path === "/esp32" ||
          path === "/esp32/" ||
          path === "/frontend" ||
          path === "/frontend/" ||
          path === "/"
        ) {
          console.log(`✅ [WS] Path verified: ${path}`);
          return true;
        } else {
          console.log(`❌ [WS] Invalid path rejected: ${path}`);
          return false;
        }
      },
    });

    // Frontend connections map (for broadcasting)
    this.frontendConnections = new Set();

    // Add error handling for WebSocket server
    this.esp32WSS.on("error", (error) => {
      console.error(`❌ [WS] WebSocket server error:`, error.message);
    });

    // Log when server is ready
    this.esp32WSS.on("listening", () => {
      console.log(
        `✅ [WS] WebSocket server listening on port 5050 (handles /esp32 and /frontend)`
      );
    });

    // Use same server for both ESP32 and Frontend
    this.frontendWSS = this.esp32WSS;

    // Single connection handler for both ESP32 and Frontend
    this.esp32WSS.on("connection", (ws, req) => {
      const path = req.url;

      // Handle ESP32 connections (/esp32 path)
      if (path === "/esp32" || path === "/esp32/" || path === "/") {
        this.handleESP32Connection(ws, req);
      }
      // Handle Frontend connections (/frontend path)
      else if (path === "/frontend" || path === "/frontend/") {
        this.handleFrontendConnection(ws, req);
      }
      // Invalid path - should not reach here if verifyClient is working
      else {
        console.log(`❌ [WS] Invalid path in connection handler: ${path}`);
        ws.close(1008, "Invalid path");
      }
    });

    console.log(
      "✅ [ESP] WebSocket server initialized on port 5050 (handles /esp32 and /frontend)"
    );
  }

  // Handle ESP32 WebSocket connection
  handleESP32Connection(ws, req) {
    console.log("📡 [ESP] ESP32 connected");

    // Error handling
    ws.on("error", (error) => {
      console.error(`❌ [ESP] WebSocket error:`, error.message);
    });

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);
        // Get serialNumber from either 'serial' or 'device_id' field (simulator uses device_id)
        const serialNumber = data.serial || data.device_id;

        // Device first connection
        if (data.type === "DEVICE_CONNECTED") {
          this.esp32Connections.set(serialNumber, ws);
          this.deviceStates.set(serialNumber, {
            power: false,
            temp: 24,
            locked: false,
          });
          console.log(`✅ [ESP] Registered: ${serialNumber}`);

          // Restore device state from database
          await this.restoreDeviceState(serialNumber);

          this.broadcastToFrontend(serialNumber, { type: "CONNECTED" });
          return;
        }

        if (!this.esp32Connections.has(serialNumber)) return;
        const state = this.deviceStates.get(serialNumber) || {};

        // TEMP_UPDATE from ESP32
        // Note: This is optional feedback from ESP32
        // If ESP32 sends temperature update, we update database
        // But database remains source of truth - if no feedback, database value is authoritative
        if (data.type === "TEMP_UPDATE") {
          const temp = data.temp;
          state.temp = temp;
          this.deviceStates.set(serialNumber, state);

          // Update database with ESP32 feedback (if valid)
          // This is optional - if ESP32 doesn't send feedback, database value is still correct
          try {
            const ac = await AC.findOne({ where: { serialNumber } });
            if (ac && temp >= 16 && temp <= 30) {
              await ac.update({ temperature: temp });
              console.log(
                `📥 [ESP] ${serialNumber}: Temperature feedback received: ${temp}°C (updated database)`
              );
            }
          } catch (err) {
            console.error(`⚠️ [ESP] DB update error:`, err.message);
          }

          this.broadcastToFrontend({
            type: "TEMP_UPDATE",
            serial: serialNumber,
            serialNumber: serialNumber,
            temp,
          });
        }

        // POWER_UPDATE from ESP32
        if (data.type === "POWER_UPDATE") {
          const power = data.power === 1;
          state.power = power;
          this.deviceStates.set(serialNumber, state);

          // Update database (skip if recent IR change)
          const recentIRChange = this.recentIRPowerChanges.has(serialNumber);
          if (!recentIRChange) {
            try {
              const ac = await AC.findOne({ where: { serialNumber } });
              if (ac) {
                await ac.update({ isOn: power });
              }
            } catch (err) {
              console.error(`⚠️ [ESP] DB update error:`, err.message);
            }
          }

          this.broadcastToFrontend(serialNumber, {
            type: "POWER_UPDATE",
            power: power ? 1 : 0,
          });
        }

        // LOCK_UPDATE from ESP32
        if (data.type === "LOCK_UPDATE") {
          const locked = data.locked === 1;
          state.locked = locked;
          this.deviceStates.set(serialNumber, state);

          this.broadcastToFrontend(serialNumber, {
            type: "LOCK_UPDATE",
            locked: locked ? 1 : 0,
          });
        }

        // IR_VIOLATION - Restore dashboard temperature
        if (data.type === "IR_VIOLATION") {
          console.log(`🔒 [ESP] IR VIOLATION: ${serialNumber}`);
          await this.handleIRViolation(serialNumber);
          this.broadcastToFrontend(serialNumber, { type: "IR_VIOLATION" });
        }

        // ROOM_TEMPERATURE - Update room temperature from ESP32/simulator
        // Simulator sends: { device_id, room_temp, temp, power }
        // ESP32 sends: { serial, room_temp, ... }
        if (data.room_temp !== undefined && data.room_temp !== null) {
          // Get serialNumber from either 'serial' or 'device_id' field
          const deviceSerial = data.serial || data.device_id || serialNumber;
          const roomTemp = parseFloat(data.room_temp);
          if (!isNaN(roomTemp)) {
            // Update database
            try {
              // Find AC by serialNumber or key (simulator uses device_id which might be key)
              let ac = await AC.findOne({
                where: { serialNumber: deviceSerial },
              });
              if (!ac) {
                ac = await AC.findOne({ where: { key: deviceSerial } });
              }
              if (ac) {
                await ac.update({
                  roomTemperature: roomTemp,
                  lastRoomTempUpdate: new Date(),
                });
                console.log(
                  `🌡️ [ESP] ${ac.serialNumber}: Room temp updated to ${roomTemp}°C`
                );

                // Broadcast to frontend
                this.broadcastToFrontend({
                  type: "ROOM_TEMPERATURE",
                  serial: ac.serialNumber,
                  serialNumber: ac.serialNumber,
                  room_temp: roomTemp,
                  roomTemperature: roomTemp,
                });
              }
            } catch (err) {
              console.error(`⚠️ [ESP] Room temp DB update error:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error(`❌ [ESP] Message error:`, error.message);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`📡 [ESP] ESP32 disconnected (code: ${code})`);
      // Remove from connections
      for (const [serial, conn] of this.esp32Connections.entries()) {
        if (conn === ws) {
          this.esp32Connections.delete(serial);
          this.deviceStates.delete(serial);
          console.log(`🗑️ [ESP] Removed ${serial} from connections`);
          break;
        }
      }
    });
  }

  // Handle Frontend WebSocket connection
  handleFrontendConnection(ws, req) {
    console.log("🌐 [FRONTEND] Frontend connected");
    this.frontendConnections.add(ws);

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        const serialNumber = data.serial;

        if (!this.esp32Connections.has(serialNumber)) return;

        // POWER_ON
        if (data.type === "POWER_ON") {
          this.sendPowerCommand(serialNumber, true);
        }

        // POWER_OFF
        if (data.type === "POWER_OFF") {
          this.sendPowerCommand(serialNumber, false);
        }

        // SET_TEMP
        if (data.type === "SET_TEMP") {
          this.sendSetTempCommand(serialNumber, data.temp);
        }

        // TEMP_PULSE
        if (data.type === "TEMP_PULSE") {
          this.sendPulseCommand(serialNumber, data.diff);
        }

        // LOCK
        if (data.type === "LOCK") {
          this.sendLockCommand(serialNumber, true);
        }

        // UNLOCK
        if (data.type === "UNLOCK") {
          this.sendLockCommand(serialNumber, false);
        }
      } catch (error) {
        console.error(`❌ [FRONTEND] Frontend message error:`, error.message);
      }
    });

    ws.on("close", () => {
      console.log("🌐 [FRONTEND] Frontend disconnected");
      this.frontendConnections.delete(ws);
    });
  }

  // Send POWER_ON or POWER_OFF command
  sendPowerCommand(serialNumber, isOn) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { type: isOn ? "POWER_ON" : "POWER_OFF" };
    ws.send(JSON.stringify(command));
    console.log(`📤 [ESP] ${serialNumber}: ${isOn ? "POWER_ON" : "POWER_OFF"}`);
    return { success: true };
  }

  // Send temperature pulse command
  sendTemperatureCommand(serialNumber, direction, count) {
    const diff = direction === "increase" || direction === "+" ? count : -count;
    return this.sendPulseCommand(serialNumber, diff);
  }

  // Send pulse command (diff: +1, +2, -1, -2, etc.)
  sendPulseCommand(serialNumber, diff) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { type: "TEMP_PULSE", diff };
    ws.send(JSON.stringify(command));
    console.log(
      `📤 [ESP] ${serialNumber}: TEMP_PULSE ${diff > 0 ? "+" : ""}${diff}`
    );
    return { success: true };
  }

  // Send direct temperature set command
  sendSetTempCommand(serialNumber, temp) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { type: "SET_TEMP", temp };
    ws.send(JSON.stringify(command));
    console.log(`📤 [ESP] ${serialNumber}: SET_TEMP ${temp}°C`);
    return { success: true };
  }

  // Start temperature sync - Database is source of truth, ESP32 follows database
  // Logic: Database value is authoritative, ESP32 hardware may not send feedback
  // So we always send database value to ESP32 and trust it's set correctly
  async startTemperatureSync(serialNumber, targetTemp) {
    try {
      const ws = this.esp32Connections.get(serialNumber);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return { success: false, message: "ESP32 not connected" };
      }

      // Database is source of truth - always send database value to ESP32
      // Don't rely on ESP32's current state (hardware may have different temp)
      // Just send the target temperature (from database) to ESP32
      console.log(
        `🔄 [ESP] ${serialNumber}: Syncing to database temp ${targetTemp}°C (Database = Source of Truth)`
      );

      // Always send SET_TEMP command with database value
      // ESP32 will set this temperature, even if hardware has different value
      // We trust ESP32 will set it correctly (no feedback needed)
      return this.sendSetTempCommand(serialNumber, targetTemp);
    } catch (error) {
      console.error(
        `❌ [ESP] Temperature sync error for ${serialNumber}:`,
        error.message
      );
      return { success: false, message: error.message };
    }
  }

  // Send LOCK or UNLOCK command
  sendLockCommand(serialNumber, locked) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { type: locked ? "LOCK" : "UNLOCK" };
    ws.send(JSON.stringify(command));
    console.log(`📤 [ESP] ${serialNumber}: ${locked ? "LOCK" : "UNLOCK"}`);
    return { success: true };
  }

  // Handle IR violation - restore dashboard temperature
  async handleIRViolation(serialNumber) {
    try {
      const ac = await AC.findOne({ where: { serialNumber } });
      if (!ac) return;

      const dashboardTemp = ac.temperature || 24;
      const state = this.deviceStates.get(serialNumber);
      const currentTemp = state?.temp || dashboardTemp;

      // Calculate difference
      const diff = dashboardTemp - currentTemp;

      if (diff !== 0) {
        console.log(
          `🔄 [ESP] ${serialNumber}: Restoring temp ${currentTemp}°C → ${dashboardTemp}°C`
        );
        this.sendPulseCommand(serialNumber, diff);
      }
    } catch (error) {
      console.error(`❌ [ESP] IR violation error:`, error.message);
    }
  }

  // Restore device state from database on connection
  // Database is source of truth - always sync ESP32 to match database
  // Even if hardware has different temperature, database value is authoritative
  async restoreDeviceState(serialNumber) {
    try {
      const ac = await AC.findOne({ where: { serialNumber } });
      if (!ac) return;

      console.log(
        `🔄 [ESP] ${serialNumber}: Restoring state from database (Database = Source of Truth)`
      );

      // Restore power state (database is source of truth)
      if (ac.isOn !== undefined) {
        this.sendPowerCommand(serialNumber, ac.isOn);
        console.log(`   └─ Power: ${ac.isOn ? "ON" : "OFF"}`);
      }

      // Restore temperature (database is source of truth)
      // Always send database temperature to ESP32, regardless of hardware state
      // ESP32 hardware may have different temp, but we sync it to database value
      if (ac.temperature) {
        this.sendSetTempCommand(serialNumber, ac.temperature);
        console.log(
          `   └─ Temperature: ${ac.temperature}°C (syncing ESP32 to database value)`
        );
      }

      // Restore lock state (database is source of truth)
      const isLocked = ac.currentState === "locked";
      if (isLocked) {
        this.sendLockCommand(serialNumber, true);
        console.log(`   └─ Lock: LOCKED`);
      }

      console.log(
        `✅ [ESP] ${serialNumber}: State restored from DB (ESP32 synced to database)`
      );
    } catch (error) {
      console.error(`❌ [ESP] Restore state error:`, error.message);
    }
  }

  // Request room temperature from ESP32 device
  requestRoomTemperature(serialNumber) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { command: "REQUEST_ROOM_TEMP" };
    ws.send(JSON.stringify(command));
    console.log(`📤 [ESP] ${serialNumber}: REQUEST_ROOM_TEMP`);
    return { success: true };
  }

  // Send event status message to ESP32 device
  sendEventStatusMessage(serialNumber, status, data = {}) {
    const ws = this.esp32Connections.get(serialNumber);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: "ESP32 not connected" };
    }

    const command = {
      type: "EVENT_STATUS",
      status: status,
      ...data,
    };
    ws.send(JSON.stringify(command));
    console.log(`📤 [ESP] ${serialNumber}: EVENT_STATUS ${status}`);
    return { success: true };
  }

  // Broadcast to all frontend clients
  broadcastToFrontend(data) {
    const json = JSON.stringify(data);
    this.frontendConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}

// Export singleton instance
const espService = new ESPService();
module.exports = espService;
