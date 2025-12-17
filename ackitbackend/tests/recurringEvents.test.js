/**
 * Recurring Events Testing File
 * Tests recurring event operations: Create, Scheduler, Instance Creation
 */

// Load models index to ensure associations are set up
require("../models/index");

const Event = require("../models/Event/event");
const AC = require("../models/AC/ac");
const EventService = require("../rolebaseaccess/admin/services/eventService");
const ManagerEventService = require("../rolebaseaccess/manager/services/managerEventService");
const EventScheduler = require("../realtimes/events/eventScheduler");
const timezoneUtils = require("../utils/timezone");

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

// Helper function to get today's date in PKT
function getTodayPKT() {
  const pktNow = timezoneUtils.getCurrentPakistanTime();
  const today = new Date(pktNow);
  today.setHours(0, 0, 0, 0);
  return today;
}

// Helper function to get date string (YYYY-MM-DD)
function getDateString(date) {
  return date.toISOString().split("T")[0];
}

// Helper function to get day of week (0=Sunday, 1=Monday, etc.)
function getDayOfWeek(date) {
  return date.getDay();
}

// Test counter
let testCount = 0;
let passCount = 0;
let failCount = 0;

function logTest(testName, passed, message = "") {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`✅ TEST ${testCount}: ${testName} - PASSED`);
  } else {
    failCount++;
    console.log(`❌ TEST ${testCount}: ${testName} - FAILED`);
    if (message) console.log(`   Error: ${message}`);
  }
}

