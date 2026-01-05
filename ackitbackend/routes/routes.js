const express = require("express");
const router = express.Router();

// Import unified auth routes (auto-detect role)
const unifiedAuthRoutes = require("./unifiedAuthRoutes");

// Import super admin module (gateway)
const superAdminModule = require("../rolebaseaccess/superadmin");

// Import admin module (gateway)
const adminModule = require("../rolebaseaccess/admin");

// Import manager module (gateway)
const managerModule = require("../rolebaseaccess/manager");

// Unified Auth Routes (auto-detect role from email)
// POST /api/auth/login - automatically detects admin/superadmin/manager
router.use("/auth", unifiedAuthRoutes);

// Super Admin Routes (through gateway)
router.use("/superadmin", superAdminModule.routes);

// Admin Routes (through gateway)
router.use("/admin", adminModule.routes);

// Manager Routes (through gateway)
router.use("/manager", managerModule.routes);

module.exports = router;
