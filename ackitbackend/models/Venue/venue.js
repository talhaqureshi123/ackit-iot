const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const Venue = sequelize.define(
  "Venue",
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
    organizationSize: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Size of the venue (e.g., Small, Medium, Large, Enterprise) - Required field",
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "venues", // Swapped: Organization model now uses venues table, so foreign key points to venues
        key: "id",
      },
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "admins",
        key: "id",
      },
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "managers",
        key: "id",
      },
    },
    // Admin-only lock state
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lockedByAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "admins",
        key: "id",
      },
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lockedTemperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 16,
        max: 30,
      },
      comment: "Locked temperature when organization/venue is locked",
    },
    status: {
      type: DataTypes.ENUM("active", "split"),
      defaultValue: "active",
    },
    // Split functionality fields
    splitFromId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "organizations", // Swapped: Venue model uses organizations table, so self-reference points to organizations
        key: "id",
      },
    },
    splitIntoIds: {
      type: DataTypes.TEXT, // JSON array of venue IDs
      allowNull: true,
    },
    splitAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    splitHistory: {
      type: DataTypes.TEXT, // JSON object with split history
      allowNull: true,
    },
    // Rejoin tracking (manager can split; rejoin into previous venue)
    rejoinedIntoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "organizations", // Swapped: Venue model uses organizations table, so self-reference points to organizations
        key: "id",
      },
    },
    rejoinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejoinHistory: {
      type: DataTypes.TEXT, // JSON array of rejoin events
      allowNull: true,
    },
    temperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 16,
      validate: {
        min: 16,
        max: 30,
      },
    },
    lastTemperatureChange: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "lasttemperaturechange",
    },
    changedBy: {
      type: DataTypes.ENUM("admin", "manager"),
      allowNull: true,
      field: "changedby",
    },
    // Energy consumption tracking
    totalEnergyConsumed: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Total energy consumed by all ACs in this venue (kWh)",
    },
    lastEnergyCalculation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time venue energy consumption was calculated",
    },
    // Venue power control fields
    isVenueOn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Venue-level power state - when ON, all ACs are ON by default, when OFF, all ACs are OFF",
    },
    venuePowerChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time venue power was toggled",
    },
    venuePowerChangedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Who toggled venue power (admin or manager)",
    },
  },
  {
    tableName: "organizations", // Swapped: Venue model now uses organizations table (complex structure)
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["adminId", "name"],
        name: "unique_admin_venue_name",
      },
    ],
  }
);

module.exports = Venue;
