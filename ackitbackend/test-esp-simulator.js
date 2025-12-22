/**
 * ESP32 Simulator Script
 */

const WebSocket = require("ws");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../config/environment/.env"),
});
require("./config/database/postgresql");
const { AC } = require("./models");

// ============================================
// CONFIGURATION
// ============================================
// Use same IP as backend server (from config or auto-detect)
const serverConfig = require("./config/server.config");
const SERVER_IP = serverConfig.SERVER_IP || "192.168.1.105";
const SERVER_PORT = 5050; // WebSocket port (not HTTP port)
const SERIAL_NUMBER = "AC-541281-637";
const WEBSOCKET_PATH = "/esp32";

// Railway Configuration
const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || "https://ackit-iot-production.up.railway.app";
const USE_RAILWAY = process.env.USE_RAILWAY === "true" || process.argv.includes("--railway");

// Determine WebSocket URL
const getWebSocketURL = () => {
  if (USE_RAILWAY) {
    // Railway uses WSS (secure WebSocket)
    const wsUrl = RAILWAY_BACKEND_URL.replace(/^https?/, "wss") + WEBSOCKET_PATH;
    return wsUrl;
  }
  // Local development uses WS (unencrypted WebSocket)
  return `ws://${SERVER_IP}:${SERVER_PORT}${WEBSOCKET_PATH}`;
};

const WS_URL = getWebSocketURL();

// Debug: Log configuration
console.log("\n📋 Simulator Configuration:");
console.log(`   └─ Mode: ${USE_RAILWAY ? "🚂 Railway (Production)" : "💻 Local (Development)"}`);
console.log(`   └─ Server IP: ${USE_RAILWAY ? RAILWAY_BACKEND_URL : SERVER_IP}`);
console.log(`   └─ Server Port: ${USE_RAILWAY ? "443 (WSS)" : SERVER_PORT}`);
console.log(`   └─ WebSocket Path: ${WEBSOCKET_PATH}`);
console.log(`   └─ Serial Number: ${SERIAL_NUMBER}`);
console.log(`   └─ Full URL: ${WS_URL}`);
console.log("");
console.log("🔗 Device Testing Links:");
if (USE_RAILWAY) {
  console.log(`   └─ Railway Backend: ${RAILWAY_BACKEND_URL}`);
  console.log(`   └─ Railway WebSocket: ${WS_URL}`);
  console.log(`   └─ Railway Frontend: https://ackit-iot-production-9ffb.up.railway.app`);
  console.log(`   └─ Test Device Dashboard: https://ackit-iot-production-9ffb.up.railway.app/admin (Admin login required)`);
  console.log(`   └─ Test Device Dashboard: https://ackit-iot-production-9ffb.up.railway.app/manager (Manager login required)`);
} else {
  console.log(`   └─ Local Backend: http://${SERVER_IP}:${SERVER_PORT}`);
  console.log(`   └─ Local WebSocket: ${WS_URL}`);
  console.log(`   └─ Railway Backend: ${RAILWAY_BACKEND_URL}`);
  console.log(`   └─ Railway Frontend: https://ackit-iot-production-9ffb.up.railway.app`);
  console.log(`   └─ Test Device Dashboard: https://ackit-iot-production-9ffb.up.railway.app/admin (Admin login required)`);
  console.log(`   └─ Test Device Dashboard: https://ackit-iot-production-9ffb.up.railway.app/manager (Manager login required)`);
}
console.log("");
console.log("💡 Tip: Use --railway flag or set USE_RAILWAY=true to connect to Railway");
console.log("");

let deviceState = {
  power: false,
  temperature: 20.0,
  roomTemperature: 33.0, // Hardcoded room temperature for testing alerts (33°C)
  remote: false,
  lockState: false,
  lockedTemperature: null,
  isConnected: false,
  deviceKey: null,
  isEventActive: false,
  lastCommandTime: 0,
  lastTempCommandTime: 0,
  eventTemperature: 0,
};

let ws = null;
let reconnectInterval = null;
let roomTempInterval = null; // Interval for automatic room temperature updates (every 5 minutes)

