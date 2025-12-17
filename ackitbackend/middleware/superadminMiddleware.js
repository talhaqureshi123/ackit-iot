// SuperAdmin Middleware - Integration point for all super admin functionality
const SuperAdminAuth = require("../rolebaseaccess/superadmin/authentication/superAdminAuth");

class SuperAdminMiddleware {
  // Use secure SuperAdminAuth authentication
  static authenticateSuperAdmin = SuperAdminAuth.authenticateSuperAdmin;

  // Require super admin role
  static requireSuperAdmin = SuperAdminAuth.requireSuperAdmin;

  // Combined authentication and authorization
  static authenticate = [SuperAdminAuth.authenticateSuperAdmin, SuperAdminAuth.requireSuperAdmin];
}

module.exports = SuperAdminMiddleware;
