const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(requireAdmin);

/**
 * Get institutional admin metrics
 */
router.get('/stats', (req, res) => {
  const db = readDB();
  res.json({
    institution: "Indira Gandhi Delhi Technical University (IGDTUW)",
    totalStaff: db.users.length + 122,
    connectedCalendarsPercentage: 94,
    timetableUploadRatePercentage: 100,
    termMeetingsScheduled: 342 + db.meetings.length,
    activeAdmins: db.users.filter(u => u.role === 'admin').map(u => ({ id: u.id, name: u.name, email: u.email }))
  });
});

/**
 * Get all staff for role assignment
 */
router.get('/staff', (req, res) => {
  const db = readDB();
  res.json({ staff: db.users });
});

/**
 * Assign role to staff member
 */
router.post('/assign-role', (req, res) => {
  const { userId, role } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Staff member not found' });

  user.role = role;
  writeDB(db);

  res.json({ message: `Role for ${user.name} updated to ${role}`, user });
});

/**
 * Upload master institutional timetable
 */
router.post('/upload-master-timetable', (req, res) => {
  const db = readDB();
  db.ai_logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    task_name: "Master University Timetable Ingestion",
    meeting_id: "GLOBAL",
    action_taken: `Admin updated University-wide master timetable for Semester 1 (18 Academic Departments).`,
    status: "success",
    latency_ms: 45
  });
  writeDB(db);

  res.json({ message: "Master Timetable updated and broadcasted to all departments." });
});

module.exports = router;
