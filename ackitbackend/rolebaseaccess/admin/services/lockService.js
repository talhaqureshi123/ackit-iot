const SystemState = require("../../../models/SystemState/systemState");
const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const Manager = require("../../../models/Roleaccess/manager");
const Admin = require("../../../models/Roleaccess/admin");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op } = require("sequelize");

class LockService {
  // ==================== ADMIN LEVEL LOCKING ====================

  // Admin locks system from Manager + Remote users
  static async adminLockSystem(adminId, lockType, reason, lockedBy) {
    let transaction;
    try {
      console.log("🔒 LockService - Starting admin system lock:");
      console.log("- Admin ID:", adminId);
      console.log("- Lock Type:", lockType);
      console.log("- Reason:", reason);
      console.log("- Locked By:", lockedBy);

      // Validate inputs (reason is optional)
      if (!adminId || !lockType || !lockedBy) {
        throw new Error("Missing required parameters for system lock");
      }
      
      // Reason is optional - use empty string if not provided
      const lockReason = reason || "";

      // Test database connection
      console.log("🔍 Testing database connection...");
      const testAdmin = await Admin.findByPk(adminId);
      if (!testAdmin) {
        throw new Error(`Admin with ID ${adminId} not found`);
      }
      console.log(
        "✅ Database connection verified, admin found:",
        testAdmin.name
      );

      transaction = await SystemState.sequelize.transaction();
      console.log("✅ Transaction started successfully");

      // Save current system state before locking
      // For remote-only locks, don't capture manager state (managers won't be locked)
      console.log("📊 Capturing system state...");
      const currentState = await this.captureSystemState(
        adminId,
        transaction,
        lockType === "lock_from_remote"
      );
      console.log("✅ System state captured:", currentState);

      // Capture temperatures
      console.log("🌡️ Capturing temperatures...");
      let temperatures = [];
      try {
        temperatures = await this.captureTemperatures(adminId, transaction);
        console.log("✅ Temperatures captured:", temperatures.length, "ACs");
      } catch (tempError) {
        console.error("⚠️ Error capturing temperatures (non-critical):", tempError);
        // Continue with empty temperatures array - lock can still be created
        temperatures = [];
      }

      // Create lock record
      console.log("💾 Creating system lock record...");
      const lockRecord = await SystemState.create(
        {
          adminId: adminId,
          entityType: "admin",
          entityId: adminId,
          actionType: "lock",
          previousState: currentState,
          lockedTemperatures: temperatures,
          isActive: true,
          reason: lockReason,
          lockedBy: lockedBy,
          lockedAt: new Date(),
        },
        { transaction }
      );
      console.log("✅ Lock record created:", lockRecord.id);

      // Only lock managers if this is a full system lock (not remote-only lock)
      // Remote locks should NOT lock managers - they only block remote access
      let managerUpdateResult = [0];
      if (lockType !== "lock_from_remote") {
        console.log("👥 Locking managers (full system lock)...");
        managerUpdateResult = await Manager.update(
          {
            status: "locked",
            lockedAt: new Date(),
            lockReason: lockReason ? `Admin locked system: ${lockReason}` : "Admin locked system",
          },
          {
            where: { adminId: adminId },
            transaction,
          }
        );
        console.log(
          "✅ Managers locked:",
          managerUpdateResult[0],
          "rows affected"
        );
      } else {
        console.log(
          "ℹ️ Remote-only lock: Managers remain unlocked (only remote access blocked)"
        );
      }

      // HIERARCHY:
      // - Full system lock (lock_from_admin) - locks managers and ACs
      // - Remote-only lock (lock_from_remote) - does NOT lock managers, ACs, Organizations, or Venues
      //   Remote lock ONLY blocks remote access - devices/organizations/venues remain unlocked

      // IMPORTANT: For remote-only locks, we do NOT lock:
      // 1. Devices (ACs) - should remain unlocked, only remote access blocked
      // 2. Organizations - should remain unlocked, only remote access blocked
      // 3. Venues - should remain unlocked, only remote access blocked
      // Remote lock only creates a SystemState record to track remote access lock

      // Lock all ACs under this admin's organizations
      // ACs belong to Venues, and Venues belong to Organizations
      console.log("🌡️ Finding organizations...");
      const Venue = require("../../../models/Venue/venue");
      const organizations = await Organization.findAll({
        where: { adminId: adminId },
        attributes: ["id"],
        transaction,
      });
      console.log("✅ Organizations found:", organizations.length);

      const orgIds = organizations.map((org) => org.id);

      // Lock ACs for both full system lock AND remote lock
      // Remote lock: Locks devices (ACs) but NOT venues/organizations
      // Full system lock: Locks managers AND devices
      let acUpdateResult = [0];
        if (orgIds.length > 0) {
        // Get venues for these organizations
        const venues = await Venue.findAll({
          where: { organizationId: { [Op.in]: orgIds } },
          attributes: ["id"],
          transaction,
        });
        const venueIds = venues.map((v) => v.id);

        if (venueIds.length > 0) {
          if (lockType === "lock_from_remote") {
            console.log("🔒 Remote lock: Locking AC devices in venues:", venueIds);
            console.log("ℹ️ Remote lock: Venues and Organizations remain unlocked");
            console.log("ℹ️ Remote lock: Only devices (ACs) are locked");
          } else {
            console.log("🔒 Full system lock: Locking ACs in venues:", venueIds);
          }
          
          acUpdateResult = await AC.update(
            {
              currentState: "locked",
              lockedAt: new Date(),
              lockedBy: lockType === "lock_from_remote" ? "remote_lock" : "admin",
            },
            {
              where: { venueId: { [Op.in]: venueIds } },
              transaction,
            }
          );
          console.log("✅ ACs locked:", acUpdateResult[0], "rows affected");
        } else {
          console.log("ℹ️ No venues found, skipping AC lock");
        }
      } else {
        console.log("ℹ️ No organizations found, skipping AC lock");
      }

      // IMPORTANT: Organizations and Venues are NEVER locked during remote lock
      // Remote lock does NOT set isLocked: true for organizations/venues
      // Organizations/Venues can only be locked via lockOrganization() function (separate action)
      // Remote lock ONLY locks devices (ACs) - venues and organizations remain unlocked
      if (lockType === "lock_from_remote") {
        console.log(
          "ℹ️ Remote lock: Organizations remain unlocked (devices are locked)"
        );
        console.log(
          "ℹ️ Remote lock: Organizations will NOT show as 'locked organization'"
        );
        console.log(
          "ℹ️ Remote lock: Venues remain unlocked (devices are locked)"
        );
        console.log(
          "ℹ️ Remote lock: Venues will NOT show as 'locked venue'"
        );
        console.log(
          "✅ Remote lock: Devices (ACs) are locked and will show as 'locked device'"
        );
      }

      await transaction.commit();
      console.log("✅ Transaction committed successfully");

      return {
        success: true,
        message: `System locked successfully at admin level`,
        lockType: lockType,
        lockedBy: lockedBy,
        reason: lockReason || null,
        lockId: lockRecord.id,
        managersAffected: managerUpdateResult[0],
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      console.error("❌ LockService error:", error);
      console.error("❌ Error stack:", error.stack);

      // Try to rollback transaction if it exists
      try {
        if (transaction) {
          await transaction.rollback();
          console.log("✅ Transaction rolled back successfully");
        }
      } catch (rollbackError) {
        console.error("❌ Failed to rollback transaction:", rollbackError);
      }

      throw error;
    }
  }

  // ==================== MANAGER-CONTROLLED REMOTE ACCESS LOCKING ====================
  //
  // IMPORTANT: This is SEPARATE from manager account status (locked/unlocked/restricted)
  //
  // MANAGER ACCOUNT STATUS (Admin-controlled):
  //   - Admin controls whether manager account is locked/unlocked/restricted
  //   - This affects whether manager can login and perform actions
  //
  // REMOTE ACCESS LOCK (Manager-controlled when account is "unlocked"):
  //   - Only managers with "unlocked" account status can use this feature
  //   - This controls whether remote users can access the system
  //   - Admin can override and lock/unlock remote access regardless of manager account status
  //
  // Manager locks system from Remote users only (NOT locking manager account)
  // IMPORTANT: Manager remote lock does NOT lock:
  //   - Devices (ACs) - remain unlocked, only remote access blocked
  //   - Organizations - remain unlocked, only remote access blocked
  //   - Venues - remain unlocked, only remote access blocked
  // Manager remote lock only creates a SystemState record to track remote access lock
  static async managerLockSystem(managerId, reason, lockedBy) {
    const transaction = await SystemState.sequelize.transaction();

    try {
      // Get manager's admin ID
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      console.log(
        "🔒 Manager remote lock: Locking devices (ACs) only"
      );
      console.log(
        "ℹ️ Manager remote lock: Venues and Organizations remain unlocked"
      );
      console.log(
        "ℹ️ Manager remote lock: Only devices (ACs) are locked"
      );

      // Reason is optional - use empty string if not provided
      const lockReason = reason || "";

      // Save current temperatures for manager's organizations
      const temperatures = await this.captureManagerTemperatures(
        managerId,
        transaction
      );

      // Lock devices (ACs) for manager's organizations
      // Get organizations assigned to this manager
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id"],
        transaction,
      });

      const orgIds = organizations.map((org) => org.id);
      let acUpdateResult = [0];

      if (orgIds.length > 0) {
        // Get venues for these organizations
        const Venue = require("../../../models/Venue/venue");
        const venues = await Venue.findAll({
          where: { organizationId: { [Op.in]: orgIds } },
          attributes: ["id"],
          transaction,
        });
        const venueIds = venues.map((v) => v.id);

        if (venueIds.length > 0) {
          console.log("🔒 Manager remote lock: Locking AC devices in venues:", venueIds);
          acUpdateResult = await AC.update(
            {
              currentState: "locked",
              lockedAt: new Date(),
              lockedBy: "remote_lock",
            },
            {
              where: { venueId: { [Op.in]: venueIds } },
              transaction,
            }
          );
          console.log("✅ Manager remote lock: ACs locked:", acUpdateResult[0], "rows affected");
        }
      }

      // Create lock record
      // NOTE: Devices are locked, but organizations/venues remain unlocked
      await SystemState.create(
        {
          managerId: managerId,
          adminId: manager.adminId,
          entityType: "manager",
          entityId: managerId,
          actionType: "lock",
          previousState: { managerId: managerId, lockedAt: new Date() },
          lockedTemperatures: temperatures,
          isActive: true,
          reason: lockReason,
          lockedBy: lockedBy,
          lockedAt: new Date(),
        },
        { transaction }
      );

      console.log(
        "✅ Manager remote lock: SystemState record created, devices locked"
      );

      await transaction.commit();

      return {
        success: true,
        message: "System locked from remote access by manager",
        lockType: "lock_from_remote",
        lockedBy: lockedBy,
        reason: lockReason || null,
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ==================== UNLOCK SYSTEM ====================

  static async unlockSystem(
    entityType,
    userId,
    unlockedBy,
    userRole,
    adminId = null
  ) {
    const transaction = await SystemState.sequelize.transaction();

    try {
      let whereClause = { isActive: true };

      if (userRole === "admin") {
        whereClause.adminId = userId;
        whereClause.entityType = { [Op.in]: ["admin", "manager"] };
      } else if (userRole === "manager") {
        // Manager can unlock ANY lock (admin or manager) for their admin
        // This matches how status check works - managers see all locks for their admin
        if (!adminId) {
          throw new Error("Admin ID is required for manager unlock");
        }
        whereClause.adminId = adminId;
        whereClause.entityType = { [Op.in]: ["admin", "manager"] };
      }

      // Find active locks
      const activeLocks = await SystemState.findAll({
        where: whereClause,
        transaction,
      });

      if (activeLocks.length === 0) {
        // No locks to unlock - commit transaction and return success message
        await transaction.commit();
        return {
          success: true,
          message: "No active locks found. System is already unlocked.",
          unlockedBy: unlockedBy,
          locksRemoved: 0,
        };
      }

      // Restore system state for each lock
      for (const lock of activeLocks) {
        try {
          await this.restoreSystemState(lock, transaction);

          // Mark lock as inactive
          await lock.update(
            {
              isActive: false,
              unlockedAt: new Date(),
            },
            { transaction }
          );
        } catch (lockError) {
          console.error(`❌ Error processing lock ${lock.id}:`, lockError);
          // Continue with other locks even if one fails
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: "System unlocked successfully",
        unlockedBy: unlockedBy,
        locksRemoved: activeLocks.length,
      };
    } catch (error) {
      console.error("❌ Error in unlockSystem:", error);
      console.error("❌ Error stack:", error.stack);
      await transaction.rollback();
      throw error;
    }
  }

  // ==================== TEMPERATURE PROTECTION ====================

  static async canChangeTemperature(acId, userRole, userId) {
    try {
      // Check if AC is locked
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "adminId", "managerId"],
          },
        ],
      });

