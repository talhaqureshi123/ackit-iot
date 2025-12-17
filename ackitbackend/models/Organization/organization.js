const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const Organization = sequelize.define(
  "Organization",
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
    batchNumber: {
      type: DataTypes.STRING,
      allowNull: true,
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
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "venues", // Swapped: Organization model now uses venues table (simple structure)
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["adminId", "name"],
        name: "unique_admin_organization_name",
      },
    ],
  }
);

module.exports = Organization;
