const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const PlanRequest = sequelize.define(
  "PlanRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "admins",
        key: "id",
      },
    },
    currentPlan: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "basic",
    },
    requestedPlan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "superadmins",
        key: "id",
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "plan_requests",
    timestamps: true,
  }
);

module.exports = PlanRequest;



