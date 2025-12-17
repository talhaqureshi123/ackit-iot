const express = require("express");
const router = express.Router();

// Import super admin module (gateway)
const superAdminModule = require("../rolebaseaccess/superadmin");

// Import admin module (gateway)
const adminModule = require("../rolebaseaccess/admin");

// Import manager module (gateway)
const managerModule = require("../rolebaseaccess/manager");

// Super Admin Routes (through gateway)
router.use("/superadmin", superAdminModule.routes);

// Admin Routes (through gateway)
router.use("/admin", adminModule.routes);

// Manager Routes (through gateway)
router.use("/manager", managerModule.routes);

module.exports = router;
