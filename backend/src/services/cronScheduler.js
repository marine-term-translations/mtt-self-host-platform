const cron = require("node-cron");
const { getDatabase } = require("../db/database");

function initCronJobs() {
  // Run daily at midnight: 0 0 * * *
  cron.schedule("0 0 * * *", () => {
    console.log("[Cron] Running daily event status check and rank digests...");
    try {
      const db = getDatabase();
      const nowISO = new Date().toISOString();

      // Transition UPCOMING -> ACTIVE
      db.prepare("UPDATE events SET status = 'ACTIVE' WHERE status = 'UPCOMING' AND start_date <= ?").run(nowISO);

      // Transition ACTIVE -> ENDED
      db.prepare("UPDATE events SET status = 'ENDED' WHERE status = 'ACTIVE' AND end_date <= ?").run(nowISO);
    } catch (err) {
      console.error("[Cron Error] Daily event status update failed:", err.message);
    }
  });
}

module.exports = { initCronJobs };
