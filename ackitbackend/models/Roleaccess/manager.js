const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database/postgresql");

const Manager = sequelize.define(
  "Manager",
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
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "admins",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("unlocked", "locked", "restricted"),
      allowNull: false,
      defaultValue: "unlocked",
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lockedByAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "admins",
        key: "id",
      },
    },
  },
  {
    tableName: "managers",
    timestamps: true,
  }
);

module.exports = Manager;
