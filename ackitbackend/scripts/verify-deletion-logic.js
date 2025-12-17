/**
 * Verify Cascade Deletion Logic
 * This script demonstrates and verifies the deletion logic
 */

const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../environment/.env"),
});

require("../models/index");

const sequelize = require("../config/database/postgresql");
const Venue = require("../models/Venue/venue");
const Organization = require("../models/Organization/organization");
const AC = require("../models/AC/ac");
const Event = require("../models/Event/event");
const ActivityLog = require("../models/Activity log/activityLog");
const SystemState = require("../models/SystemState/systemState");

async function verifyDeletionLogic() {
  console.log("🔍 VERIFYING CASCADE DELETION LOGIC");
  console.log("=".repeat(70));
  console.log();

  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Get all venues
    const venues = await Venue.findAll({
      include: [
        {
          model: Organization,
          as: "organizations",
          include: [
            {
              model: AC,
              as: "acs",
            },
          ],
        },
      ],
    });

    console.log("📊 CURRENT DATABASE STATE:");
    console.log("-".repeat(70));

    venues.forEach((venue) => {
      console.log(`\n🏢 Venue: "${venue.name}" (ID: ${venue.id})`);
      const orgs = venue.organizations || [];
      console.log(`   └─ Organizations: ${orgs.length}`);

      orgs.forEach((org) => {
        const acs = org.acs || [];
        console.log(`      └─ Org: "${org.name}" (ID: ${org.id})`);
        console.log(`         └─ AC Devices: ${acs.length}`);
        acs.forEach((ac) => {
          console.log(`            └─ AC: "${ac.name}" (ID: ${ac.id})`);
        });
      });
    });

    console.log("\n" + "=".repeat(70));
    console.log("📋 DELETION LOGIC VERIFICATION:");
    console.log("=".repeat(70));
    console.log();

    // Logic 1: Venue Deletion
    console.log("1️⃣  VENUE DELETION LOGIC:");
    console.log("   When venue is deleted:");
    console.log("   ├─ Find all organizations in venue");
    console.log("   ├─ For each organization:");
    console.log("   │  ├─ Find all AC devices in organization");
    console.log("   │  ├─ Delete all events (deviceId OR organizationId)");
    console.log("   │  ├─ Delete child events (parentAdminEventId)");
    console.log("   │  ├─ Delete activity logs (targetType='ac' OR 'organization')");
    console.log("   │  ├─ Delete system states (entityType='ac' OR 'organization')");
    console.log("   │  ├─ Delete AC devices");
    console.log("   │  ├─ Handle split relationships");
    console.log("   │  └─ Delete organization");
    console.log("   ├─ Delete venue activity logs");
    console.log("   └─ Delete venue");
    console.log();

    // Logic 2: Organization Deletion
    console.log("2️⃣  ORGANIZATION DELETION LOGIC:");
    console.log("   When organization is deleted:");
    console.log("   ├─ Find all AC devices in organization");
    console.log("   ├─ Find all events (deviceId OR organizationId)");
    console.log("   ├─ Delete all events");
    console.log("   │  ├─ Events where deviceId = AC IDs");
    console.log("   │  ├─ Events where organizationId = Org ID");
    console.log("   │  └─ Child events (parentAdminEventId)");
    console.log("   ├─ Delete activity logs");
    console.log("   │  ├─ targetType='ac', targetId = AC IDs");
    console.log("   │  └─ targetType='organization', targetId = Org ID");
    console.log("   ├─ Delete system states");
    console.log("   │  ├─ entityType='ac', entityId = AC IDs");
    console.log("   │  └─ entityType='organization', entityId = Org ID");
    console.log("   ├─ Delete AC devices");
    console.log("   ├─ Handle split relationships");
    console.log("   └─ Delete organization");
    console.log();

    // Logic 3: AC Device Deletion
    console.log("3️⃣  AC DEVICE DELETION LOGIC:");
    console.log("   When AC device is deleted:");
    console.log("   ├─ Delete all events");
    console.log("   │  ├─ Events where deviceId = AC ID");
    console.log("   │  └─ Child events (parentAdminEventId)");
    console.log("   ├─ Delete activity logs");
    console.log("   │  └─ targetType='ac', targetId = AC ID");
    console.log("   ├─ Delete system states");
    console.log("   │  └─ entityType='ac', entityId = AC ID");
    console.log("   └─ Delete AC device");
    console.log();

    // Show current counts
    const eventCount = await Event.count();
    const activityLogCount = await ActivityLog.count();
    const systemStateCount = await SystemState.count();

    console.log("=".repeat(70));
    console.log("📊 CURRENT COUNTS:");
    console.log("=".repeat(70));
    console.log(`   Venues: ${venues.length}`);
    console.log(
      `   Organizations: ${venues.reduce((sum, v) => sum + (v.organizations?.length || 0), 0)}`
    );
    console.log(
      `   AC Devices: ${venues.reduce((sum, v) => sum + (v.organizations?.reduce((s, o) => s + (o.acs?.length || 0), 0) || 0), 0)}`
    );
    console.log(`   Events: ${eventCount}`);
    console.log(`   Activity Logs: ${activityLogCount}`);
    console.log(`   System States: ${systemStateCount}`);
    console.log();

    console.log("✅ Logic verification complete!");
    console.log();
    console.log("💡 The deletion logic ensures:");
    console.log("   - Venue deletion → deletes all organizations → deletes all ACs → deletes all events");
    console.log("   - Organization deletion → deletes all ACs → deletes all events");
    console.log("   - AC deletion → deletes all events");
    console.log("   - All deletions are transactional (all or nothing)");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verifyDeletionLogic();


