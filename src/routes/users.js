const express = require('express');
const router = express.Router();
const { readDB } = require('../db/database');

/**
 * List all staff members
 */
router.get('/', (req, res) => {
  const db = readDB();
  const usersWithStatus = db.users.map(u => {
    // Current time status indicator
    return {
      ...u,
      live_status: u.id === 'usr_sharma' ? 'busy' : 'available',
      status_label: u.id === 'usr_sharma' ? '🔴 In Lecture (LH-2)' : '🟢 Free Now'
    };
  });
  res.json({ users: usersWithStatus });
});

/**
 * Get single staff details + timetable
 */
router.get('/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Staff member not found' });

  const timetable = db.timetables.filter(tt => tt.user_id === user.id);
  res.json({ user, timetable });
});

module.exports = router;
