// Script to move a device (AC) to a manager's organization
require("dotenv").config({ path: require("path").resolve(__dirname, "../environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const Organization = require("../models/Organization/organization");
const Manager = require("../models/Roleaccess/manager");
const ActivityLog = require("../models/Activity log/activityLog");

// Load model associations
require("../models");

async function listAvailableOptions() {
  console.log("📋 Listing available managers and organizations...\n");

  try {
    await sequelize.authenticate();

    const managers = await Manager.findAll({
      include: [
        {
          model: Organization,
          as: "organizations",
          attributes: ["id", "name"],
        },
      ],
      attributes: ["id", "name", "email"],
      order: [["id", "ASC"]],
    });

    if (managers.length === 0) {
      console.log("⚠️  No managers found in the database.\n");
      return;
    }

    console.log("👥 Available Managers:\n");
    managers.forEach((manager) => {
      console.log(`   Manager ID: ${manager.id}`);
      console.log(`   Name: ${manager.name}`);
      console.log(`   Email: ${manager.email}`);
      if (manager.organizations && manager.organizations.length > 0) {
        console.log(`   Organizations (${manager.organizations.length}):`);
        manager.organizations.forEach((org) => {
          console.log(`      - ID: ${org.id}, Name: ${org.name}`);
        });
      } else {
        console.log(`   Organizations: None assigned`);
      }
      console.log();
    });

    const organizations = await Organization.findAll({
      include: [
        {
          model: Manager,
          as: "manager",
          attributes: ["id", "name"],
          required: false,
        },
      ],
      attributes: ["id", "name", "managerId", "adminId"],
      order: [["id", "ASC"]],
    });

    console.log("\n🏢 All Organizations:\n");
    organizations.forEach((org) => {
      console.log(`   Organization ID: ${org.id}`);
      console.log(`   Name: ${org.name}`);
      console.log(`   Manager ID: ${org.managerId || "Not assigned"}`);
      console.log(`   Manager Name: ${org.manager?.name || "N/A"}`);
      console.log(`   Admin ID: ${org.adminId}`);
      console.log();
    });
  } catch (error) {
    console.error(`❌ Error listing options: ${error.message}`);
  } finally {
    await sequelize.close();
  }
}

async function moveDeviceToManagerOrg() {
  console.log("🚀 Starting device move process...\n");

  // Device information from user
  const deviceSerialNumber = "AC-431142-617";
  const deviceKey = "QUMtNDMxMTQyLTYxNy0xNzYxOTI3NDMxMjAyLWUyYzM0YjQ0MzNkODBmMDIzY2NhOTRhYTZkOGVmMTJkMjlhNjNjZDNjZTdhNmYzNmZlMjk4MzE2MmU0ZTViMTI=";

  // Get managerId and organizationId from command line arguments
  const args = process.argv.slice(2);
  let managerId = null;
  let organizationId = null;

  // Check if user wants to list options
  if (args.length === 0 || args.includes("--list") || args.includes("-l")) {
    await listAvailableOptions();
    return;
  }

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--managerId" || args[i] === "-m") {
      managerId = parseInt(args[i + 1]);
    } else if (args[i] === "--organizationId" || args[i] === "-o") {
      organizationId = parseInt(args[i + 1]);
    }
  }

  const transaction = await sequelize.transaction();

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Step 1: Find the device
    console.log(`🔍 Step 1: Looking for device with serial number: ${deviceSerialNumber}`);
    const device = await AC.findOne({
      where: { 
        serialNumber: deviceSerialNumber 
      },
      include: [
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name", "managerId", "adminId"],
        },
      ],
      transaction,
    });

    if (!device) {
      throw new Error(`Device with serial number ${deviceSerialNumber} not found`);
    }

    console.log(`✅ Device found:`);
    console.log(`   - ID: ${device.id}`);
    console.log(`   - Name: ${device.name}`);
    console.log(`   - Serial Number: ${device.serialNumber}`);
    console.log(`   - Current Organization ID: ${device.organizationId}`);
    console.log(`   - Current Organization Name: ${device.organization?.name || "N/A"}`);
    console.log(`   - Current Organization Manager ID: ${device.organization?.managerId || "N/A"}\n`);

    const previousOrganizationId = device.organizationId;
    const previousOrganizationName = device.organization?.name || "Unknown";

    // Step 2: If organizationId not provided, find organizations for the manager
    if (!organizationId && managerId) {
      console.log(`🔍 Step 2: Finding organizations for manager ID: ${managerId}`);
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "managerId", "adminId"],
        transaction,
      });

      if (organizations.length === 0) {
        throw new Error(`No organizations found for manager ID ${managerId}. Please assign an organization to this manager first.`);
      }

      console.log(`✅ Found ${organizations.length} organization(s) for manager ${managerId}:`);
      organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ID: ${org.id}, Name: ${org.name}`);
      });

      // Use the first organization if multiple found (or you can prompt)
      organizationId = organizations[0].id;
      console.log(`   → Using organization ID: ${organizationId} (${organizations[0].name})\n`);
    }

    if (!organizationId) {
      throw new Error("Organization ID is required. Use --organizationId <id> or --managerId <id> to auto-select");
    }

    if (!managerId) {
      // Try to get managerId from the target organization
      console.log(`🔍 Step 2: Getting manager ID from organization ${organizationId}`);
      const targetOrg = await Organization.findByPk(organizationId, {
        attributes: ["id", "name", "managerId", "adminId"],
        transaction,
      });

      if (!targetOrg) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }

      if (!targetOrg.managerId) {
        throw new Error(`Organization ${organizationId} (${targetOrg.name}) is not assigned to any manager. Please assign it to a manager first.`);
      }

      managerId = targetOrg.managerId;
      console.log(`✅ Target organization found:`);
      console.log(`   - ID: ${targetOrg.id}`);
      console.log(`   - Name: ${targetOrg.name}`);
      console.log(`   - Manager ID: ${targetOrg.managerId}`);
      console.log(`   - Admin ID: ${targetOrg.adminId}\n`);
    }

    // Step 3: Verify target organization and manager
    console.log(`🔍 Step 3: Verifying target organization and manager...`);
    const targetOrganization = await Organization.findByPk(organizationId, {
      include: [
        {
          model: Manager,
          as: "manager",
          attributes: ["id", "name", "email"],
        },
      ],
      transaction,
    });

    if (!targetOrganization) {
      throw new Error(`Target organization with ID ${organizationId} not found`);
    }

    if (targetOrganization.managerId !== managerId) {
      console.log(`⚠️  Warning: Organization ${organizationId} is assigned to manager ${targetOrganization.managerId}, but you specified manager ${managerId}`);
      console.log(`   → Updating organization to assign it to manager ${managerId}...`);
      await targetOrganization.update({ managerId: managerId }, { transaction });
      console.log(`   ✅ Organization updated\n`);
    } else {
      console.log(`✅ Target organization verified:`);
      console.log(`   - ID: ${targetOrganization.id}`);
      console.log(`   - Name: ${targetOrganization.name}`);
      console.log(`   - Manager ID: ${targetOrganization.managerId}`);
      console.log(`   - Manager Name: ${targetOrganization.manager?.name || "N/A"}\n`);
    }

    // Step 4: Verify the manager exists
    const manager = await Manager.findByPk(managerId, {
      attributes: ["id", "name", "email", "adminId"],
      transaction,
    });

    if (!manager) {
      throw new Error(`Manager with ID ${managerId} not found`);
    }

    console.log(`✅ Manager verified:`);
    console.log(`   - ID: ${manager.id}`);
    console.log(`   - Name: ${manager.name}`);
    console.log(`   - Email: ${manager.email}`);
    console.log(`   - Admin ID: ${manager.adminId}\n`);

    // Step 5: Update device to new organization
    console.log(`🔄 Step 4: Moving device from organization ${previousOrganizationId} (${previousOrganizationName}) to organization ${organizationId} (${targetOrganization.name})...`);
    
    await device.update(
      { organizationId: organizationId },
      { transaction }
    );

    console.log(`✅ Device moved successfully!\n`);

    // Step 6: Log the activity
    console.log(`📝 Step 5: Logging activity...`);
    await ActivityLog.create(
      {
        adminId: manager.adminId, // Use adminId from manager
        managerId: managerId,
        action: "MOVE_DEVICE_TO_MANAGER_ORG",
        targetType: "ac",
        targetId: device.id,
        details: {
          deviceSerialNumber: device.serialNumber,
          deviceName: device.name,
          previousOrganizationId: previousOrganizationId,
          previousOrganizationName: previousOrganizationName,
          newOrganizationId: organizationId,
          newOrganizationName: targetOrganization.name,
          managerId: managerId,
          managerName: manager.name,
        },
      },
      { transaction }
    );
    console.log(`✅ Activity logged\n`);

    // Commit transaction
    await transaction.commit();

    console.log(`🎉 SUCCESS! Device moved successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Device: ${device.name} (${device.serialNumber})`);
    console.log(`   - Previous Organization: ${previousOrganizationName} (ID: ${previousOrganizationId})`);
    console.log(`   - New Organization: ${targetOrganization.name} (ID: ${organizationId})`);
    console.log(`   - Manager: ${manager.name} (ID: ${managerId})`);
    console.log(`   - Transaction: COMMITTED\n`);

  } catch (error) {
    await transaction.rollback();
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(`   Transaction rolled back`);
    console.error(`\nFull error:`, error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log(`🔌 Database connection closed`);
  }
}

// Run the script
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📱 Device Move Script`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`This script moves device AC-431142-617 to a manager's organization.`);
  console.log(`\nUsage:`);
  console.log(`   List available options:`);
  console.log(`     node move-device-to-manager-org.js --list`);
  console.log(`\n   Move device:`);
  console.log(`     node move-device-to-manager-org.js --managerId <id> [--organizationId <id>]`);
  console.log(`     node move-device-to-manager-org.js --organizationId <id>\n`);
  console.log(`Examples:`);
  console.log(`   node move-device-to-manager-org.js --list`);
  console.log(`   node move-device-to-manager-org.js --managerId 1`);
  console.log(`   node move-device-to-manager-org.js --organizationId 5 --managerId 1\n`);
  console.log(`${"=".repeat(60)}\n`);
  process.exit(0);
}

moveDeviceToManagerOrg();