// ============================================
// CONSOLE LOGS (ONLY REQUIRED ONES)
// ============================================

// 1. SYNC CONSOLE (ON/OFF)
function logSync(power, temp) {
  console.log(`📊 [SYNC] Power: ${power ? "ON" : "OFF"}, Temp: ${temp}°C`);
}

// 2. TEMP CHANGE CONSOLE (WITH PULSE)
function logTempChange(oldTemp, newTemp, pulse) {
  const pulseType = pulse > 0 ? `+${pulse} (POSITIVE)` : `${pulse} (NEGATIVE)`;
  console.log(`🌡️ [TEMP] ${oldTemp}°C → ${newTemp}°C | Pulse: ${pulseType}`);
}

// 3. EVENT CONSOLE
function logEvent(status, temp = null) {
  if (temp) {
    console.log(`📅 [EVENT] ${status.toUpperCase()} | Temp: ${temp}°C`);
  } else {
    console.log(`📅 [EVENT] ${status.toUpperCase()}`);
  }
}

// 4. POWER SUPPLY SHORT (ON THEN OFF THEN ON)
function logPowerSupplyShort() {
  console.log(`⚡ [POWER SUPPLY SHORT] ON → OFF → ON`);
}

// 5. REMOTE LOCKED DEVICE CONSOLE
function logRemoteLock(locked, temp = null) {
  if (locked) {
    console.log(`🔒 [REMOTE LOCK] LOCKED | Locked Temp: ${temp}°C`);
  } else {
    console.log(`🔓 [REMOTE LOCK] UNLOCKED`);
  }
}

// 6. ROOM TEMP CONSOLE
function logRoomTemp(roomTemp, deviceTemp) {
  console.log(`🌡️ [ROOM TEMP] Room: ${roomTemp}°C | Device: ${deviceTemp}°C`);
}