async function runTests() {
  console.log("=".repeat(80));
  console.log("🔄 RECURRING EVENTS TEST SUITE");
  console.log("=".repeat(80));
  console.log();

  try {
    // Find valid devices
    console.log("📋 Finding valid devices...");
    const validDevice = await findValidDevice();
    if (!validDevice) {
      console.log(
        "❌ ERROR: No valid device found for admin. Please ensure database has AC devices with venues."
      );
      return;
    }
    const testDeviceId = validDevice.id;
    const testAdminId = validDevice.venue.adminId;
    console.log(
      `✅ Found device: ${validDevice.serialNumber} (ID: ${testDeviceId}, Admin: ${testAdminId})`
    );
    console.log();

    // Find valid manager device
    const validManagerDevice = await findValidManagerDevice();
    let testManagerId = null;
    if (validManagerDevice && validManagerDevice.venue.managerId) {
      testManagerId = validManagerDevice.venue.managerId;
      console.log(
        `✅ Found manager device: ${validManagerDevice.serialNumber} (ID: ${validManagerDevice.id}, Manager: ${testManagerId})`
      );
    } else {
      console.log(
        "⚠️  No manager device found. Manager tests will be skipped."
      );
    }
    console.log();

    // ==================== TEST 1: Admin Recurring Event Creation ====================
    console.log("=".repeat(80));
    console.log("TEST 1: Admin Recurring Event Creation");
    console.log("=".repeat(80));
    try {
      const today = getTodayPKT();
      const startDate = getDateString(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7); // 7 days from today
      const endDateStr = getDateString(endDate);
      const todayDayOfWeek = getDayOfWeek(today);

      const recurringEventData = {
        name: "Test Recurring Event - Admin",
        eventType: "device",
        deviceId: testDeviceId,
        temperature: 22,
        isRecurring: true,
        recurringType: "weekly",
        daysOfWeek: [todayDayOfWeek], // Today's day
        recurringStartDate: startDate,
        recurringEndDate: endDateStr,
        timeStart: "10:00:00",
        timeEnd: "18:00:00",
        // For recurring events, startTime and endTime are optional (will be calculated)
        startTime: new Date(`${startDate}T10:00:00`).toISOString(),
        endTime: new Date(`${startDate}T18:00:00`).toISOString(),
      };

      const result = await EventService.createEvent(
        testAdminId,
        recurringEventData
      );

      if (result.success && result.data.event) {
        const event = result.data.event;
        if (
          event.isRecurring === true &&
          event.recurringType === "weekly" &&
          Array.isArray(event.daysOfWeek) &&
          event.daysOfWeek.includes(todayDayOfWeek) &&
          event.timeStart === "10:00:00" &&
          event.timeEnd === "18:00:00"
        ) {
          logTest("Admin Recurring Event Creation", true);
          console.log(`   Event ID: ${event.id}`);
          console.log(`   Days: ${event.daysOfWeek.join(", ")}`);
          console.log(`   Time: ${event.timeStart} - ${event.timeEnd}`);
          console.log(
            `   Date Range: ${event.recurringStartDate} to ${event.recurringEndDate}`
          );

          // Cleanup
          await event.destroy();
        } else {
          logTest(
            "Admin Recurring Event Creation",
            false,
            "Event fields don't match"
          );
        }
      } else {
        logTest(
          "Admin Recurring Event Creation",
          false,
          "Event creation failed"
        );
      }
    } catch (error) {
      logTest("Admin Recurring Event Creation", false, error.message);
    }
    console.log();

    // ==================== TEST 2: Recurring Event Validation ====================
    console.log("=".repeat(80));
    console.log("TEST 2: Recurring Event Validation (Missing Fields)");
    console.log("=".repeat(80));
    try {
      const invalidEventData = {
        name: "Invalid Recurring Event",
        eventType: "device",
        deviceId: testDeviceId,
        temperature: 22,
        isRecurring: true,
        // Missing daysOfWeek, recurringStartDate, etc.
      };

      try {
        await EventService.createEvent(testAdminId, invalidEventData);
        logTest(
          "Recurring Event Validation",
          false,
          "Should have thrown error for missing fields"
        );
      } catch (error) {
        if (
          error.message.includes("daysOfWeek") ||
          error.message.includes("required")
        ) {
          logTest("Recurring Event Validation", true);
          console.log(`   Correctly rejected: ${error.message}`);
        } else {
          logTest(
            "Recurring Event Validation",
            false,
            `Wrong error: ${error.message}`
          );
        }
      }
    } catch (error) {
      logTest("Recurring Event Validation", false, error.message);
    }
    console.log();

    // ==================== TEST 3: Manager Recurring Event Creation ====================
    if (testManagerId && validManagerDevice) {
      console.log("=".repeat(80));
      console.log("TEST 3: Manager Recurring Event Creation");
      console.log("=".repeat(80));
      try {
        const today = getTodayPKT();
        const startDate = getDateString(today);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        const endDateStr = getDateString(endDate);
        const todayDayOfWeek = getDayOfWeek(today);

        const recurringEventData = {
          name: "Test Recurring Event - Manager",
          eventType: "device",
          deviceId: validManagerDevice.id,
          temperature: 24,
          isRecurring: true,
          recurringType: "weekly",
          daysOfWeek: [todayDayOfWeek],
          recurringStartDate: startDate,
          recurringEndDate: endDateStr,
          timeStart: "09:00:00",
          timeEnd: "17:00:00",
          startTime: new Date(`${startDate}T09:00:00`).toISOString(),
          endTime: new Date(`${startDate}T17:00:00`).toISOString(),
        };

        const result = await ManagerEventService.createEvent(
          testManagerId,
          recurringEventData
        );

        if (result.success && result.data.event) {
          const event = result.data.event;
          if (
            event.isRecurring === true &&
            event.recurringType === "weekly" &&
            event.createdBy === "manager"
          ) {
            logTest("Manager Recurring Event Creation", true);
            console.log(`   Event ID: ${event.id}`);

            // Cleanup
            await event.destroy();
          } else {
            logTest(
              "Manager Recurring Event Creation",
              false,
              "Event fields don't match"
            );
          }
        } else {
          logTest(
            "Manager Recurring Event Creation",
            false,
            "Event creation failed"
          );
        }
      } catch (error) {
        logTest("Manager Recurring Event Creation", false, error.message);
      }
      console.log();
    } else {
      console.log("=".repeat(80));
      console.log(
        "TEST 3: Manager Recurring Event Creation - SKIPPED (No manager device)"
      );
      console.log("=".repeat(80));
      console.log();
    }

    // ==================== TEST 4: Scheduler Instance Creation ====================
    console.log("=".repeat(80));
    console.log("TEST 4: Scheduler Instance Creation");
    console.log("=".repeat(80));
    try {
      const today = getTodayPKT();
      const startDate = getDateString(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = getDateString(endDate);
      const todayDayOfWeek = getDayOfWeek(today);

      // Create a recurring event template
      const recurringEventData = {
        name: "Test Recurring Event for Scheduler",
        eventType: "device",
        deviceId: testDeviceId,
        temperature: 23,
        isRecurring: true,
        recurringType: "weekly",
        daysOfWeek: [todayDayOfWeek], // Today's day
        recurringStartDate: startDate,
        recurringEndDate: endDateStr,
        timeStart: "11:00:00",
        timeEnd: "19:00:00",
        startTime: new Date(`${startDate}T11:00:00`).toISOString(),
        endTime: new Date(`${startDate}T19:00:00`).toISOString(),
      };

      const result = await EventService.createEvent(
        testAdminId,
        recurringEventData
      );
      const templateEvent = result.data.event;
      console.log(`   Created template event ID: ${templateEvent.id}`);

      // Count instances before scheduler
      const instancesBefore = await Event.count({
        where: {
          parentRecurringEventId: templateEvent.id,
        },
      });
      console.log(`   Instances before scheduler: ${instancesBefore}`);

      // Run scheduler
      await EventScheduler.checkAndCreateRecurringInstances();

      // Count instances after scheduler
      const instancesAfter = await Event.count({
        where: {
          parentRecurringEventId: templateEvent.id,
        },
      });
      console.log(`   Instances after scheduler: ${instancesAfter}`);

      // Check if instance was created
      if (instancesAfter > instancesBefore) {
        const instance = await Event.findOne({
          where: {
            parentRecurringEventId: templateEvent.id,
          },
          order: [["createdAt", "DESC"]],
        });

        if (instance) {
          logTest("Scheduler Instance Creation", true);
          console.log(`   Instance ID: ${instance.id}`);
          console.log(`   Instance Start Time: ${instance.startTime}`);
          console.log(`   Instance End Time: ${instance.endTime}`);
          console.log(`   Instance Status: ${instance.status}`);

          // Cleanup
          await instance.destroy();
        } else {
          logTest("Scheduler Instance Creation", false, "Instance not found");
        }
      } else {
        logTest(
          "Scheduler Instance Creation",
          false,
          "No instance created (may already exist)"
        );
      }

      // Cleanup template
      await templateEvent.destroy();
    } catch (error) {
      logTest("Scheduler Instance Creation", false, error.message);
      console.error("   Full error:", error);
    }
    console.log();

    // ==================== TEST 5: Multiple Days Recurring Event ====================
    console.log("=".repeat(80));
    console.log("TEST 5: Multiple Days Recurring Event (Mon-Fri)");
    console.log("=".repeat(80));
    try {
      const today = getTodayPKT();
      const startDate = getDateString(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 14);
      const endDateStr = getDateString(endDate);

      const recurringEventData = {
        name: "Test Recurring Event - Mon-Fri",
        eventType: "device",
        deviceId: testDeviceId,
        temperature: 25,
        isRecurring: true,
        recurringType: "weekly",
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        recurringStartDate: startDate,
        recurringEndDate: endDateStr,
        timeStart: "08:00:00",
        timeEnd: "16:00:00",
        startTime: new Date(`${startDate}T08:00:00`).toISOString(),
        endTime: new Date(`${startDate}T16:00:00`).toISOString(),
      };

      const result = await EventService.createEvent(
        testAdminId,
        recurringEventData
      );

      if (result.success && result.data.event) {
        const event = result.data.event;
        if (
          event.isRecurring === true &&
          Array.isArray(event.daysOfWeek) &&
          event.daysOfWeek.length === 5 &&
          event.daysOfWeek.includes(1) && // Monday
          event.daysOfWeek.includes(5) // Friday
        ) {
          logTest("Multiple Days Recurring Event", true);
          console.log(`   Event ID: ${event.id}`);
          console.log(`   Days: ${event.daysOfWeek.join(", ")} (Mon-Fri)`);

          // Cleanup
          await event.destroy();
        } else {
          logTest(
            "Multiple Days Recurring Event",
            false,
            "Event days don't match"
          );
        }
      } else {
        logTest(
          "Multiple Days Recurring Event",
          false,
          "Event creation failed"
        );
      }
    } catch (error) {
      logTest("Multiple Days Recurring Event", false, error.message);
    }
    console.log();

    // ==================== TEST 6: Invalid Days Validation ====================
    console.log("=".repeat(80));
    console.log("TEST 6: Invalid Days Validation");
    console.log("=".repeat(80));
    try {
      const today = getTodayPKT();
      const startDate = getDateString(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = getDateString(endDate);

      const invalidEventData = {
        name: "Invalid Days Event",
        eventType: "device",
        deviceId: testDeviceId,
        temperature: 22,
        isRecurring: true,
        recurringType: "weekly",
        daysOfWeek: [1, 2, 10], // Invalid: 10 is not a valid day
        recurringStartDate: startDate,
        recurringEndDate: endDateStr,
        timeStart: "10:00:00",
        timeEnd: "18:00:00",
        startTime: new Date(`${startDate}T10:00:00`).toISOString(),
        endTime: new Date(`${startDate}T18:00:00`).toISOString(),
      };

      try {
        await EventService.createEvent(testAdminId, invalidEventData);
        logTest(
          "Invalid Days Validation",
          false,
          "Should have thrown error for invalid days"
        );
      } catch (error) {
        if (
          error.message.includes("daysOfWeek") ||
          error.message.includes("0-6")
        ) {
          logTest("Invalid Days Validation", true);
          console.log(`   Correctly rejected: ${error.message}`);
        } else {
          logTest(
            "Invalid Days Validation",
            false,
            `Wrong error: ${error.message}`
          );
        }
      }
    } catch (error) {
      logTest("Invalid Days Validation", false, error.message);
    }
    console.log();

    // ==================== SUMMARY ====================
    console.log("=".repeat(80));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${testCount}`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(
      `📈 Success Rate: ${
        testCount > 0 ? ((passCount / testCount) * 100).toFixed(2) : 0
      }%`
    );
    console.log("=".repeat(80));

    if (failCount === 0) {
      console.log("🎉 All tests passed!");
    } else {
      console.log("⚠️  Some tests failed. Please review the errors above.");
    }

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ FATAL ERROR:", error);
    process.exit(1);
  }
}

// Run tests
runTests();
