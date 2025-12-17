/**
 * Check remaining events after deletion
 * This script will show all events and their relationships
 */

const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../environment/.env"),
});

// Load models with associations
require("../models/index");

const sequelize = require("../config/database/postgresql");
const Event = require("../models/Event/event");
const Organization = require("../models/Organization/organization");
const AC = require("../models/AC/ac");
const Venue = require("../models/Venue/venue");

async function checkRemainingEvents() {
  console.log("🔍 Checking Remaining Events");
  console.log("=".repeat(60));

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Get all events
    const allEvents = await Event.findAll({
      order: [["createdAt", "DESC"]],
    });

    console.log(`📊 Total Events: ${allEvents.length}\n`);

    // Get all existing organizations
    const organizations = await Organization.findAll({
      attributes: ["id", "name"],
    });
    const orgIds = new Set(organizations.map((o) => o.id));

    // Get all existing ACs
    const acs = await AC.findAll({
      attributes: ["id", "name"],
    });
    const acIds = new Set(acs.map((ac) => ac.id));

    // Show what exists
    console.log(`📊 Existing Organizations: ${organizations.length}`);
    organizations.forEach((org) => {
      console.log(`   - ID: ${org.id}, Name: "${org.name}"`);
    });
    console.log(`📊 Existing AC Devices: ${acs.length}`);
    if (acs.length <= 10) {
      acs.forEach((ac) => {
        console.log(`   - ID: ${ac.id}, Name: "${ac.name}"`);
      });
    } else {
      console.log(`   (Showing first 10 of ${acs.length})`);
      acs.slice(0, 10).forEach((ac) => {
        console.log(`   - ID: ${ac.id}, Name: "${ac.name}"`);
      });
    }
    console.log();

    // Categorize events
    const orphanedEvents = [];
    const validEvents = [];
    const eventsWithNullTargets = [];

    allEvents.forEach((event) => {
      const eventData = {
        id: event.id,
        name: event.name,
        eventType: event.eventType,
        organizationId: event.organizationId,
        deviceId: event.deviceId,
        parentAdminEventId: event.parentAdminEventId,
        createdBy: event.createdBy,
        status: event.status,
      };

      // Check if event has null targets
      if (
        (!event.organizationId && event.eventType === "organization") ||
        (!event.deviceId && event.eventType === "device")
      ) {
        eventsWithNullTargets.push(eventData);
      }
      // Check if event references non-existent entities
      else if (event.organizationId && !orgIds.has(event.organizationId)) {
        orphanedEvents.push({
          ...eventData,
          reason: `Organization ${event.organizationId} does not exist`,
        });
      } else if (event.deviceId && !acIds.has(event.deviceId)) {
        orphanedEvents.push({
          ...eventData,
          reason: `AC Device ${event.deviceId} does not exist`,
        });
      } else {
        validEvents.push(eventData);
      }
    });

    console.log(`✅ Valid Events: ${validEvents.length}`);
    console.log(`❌ Orphaned Events: ${orphanedEvents.length}`);
    console.log(`⚠️  Events with Null Targets: ${eventsWithNullTargets.length}\n`);

    if (orphanedEvents.length > 0) {
      console.log("📋 Orphaned Events (should be deleted):");
      console.log("-".repeat(60));
      orphanedEvents.forEach((event, index) => {
        console.log(`${index + 1}. Event ID: ${event.id}`);
        console.log(`   Name: ${event.name}`);
        console.log(`   Type: ${event.eventType}`);
        console.log(`   Organization ID: ${event.organizationId || "N/A"}`);
        console.log(`   Device ID: ${event.deviceId || "N/A"}`);
        console.log(`   Parent Event ID: ${event.parentAdminEventId || "N/A"}`);
        console.log(`   Created By: ${event.createdBy}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Reason: ${event.reason}`);
        console.log();
      });
    }

    if (eventsWithNullTargets.length > 0) {
      console.log("⚠️  Events with Null Targets:");
      console.log("-".repeat(60));
      eventsWithNullTargets.forEach((event, index) => {
        console.log(`${index + 1}. Event ID: ${event.id}`);
        console.log(`   Name: ${event.name}`);
        console.log(`   Type: ${event.eventType}`);
        console.log(`   Organization ID: ${event.organizationId || "NULL"}`);
        console.log(`   Device ID: ${event.deviceId || "NULL"}`);
        console.log(`   Parent Event ID: ${event.parentAdminEventId || "N/A"}`);
        console.log(`   Created By: ${event.createdBy}`);
        console.log(`   Status: ${event.status}`);
        console.log();
      });
    }

    // Check for events with parentAdminEventId pointing to non-existent events
    const eventIds = new Set(allEvents.map((e) => e.id));
    const eventsWithOrphanedParents = allEvents.filter(
      (event) =>
        event.parentAdminEventId &&
        !eventIds.has(event.parentAdminEventId)
    );

    if (eventsWithOrphanedParents.length > 0) {
      console.log("⚠️  Events with Orphaned Parent Events:");
      console.log("-".repeat(60));
      eventsWithOrphanedParents.forEach((event, index) => {
        console.log(`${index + 1}. Event ID: ${event.id}`);
        console.log(`   Name: ${event.name}`);
        console.log(`   Parent Admin Event ID: ${event.parentAdminEventId} (does not exist)`);
        console.log(`   Organization ID: ${event.organizationId || "N/A"}`);
        console.log(`   Device ID: ${event.deviceId || "N/A"}`);
        console.log();
      });
    }

    // Show breakdown by organization/device
    console.log("\n📊 Event Breakdown by Organization:");
    console.log("-".repeat(60));
    const eventsByOrg = {};
    allEvents.forEach((event) => {
      const key = event.organizationId
        ? `Org ${event.organizationId}`
        : event.deviceId
        ? `AC ${event.deviceId}`
        : "Unknown";
      if (!eventsByOrg[key]) {
        eventsByOrg[key] = [];
      }
      eventsByOrg[key].push({
        id: event.id,
        name: event.name,
        eventType: event.eventType,
        status: event.status,
      });
    });

    Object.keys(eventsByOrg).forEach((key) => {
      const orgName =
        key.startsWith("Org ") && organizations.find((o) => o.id === parseInt(key.split(" ")[1]))
          ? ` (${organizations.find((o) => o.id === parseInt(key.split(" ")[1])).name})`
          : key.startsWith("AC ") && acs.find((a) => a.id === parseInt(key.split(" ")[1]))
          ? ` (${acs.find((a) => a.id === parseInt(key.split(" ")[1])).name})`
          : "";
      console.log(`${key}${orgName}: ${eventsByOrg[key].length} events`);
      if (eventsByOrg[key].length <= 5) {
        eventsByOrg[key].forEach((e) => {
          console.log(`   - Event ${e.id}: ${e.name} (${e.eventType}, ${e.status})`);
        });
      } else {
        console.log(`   (Showing first 5 of ${eventsByOrg[key].length})`);
        eventsByOrg[key].slice(0, 5).forEach((e) => {
          console.log(`   - Event ${e.id}: ${e.name} (${e.eventType}, ${e.status})`);
        });
      }
      console.log();
    });

    // Summary
    console.log("\n📊 Summary:");
    console.log(`Total Events: ${allEvents.length}`);
    console.log(`Valid Events: ${validEvents.length}`);
    console.log(`Orphaned Events (need cleanup): ${orphanedEvents.length}`);
    console.log(`Events with Null Targets: ${eventsWithNullTargets.length}`);
    console.log(`Events with Orphaned Parents: ${eventsWithOrphanedParents.length}`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkRemainingEvents();

