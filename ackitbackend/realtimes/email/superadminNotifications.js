const nodemailer = require("nodemailer");

class SuperAdminNotificationService {
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

    // Send suspension notification to admin
  async sendSuspensionNotification(adminEmail, adminName, reason, suspendedBy) {
    try {
      // Validate inputs
      if (!adminEmail || !adminName || !reason || !suspendedBy) {
        throw new Error("All parameters are required for suspension notification");
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        throw new Error("Invalid email format");
      }
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: adminEmail,
        subject: "Account Suspension Notice - ACKit System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Account Suspension Notice</h2>
            
            <p>Dear ${adminName},</p>
            
            <p>Your ACKit admin account has been suspended by the system administrator.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc3545;">Suspension Details:</h3>
              <ul>
                <li><strong>Reason:</strong> ${reason}</li>
                <li><strong>Suspended By:</strong> Super Admin (${suspendedBy})</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p><strong>What this means:</strong></p>
            <ul>
              <li>Your account access has been temporarily disabled</li>
              <li>All managers and ACs under your account are also suspended</li>
              <li>All ongoing operations (locks, unlocks, AC states) are frozen</li>
              <li>You will be notified when your account is restored</li>
            </ul>
            
            <p>If you believe this suspension is in error, please contact the system administrator.</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Suspension notification sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending suspension notification:", error);
      throw error;
    }
  }

  // Send resumption notification to admin
  async sendResumptionNotification(adminEmail, adminName, resumedBy) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: adminEmail,
        subject: "Account Restored - ACKit System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Account Restored</h2>
            
            <p>Dear ${adminName},</p>
            
            <p>Your ACKit admin account has been restored and is now active.</p>
            
            <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">Restoration Details:</h3>
              <ul>
                <li><strong>Restored By:</strong> Super Admin (${resumedBy})</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Status:</strong> All systems restored to previous state</li>
              </ul>
            </div>
            
            <p><strong>What has been restored:</strong></p>
            <ul>
              <li>Your admin account access</li>
              <li>All managers, organizations, and ACs under your account</li>
              <li>All AC states (locked/unlocked) exactly as before suspension</li>
              <li>All WebSocket connections and real-time controls</li>
              <li>All scheduled operations and monitoring</li>
            </ul>
            
            <p>You can now access your account and resume normal operations.</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Resumption notification sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending resumption notification:", error);
      throw error;
    }
  }

  // Send system alert to super admin
  async sendSystemAlert(superAdminEmail, alertType, details) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: superAdminEmail,
        subject: `System Alert: ${alertType} - ACKit System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">System Alert</h2>
            
            <p>Dear Super Administrator,</p>
            
            <p>A system alert has been triggered:</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Alert Details:</h3>
              <ul>
                <li><strong>Type:</strong> ${alertType}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Details:</strong> ${details}</li>
              </ul>
            </div>
            
            <p>Please review this alert and take appropriate action if necessary.</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated alert from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`System alert sent to ${superAdminEmail}`);
    } catch (error) {
      console.error("Error sending system alert:", error);
      throw error;
    }
  }
}

module.exports = new SuperAdminNotificationService();
