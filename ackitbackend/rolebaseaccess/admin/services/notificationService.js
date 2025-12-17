const nodemailer = require("nodemailer");
const ActivityLog = require("../../../models/Activity log/activityLog");

class AdminNotificationService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Helper function to check if notifications are disabled
  _isNotificationDisabled() {
    const notificationEmail = process.env.IOTIFY_NOTIFICATION_EMAIL;
    return (
      !notificationEmail ||
      notificationEmail === "iotify@company.com" ||
      notificationEmail === "disabled" ||
      notificationEmail.toLowerCase() === "disabled" ||
      notificationEmail.toLowerCase() === "false" ||
      notificationEmail.toLowerCase() === "off"
    );
  }

  // Send notification to IoTify about Manager actions
  async sendManagerActionNotification(managerName, action, details, adminName) {
    try {
      if (this._isNotificationDisabled()) {
        console.log(
          "⚠️  Manager action email notifications disabled - IOTIFY_NOTIFICATION_EMAIL is disabled"
        );
        console.log(
          `📧 Would have sent: Manager ${action} notification for ${managerName} to IoTify`
        );
        return { success: true, message: "Email notifications disabled" };
      }

      const notificationEmail = process.env.IOTIFY_NOTIFICATION_EMAIL;
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: notificationEmail,
        subject: `Manager Action Alert: ${action} - ACKit System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Manager Action Notification</h2>
            <p>Dear IoTify Team,</p>
            <p>A manager action has been performed in the ACKit system:</p>
            <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0056b3;">Action Details:</h3>
              <ul>
                <li><strong>Manager:</strong> ${managerName}</li>
                <li><strong>Action:</strong> ${action}</li>
                <li><strong>Performed by Admin:</strong> ${adminName}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Details:</strong> ${details}</li>
              </ul>
            </div>
            <p>Please review this action and take appropriate measures if necessary.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated notification from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ Manager action notification sent to IoTify: ${action} by ${managerName}`
      );
    } catch (error) {
      console.error("❌ Error sending manager action notification:", error);
      throw error;
    }
  }

  // Send notification to IoTify about Organization/AC actions
  async sendSystemActionNotification(
    action,
    targetType,
    targetName,
    details,
    adminName
  ) {
    try {
      if (this._isNotificationDisabled()) {
        console.log(
          "⚠️  System action email notifications disabled - IOTIFY_NOTIFICATION_EMAIL is disabled"
        );
        console.log(
          `📧 Would have sent: System ${action} notification for ${targetType} - ${targetName} to IoTify`
        );
        return { success: true, message: "Email notifications disabled" };
      }

      const notificationEmail = process.env.IOTIFY_NOTIFICATION_EMAIL;
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: notificationEmail,
        subject: `System Action Alert: ${action} - ACKit System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">System Action Notification</h2>
            <p>Dear IoTify Team,</p>
            <p>A system action has been performed in the ACKit system:</p>
            <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #155724;">Action Details:</h3>
              <ul>
                <li><strong>Action:</strong> ${action}</li>
                <li><strong>Target Type:</strong> ${targetType}</li>
                <li><strong>Target Name:</strong> ${targetName}</li>
                <li><strong>Performed by Admin:</strong> ${adminName}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Details:</strong> ${details}</li>
              </ul>
            </div>
            <p>Please review this action and take appropriate measures if necessary.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated notification from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ System action notification sent to IoTify: ${action} on ${targetType} - ${targetName}`
      );
    } catch (error) {
      console.error("❌ Error sending system action notification:", error);
      throw error;
    }
  }

  // Send critical alert to IoTify
  async sendCriticalAlert(alertType, details, adminName) {
    try {
      if (this._isNotificationDisabled()) {
        console.log(
          "⚠️  Critical alert email notifications disabled - IOTIFY_NOTIFICATION_EMAIL is disabled"
        );
        console.log(
          `📧 Would have sent: Critical alert ${alertType} to IoTify`
        );
        return { success: true, message: "Email notifications disabled" };
      }

      const notificationEmail = process.env.IOTIFY_NOTIFICATION_EMAIL;
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: notificationEmail,
        subject: `🚨 CRITICAL ALERT: ${alertType} - ACKit System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">🚨 CRITICAL ALERT</h2>
            <p>Dear IoTify Team,</p>
            <p>A critical alert has been triggered in the ACKit system:</p>
            <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #721c24;">Alert Details:</h3>
              <ul>
                <li><strong>Alert Type:</strong> ${alertType}</li>
                <li><strong>Triggered by Admin:</strong> ${adminName}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Details:</strong> ${details}</li>
              </ul>
            </div>
            <p><strong>IMMEDIATE ACTION REQUIRED</strong></p>
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is a critical automated alert from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`🚨 Critical alert sent to IoTify: ${alertType}`);
    } catch (error) {
      console.error("❌ Error sending critical alert:", error);
      throw error;
    }
  }

  // Get manager activity logs for admin visibility
  async getManagerActivityLogs(adminId, managerId = null, limit = 50) {
    try {
      const whereClause = { adminId: adminId };

      if (managerId) {
        whereClause.targetId = managerId;
        whereClause.targetType = "manager";
      }

      const logs = await ActivityLog.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: limit,
        attributes: [
          "id",
          "action",
          "targetType",
          "targetId",
          "details",
          "createdAt",
        ],
      });

      return {
        success: true,
        logs: logs,
      };
    } catch (error) {
      console.error("Error fetching manager activity logs:", error);
      throw error;
    }
  }

  // Log manager action for admin visibility
  async logManagerAction(adminId, managerId, action, details) {
    try {
      await ActivityLog.create({
        adminId: adminId,
        action: action,
        targetType: "manager",
        targetId: managerId,
        details: details,
      });

      console.log(
        `✅ Manager action logged: ${action} for manager ${managerId}`
      );
    } catch (error) {
      console.error("❌ Error logging manager action:", error);
      throw error;
    }
  }
}

module.exports = new AdminNotificationService();
