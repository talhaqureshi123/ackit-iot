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

  // Send plan request approval notification to admin
  async sendPlanApprovalNotification(adminEmail, adminName, requestedPlan, reviewedBy) {
    try {
      if (!adminEmail || !adminName || !requestedPlan) {
        throw new Error("All parameters are required for plan approval notification");
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        throw new Error("Invalid email format");
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: adminEmail,
        subject: "Plan Upgrade Approved - ACKit System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Plan Upgrade Approved</h2>
            
            <p>Dear ${adminName},</p>
            
            <p>Great news! Your plan upgrade request has been approved by the Super Admin.</p>
            
            <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">Plan Details:</h3>
              <ul>
                <li><strong>New Plan:</strong> ${requestedPlan.charAt(0).toUpperCase() + requestedPlan.slice(1)}</li>
                <li><strong>Approved By:</strong> Super Admin (${reviewedBy || 'System'})</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p><strong>What's next:</strong></p>
            <ul>
              <li>Your account has been upgraded to ${requestedPlan.charAt(0).toUpperCase() + requestedPlan.slice(1)} plan</li>
              <li>You can now access all features available in your new plan</li>
              <li>If you have any questions, please contact the IOTFIY team</li>
            </ul>
            
            <p>Thank you for using ACKit!</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Plan approval notification sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending plan approval notification:", error);
      throw error;
    }
  }

  // Send plan request rejection notification to admin
  async sendPlanRejectionNotification(adminEmail, adminName, requestedPlan, rejectionReason, reviewedBy) {
    try {
      if (!adminEmail || !adminName || !requestedPlan) {
        throw new Error("All parameters are required for plan rejection notification");
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        throw new Error("Invalid email format");
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: adminEmail,
        subject: "Plan Upgrade Request - ACKit System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Plan Upgrade Request</h2>
            
            <p>Dear ${adminName},</p>
            
            <p>We regret to inform you that your plan upgrade request has been reviewed and could not be approved at this time.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc3545;">Request Details:</h3>
              <ul>
                <li><strong>Requested Plan:</strong> ${requestedPlan.charAt(0).toUpperCase() + requestedPlan.slice(1)}</li>
                <li><strong>Reviewed By:</strong> Super Admin (${reviewedBy || 'System'})</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                ${rejectionReason ? `<li><strong>Reason:</strong> ${rejectionReason}</li>` : ''}
              </ul>
            </div>
            
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>You can submit a new plan upgrade request if needed</li>
              <li>If you have questions about this decision, please contact the IOTFIY team</li>
              <li>We're here to help you find the best plan for your needs</li>
            </ul>
            
            <p>Thank you for your understanding.</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Plan rejection notification sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending plan rejection notification:", error);
      throw error;
    }
  }

  // Send plan update notification to admin (direct update without request)
  async sendPlanUpdateNotification(adminEmail, adminName, newPlan, reason) {
    try {
      if (!adminEmail || !adminName || !newPlan) {
        throw new Error("All parameters are required for plan update notification");
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        throw new Error("Invalid email format");
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@ackit.com",
        to: adminEmail,
        subject: "Plan Updated - ACKit System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Plan Updated</h2>
            
            <p>Dear ${adminName},</p>
            
            <p>Your account plan has been updated by the Super Admin.</p>
            
            <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0056b3;">Plan Details:</h3>
              <ul>
                <li><strong>New Plan:</strong> ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}</li>
                <li><strong>Updated By:</strong> Super Admin</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
              </ul>
            </div>
            
            <p><strong>What this means:</strong></p>
            <ul>
              <li>Your account plan has been changed to ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}</li>
              <li>You now have access to all features available in your new plan</li>
              <li>If you have any questions, please contact the IOTFIY team</li>
            </ul>
            
            <p>Thank you for using ACKit!</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated message from the ACKit IoT Management System.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Plan update notification sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending plan update notification:", error);
      throw error;
    }
  }
}

module.exports = new SuperAdminNotificationService();
