const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const SystemState = sequelize.define(
  "SystemState",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    superAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "superadmins",
        key: "id",
      },
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    entityType: {
      type: DataTypes.ENUM("ac", "organization", "manager", "admin"),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actionType: {
      type: DataTypes.ENUM("lock", "suspend"),
      allowNull: false,
      defaultValue: "lock",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    previousState: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    unlockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "system_states",
    timestamps: true,
  }
);

module.exports = SystemState;
