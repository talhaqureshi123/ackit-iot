/**
 * Centralized Session Management Helper
 * Provides consistent session handling across all roles and controllers
 */

class SessionHelper {
  /**
   * Ensure session exists and refresh it
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} role - User role (admin, manager, superadmin)
   * @returns {boolean} - True if session is valid, false otherwise
   */
  static ensureSession(req, res, role = "user") {
    try {
      // Check if session exists
      if (!req.session) {
        console.error(`❌ [${role.toUpperCase()}] No session object available`);
        res.status(401).json({
          success: false,
          message: "Session not available",
          role: role,
        });
        return false;
      }

      // Check if session has required data
      if (!req.session.sessionId || !req.session.user) {
        console.error(
          `❌ [${role.toUpperCase()}] Session missing required data`
        );
        res.status(401).json({
          success: false,
          message: "Invalid session data",
          role: role,
        });
        return false;
      }

      // Check if user role matches expected role
      if (req.session.user.role !== role) {
        console.error(
          `❌ [${role.toUpperCase()}] Role mismatch. Expected: ${role}, Got: ${
            req.session.user.role
          }`
        );
        res.status(403).json({
          success: false,
          message: `Access denied. ${role} role required`,
          role: role,
        });
        return false;
      }

      // Refresh session to prevent expiration
      if (req.session.touch) {
        req.session.touch();
      }

      console.log(`✅ [${role.toUpperCase()}] Session validated and refreshed`);
      return true;
    } catch (error) {
      console.error(
        `❌ [${role.toUpperCase()}] Session validation error:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Session validation error",
        role: role,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Refresh session without validation (for operations that don't require role check)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {boolean} - True if session refreshed, false otherwise
   */
  static refreshSession(req, res) {
    try {
      if (!req.session) {
        console.error("❌ No session to refresh");
        return false;
      }

      if (req.session.touch) {
        req.session.touch();
        console.log("✅ Session refreshed");
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Session refresh error:", error);
      return false;
    }
  }

  /**
   * Safely destroy session with error handling
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} role - User role for logging
   * @returns {Promise<boolean>} - True if session destroyed successfully
   */
  static async destroySession(req, res, role = "user") {
    return new Promise((resolve) => {
      try {
        if (!req.session) {
          console.log(`ℹ️ [${role.toUpperCase()}] No session to destroy`);
          resolve(true);
          return;
        }

        if (req.session.destroy) {
          req.session.destroy((err) => {
            if (err) {
              console.error(
                `❌ [${role.toUpperCase()}] Session destroy error:`,
                err
              );
              resolve(false);
            } else {
              console.log(
                `✅ [${role.toUpperCase()}] Session destroyed successfully`
              );
              resolve(true);
            }
          });
        } else {
          console.log(`ℹ️ [${role.toUpperCase()}] No destroy method available`);
          resolve(true);
        }
      } catch (error) {
        console.error(
          `❌ [${role.toUpperCase()}] Session destroy error:`,
          error
        );
        resolve(false);
      }
    });
  }

  /**
   * Get session info for debugging
   * @param {Object} req - Express request object
   * @returns {Object} - Session information
   */
  static getSessionInfo(req) {
    return {
      exists: !!req.session,
      sessionId: req.session?.sessionId,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
      userName: req.session?.user?.name,
      userEmail: req.session?.user?.email,
      cookieId: req.sessionID,
    };
  }

  /**
   * Log session information for debugging
   * @param {Object} req - Express request object
   * @param {string} context - Context for logging
   */
  static logSessionInfo(req, context = "Session Check") {
    const info = this.getSessionInfo(req);
    console.log(`🔍 [${context}] Session Info:`, info);
  }
}

module.exports = SessionHelper;
