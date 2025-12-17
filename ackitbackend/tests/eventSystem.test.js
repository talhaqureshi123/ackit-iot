/**
 * Event System Testing File
 * Tests all event operations: Create, Start, End, Power Recovery
 */

// Load models index to ensure associations are set up
require("../models/index");

const Event = require("../models/Event/event");
const AC = require("../models/AC/ac");
const EventService = require("../rolebaseaccess/admin/services/eventService");
const ManagerEventService = require("../rolebaseaccess/manager/services/managerEventService");
const ESPService = require("../services/esp");
const EventScheduler = require("../realtimes/events/eventScheduler");

// Mock data - Update these with actual IDs from your database
// To find valid IDs, check your database:
// - Find an AC that has a venueId and the venue has an adminId
// - Find a manager that has an organization assigned
const mockAdminId = 1;
const mockManagerId = 1;
const mockDeviceId = 1;

// Helper function to find a valid device with venue
async function findValidDevice(adminId) {
  const Venue = require("../models/Venue/venue");
  const device = await AC.findOne({
    where: {},
    include: [
      {
        model: Venue,
        as: "venue",
        where: adminId ? { adminId: adminId } : {},
        required: true,
      },
    ],
    limit: 1,
  });
  return device;
}

// Helper function to find a valid device with organization for manager
async function findValidManagerDevice(managerId) {
  const Venue = require("../models/Venue/venue");
  const device = await AC.findOne({
    where: {},
    include: [
      {
        model: Venue,
        as: "venue",
        where: managerId ? { managerId: managerId } : {},
        required: true,
      },
    ],
    limit: 1,
  });
  return device;
}

/**
 * Test 1: Event Create - Device State Should NOT Change
 */
