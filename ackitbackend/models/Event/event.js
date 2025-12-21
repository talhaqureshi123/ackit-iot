const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Event name/description",
    },
    eventType: {
      type: DataTypes.ENUM("device", "organization"),
      allowNull: false,
      comment:
        "Type of event: ONLY 'device' is supported. Organization events are NOT used. All events must be device-level (AC) events.",
    },
    // Events are ONLY for AC devices - organization/venue events are NOT supported
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "acs",
        key: "id",
      },
      comment:
        "AC device ID - REQUIRED for all events (events are device-level only)",
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "organizations",
        key: "id",
      },
      comment:
        "DEPRECATED: Organization events are NOT supported. This field is always null. Events are device-level only.",
    },
    // Creator information
    createdBy: {
      type: DataTypes.ENUM("admin", "manager"),
      allowNull: false,
      comment: "Who created the event",
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "admins",
        key: "id",
      },
      comment: "Admin ID if created by admin",
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "managers",
        key: "id",
      },
      comment: "Manager ID if created by manager",
    },
    // Event timing
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Event start time (stored as UTC TIMESTAMPTZ in database)",
      // CRITICAL: Sequelize DATE maps to PostgreSQL TIMESTAMPTZ
      // Backend must send UTC ISO strings, PostgreSQL will store as UTC
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Event end time (stored as UTC TIMESTAMPTZ in database)",
      // CRITICAL: Sequelize DATE maps to PostgreSQL TIMESTAMPTZ
      // Backend must send UTC ISO strings, PostgreSQL will store as UTC
    },
    // Event settings
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Temperature setting for the event (optional)",
    },
    powerOn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether to turn power on for this event",
    },
    // Event status
    status: {
      type: DataTypes.ENUM(
        "scheduled",
        "active",
        "completed",
        "cancelled",
        "stopped"
      ),
      defaultValue: "scheduled",
      comment:
        "Event status: scheduled, active, completed, cancelled, or stopped",
    },
    // Relationship to admin event (for manager events)
    parentAdminEventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "events",
        key: "id",
      },
      comment:
        "Admin event ID if this is a manager event (must exist before manager can create)",
    },
    // Auto-start/stop tracking
    autoStarted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the event was auto-started when admin event stopped",
    },
    autoEnded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the event was auto-ended when admin event stopped",
    },
    stoppedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the event was stopped (for admin events)",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the event actually started",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the event completed",
    },
    // Disable/Enable feature
    isDisabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the event is currently disabled/paused",
    },
    disabledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the event was disabled/paused",
    },
    originalEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Original end time before any extensions due to disable/enable",
    },
    totalDisabledDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Total milliseconds the event has been disabled (for tracking)",
    },
    // Recurring event fields
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this is a recurring event (weekly schedule)",
    },
    recurringType: {
      type: DataTypes.ENUM("weekly"),
      allowNull: true,
      comment: "Type of recurring event (currently only 'weekly' supported)",
    },
    daysOfWeek: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment:
        "Array of days of week [0-6] where 0=Sunday, 1=Monday, etc. Example: [1,2,3,4,5] for Mon-Fri",
    },
    recurringStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Start date for recurring schedule (YYYY-MM-DD)",
    },
    recurringEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "End date for recurring schedule (YYYY-MM-DD)",
    },
    timeStart: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Daily start time for recurring events (HH:MM:SS)",
    },
    timeEnd: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Daily end time for recurring events (HH:MM:SS)",
    },
    parentRecurringEventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "events",
        key: "id",
      },
      comment:
        "Reference to parent recurring event template (for generated instances)",
    },
  },
  {
    tableName: "events",
    timestamps: true,
    indexes: [
      {
        fields: ["deviceId"],
      },
      {
        fields: ["organizationId"],
      },
      {
        fields: ["adminId"],
      },
      {
        fields: ["managerId"],
      },
      {
        fields: ["startTime", "endTime"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["parentAdminEventId"],
      },
      {
        fields: ["isRecurring"],
      },
      {
        fields: ["parentRecurringEventId"],
      },
      {
        fields: ["recurringStartDate", "recurringEndDate"],
      },
    ],
  }
);

module.exports = Event;
