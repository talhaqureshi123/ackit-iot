const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const Admin = sequelize.define(
  "Admin",
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "suspended"),
      defaultValue: "active",
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspendedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "superadmins",
        key: "id",
      },
    },
    suspensionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "admins",
    timestamps: true,
  }
);

module.exports = Admin;