      if (!ac) {
        return { allowed: false, reason: "AC not found" };
      }

      // Check for active locks that would prevent temperature changes
      const activeLocks = await SystemState.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { adminId: ac.organization.adminId, entityType: "admin" },
            { managerId: ac.organization.managerId, entityType: "manager" },
          ],
        },
      });

      // If admin is changing temperature and there's only manager lock, allow it
      if (userRole === "admin" && ac.organization.adminId === userId) {
        const adminLocks = activeLocks.filter(
          (lock) => lock.entityType === "admin"
        );
        if (adminLocks.length === 0) {
          return { allowed: true, reason: "Admin has permission" };
        }
      }

      // If manager is changing temperature and there's no admin lock, allow it
      if (userRole === "manager" && ac.organization.managerId === userId) {
        const adminLocks = activeLocks.filter(
          (lock) => lock.entityType === "admin"
        );
        if (adminLocks.length === 0) {
          return { allowed: true, reason: "Manager has permission" };
        }
      }

      // Check if there are any active locks that would block this user
      if (activeLocks.length > 0) {
        return {
          allowed: false,
          reason: `Temperature locked by ${activeLocks[0].lockedBy}`,
        };
      }

      return { allowed: true, reason: "No active locks" };
    } catch (error) {
      console.error("Error checking temperature permission:", error);
      return { allowed: false, reason: "Error checking permissions" };
    }
  }

  static async restoreTemperature(acId) {
    try {
      // Find the most recent lock with temperature data for this AC
      const lockWithTemp = await SystemState.findOne({
        where: {
          isActive: true,
          lockedTemperatures: { [Op.ne]: null },
        },
        order: [["lockedAt", "DESC"]],
      });

      if (lockWithTemp && lockWithTemp.lockedTemperatures) {
        const acTempData = lockWithTemp.lockedTemperatures.find(
          (temp) => temp.acId === parseInt(acId)
        );

        if (acTempData) {
          await AC.update(
            {
              temperature: acTempData.temperature,
              isOn: acTempData.isOn,
            },
            {
              where: { id: acId },
            }
          );

          console.log(
            `Temperature restored for AC ${acId} to ${acTempData.temperature}°C`
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error restoring temperature:", error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================

  static async captureSystemState(adminId, transaction, skipManagers = false) {
    // For remote-only locks, skip capturing manager state (managers won't be locked)
    let managers = [];
    if (!skipManagers) {
      managers = await Manager.findAll({
        where: { adminId: adminId },
        attributes: ["id", "status", "lockedAt"],
        transaction,
      });
    } else {
      console.log("ℹ️ Skipping manager state capture (remote-only lock)");
    }

    const organizations = await Organization.findAll({
      where: { adminId: adminId },
      attributes: ["id"], // Remove status - Organization model uses venues table which may not have status
      transaction,
    });

    return {
      managers: managers.map((m) => ({
        id: m.id,
        status: m.status,
        lockedAt: m.lockedAt,
      })),
      organizations: organizations.map((o) => ({
        id: o.id,
        // status removed - Organization model uses venues table
      })),
      capturedAt: new Date(),
    };
  }

  static async captureTemperatures(adminId, transaction) {
    try {
      // ACs belong to Venues, and Venues belong to Organizations
      // Get venues for this admin's organizations, then get ACs
      const Venue = require("../../../models/Venue/venue");
      
    const organizations = await Organization.findAll({
      where: { adminId: adminId },
      attributes: ["id"],
      transaction,
    });

    const orgIds = organizations.map((org) => org.id);

      if (orgIds.length === 0) {
        console.log("ℹ️ No organizations found for admin, returning empty temperatures");
        return [];
      }

      // Get venues that belong to these organizations
      const venues = await Venue.findAll({
        where: { organizationId: { [Op.in]: orgIds } },
        attributes: ["id"],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        console.log("ℹ️ No venues found for organizations, returning empty temperatures");
        return [];
      }

      // Get ACs that belong to these venues
    const acs = await AC.findAll({
        where: { venueId: { [Op.in]: venueIds } },
      attributes: ["id", "temperature", "isOn"],
      transaction,
    });

    return acs.map((ac) => ({
      acId: ac.id,
      temperature: ac.temperature,
      isOn: ac.isOn,
    }));
    } catch (error) {
      console.error("❌ Error in captureTemperatures:", error);
      throw error;
    }
  }

  static async captureManagerTemperatures(managerId, transaction) {
    // ACs belong to Venues, and Venues belong to Organizations
    // Get venues for manager's organizations, then get ACs
    const Venue = require("../../../models/Venue/venue");
    
    const organizations = await Organization.findAll({
      where: { managerId: managerId },
      attributes: ["id"],
      transaction,
    });

    const orgIds = organizations.map((org) => org.id);

    if (orgIds.length === 0) return [];

    // Get venues that belong to these organizations
    const venues = await Venue.findAll({
      where: { organizationId: { [Op.in]: orgIds } },
      attributes: ["id"],
      transaction,
    });

    const venueIds = venues.map((v) => v.id);

    if (venueIds.length === 0) return [];

    // Get ACs that belong to these venues
    const acs = await AC.findAll({
      where: { venueId: { [Op.in]: venueIds } },
      attributes: ["id", "temperature", "isOn"],
      transaction,
    });

    return acs.map((ac) => ({
      acId: ac.id,
      temperature: ac.temperature,
      isOn: ac.isOn,
    }));
  }

  static async restoreSystemState(lock, transaction) {
    try {
      // Parse previousState if it's a string (JSON)
      let previousState = lock.previousState;
      if (typeof previousState === "string") {
        try {
          previousState = JSON.parse(previousState);
        } catch (parseError) {
          console.error("❌ Error parsing previousState JSON:", parseError);
          previousState = null;
        }
      }

      // Only restore managers if this was a full system lock (not remote-only lock)
      // Remote locks don't lock managers, so there's nothing to restore
      if (lock.entityType === "admin" && previousState) {
        // Check if previousState has managers data (indicates managers were locked)
        // If this was a remote-only lock, previousState.managers might be empty or not exist
        // Only restore if managers were actually locked (previousState has manager data)
        if (
          previousState.managers &&
          Array.isArray(previousState.managers) &&
          previousState.managers.length > 0
        ) {
          console.log(
            `🔄 Restoring ${previousState.managers.length} manager(s) from previous state`
          );
          for (const manager of previousState.managers) {
            if (manager && manager.id) {
              await Manager.update(
                {
                  status: manager.status || "unlocked",
                  lockedAt: manager.lockedAt || null,
                  lockedByAdminId: null,
                },
                {
                  where: { id: manager.id },
                  transaction,
                }
              );
            }
          }
        } else {
          console.log(
            "ℹ️ No manager state to restore (remote-only lock - managers were never locked)"
          );
        }

        // Restore organizations
        if (previousState.organizations) {
          // Note: Organization suspension functionality has been removed
          // Organizations are no longer restored from suspension
        }
      }

      // Parse lockedTemperatures if it's a string (JSON)
      let lockedTemperatures = lock.lockedTemperatures;
      if (typeof lockedTemperatures === "string") {
        try {
          lockedTemperatures = JSON.parse(lockedTemperatures);
        } catch (parseError) {
          console.error(
            "❌ Error parsing lockedTemperatures JSON:",
            parseError
          );
          lockedTemperatures = null;
        }
      }

      // Restore temperatures and unlock devices
      // For remote lock, devices were locked, so unlock them
      if (lockedTemperatures && Array.isArray(lockedTemperatures)) {
        for (const tempData of lockedTemperatures) {
          if (tempData && tempData.acId) {
            await AC.update(
              {
                temperature: tempData.temperature || 16,
                isOn: tempData.isOn !== undefined ? tempData.isOn : true,
                currentState: "unlocked",
                lockedAt: null,
                lockedBy: null,
              },
              {
                where: { id: tempData.acId },
                transaction,
              }
            );
          }
        }
      } else {
        // If no temperature data but this was a remote lock, unlock all devices
        // Remote lock locks devices, so we need to unlock them
        if (lock.entityType === "admin" || lock.entityType === "manager") {
          console.log("🔄 Unlocking devices after remote lock removal...");
          // Get admin ID from lock
          const adminId = lock.adminId;
          if (adminId) {
            // Get all venues for this admin
            const Venue = require("../../../models/Venue/venue");
            const venues = await Venue.findAll({
              where: { adminId: adminId },
              attributes: ["id"],
              transaction,
            });
            const venueIds = venues.map((v) => v.id);

            if (venueIds.length > 0) {
              await AC.update(
                {
                  currentState: "unlocked",
                  lockedAt: null,
                  lockedBy: null,
                },
                {
                  where: { venueId: { [Op.in]: venueIds } },
                  transaction,
                }
              );
              console.log("✅ Devices unlocked after remote lock removal");
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in restoreSystemState:", error);
      throw error;
    }
  }

  // ==================== ORGANIZATION LEVEL REMOTE LOCK ====================
  // Remote lock all devices (ACs) in all venues under an organization
  // Organization and Venues remain unlocked - only devices are locked
  static async remoteLockOrganization(adminId, organizationId, reason = "") {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔒 Remote lock organization:", organizationId);
      console.log("- Admin ID:", adminId);
      console.log("- Reason:", reason || "No reason provided");

      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or does not belong to this admin");
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: { organizationId: organizationId },
        attributes: ["id", "name"],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        console.log("ℹ️ No venues found in organization, nothing to lock");
        await transaction.commit();
        return {
          success: true,
          message: "Organization remote locked (no venues found)",
          organizationId: organizationId,
          organizationName: organization.name,
          acsAffected: 0,
        };
      }

      // Lock all ACs in these venues
      const acUpdateResult = await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: "remote_lock",
        },
        {
          where: { venueId: { [Op.in]: venueIds } },
          transaction,
        }
      );

      console.log("✅ Organization remote lock: ACs locked:", acUpdateResult[0], "rows affected");
      console.log("ℹ️ Organization and Venues remain unlocked (only devices locked)");

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "REMOTE_LOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Remote locked all devices in organization "${organization.name}". ${acUpdateResult[0]} device(s) locked. Reason: ${reason || "No reason provided"}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send LOCK commands and temperature sync to all ESP32 devices
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        
        // Get all locked ACs with their serial numbers
        const lockedACs = await AC.findAll({
          where: { venueId: { [Op.in]: venueIds } },
          attributes: ["id", "serialNumber", "temperature"],
        });

        let wsCommandsSent = 0;
        let wsCommandsSkipped = 0;

        for (const ac of lockedACs) {
          if (ac.serialNumber) {
            try {
              // Send LOCK command
              const lockResult = ESPService.sendLockCommand(ac.serialNumber, true);
              if (lockResult.success) {
                // Also sync temperature to dashboard value
                const dashboardTemp = ac.temperature || 24;
                await ESPService.startTemperatureSync(ac.serialNumber, dashboardTemp);
                wsCommandsSent++;
                console.log(
                  `✅ [ORG-LOCK] Sent LOCK + temp sync to ESP32: ${ac.serialNumber} (${dashboardTemp}°C)`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [ORG-LOCK] Failed to send lock to ESP32: ${ac.serialNumber} - ${lockResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [ORG-LOCK] WebSocket error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [ORG-LOCK] Device ${ac.id} has no serial number, skipping WebSocket command`
            );
          }
        }

        console.log(
          `📡 [ORG-LOCK] WebSocket commands: ${wsCommandsSent} sent, ${wsCommandsSkipped} skipped`
        );
      } catch (wsError) {
        console.error("❌ [ORG-LOCK] WebSocket command error (non-critical):", wsError.message);
        // Don't fail the operation if WebSocket fails
      }

      return {
        success: true,
        message: `Organization remote locked successfully. ${acUpdateResult[0]} device(s) locked.`,
        organizationId: organizationId,
        organizationName: organization.name,
        acsAffected: acUpdateResult[0],
        venuesAffected: venues.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in remoteLockOrganization:", error);
      throw error;
    }
  }

  // Remote unlock all devices (ACs) in all venues under an organization
  static async remoteUnlockOrganization(adminId, organizationId) {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔓 Remote unlock organization:", organizationId);
      console.log("- Admin ID:", adminId);

      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or does not belong to this admin");
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: { organizationId: organizationId },
        attributes: ["id", "name"],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        console.log("ℹ️ No venues found in organization, nothing to unlock");
        await transaction.commit();
        return {
          success: true,
          message: "Organization remote unlocked (no venues found)",
          organizationId: organizationId,
          organizationName: organization.name,
          acsAffected: 0,
        };
      }

      // Unlock all ACs in these venues
      const acUpdateResult = await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        {
          where: { venueId: { [Op.in]: venueIds } },
          transaction,
        }
      );

      console.log("✅ Organization remote unlock: ACs unlocked:", acUpdateResult[0], "rows affected");

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "REMOTE_UNLOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Remote unlocked all devices in organization "${organization.name}". ${acUpdateResult[0]} device(s) unlocked.`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send UNLOCK commands to all ESP32 devices
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        
        // Get all unlocked ACs with their serial numbers
        const unlockedACs = await AC.findAll({
          where: { venueId: { [Op.in]: venueIds } },
          attributes: ["id", "serialNumber"],
        });

        let wsCommandsSent = 0;
        let wsCommandsSkipped = 0;

        for (const ac of unlockedACs) {
          if (ac.serialNumber) {
            try {
              // Send UNLOCK command
              const unlockResult = ESPService.sendLockCommand(ac.serialNumber, false);
              if (unlockResult.success) {
                wsCommandsSent++;
                console.log(
                  `✅ [ORG-UNLOCK] Sent UNLOCK command to ESP32: ${ac.serialNumber}`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [ORG-UNLOCK] Failed to send unlock to ESP32: ${ac.serialNumber} - ${unlockResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [ORG-UNLOCK] WebSocket error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [ORG-UNLOCK] Device ${ac.id} has no serial number, skipping WebSocket command`
            );
          }
        }

        console.log(
          `📡 [ORG-UNLOCK] WebSocket commands: ${wsCommandsSent} sent, ${wsCommandsSkipped} skipped`
        );
      } catch (wsError) {
        console.error("❌ [ORG-UNLOCK] WebSocket command error (non-critical):", wsError.message);
        // Don't fail the operation if WebSocket fails
      }

      return {
        success: true,
        message: `Organization remote unlocked successfully. ${acUpdateResult[0]} device(s) unlocked.`,
        organizationId: organizationId,
        organizationName: organization.name,
        acsAffected: acUpdateResult[0],
        venuesAffected: venues.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in remoteUnlockOrganization:", error);
      throw error;
    }
  }

  // ==================== VENUE LEVEL REMOTE LOCK ====================
  // Remote lock all devices (ACs) in a venue
  // Venue remains unlocked - only devices are locked
  static async remoteLockVenue(adminId, venueId, reason = "") {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔒 Remote lock venue:", venueId);
      console.log("- Admin ID:", adminId);
      console.log("- Reason:", reason || "No reason provided");

      // Verify venue belongs to admin
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found or does not belong to this admin");
      }

      // Lock all ACs in this venue
      const acUpdateResult = await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: "remote_lock",
        },
        {
          where: { venueId: venueId },
          transaction,
        }
      );

      console.log("✅ Venue remote lock: ACs locked:", acUpdateResult[0], "rows affected");
      console.log("ℹ️ Venue remains unlocked (only devices locked)");

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "REMOTE_LOCK_VENUE",
          targetType: "venue",
          targetId: venueId,
          details: `Remote locked all devices in venue "${venue.name}". ${acUpdateResult[0]} device(s) locked. Reason: ${reason || "No reason provided"}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send LOCK commands and temperature sync to all ESP32 devices
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        
        // Get all locked ACs with their serial numbers
        const lockedACs = await AC.findAll({
          where: { venueId: venueId },
          attributes: ["id", "serialNumber", "temperature"],
        });

        let wsCommandsSent = 0;
        let wsCommandsSkipped = 0;

        for (const ac of lockedACs) {
          if (ac.serialNumber) {
            try {
              // Send LOCK command
              const lockResult = ESPService.sendLockCommand(ac.serialNumber, true);
              if (lockResult.success) {
                // Also sync temperature to dashboard value
                const dashboardTemp = ac.temperature || 24;
                await ESPService.startTemperatureSync(ac.serialNumber, dashboardTemp);
                wsCommandsSent++;
                console.log(
                  `✅ [VENUE-LOCK] Sent LOCK + temp sync to ESP32: ${ac.serialNumber} (${dashboardTemp}°C)`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [VENUE-LOCK] Failed to send lock to ESP32: ${ac.serialNumber} - ${lockResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [VENUE-LOCK] WebSocket error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [VENUE-LOCK] Device ${ac.id} has no serial number, skipping WebSocket command`
            );
          }
        }

        console.log(
          `📡 [VENUE-LOCK] WebSocket commands: ${wsCommandsSent} sent, ${wsCommandsSkipped} skipped`
        );
      } catch (wsError) {
        console.error("❌ [VENUE-LOCK] WebSocket command error (non-critical):", wsError.message);
        // Don't fail the operation if WebSocket fails
      }

      return {
        success: true,
        message: `Venue remote locked successfully. ${acUpdateResult[0]} device(s) locked.`,
        venueId: venueId,
        venueName: venue.name,
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in remoteLockVenue:", error);
      throw error;
    }
  }

  // Remote unlock all devices (ACs) in a venue
  static async remoteUnlockVenue(adminId, venueId) {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔓 Remote unlock venue:", venueId);
      console.log("- Admin ID:", adminId);

      // Verify venue belongs to admin
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found or does not belong to this admin");
      }

      // Unlock all ACs in this venue
      const acUpdateResult = await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        {
          where: { venueId: venueId },
          transaction,
        }
      );

      console.log("✅ Venue remote unlock: ACs unlocked:", acUpdateResult[0], "rows affected");

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "REMOTE_UNLOCK_VENUE",
          targetType: "venue",
          targetId: venueId,
          details: `Remote unlocked all devices in venue "${venue.name}". ${acUpdateResult[0]} device(s) unlocked.`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send UNLOCK commands to all ESP32 devices
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        
        // Get all unlocked ACs with their serial numbers
        const unlockedACs = await AC.findAll({
          where: { venueId: venueId },
          attributes: ["id", "serialNumber"],
        });

        let wsCommandsSent = 0;
        let wsCommandsSkipped = 0;

        for (const ac of unlockedACs) {
          if (ac.serialNumber) {
            try {
              // Send UNLOCK command
              const unlockResult = ESPService.sendLockCommand(ac.serialNumber, false);
              if (unlockResult.success) {
                wsCommandsSent++;
                console.log(
                  `✅ [VENUE-UNLOCK] Sent UNLOCK command to ESP32: ${ac.serialNumber}`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [VENUE-UNLOCK] Failed to send unlock to ESP32: ${ac.serialNumber} - ${unlockResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [VENUE-UNLOCK] WebSocket error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [VENUE-UNLOCK] Device ${ac.id} has no serial number, skipping WebSocket command`
            );
          }
        }

        console.log(
          `📡 [VENUE-UNLOCK] WebSocket commands: ${wsCommandsSent} sent, ${wsCommandsSkipped} skipped`
        );
      } catch (wsError) {
        console.error("❌ [VENUE-UNLOCK] WebSocket command error (non-critical):", wsError.message);
        // Don't fail the operation if WebSocket fails
      }

      return {
        success: true,
        message: `Venue remote unlocked successfully. ${acUpdateResult[0]} device(s) unlocked.`,
        venueId: venueId,
        venueName: venue.name,
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in remoteUnlockVenue:", error);
      throw error;
    }
  }

  // ==================== MANAGER LEVEL REMOTE LOCK ====================
  // Manager remote lock all devices (ACs) in all venues under an assigned organization
  // Organization and Venues remain unlocked - only devices are locked
  static async managerRemoteLockOrganization(managerId, organizationId, reason = "") {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔒 Manager remote lock organization:", organizationId);
      console.log("- Manager ID:", managerId);
      console.log("- Reason:", reason || "No reason provided");

      // Get manager details
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      // Verify organization is assigned to this manager
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or not assigned to this manager");
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: { organizationId: organizationId },
        attributes: ["id", "name"],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        console.log("ℹ️ No venues found in organization, nothing to lock");
        await transaction.commit();
        return {
          success: true,
          message: "Organization remote locked (no venues found)",
          organizationId: organizationId,
          organizationName: organization.name,
          acsAffected: 0,
        };
      }

      // Lock all ACs in these venues
      const acUpdateResult = await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: "remote_lock",
        },
        {
          where: { venueId: { [Op.in]: venueIds } },
          transaction,
        }
      );

      console.log("✅ Manager organization remote lock: ACs locked:", acUpdateResult[0], "rows affected");
      console.log("ℹ️ Organization and Venues remain unlocked (only devices locked)");

      // Log activity
      await ActivityLog.create(
        {
          adminId: manager.adminId,
          action: "MANAGER_REMOTE_LOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Manager "${manager.name}" remote locked all devices in organization "${organization.name}". ${acUpdateResult[0]} device(s) locked. Reason: ${reason || "No reason provided"}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Organization remote locked successfully. ${acUpdateResult[0]} device(s) locked.`,
        organizationId: organizationId,
        organizationName: organization.name,
        acsAffected: acUpdateResult[0],
        venuesAffected: venues.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in managerRemoteLockOrganization:", error);
      throw error;
    }
  }

  // Manager remote unlock all devices (ACs) in all venues under an assigned organization
  static async managerRemoteUnlockOrganization(managerId, organizationId) {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔓 Manager remote unlock organization:", organizationId);
      console.log("- Manager ID:", managerId);

      // Get manager details
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      // Verify organization is assigned to this manager
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or not assigned to this manager");
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: { organizationId: organizationId },
        attributes: ["id", "name"],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        console.log("ℹ️ No venues found in organization, nothing to unlock");
        await transaction.commit();
        return {
          success: true,
          message: "Organization remote unlocked (no venues found)",
          organizationId: organizationId,
          organizationName: organization.name,
          acsAffected: 0,
        };
      }

      // Unlock all ACs in these venues
      const acUpdateResult = await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        {
          where: { venueId: { [Op.in]: venueIds } },
          transaction,
        }
      );

      console.log("✅ Manager organization remote unlock: ACs unlocked:", acUpdateResult[0], "rows affected");

      // Log activity
      await ActivityLog.create(
        {
          adminId: manager.adminId,
          action: "MANAGER_REMOTE_UNLOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Manager "${manager.name}" remote unlocked all devices in organization "${organization.name}". ${acUpdateResult[0]} device(s) unlocked.`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Organization remote unlocked successfully. ${acUpdateResult[0]} device(s) unlocked.`,
        organizationId: organizationId,
        organizationName: organization.name,
        acsAffected: acUpdateResult[0],
        venuesAffected: venues.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in managerRemoteUnlockOrganization:", error);
      throw error;
    }
  }

  // Manager remote lock all devices (ACs) in a venue (venue must be in manager's assigned organization)
  static async managerRemoteLockVenue(managerId, venueId, reason = "") {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔒 Manager remote lock venue:", venueId);
      console.log("- Manager ID:", managerId);
      console.log("- Reason:", reason || "No reason provided");

      // Get manager details
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      // Get venue
      const venue = await Venue.findOne({
        where: {
          id: venueId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found");
      }

      // Verify venue's organization is assigned to this manager
      const organization = await Organization.findOne({
        where: {
          id: venue.organizationId,
          managerId: managerId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Venue not in manager's assigned organization");
      }

      // Lock all ACs in this venue
      const acUpdateResult = await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: "remote_lock",
        },
        {
          where: { venueId: venueId },
          transaction,
        }
      );

      console.log("✅ Manager venue remote lock: ACs locked:", acUpdateResult[0], "rows affected");
      console.log("ℹ️ Venue remains unlocked (only devices locked)");

      // Log activity
      await ActivityLog.create(
        {
          adminId: manager.adminId,
          action: "MANAGER_REMOTE_LOCK_VENUE",
          targetType: "venue",
          targetId: venueId,
          details: `Manager "${manager.name}" remote locked all devices in venue "${venue.name}". ${acUpdateResult[0]} device(s) locked. Reason: ${reason || "No reason provided"}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Venue remote locked successfully. ${acUpdateResult[0]} device(s) locked.`,
        venueId: venueId,
        venueName: venue.name,
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in managerRemoteLockVenue:", error);
      throw error;
    }
  }

  // Manager remote unlock all devices (ACs) in a venue (venue must be in manager's assigned organization)
  static async managerRemoteUnlockVenue(managerId, venueId) {
    const transaction = await SystemState.sequelize.transaction();
    const Venue = require("../../../models/Venue/venue");

    try {
      console.log("🔓 Manager remote unlock venue:", venueId);
      console.log("- Manager ID:", managerId);

      // Get manager details
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      // Get venue
      const venue = await Venue.findOne({
        where: {
          id: venueId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found");
      }

      // Verify venue's organization is assigned to this manager
      const organization = await Organization.findOne({
        where: {
          id: venue.organizationId,
          managerId: managerId,
        },
        attributes: ["id", "name", "batchNumber", "adminId", "managerId", "createdAt", "updatedAt"],
        transaction,
      });

      if (!organization) {
        throw new Error("Venue not in manager's assigned organization");
      }

      // Unlock all ACs in this venue
      const acUpdateResult = await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        {
          where: { venueId: venueId },
          transaction,
        }
      );

      console.log("✅ Manager venue remote unlock: ACs unlocked:", acUpdateResult[0], "rows affected");

      // Log activity
      await ActivityLog.create(
        {
          adminId: manager.adminId,
          action: "MANAGER_REMOTE_UNLOCK_VENUE",
          targetType: "venue",
          targetId: venueId,
          details: `Manager "${manager.name}" remote unlocked all devices in venue "${venue.name}". ${acUpdateResult[0]} device(s) unlocked.`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Venue remote unlocked successfully. ${acUpdateResult[0]} device(s) unlocked.`,
        venueId: venueId,
        venueName: venue.name,
        acsAffected: acUpdateResult[0],
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error in managerRemoteUnlockVenue:", error);
      throw error;
    }
  }
}

module.exports = LockService;
