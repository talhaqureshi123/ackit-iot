const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const AC = sequelize.define(
  "AC",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ton: {
      type: DataTypes.ENUM("0.5", "1", "1.5", "2"),
      allowNull: false,
      comment: "AC capacity in tons (0.5, 1, 1.5, or 2 ton) - Required field",
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Base64 encoded key for AC device authentication",
    },
    venueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "organizations", // Swapped: ACs now reference organizations table (which is used by Venue model)
        key: "id",
      },
    },

    temperature: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 16,
    },
    isOn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Track who toggled power state and when
    lastPowerChangeAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastPowerChangeBy: {
      type: DataTypes.ENUM("admin", "manager"),
      allowNull: true,
    },
    lastTemperatureChange: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    changedBy: {
      type: DataTypes.ENUM("admin", "manager"),
      allowNull: true,
    },
    // Device health / alerting
    isWorking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    alertAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Energy consumption tracking
    currentMode: {
      type: DataTypes.ENUM("eco", "normal", "high"),
      allowNull: true,
      defaultValue: "high",
      comment: "Current AC mode: eco, normal, or high (default: high)",
    },
    // Lock status fields (exist in DB but not in model definition)
    // These are handled at the database level and will be returned by Sequelize
    // currentState, lockedBy, lockedAt, lockReason
    totalEnergyConsumed: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Total energy consumed in kWh (lifetime)",
    },
    lastEnergyCalculation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time energy consumption was calculated",
    },
    isOnStartup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Flag indicating if AC is in startup period (high consumption)",
    },
    startupStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When AC turned on (for startup period calculation)",
    },
    // Room temperature tracking for cooling detection
    roomTemperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Current room temperature from ESP sensor",
    },
    roomTempHistory: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: "Array of {temp, timestamp} for tracking 3-hour cooling pattern",
    },
    lastRoomTempCheck: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time room temperature was requested/checked",
    },
    lastRoomTempUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time room temperature was updated by ESP",
    },
    // Lock status fields
    currentState: {
      type: DataTypes.ENUM("locked", "unlocked"),
      allowNull: true,
      defaultValue: "unlocked",
      comment: "Current lock state of the AC device",
    },
    lockedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Who locked the device (e.g., 'admin', 'Manager-1')",
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the device was locked",
    },
    lockReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Reason for locking the device",
    },
  },
  {
    tableName: "acs",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["serialNumber"],
        name: "unique_ac_serial_number",
      },
      {
        unique: true,
        fields: ["venueId", "serialNumber"],
        name: "unique_venue_ac_serial",
      },
      {
        unique: true,
        fields: ["key"],
        name: "unique_ac_key",
      },
    ],
  }
);

module.exports = AC;
