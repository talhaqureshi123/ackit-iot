const WebSocket = require("ws");
const AC = require("../models/AC/ac");
const Venue = require("../models/Venue/venue");
const Organization = require("../models/Organization/organization");

class ESPService {
  constructor() {
    this.esp32Connections = new Map(); // { serialNumber: WebSocket }
    this.deviceStates = new Map(); // { serialNumber: { power, temp, locked } }
    this.recentIRPowerChanges = new Map(); // Track recent IR power changes
    
    // Room/Channel system for notifications
    // Rooms: device:{deviceId}, venue:{venueId}, organization:{organizationId}
    this.rooms = new Map(); // { roomName: Set<WebSocket> }
    
    // Device metadata: track device -> venue -> organization mapping
    this.deviceMetadata = new Map(); // { serialNumber: { deviceId, venueId, organizationId, deviceName, venueName, organizationName } }
    
    // Frontend connections with room subscriptions
    this.frontendSubscriptions = new Map(); // { WebSocket: Set<roomName> }
  }

  // Initialize WebSocket servers
  initialize(server) {
    // Unified WebSocket Server attached to Express HTTP server
    // Handles both /esp32 and /frontend paths
    // URL Format:
    //   - ESP32: ws://SERVER_IP:5050/esp32
    //   - Frontend: ws://SERVER_IP:5050/frontend
    // IMPORTANT: Attach to existing HTTP server, don't create standalone server
    // Don't specify 'path' option - handle all paths in verifyClient
    // This allows us to accept both /esp32 and /frontend paths
    this.esp32WSS = new WebSocket.Server({
      server: server, // Attach to Express HTTP server
      // No 'path' option - we'll filter paths in verifyClient
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
    
    // Initialize room system
    this.initializeRooms();

    // Add error handling for WebSocket server
    this.esp32WSS.on("error", (error) => {
      console.error(`❌ [WS] WebSocket server error:`, error.message);
      console.error(`❌ [WS] Error stack:`, error.stack);
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

  // Initialize room system
  initializeRooms() {
    console.log("✅ [ROOMS] Room system initialized");
  }

  // Room management methods
  joinRoom(ws, roomName) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(ws);
    console.log(`📥 [ROOMS] Client joined room: ${roomName}`);
  }

  leaveRoom(ws, roomName) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(ws);
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
      console.log(`📤 [ROOMS] Client left room: ${roomName}`);
    }
  }

  // Broadcast to specific room
  broadcastToRoom(roomName, data) {
    if (!this.rooms.has(roomName)) {
      console.log(`⚠️ [ROOMS] Room ${roomName} does not exist - no clients to broadcast to`);
      return;
    }
    const json = JSON.stringify(data);
    const room = this.rooms.get(roomName);
    let sentCount = 0;
    room.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
        sentCount++;
      }
    });
    if (sentCount > 0) {
      console.log(`📢 [ROOMS] Broadcast to ${roomName}: ${sentCount} clients | Event: ${data.type || 'unknown'}`);
    } else {
      console.log(`⚠️ [ROOMS] Room ${roomName} has ${room.size} clients but none are OPEN | Event: ${data.type || 'unknown'}`);
    }
  }

  // Get device metadata (device -> venue -> organization)
  async getDeviceMetadata(serialNumber) {
    try {
      const ac = await AC.findOne({
        where: { serialNumber },
        include: [
          {
            model: Venue,
            as: "venue",
            include: [
              {
                model: Organization,
                as: "organization",
              },
            ],
          },
        ],
      });

      if (!ac) {
        return null;
      }

      const venue = ac.venue;
      const organization = venue?.organization;

      return {
        deviceId: ac.id,
        venueId: venue?.id,
        organizationId: organization?.id,
        deviceName: ac.name,
        venueName: venue?.name,
        organizationName: organization?.name,
        serialNumber: ac.serialNumber,
      };
    } catch (error) {
      console.error(`❌ [ROOMS] Error getting device metadata:`, error.message);
      return null;
    }
  }

  // Emit event to relevant rooms
  async emitEvent(eventType, data) {
    const { deviceId, venueId, organizationId, serialNumber } = data;

    const eventData = {
      type: eventType,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Emit to device room
    if (deviceId) {
      this.broadcastToRoom(`device:${deviceId}`, eventData);
    }

    // Emit to venue room
    if (venueId) {
      this.broadcastToRoom(`venue:${venueId}`, eventData);
    }

    // Emit to organization room
    if (organizationId) {
      this.broadcastToRoom(`organization:${organizationId}`, eventData);
    }

    // Also broadcast to all frontend clients (for backward compatibility)
    this.broadcastToFrontend(eventData);
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
        console.log(`📥 [ESP] Received message from device:`, data);
        // Get serialNumber from either 'serial' or 'device_id' field (simulator uses device_id)
        const serialNumber = data.serial || data.device_id;
        console.log(`📥 [ESP] Extracted serialNumber: ${serialNumber} from data:`, { serial: data.serial, device_id: data.device_id });

        // Device first connection
        if (data.type === "DEVICE_CONNECTED") {
          console.log(`🔌 [ESP] Processing DEVICE_CONNECTED for ${serialNumber}`);
          this.esp32Connections.set(serialNumber, ws);
          this.deviceStates.set(serialNumber, {
            power: false,
            temp: 24,
            locked: false,
          });
          console.log(`✅ [ESP] Registered: ${serialNumber}`);

          // Get device metadata (venue, organization)
          const metadata = await this.getDeviceMetadata(serialNumber);
          if (metadata) {
            // Store metadata
            this.deviceMetadata.set(serialNumber, metadata);

            // Join device to its rooms
            if (metadata.deviceId) {
              this.joinRoom(ws, `device:${metadata.deviceId}`);
            }
            if (metadata.venueId) {
              this.joinRoom(ws, `venue:${metadata.venueId}`);
            }
            if (metadata.organizationId) {
              this.joinRoom(ws, `organization:${metadata.organizationId}`);
            }

            // Emit DEVICE_CONNECTED event
            console.log(`📤 [ESP] Emitting DEVICE_CONNECTED event for ${serialNumber} | Device: ${metadata.deviceId}, Venue: ${metadata.venueId}, Org: ${metadata.organizationId}`);
            await this.emitEvent("DEVICE_CONNECTED", {
              deviceId: metadata.deviceId,
              venueId: metadata.venueId,
              organizationId: metadata.organizationId,
              serialNumber: serialNumber,
              deviceName: metadata.deviceName,
              venueName: metadata.venueName,
              organizationName: metadata.organizationName,
              message: `Device ${metadata.deviceName || serialNumber} is CONNECTED`,
            });
            console.log(`✅ [ESP] DEVICE_CONNECTED event emitted for ${serialNumber}`);

            // Check for pending events that should have started while device was offline
            await this.checkPendingEventsForDevice(metadata.deviceId);
          } else {
            console.warn(`⚠️ [ESP] Could not find device metadata for ${serialNumber}`);
            // Still broadcast for backward compatibility
            this.broadcastToFrontend({
              type: "CONNECTED",
              serial: serialNumber,
              serialNumber: serialNumber,
            });
          }

          // Restore device state from database
          await this.restoreDeviceState(serialNumber);
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

          // Get metadata for event emission
          const metadata = this.deviceMetadata.get(serialNumber);
          
          // Emit DEVICE_UPDATED event
          if (metadata) {
            await this.emitEvent("DEVICE_UPDATED", {
              deviceId: metadata.deviceId,
              venueId: metadata.venueId,
              organizationId: metadata.organizationId,
              serialNumber: serialNumber,
              updateType: "temperature",
              temperature: temp,
            });
          }

          // Legacy broadcast
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

          // Get metadata for event emission
          const metadata = this.deviceMetadata.get(serialNumber);
          
          // Emit DEVICE_UPDATED event
          if (metadata) {
            await this.emitEvent("DEVICE_UPDATED", {
              deviceId: metadata.deviceId,
              venueId: metadata.venueId,
              organizationId: metadata.organizationId,
              serialNumber: serialNumber,
              updateType: "power",
              isOn: power,
            });
          }

          // Legacy broadcast
          this.broadcastToFrontend({
            type: "POWER_UPDATE",
            serial: serialNumber,
            serialNumber: serialNumber,
            power: power ? 1 : 0,
          });
        }

        // LOCK_UPDATE from ESP32
        if (data.type === "LOCK_UPDATE") {
          const locked = data.locked === 1;
          state.locked = locked;
          this.deviceStates.set(serialNumber, state);

          this.broadcastToFrontend({
            type: "LOCK_UPDATE",
            serial: serialNumber,
            serialNumber: serialNumber,
            locked: locked ? 1 : 0,
          });
        }

        // IR_VIOLATION - Restore dashboard temperature
        if (data.type === "IR_VIOLATION") {
          console.log(`🔒 [ESP] IR VIOLATION: ${serialNumber}`);
          await this.handleIRViolation(serialNumber);
          this.broadcastToFrontend({
            type: "IR_VIOLATION",
            serial: serialNumber,
            serialNumber: serialNumber,
          });
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

    ws.on("close", async (code, reason) => {
      console.log(`📡 [ESP] ESP32 disconnected (code: ${code})`);
      // Remove from connections and emit disconnect event
      for (const [serial, conn] of this.esp32Connections.entries()) {
        if (conn === ws) {
          this.esp32Connections.delete(serial);
          this.deviceStates.delete(serial);

          // Get metadata before removing
          const metadata = this.deviceMetadata.get(serial);

          // Leave rooms
          if (metadata) {
            if (metadata.deviceId) {
              this.leaveRoom(ws, `device:${metadata.deviceId}`);
            }
            if (metadata.venueId) {
              this.leaveRoom(ws, `venue:${metadata.venueId}`);
            }
            if (metadata.organizationId) {
              this.leaveRoom(ws, `organization:${metadata.organizationId}`);
            }

            // Emit DEVICE_DISCONNECTED event
            await this.emitEvent("DEVICE_DISCONNECTED", {
              deviceId: metadata.deviceId,
              venueId: metadata.venueId,
              organizationId: metadata.organizationId,
              serialNumber: serial,
              deviceName: metadata.deviceName,
              venueName: metadata.venueName,
              organizationName: metadata.organizationName,
              message: `Device ${metadata.deviceName || serial} is DISCONNECTED`,
            });

            // Remove metadata
            this.deviceMetadata.delete(serial);
          } else {
            // Fallback: broadcast disconnect for backward compatibility
            this.broadcastToFrontend({
              type: "DISCONNECTED",
              serial: serial,
              serialNumber: serial,
            });
          }

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
    this.frontendSubscriptions.set(ws, new Set());
    
    // Send current list of connected devices to newly connected frontend
    // This ensures dashboard shows correct connection status immediately
    const connectedDevicesList = Array.from(this.esp32Connections.keys());
    if (connectedDevicesList.length > 0) {
      console.log(`📤 [FRONTEND] Sending ${connectedDevicesList.length} connected device(s) to new frontend client`);
      connectedDevicesList.forEach(async (serialNumber) => {
        const metadata = this.deviceMetadata.get(serialNumber);
        if (metadata) {
          // Send DEVICE_CONNECTED event for each already-connected device
          const eventData = {
            type: "DEVICE_CONNECTED",
            timestamp: new Date().toISOString(),
            deviceId: metadata.deviceId,
            venueId: metadata.venueId,
            organizationId: metadata.organizationId,
            serialNumber: serialNumber,
            deviceName: metadata.deviceName,
            venueName: metadata.venueName,
            organizationName: metadata.organizationName,
            message: `Device ${metadata.deviceName || serialNumber} is CONNECTED`,
          };
          // Send directly to this frontend client
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(eventData));
            console.log(`✅ [FRONTEND] Sent DEVICE_CONNECTED for ${serialNumber} to new frontend client`);
          }
        } else {
          // Fallback: send basic CONNECTED message if metadata not available
          const eventData = {
            type: "CONNECTED",
            serial: serialNumber,
            serialNumber: serialNumber,
          };
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(eventData));
            console.log(`✅ [FRONTEND] Sent CONNECTED for ${serialNumber} to new frontend client (no metadata)`);
          }
        }
      });
    } else {
      console.log("📤 [FRONTEND] No devices currently connected");
    }

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);
        const serialNumber = data.serial;

        // Handle room subscriptions
        if (data.type === "SUBSCRIBE_ROOM") {
          const roomName = data.room;
          if (roomName) {
            this.joinRoom(ws, roomName);
            const subscriptions = this.frontendSubscriptions.get(ws);
            if (subscriptions) {
              subscriptions.add(roomName);
            }
            console.log(`📥 [FRONTEND] Subscribed to room: ${roomName}`);
            // Send confirmation
            ws.send(JSON.stringify({
              type: "SUBSCRIBE_SUCCESS",
              room: roomName,
            }));
          }
          return;
        }

        if (data.type === "UNSUBSCRIBE_ROOM") {
          const roomName = data.room;
          if (roomName) {
            this.leaveRoom(ws, roomName);
            const subscriptions = this.frontendSubscriptions.get(ws);
            if (subscriptions) {
              subscriptions.delete(roomName);
            }
            console.log(`📤 [FRONTEND] Unsubscribed from room: ${roomName}`);
            // Send confirmation
            ws.send(JSON.stringify({
              type: "UNSUBSCRIBE_SUCCESS",
              room: roomName,
            }));
          }
          return;
        }

        // Legacy command handling
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
      
      // Leave all subscribed rooms
      const subscriptions = this.frontendSubscriptions.get(ws);
      if (subscriptions) {
        subscriptions.forEach((roomName) => {
          this.leaveRoom(ws, roomName);
        });
      }
      this.frontendSubscriptions.delete(ws);
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
      console.error(`❌ [ESP] ${serialNumber}: Cannot send SET_TEMP - WebSocket not connected (readyState: ${ws ? ws.readyState : 'null'})`);
      return { success: false, message: "ESP32 not connected" };
    }

    const command = { type: "SET_TEMP", temp };
    const commandJson = JSON.stringify(command);
    ws.send(commandJson);
    console.log(`📤 [ESP] ${serialNumber}: SET_TEMP ${temp}°C | Command: ${commandJson}`);
    return { success: true };
  }

  // Start temperature sync - Database is source of truth, ESP32 follows database
  // Logic: Database value is authoritative, ESP32 hardware may not send feedback
  // So we always send database value to ESP32 and trust it's set correctly
  async startTemperatureSync(serialNumber, targetTemp) {
    try {
      // Check if device is connected
      if (!this.esp32Connections.has(serialNumber)) {
        console.error(`❌ [ESP] ${serialNumber}: Device not in connections map`);
        return { success: false, message: "ESP32 not connected" };
      }

      const ws = this.esp32Connections.get(serialNumber);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error(`❌ [ESP] ${serialNumber}: WebSocket not open (readyState: ${ws ? ws.readyState : 'null'})`);
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
      const result = this.sendSetTempCommand(serialNumber, targetTemp);
      if (result.success) {
        console.log(`✅ [ESP] ${serialNumber}: SET_TEMP command sent successfully`);
      } else {
        console.error(`❌ [ESP] ${serialNumber}: SET_TEMP command failed - ${result.message}`);
      }
      return result;
    } catch (error) {
      console.error(
        `❌ [ESP] Temperature sync error for ${serialNumber}:`,
        error.message
      );
      console.error(`   └─ Stack:`, error.stack);
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

  // Emit VENUE_UPDATED event (call this when venue settings change)
  async emitVenueUpdated(venueId, updateData = {}) {
    try {
      const venue = await Venue.findByPk(venueId, {
        include: [
          {
            model: Organization,
            as: "organization",
          },
        ],
      });

      if (!venue) {
        console.warn(`⚠️ [ROOMS] Venue ${venueId} not found`);
        return;
      }

      const organization = venue.organization;

      await this.emitEvent("VENUE_UPDATED", {
        venueId: venue.id,
        organizationId: organization?.id,
        venueName: venue.name,
        organizationName: organization?.name,
        ...updateData,
      });

      console.log(`📢 [ROOMS] VENUE_UPDATED event emitted for venue ${venueId}`);
    } catch (error) {
      console.error(`❌ [ROOMS] Error emitting VENUE_UPDATED:`, error.message);
    }
  }

  // Emit ORGANIZATION_UPDATED event (call this when organization settings change)
  async emitOrganizationUpdated(organizationId, updateData = {}) {
    try {
      const organization = await Organization.findByPk(organizationId);

      if (!organization) {
        console.warn(`⚠️ [ROOMS] Organization ${organizationId} not found`);
        return;
      }

      await this.emitEvent("ORGANIZATION_UPDATED", {
        organizationId: organization.id,
        organizationName: organization.name,
        ...updateData,
      });

      console.log(`📢 [ROOMS] ORGANIZATION_UPDATED event emitted for organization ${organizationId}`);
    } catch (error) {
      console.error(`❌ [ROOMS] Error emitting ORGANIZATION_UPDATED:`, error.message);
    }
  }

  // Emit DEVICE_UPDATED event (call this when device config changes from API)
  async emitDeviceUpdated(deviceId, updateData = {}) {
    try {
      const ac = await AC.findByPk(deviceId, {
        include: [
          {
            model: Venue,
            as: "venue",
            include: [
              {
                model: Organization,
                as: "organization",
              },
            ],
          },
        ],
      });

      if (!ac) {
        console.warn(`⚠️ [ROOMS] Device ${deviceId} not found`);
        return;
      }

      const venue = ac.venue;
      const organization = venue?.organization;

      await this.emitEvent("DEVICE_UPDATED", {
        deviceId: ac.id,
        venueId: venue?.id,
        organizationId: organization?.id,
        serialNumber: ac.serialNumber,
        deviceName: ac.name,
        venueName: venue?.name,
        organizationName: organization?.name,
        ...updateData,
      });

      console.log(`📢 [ROOMS] DEVICE_UPDATED event emitted for device ${deviceId}`);
    } catch (error) {
      console.error(`❌ [ROOMS] Error emitting DEVICE_UPDATED:`, error.message);
    }
  }

  // Get list of currently connected device serial numbers
  getConnectedDeviceSerialNumbers() {
    return Array.from(this.esp32Connections.keys());
  }

  // Check if a device is connected by serial number
  isDeviceConnected(serialNumber) {
    return this.esp32Connections.has(serialNumber);
  }

  // Get connected devices info (for API endpoint)
  getConnectedDevicesInfo() {
    const connectedDevices = [];
    this.esp32Connections.forEach((ws, serialNumber) => {
      const metadata = this.deviceMetadata.get(serialNumber);
      if (metadata) {
        connectedDevices.push({
          serialNumber: serialNumber,
          deviceId: metadata.deviceId,
          venueId: metadata.venueId,
          organizationId: metadata.organizationId,
          deviceName: metadata.deviceName,
          venueName: metadata.venueName,
          organizationName: metadata.organizationName,
        });
      } else {
        // Device connected but metadata not loaded yet
        connectedDevices.push({
          serialNumber: serialNumber,
          deviceId: null,
          venueId: null,
          organizationId: null,
        });
      }
    });
    return connectedDevices;
  }

  // Check for pending events that should have started while device was offline
  async checkPendingEventsForDevice(deviceId) {
    if (!deviceId) return;

    try {
      const Event = require("../models/Event/event");
      const EventService = require("../rolebaseaccess/admin/services/eventService");
      const ManagerEventService = require("../rolebaseaccess/manager/services/managerEventService");
      const timezoneUtils = require("../utils/timezone");
      const { Op, Sequelize } = require("sequelize");

      const now = timezoneUtils.getCurrentUTCTime();
      const nowUTCString = now.toISOString();

      // Find scheduled events for this device that should have started (startTime passed but endTime not passed)
      const pendingEvents = await Event.findAll({
        where: {
          deviceId: deviceId,
          status: "scheduled",
          isDisabled: false,
          [Op.and]: [
            Sequelize.literal(
              `"startTime" <= '${nowUTCString}'::timestamptz`
            ),
            Sequelize.literal(
              `"endTime" > '${nowUTCString}'::timestamptz`
            ),
          ],
        },
      });

      if (pendingEvents.length > 0) {
        console.log(
          `📅 [ESP] Found ${pendingEvents.length} pending event(s) for device ${deviceId} that should start now`
        );

        for (const event of pendingEvents) {
          try {
            if (event.createdBy === "admin") {
              await EventService.startEvent(event.adminId, event.id);
              console.log(
                `✅ [ESP] Started pending admin event: ${event.name} (ID: ${event.id})`
              );
            } else if (event.createdBy === "manager") {
              await ManagerEventService.startEvent(event.managerId, event.id);
              console.log(
                `✅ [ESP] Started pending manager event: ${event.name} (ID: ${event.id})`
              );
            }
          } catch (error) {
            console.error(
              `❌ [ESP] Error starting pending event ${event.id}:`,
              error.message
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `❌ [ESP] Error checking pending events for device ${deviceId}:`,
        error.message
      );
    }
  }
}

// Export singleton instance
const espService = new ESPService();
module.exports = espService;
