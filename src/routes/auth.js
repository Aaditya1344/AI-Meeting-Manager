const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db/database');

/**
 * Google Login (Supports both OAuth flow & quick Google Workspace selection)
 */
router.post('/google', (req, res) => {
  const { email, name, avatar } = req.body;
  const db = readDB();

  let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!user) {
    // Determine default role: if email or name contains aditya or arun -> admin, else faculty
    const isInitialAdmin = 
      (email && (email.toLowerCase().includes('aditya') || email.toLowerCase().includes('arun'))) ||
      (name && (name.toLowerCase().includes('aditya') || name.toLowerCase().includes('arun')));

    user = {
      id: `usr_${Date.now()}`,
      name: name || "Google User",
      email: email || `user_${Date.now()}@igdtuw.ac.in`,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=4f46e5`,
      designation: "", // Pending onboarding
      department: "",
      employee_id: "",
      cabin: "",
      role: isInitialAdmin ? "admin" : "faculty",
      onboarded: false,
      gcal_connected: true
    };

    db.users.push(user);
    writeDB(db);
  }

  res.json({
    message: "Google authentication successful",
    user,
    requiresOnboarding: !user.onboarded
  });
});

/**
 * Complete Profile Onboarding (Designation, Department, Employee ID, Cabin)
 */
router.post('/onboard', (req, res) => {
  const { userId, designation, department, employee_id, cabin } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user-provided institutional metadata
  user.designation = designation || user.designation || "Assistant Professor";
  user.department = department || user.department || "Computer Science & Engineering";
  user.employee_id = employee_id || user.employee_id || `IGDTUW-EMP-${Math.floor(100 + Math.random() * 900)}`;
  user.cabin = cabin || user.cabin || "Main Faculty Block";
  user.onboarded = true;

  // If role wasn't already admin and user is HOD/Dean, give organizer role
  if (user.role !== 'admin') {
    if (designation.toLowerCase().includes('hod') || designation.toLowerCase().includes('head') || designation.toLowerCase().includes('dean')) {
      user.role = 'organizer';
    }
  }

  writeDB(db);

  res.json({
    message: "Profile onboarding completed successfully",
    user
  });
});

/**
 * Get current session user
 */
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

/**
 * Quick User Switcher for Testing / Demonstration
 */
router.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

module.exports = router;