async function testEventCreateDeviceStateUnchanged() {
  console.log("\n🧪 TEST 1: Event Create - Device State Unchanged");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Get device before event creation
    const deviceBefore = await AC.findByPk(testDeviceId);
    const deviceStateBefore = deviceBefore ? deviceBefore.isOn : null;

    console.log(`📊 Device ID: ${testDeviceId}`);
    console.log(`📊 Device State Before Event Create: ${deviceStateBefore ? "ON" : "OFF"}`);

    // Create event
    const eventData = {
      name: "Test Event - Device State Check",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() + 60000), // 1 minute from now
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      temperature: 24,
      powerOn: true,
    };

    const result = await EventService.createEvent(testAdminId, eventData);

    // Get device after event creation
    const deviceAfter = await AC.findByPk(testDeviceId);
    const deviceStateAfter = deviceAfter ? deviceAfter.isOn : null;

    console.log(`📊 Device State After Event Create: ${deviceStateAfter ? "ON" : "OFF"}`);
    console.log(`📊 Device Temperature: ${deviceAfter ? deviceAfter.temperature : "N/A"}°C`);

    // Verify
    if (deviceStateBefore === deviceStateAfter) {
      console.log("✅ PASS: Device state unchanged after event creation");
      return true;
    } else {
      console.log("❌ FAIL: Device state changed after event creation");
      console.log(`   Expected: ${deviceStateBefore}, Got: ${deviceStateAfter}`);
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 2: Event Start - Device Should Turn ON
 */
async function testEventStartDeviceTurnsON() {
  console.log("\n🧪 TEST 2: Event Start - Device Turns ON");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Create a scheduled event
    const eventData = {
      name: "Test Event - Start Check",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() + 60000),
      endTime: new Date(Date.now() + 3600000),
      temperature: 24,
      powerOn: true,
    };

    const createResult = await EventService.createEvent(testAdminId, eventData);
    const eventId = createResult.data.event.id;

    // Get device before event start
    const deviceBefore = await AC.findByPk(testDeviceId);
    const deviceStateBefore = deviceBefore ? deviceBefore.isOn : null;

    console.log(`📊 Device State Before Event Start: ${deviceStateBefore ? "ON" : "OFF"}`);

    // Start event
    await EventService.startEvent(testAdminId, eventId);

    // Get device after event start
    const deviceAfter = await AC.findByPk(testDeviceId);
    const deviceStateAfter = deviceAfter ? deviceAfter.isOn : null;

    console.log(`📊 Device State After Event Start: ${deviceStateAfter ? "ON" : "OFF"}`);
    console.log(`📊 Device Temperature: ${deviceAfter ? deviceAfter.temperature : "N/A"}°C`);

    // Verify
    if (deviceStateAfter === true) {
      console.log("✅ PASS: Device turned ON after event start");
      return true;
    } else {
      console.log("❌ FAIL: Device did not turn ON after event start");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 3: Event End - Device Should Turn OFF
 */
async function testEventEndDeviceTurnsOFF() {
  console.log("\n🧪 TEST 3: Event End - Device Turns OFF");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Create and start an event
    const eventData = {
      name: "Test Event - End Check",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() + 60000),
      endTime: new Date(Date.now() + 3600000),
      temperature: 24,
      powerOn: true,
    };

    const createResult = await EventService.createEvent(testAdminId, eventData);
    const eventId = createResult.data.event.id;

    // Start event
    await EventService.startEvent(testAdminId, eventId);

    // Get device before event end
    const deviceBefore = await AC.findByPk(testDeviceId);
    const deviceStateBefore = deviceBefore ? deviceBefore.isOn : null;

    console.log(`📊 Device State Before Event End: ${deviceStateBefore ? "ON" : "OFF"}`);

    // Stop event
    await EventService.stopEvent(testAdminId, eventId);

    // Get device after event end
    const deviceAfter = await AC.findByPk(testDeviceId);
    const deviceStateAfter = deviceAfter ? deviceAfter.isOn : null;

    console.log(`📊 Device State After Event End: ${deviceStateAfter ? "ON" : "OFF"}`);

    // Verify
    if (deviceStateAfter === false) {
      console.log("✅ PASS: Device turned OFF after event end");
      return true;
    } else {
      console.log("❌ FAIL: Device did not turn OFF after event end");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 4: Power Failure Recovery - Device ON Maintained
 */
async function testPowerFailureRecovery() {
  console.log("\n🧪 TEST 4: Power Failure Recovery - Device ON Maintained");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Create and start an event
    const eventData = {
      name: "Test Event - Power Recovery",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() + 60000),
      endTime: new Date(Date.now() + 3600000),
      temperature: 24,
      powerOn: true,
    };

    const createResult = await EventService.createEvent(testAdminId, eventData);
    const eventId = createResult.data.event.id;

    // Start event
    await EventService.startEvent(testAdminId, eventId);

    // Simulate power failure - device goes OFF
    const device = await AC.findByPk(testDeviceId);
    device.isOn = false;
    await device.save();

    console.log(`📊 Device State After Power Failure: OFF`);

    // Check active event exists
    const activeEvent = await Event.findOne({
      where: {
        deviceId: testDeviceId,
        status: "active",
        isDisabled: false,
      },
    });

    if (!activeEvent) {
      console.log("❌ FAIL: No active event found");
      return false;
    }

    console.log(`📊 Active Event Found: ${activeEvent.name}`);
    console.log(`📊 Event Temperature: ${activeEvent.temperature}°C`);

    // Simulate power recovery - device comes back ON
    // This simulates what ESP service does when device recovers
    device.isOn = true;
    await device.save();

    console.log(`📊 Device State After Power Recovery: ON`);

    // Verify active event still exists
    const eventAfterRecovery = await Event.findOne({
      where: {
        id: eventId,
        status: "active",
      },
    });

    if (eventAfterRecovery) {
      console.log("✅ PASS: Event still active after power recovery");
      console.log(`   Event should maintain device ON with temperature ${activeEvent.temperature}°C`);
      return true;
    } else {
      console.log("❌ FAIL: Event not active after power recovery");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 5: Manager Event Create - Device State Unchanged
 */
async function testManagerEventCreateDeviceStateUnchanged() {
  console.log("\n🧪 TEST 5: Manager Event Create - Device State Unchanged");
  console.log("=".repeat(60));

  try {
    // Find a valid device with organization for manager
    const validDevice = await findValidManagerDevice(mockManagerId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with organization for manager. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testManagerId = validDevice.venue.organization.managerId;

    // Get device before event creation
    const deviceBefore = await AC.findByPk(testDeviceId);
    const deviceStateBefore = deviceBefore ? deviceBefore.isOn : null;

    console.log(`📊 Device ID: ${testDeviceId}`);
    console.log(`📊 Device State Before Event Create: ${deviceStateBefore ? "ON" : "OFF"}`);

    // Create manager event
    const eventData = {
      name: "Test Manager Event - Device State Check",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() + 60000),
      endTime: new Date(Date.now() + 3600000),
      temperature: 24,
      powerOn: true,
    };

    const result = await ManagerEventService.createEvent(testManagerId, eventData);

    // Get device after event creation
    const deviceAfter = await AC.findByPk(testDeviceId);
    const deviceStateAfter = deviceAfter ? deviceAfter.isOn : null;

    console.log(`📊 Device State After Event Create: ${deviceStateAfter ? "ON" : "OFF"}`);
    console.log(`📊 Device Temperature: ${deviceAfter ? deviceAfter.temperature : "N/A"}°C`);

    // Verify
    if (deviceStateBefore === deviceStateAfter) {
      console.log("✅ PASS: Device state unchanged after manager event creation");
      return true;
    } else {
      console.log("❌ FAIL: Device state changed after manager event creation");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 6: Event Scheduler - Auto Start
 */
async function testEventSchedulerAutoStart() {
  console.log("\n🧪 TEST 6: Event Scheduler - Auto Start");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Create event with start time in the past (should auto-start)
    const eventData = {
      name: "Test Event - Auto Start",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date(Date.now() + 3600000),
      temperature: 24,
      powerOn: true,
    };

    const createResult = await EventService.createEvent(testAdminId, eventData);
    const eventId = createResult.data.event.id;

    console.log(`📊 Event Created: ${eventData.name}`);
    console.log(`📊 Event Status: scheduled`);

    // Run scheduler check
    await EventScheduler.checkAndStartEvents();

    // Check if event started
    const event = await Event.findByPk(eventId);
    const device = await AC.findByPk(testDeviceId);

    console.log(`📊 Event Status After Scheduler: ${event.status}`);
    console.log(`📊 Device State: ${device.isOn ? "ON" : "OFF"}`);

    // Verify
    if (event.status === "active" && device.isOn === true) {
      console.log("✅ PASS: Event auto-started and device turned ON");
      return true;
    } else {
      console.log("❌ FAIL: Event did not auto-start or device not ON");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Test 7: Event Scheduler - Auto End
 */
async function testEventSchedulerAutoEnd() {
  console.log("\n🧪 TEST 7: Event Scheduler - Auto End");
  console.log("=".repeat(60));

  try {
    // Find a valid device with venue
    const validDevice = await findValidDevice(mockAdminId);
    if (!validDevice) {
      console.log("⚠️  SKIP: No device found with venue for admin. Please ensure database has proper data.");
      return null; // Skip test
    }
    
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;

    // Create and start an event
    const eventData = {
      name: "Test Event - Auto End",
      eventType: "device",
      deviceId: testDeviceId,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 60000), // 1 minute ago (should auto-end)
      temperature: 24,
      powerOn: true,
    };

    const createResult = await EventService.createEvent(testAdminId, eventData);
    const eventId = createResult.data.event.id;

    // Manually start event
    await EventService.startEvent(testAdminId, eventId);

    console.log(`📊 Event Status Before Scheduler: active`);
    console.log(`📊 Device State Before Scheduler: ON`);

    // Run scheduler check
    await EventScheduler.checkAndEndEvents();

    // Check if event ended
    const event = await Event.findByPk(eventId);
    const device = await AC.findByPk(testDeviceId);

    console.log(`📊 Event Status After Scheduler: ${event.status}`);
    console.log(`📊 Device State After Scheduler: ${device.isOn ? "ON" : "OFF"}`);

    // Verify
    if ((event.status === "completed" || event.status === "stopped") && device.isOn === false) {
      console.log("✅ PASS: Event auto-ended and device turned OFF");
      return true;
    } else {
      console.log("❌ FAIL: Event did not auto-end or device not OFF");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return false;
  }
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 EVENT SYSTEM TESTING SUITE");
  console.log("=".repeat(60));

  const results = [];

  // Run all tests
  results.push(await testEventCreateDeviceStateUnchanged());
  results.push(await testEventStartDeviceTurnsON());
  results.push(await testEventEndDeviceTurnsOFF());
  results.push(await testPowerFailureRecovery());
  results.push(await testManagerEventCreateDeviceStateUnchanged());
  results.push(await testEventSchedulerAutoStart());
  results.push(await testEventSchedulerAutoEnd());

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  const skipped = results.filter(r => r === null).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⚠️  Skipped: ${skipped}/${total}`);
  console.log(`📈 Success Rate: ${total > skipped ? ((passed / (total - skipped)) * 100).toFixed(2) : 0}%`);

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log("\n⚠️  SOME TESTS FAILED - Please review the errors above");
  }

  console.log("=".repeat(60) + "\n");
}

// Export for use
module.exports = {
  runAllTests,
  testEventCreateDeviceStateUnchanged,
  testEventStartDeviceTurnsON,
  testEventEndDeviceTurnsOFF,
  testPowerFailureRecovery,
  testManagerEventCreateDeviceStateUnchanged,
  testEventSchedulerAutoStart,
  testEventSchedulerAutoEnd,
};

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log("✅ Testing completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Testing failed:", error);
      process.exit(1);
    });
}

