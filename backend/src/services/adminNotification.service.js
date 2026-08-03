// Admin Notification Service - Sends email notifications to all admins when reports/appeals are created
const { getDatabase } = require('../db/database');
const { queueMail } = require('./mail.service');
const config = require('../config');

/**
 * Format a report number as RPT-XXXXX
 */
function formatReportNumber(id) {
  return `RPT-${String(id).padStart(5, '0')}`;
}

/**
 * Format an appeal number as APL-XXXXX
 */
function formatAppealNumber(id) {
  return `APL-${String(id).padStart(5, '0')}`;
}

/**
 * Get list of all admin user email addresses
 */
function getAdminEmails() {
  try {
    const db = getDatabase();
    const admins = db.prepare(`
      SELECT email, username 
      FROM users 
      WHERE is_admin = 1 AND email IS NOT NULL AND email != ''
    `).all();
    return admins;
  } catch (err) {
    console.error('[Admin Notification] Error fetching admin emails:', err.message);
    return [];
  }
}

/**
 * Notify all admins about a new report (message report or community report)
 */
function notifyAdminsNewReport({ reportId, type = 'message', reason, reporterUsername, itemDetails }) {
  try {
    const admins = getAdminEmails();
    if (admins.length === 0) {
      console.log('[Admin Notification] No admins with email found for report notification.');
      return;
    }

    const reportNumber = formatReportNumber(reportId);
    const directLink = `${config.frontendUrl}/admin/moderation?reportId=${reportId}`;
    const subject = `[MTT Moderation] New Report ${reportNumber} (${type === 'community' ? 'Community' : 'Message'})`;

    for (const admin of admins) {
      queueMail(
        admin.email,
        subject,
        'admin-report',
        {
          recipient_name: admin.username,
          title: `New Report Submitted (${reportNumber})`,
          body: `A new ${type} report (${reportNumber}) has been submitted by user @${reporterUsername || 'unknown'}.\n\nReason: "${reason || 'No reason specified'}"\n${itemDetails ? `\nDetails: ${itemDetails}\n` : ''}\nClick below to review this report directly in the MTT Moderation queue:`,
          action_text: `Review Report ${reportNumber}`,
          action_url: directLink
        }
      );
    }
  } catch (err) {
    console.error('[Admin Notification] Failed to notify admins of report:', err.message);
  }
}

/**
 * Notify all admins about a new appeal
 */
function notifyAdminsNewAppeal({ appealId, reason, authorUsername, termName }) {
  try {
    const admins = getAdminEmails();
    if (admins.length === 0) {
      console.log('[Admin Notification] No admins with email found for appeal notification.');
      return;
    }

    const appealNumber = formatAppealNumber(appealId);
    const directLink = `${config.frontendUrl}/admin/moderation?appealId=${appealId}`;
    const subject = `[MTT Moderation] New Appeal ${appealNumber} Submitted`;

    for (const admin of admins) {
      queueMail(
        admin.email,
        subject,
        'admin-report',
        {
          recipient_name: admin.username,
          title: `New Appeal Submitted (${appealNumber})`,
          body: `A new translation appeal (${appealNumber}) has been submitted by user @${authorUsername || 'unknown'}${termName ? ` regarding term "${termName}"` : ''}.\n\nReason: "${reason || 'No reason specified'}"\n\nClick below to review this appeal directly in the MTT Moderation queue:`,
          action_text: `Review Appeal ${appealNumber}`,
          action_url: directLink
        }
      );
    }
  } catch (err) {
    console.error('[Admin Notification] Failed to notify admins of appeal:', err.message);
  }
}

module.exports = {
  formatReportNumber,
  formatAppealNumber,
  getAdminEmails,
  notifyAdminsNewReport,
  notifyAdminsNewAppeal
};