// ============================================
// CONNECTION
// ============================================
function connect() {
  const wsUrl = WS_URL;
  console.log(`\n🔌 Attempting to connect to: ${wsUrl}`);
  console.log(`📡 Mode: ${USE_RAILWAY ? "Railway (WSS)" : "Local (WS)"}`);
  console.log(`📡 Server: ${USE_RAILWAY ? RAILWAY_BACKEND_URL : SERVER_IP}`);
  console.log(`📡 Port: ${USE_RAILWAY ? "443 (WSS)" : SERVER_PORT}`);
  console.log(`📡 Path: ${WEBSOCKET_PATH}`);
  console.log(`📡 Protocol: ${USE_RAILWAY ? "wss:// (secure)" : "ws:// (unencrypted)"}`);
  console.log(`📡 Full URL: ${wsUrl}`);

  ws = new WebSocket(wsUrl, {
    perMessageDeflate: false,
    handshakeTimeout: 10000,
    maxPayload: 1024 * 1024,
  });

  ws.on("open", async () => {
    console.log(`✅ WebSocket connection established!`);
    deviceState.isConnected = true;

    try {
      const ac = await AC.findOne({
        where: { serialNumber: SERIAL_NUMBER },
        attributes: [
          "id",
          "name",
          "serialNumber",
          "temperature",
          "isOn",
          "key",
        ],
      });

      if (ac) {
        if (ac.temperature !== undefined && ac.temperature !== null) {
          const dbTemp = parseFloat(ac.temperature);
          if (dbTemp >= 16 && dbTemp <= 30) {
            deviceState.temperature = dbTemp;
          }
        }

        if (ac.isOn !== undefined) {
          deviceState.power = ac.isOn;
        }

        if (ac.key) {
          deviceState.deviceKey = ac.key;
        }

        // 1. SYNC CONSOLE (ON/OFF)
        logSync(deviceState.power, deviceState.temperature);
      }
    } catch (error) {
      // Silent error
    }

    // Send DEVICE_CONNECTED message (matching ESP32 format)
    setTimeout(() => {
      const initMessage = JSON.stringify({
        type: "DEVICE_CONNECTED",
        serial: SERIAL_NUMBER,
      });
      console.log(`📤 Sending DEVICE_CONNECTED: ${initMessage}`);
      ws.send(initMessage);
      if (!deviceState.deviceKey) {
        deviceState.deviceKey = SERIAL_NUMBER;
      }

      // Automatically send room temperature after connection (for alert testing)
      // Wait a bit for device to be registered
      setTimeout(() => {
        if (deviceState.power && deviceState.roomTemperature !== null) {
          handleRoomTemperatureRequest();
          console.log(
            `🌡️ [AUTO] Sending initial room temp: ${deviceState.roomTemperature}°C`
          );
        }

        // Start automatic room temperature updates every 5 minutes (for alert testing)
        startRoomTemperatureAutoUpdate();
      }, 500);
    }, 100);
  });

  ws.on("message", (data) => {
    const messageStr = data.toString();

    // Completely skip logging for routine messages (reduces console spam)
    // Skip: REQUEST_ROOM_TEMP, ping/pong messages
    try {
      const parsed = JSON.parse(messageStr);
      // Skip REQUEST_ROOM_TEMP completely (no log, just handle silently)
      if (parsed.command === "REQUEST_ROOM_TEMP") {
        handleMessage(data);
        return; // Exit early, no log
      }
      // Log other important messages
      console.log(
        `📨 Received message from server: ${messageStr.substring(0, 100)}`
      );
    } catch (e) {
      // Not JSON - skip ping/pong completely (no logs, handled silently)
      if (
        messageStr.includes("ping") ||
        messageStr.includes("PING") ||
        messageStr.includes("pong") ||
        messageStr.includes("PONG")
      ) {
        handleMessage(data);
        return; // Exit early, no log
      }
      // Log other non-JSON messages
      console.log(
        `📨 Received message from server: ${messageStr.substring(0, 100)}`
      );
    }
    handleMessage(data);
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error:`, error.message || error);
    console.error(`   └─ URL: ${wsUrl}`);
    console.error(`   └─ Server IP: ${SERVER_IP}`);
    console.error(`   └─ Server Port: ${SERVER_PORT}`);
    console.error(`   └─ Path: ${WEBSOCKET_PATH}`);
    console.error(`   └─ Troubleshooting:`);
    console.error(`      • Check if backend server is running`);
    console.error(
      `      • Check if WebSocket server is listening on port ${SERVER_PORT}`
    );
    console.error(`      • Check if path ${WEBSOCKET_PATH} is correct`);
    console.error(`      • Check firewall/network connectivity`);
    console.error(`      • Verify IP address: ${SERVER_IP}`);
    deviceState.isConnected = false;
  });

  ws.on("close", (code, reason) => {
    console.log(
      `🔌 WebSocket closed. Code: ${code}, Reason: ${
        reason || "No reason provided"
      }`
    );
    deviceState.isConnected = false;

    // Stop room temperature auto-update when disconnected
    stopRoomTemperatureAutoUpdate();

    if (!reconnectInterval) {
      console.log(`⏳ Reconnecting in 5 seconds...`);
      reconnectInterval = setTimeout(() => {
        reconnectInterval = null;
        connect();
      }, 5000);
    }
  });
}

// ============================================
// MESSAGE HANDLER
// ============================================
function handleMessage(data) {
  try {
    const message = data.toString();

    // Handle ping/pong silently (no logs)
    if (message === "ping" || message === "PING") {
      ws.send("pong");
      return; // Exit early, no processing needed
    }

    try {
      const command = JSON.parse(message);

      // Handle POWER_ON and POWER_OFF commands
      if (command.type === "POWER_ON") {
        if (deviceState.power !== true) {
          deviceState.power = true;
          logSync(deviceState.power, deviceState.temperature);
          sendPowerUpdate();
        }
        return;
      }

      if (command.type === "POWER_OFF") {
        if (deviceState.power !== false) {
          deviceState.power = false;
          logSync(deviceState.power, deviceState.temperature);
          sendPowerUpdate();
        }
        return;
      }

      // Handle SET_TEMP command
      if (command.type === "SET_TEMP" && command.temp !== undefined) {
        const targetTemp = parseInt(command.temp);
        if (targetTemp >= 16 && targetTemp <= 30) {
          const oldTemp = deviceState.temperature;
          const diff = targetTemp - oldTemp;
          deviceState.temperature = targetTemp;
          logTempChange(oldTemp, targetTemp, diff);
          sendTempUpdate();
        }
        return;
      }

      // Handle TEMP_PULSE command
      if (command.type === "TEMP_PULSE" && command.diff !== undefined) {
        const pulseCount = command.diff;
        const previousTemp = deviceState.temperature;
        let tempChanged = false;

        if (pulseCount > 0 && deviceState.temperature < 30) {
          const maxIncrease = Math.min(
            pulseCount,
            30 - deviceState.temperature
          );
          deviceState.temperature = deviceState.temperature + maxIncrease;
          tempChanged = maxIncrease > 0;
          logTempChange(previousTemp, deviceState.temperature, pulseCount);
        } else if (pulseCount < 0 && deviceState.temperature > 16) {
          const maxDecrease = Math.min(
            Math.abs(pulseCount),
            deviceState.temperature - 16
          );
          deviceState.temperature = deviceState.temperature - maxDecrease;
          tempChanged = maxDecrease > 0;
          logTempChange(previousTemp, deviceState.temperature, pulseCount);
        }

        if (tempChanged) {
          sendTempUpdate();
        }
        return;
      }

      // Handle LOCK and UNLOCK commands
      if (command.type === "LOCK") {
        if (!deviceState.lockState) {
          deviceState.lockState = true;
          deviceState.lockedTemperature = deviceState.temperature || 24;
          logRemoteLock(true, deviceState.lockedTemperature);
          sendLockUpdate();
        }
        return;
      }

      if (command.type === "UNLOCK") {
        if (deviceState.lockState) {
          deviceState.lockState = false;
          deviceState.lockedTemperature = null;
          logRemoteLock(false);
          sendLockUpdate();
        }
        return;
      }

      if (command.command === "LOCK_STATE") {
        handleLockState(command);
        return;
      }

      if (command.command === "EVENT_STATUS") {
        handleEventStatus(command);
        return;
      }

      if (command.command === "REQUEST_ROOM_TEMP") {
        handleRoomTemperatureRequest();
        return;
      }

      if (command.power !== undefined || command.temp !== undefined) {
        handleCommand(command);
      }
    } catch (parseError) {
      // Ignore parse errors
    }
  } catch (error) {
    // Silent error
  }
}

// ============================================
// COMMAND HANDLER
// ============================================
function handleCommand(command) {
  let changed = false;
  const now = Date.now();
  const timeSinceLastCommand = now - deviceState.lastCommandTime;
  deviceState.lastCommandTime = now;

  // POWER COMMAND
  if (command.power !== undefined) {
    const wasEventActive = deviceState.isEventActive;
    const wasPowerOn = deviceState.power;

    // Power supply short detection: ON then OFF then ON quickly
    if (wasPowerOn && !command.power && timeSinceLastCommand < 2000) {
      setTimeout(() => {
        if (deviceState.power === false) {
          const checkTime = Date.now();
          setTimeout(() => {
            if (deviceState.power === true && Date.now() - checkTime < 2000) {
              logPowerSupplyShort();
            }
          }, 1000);
        }
      }, 500);
    }

    if (command.power !== deviceState.power) {
      deviceState.power = command.power;
      changed = true;
      // 1. SYNC CONSOLE (ON/OFF)
      logSync(deviceState.power, deviceState.temperature);
    }

    // Event end detection
    if (!deviceState.power && wasEventActive && wasPowerOn) {
      deviceState.isEventActive = false;
      if (deviceState.eventTemperature > 0) {
        deviceState.temperature = deviceState.eventTemperature;
        logEvent("end", deviceState.temperature);
      }
    }
    // Event start detection
    else if (
      deviceState.power &&
      !wasPowerOn &&
      now - deviceState.lastTempCommandTime < 2000
    ) {
      deviceState.isEventActive = true;
      deviceState.eventTemperature = deviceState.temperature;
      logEvent("on", deviceState.temperature);
    }
  }

  // TEMPERATURE COMMAND
  if (command.temp !== undefined) {
    // Block temperature changes when event is active (only event system can change temp)
    if (deviceState.isEventActive) {
      console.log(
        `🚫 [TEMP] Temperature change blocked - Event is active (Event temp: ${deviceState.eventTemperature}°C)`
      );
      console.log(`⚠️ [BUTTONS] +/- buttons disabled - Event is active`);
      return;
    }

    const pulseCount = command.temp;
    const previousTemp = deviceState.temperature;
    deviceState.lastTempCommandTime = now;

    // Always log temp change attempt (even if no change)
    if (pulseCount !== 0) {
      const absPulseCount = Math.abs(pulseCount);
      let tempChanged = false;

      if (pulseCount > 0 && deviceState.temperature < 30) {
        // Handle multiple pulses for increase
        const maxIncrease = Math.min(
          absPulseCount,
          30 - deviceState.temperature
        );
        deviceState.temperature = deviceState.temperature + maxIncrease;
        tempChanged = maxIncrease > 0;
        changed = tempChanged || changed;
        // 2. TEMP CHANGE CONSOLE (WITH PULSE)
        if (tempChanged) {
          logTempChange(previousTemp, deviceState.temperature, pulseCount);
        } else {
          logTempChange(previousTemp, previousTemp, pulseCount);
        }
      } else if (pulseCount < 0 && deviceState.temperature > 16) {
        // Handle multiple pulses for decrease
        const maxDecrease = Math.min(
          absPulseCount,
          deviceState.temperature - 16
        );
        deviceState.temperature = deviceState.temperature - maxDecrease;
        tempChanged = maxDecrease > 0;
        changed = tempChanged || changed;
        // 2. TEMP CHANGE CONSOLE (WITH PULSE)
        if (tempChanged) {
          logTempChange(previousTemp, deviceState.temperature, pulseCount);
        } else {
          logTempChange(previousTemp, previousTemp, pulseCount);
        }
      } else {
        // Pulse received but temp can't change (at limit)
        logTempChange(previousTemp, previousTemp, pulseCount);
      }
    }

    // Event start if power also ON
    if (
      command.power !== undefined &&
      command.power === true &&
      !deviceState.isEventActive
    ) {
      deviceState.isEventActive = true;
      deviceState.eventTemperature = deviceState.temperature;
      logEvent("on", deviceState.temperature);
    }
  }

  // Send state update
  if (changed) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const updateMessage = JSON.stringify({
      device_id: deviceState.deviceKey || SERIAL_NUMBER,
      temp: deviceState.temperature,
      power: deviceState.power ? 1 : 0,
      remote: 0,
    });
    ws.send(updateMessage);
  }
}

// ============================================
// EVENT STATUS HANDLER
// ============================================
function handleEventStatus(command) {
  const status = command.status || "";

  // Set event active state based on status
  if (status === "event created" || status === "event temp") {
    deviceState.isEventActive = true;
    console.log(`🚫 [BUTTONS] +/- buttons DISABLED - Event is active`);
    if (command.temperature !== undefined && command.temperature !== null) {
      const eventTemp = parseFloat(command.temperature);
      deviceState.eventTemperature = eventTemp;
      // Update device temperature to event temperature
      const previousTemp = deviceState.temperature;
      deviceState.temperature = eventTemp;
      // 3. EVENT CONSOLE
      logEvent(status, eventTemp);
      // Send state update to backend
      if (ws && ws.readyState === WebSocket.OPEN) {
        const updateMessage = JSON.stringify({
          device_id: deviceState.deviceKey || SERIAL_NUMBER,
          temp: deviceState.temperature,
          power: deviceState.power ? 1 : 0,
          remote: 0,
        });
        ws.send(updateMessage);
        console.log(
          `📊 [SYNC] Power: ${deviceState.power ? "ON" : "OFF"}, Temp: ${
            deviceState.temperature
          }°C`
        );
      }
    } else {
      // 3. EVENT CONSOLE
      logEvent(status);
    }
  } else if (status === "event end" || status === "disable") {
    deviceState.isEventActive = false;
    deviceState.eventTemperature = 0;
    console.log(`✅ [BUTTONS] +/- buttons ENABLED - Event disabled`);
    // 3. EVENT CONSOLE
    logEvent(status);
  } else if (status === "enable") {
    deviceState.isEventActive = true;
    console.log(`🚫 [BUTTONS] +/- buttons DISABLED - Event enabled`);
    // 3. EVENT CONSOLE
    logEvent(status);
  } else {
    // 3. EVENT CONSOLE
    logEvent(status);
  }
}

// ============================================
// LOCK STATE HANDLER
// ============================================
function handleLockState(command) {
  const wasLocked = deviceState.lockState;
  deviceState.lockState = command.locked || false;

  if (command.lockedTemperature !== undefined) {
    deviceState.lockedTemperature = command.lockedTemperature;
  }

  // 5. REMOTE LOCKED DEVICE CONSOLE
  if (deviceState.lockState && !wasLocked) {
    logRemoteLock(true, deviceState.lockedTemperature);
  } else if (!deviceState.lockState && wasLocked) {
    logRemoteLock(false);
  }
}

// ============================================
// ROOM TEMPERATURE HANDLER
// ============================================
function handleRoomTemperatureRequest() {
  if (!deviceState.power) {
    console.log(`⏸️ [ROOM_TEMP] Device is OFF, skipping room temp send`);
    return;
  }

  // Always send room temperature if it's set (hardcoded 33°C for testing)
  if (
    deviceState.roomTemperature !== null &&
    deviceState.roomTemperature !== undefined
  ) {
    // 6. ROOM TEMP CONSOLE
    logRoomTemp(deviceState.roomTemperature, deviceState.temperature);

    const roomTempMessage = JSON.stringify({
      device_id: deviceState.deviceKey || SERIAL_NUMBER,
      room_temp: deviceState.roomTemperature,
      temp: deviceState.temperature,
      power: deviceState.power ? 1 : 0,
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(roomTempMessage);
      console.log(
        `📤 [ROOM_TEMP] Sent to backend: ${deviceState.roomTemperature}°C`
      );
    } else {
      console.log(`⚠️ [ROOM_TEMP] WebSocket not connected, cannot send`);
    }
  } else {
    console.log(`⚠️ [ROOM_TEMP] Room temperature not set (null)`);
  }
}

// ============================================
// AUTOMATIC ROOM TEMPERATURE UPDATE (EVERY 5 MINUTES)
// ============================================
function startRoomTemperatureAutoUpdate() {
  // Clear existing interval if any
  stopRoomTemperatureAutoUpdate();

  // Send room temperature every 5 minutes (300000 ms) for alert testing
  // This simulates the backend requesting room temperature periodically
  roomTempInterval = setInterval(() => {
    if (deviceState.power && deviceState.isConnected) {
      // Keep room temperature constant (33°C) to trigger alert (no decrease)
      // Or you can increase it to simulate temperature not decreasing
      // For alert testing: constant temp = alert (temperature not decreasing)
      console.log(
        `⏰ [AUTO] 5 minutes passed - Sending room temp: ${deviceState.roomTemperature}°C`
      );
      handleRoomTemperatureRequest();
    } else {
      console.log(
        `⏸️ [AUTO] Device is OFF or disconnected, skipping auto room temp update`
      );
    }
  }, 5 * 60 * 1000); // 5 minutes = 300000 ms

  console.log(
    `🔄 [AUTO] Started automatic room temperature updates (every 5 minutes)`
  );
}

function stopRoomTemperatureAutoUpdate() {
  if (roomTempInterval) {
    clearInterval(roomTempInterval);
    roomTempInterval = null;
    console.log(`⏹️ [AUTO] Stopped automatic room temperature updates`);
  }
}

// ============================================
// INTERACTIVE COMMANDS
// ============================================
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function handleUserInput(input) {
  const parts = input.trim().split(" ");
  const command = parts[0].toLowerCase();

  switch (command) {
    case "temp":
      if (parts[1]) {
        const temp = parseFloat(parts[1]);
        if (temp >= 16 && temp <= 30) {
          const oldTemp = deviceState.temperature;
          deviceState.temperature = temp;
          const pulse = temp > oldTemp ? 1 : -1;
          logTempChange(oldTemp, temp, pulse);
          sendStateUpdate(false);
        }
      }
      break;

    case "power":
      if (parts[1] === "on") {
        deviceState.power = true;
        logSync(true, deviceState.temperature);
        sendStateUpdate(false);
        // Automatically send room temperature when power turns ON (for alert testing)
        if (deviceState.roomTemperature !== null) {
          setTimeout(() => {
            handleRoomTemperatureRequest();
            console.log(
              `🌡️ [AUTO] Room temp sent after power ON: ${deviceState.roomTemperature}°C`
            );
          }, 500);
        }
        // Start automatic room temperature updates when power turns ON
        if (deviceState.isConnected) {
          startRoomTemperatureAutoUpdate();
        }
      } else if (parts[1] === "off") {
        deviceState.power = false;
        logSync(false, deviceState.temperature);
        sendStateUpdate(false);
        // Stop automatic room temperature updates when power turns OFF
        stopRoomTemperatureAutoUpdate();
      }
      break;

    case "roomtemp":
      if (parts[1]) {
        const roomTemp = parseFloat(parts[1]);
        deviceState.roomTemperature = roomTemp;
        logRoomTemp(roomTemp, deviceState.temperature);
        handleRoomTemperatureRequest();
      }
      break;

    case "powershort":
      // Simulate power supply short: ON → OFF → ON
      if (deviceState.power) {
        deviceState.power = false;
        logPowerSupplyShort();
        sendStateUpdate(false);
        setTimeout(() => {
          deviceState.power = true;
          sendStateUpdate(false);
        }, 1000);
      }
      break;

    case "lock":
      if (!deviceState.lockState) {
        deviceState.lockState = true;
        deviceState.lockedTemperature = deviceState.temperature || 24;
        logRemoteLock(true, deviceState.lockedTemperature);
      }
      break;

    case "unlock":
      if (deviceState.lockState) {
        deviceState.lockState = false;
        deviceState.lockedTemperature = null;
        logRemoteLock(false);
      }
      break;

    case "exit":
      if (ws) ws.close();
      rl.close();
      process.exit(0);
      break;
  }
}

function sendStateUpdate(isRemote = false) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const updateMessage = JSON.stringify({
    device_id: deviceState.deviceKey || SERIAL_NUMBER,
    temp: deviceState.temperature,
    power: deviceState.power ? 1 : 0,
    remote: isRemote ? 1 : 0,
  });

  ws.send(updateMessage);
}

// Send POWER_UPDATE message to backend (matching ESP32 format)
function sendPowerUpdate() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  const message = JSON.stringify({
    type: "POWER_UPDATE",
    serial: SERIAL_NUMBER,
    power: deviceState.power ? 1 : 0,
  });
  ws.send(message);
}

// Send TEMP_UPDATE message to backend (matching ESP32 format)
function sendTempUpdate() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  const message = JSON.stringify({
    type: "TEMP_UPDATE",
    serial: SERIAL_NUMBER,
    temp: deviceState.temperature,
  });
  ws.send(message);
}

// Send LOCK_UPDATE message to backend (matching ESP32 format)
function sendLockUpdate() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  const message = JSON.stringify({
    type: "LOCK_UPDATE",
    serial: SERIAL_NUMBER,
    locked: deviceState.lockState ? 1 : 0,
  });
  ws.send(message);
}

// ============================================
// START SIMULATOR
// ============================================
console.log("\n🚀 ESP32 SIMULATOR\n");

connect();

rl.on("line", (input) => {
  handleUserInput(input);
});
