// Models Index - Set up all model associations
const Admin = require("./Roleaccess/admin");
const Manager = require("./Roleaccess/manager");
const Organization = require("./Organization/organization");
const Venue = require("./Venue/venue");
const AC = require("./AC/ac");
const SuperAdmin = require("./Roleaccess/superadmin");
const ActivityLog = require("./Activity log/activityLog");
const SystemState = require("./SystemState/systemState");
const Event = require("./Event/event");

// Define associations
// Admin associations with Manager
Admin.hasMany(Manager, {
  foreignKey: "adminId",
  as: "managers",
});
Manager.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Admin associations with Organization
Admin.hasMany(Organization, {
  foreignKey: "adminId",
  as: "organizations",
});
Organization.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Organization associations with Venue (Organization is parent, Venue is child)
Organization.hasMany(Venue, {
  foreignKey: "organizationId",
  as: "venues",
});
Venue.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

// Admin associations with Venue (ownership)
Admin.hasMany(Venue, {
  foreignKey: "adminId",
  as: "venues",
});
Venue.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Manager associations with Venue (assignment)
Manager.hasMany(Venue, {
  foreignKey: "managerId",
  as: "venues",
});
Venue.belongsTo(Manager, {
  foreignKey: "managerId",
  as: "manager",
});

// Manager associations with Organization (assignment)
Manager.hasMany(Organization, {
  foreignKey: "managerId",
  as: "organizations",
});
Organization.belongsTo(Manager, {
  foreignKey: "managerId",
  as: "manager",
});

// Venue associations with AC
Venue.hasMany(AC, {
  foreignKey: "venueId",
  as: "acs",
});
AC.belongsTo(Venue, {
  foreignKey: "venueId",
  as: "venue",
});

// Organization associations with AC (direct - AC.venueId references organizations table)
// Note: AC.venueId references organizations table, and Organization model uses venues table
// But since AC.venueId points to organizations table, we need this direct association
Organization.hasMany(AC, {
  foreignKey: "venueId",
  as: "acs",
});
AC.belongsTo(Organization, {
  foreignKey: "venueId",
  as: "organization",
});

// SuperAdmin associations
// ActivityLog is admin-only now (no superAdminId). SystemState can be initiated by superadmin.
SuperAdmin.hasMany(SystemState, {
  foreignKey: "superAdminId",
  as: "systemStates",
});
SystemState.belongsTo(SuperAdmin, {
  foreignKey: "superAdminId",
  as: "superAdmin",
});

// Admin associations with SystemState
Admin.hasMany(SystemState, {
  foreignKey: "adminId",
  as: "systemStates",
});
SystemState.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Admin associations with ActivityLog
Admin.hasMany(ActivityLog, {
  foreignKey: "adminId",
  as: "activityLogs",
});
ActivityLog.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Manager associations with ActivityLog
Manager.hasMany(ActivityLog, {
  foreignKey: "managerId",
  as: "activityLogs",
});
ActivityLog.belongsTo(Manager, {
  foreignKey: "managerId",
  as: "manager",
});

// Manager associations with SystemState
Manager.hasMany(SystemState, {
  foreignKey: "managerId",
  as: "systemStates",
});
SystemState.belongsTo(Manager, {
  foreignKey: "managerId",
  as: "manager",
});

// Event associations
// Admin associations with Event
Admin.hasMany(Event, {
  foreignKey: "adminId",
  as: "events",
});
Event.belongsTo(Admin, {
  foreignKey: "adminId",
  as: "admin",
});

// Manager associations with Event
Manager.hasMany(Event, {
  foreignKey: "managerId",
  as: "events",
});
Event.belongsTo(Manager, {
  foreignKey: "managerId",
  as: "manager",
});

// Event associations with AC (device)
AC.hasMany(Event, {
  foreignKey: "deviceId",
  as: "events",
});
Event.belongsTo(AC, {
  foreignKey: "deviceId",
  as: "device",
});

// Event associations with Organization (optional - for organizationId field)
Organization.hasMany(Event, {
  foreignKey: "organizationId",
  as: "events",
});
Event.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

// Event associations with Venue - REMOVED: Events don't have venueId, they link to Venue through AC device
// Events are linked to AC devices, and ACs belong to Venues
// So we access Venue through: Event → AC → Venue

// Self-referential association for parent admin events
Event.hasMany(Event, {
  foreignKey: "parentAdminEventId",
  as: "managerEvents",
});
Event.belongsTo(Event, {
  foreignKey: "parentAdminEventId",
  as: "parentAdminEvent",
});

module.exports = {
  Admin,
  Manager,
  Organization,
  Venue,
  AC,
  SuperAdmin,
  ActivityLog,
  SystemState,
  Event,
};
