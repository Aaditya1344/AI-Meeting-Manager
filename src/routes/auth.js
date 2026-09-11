const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db/database');

/**
 * Standard Email & Password Login
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please enter your institutional email.' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Password is required to sign in.' });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    // If new user logging in with email
    const isInitialAdmin = 
      email.toLowerCase().includes('aditya') || 
      email.toLowerCase().includes('arun');

    const nameFromEmail = email.split('@')[0].replace('.', ' ').replace(/^[a-z]/, c => c.toUpperCase());

    user = {
      id: `usr_${Date.now()}`,
      name: nameFromEmail,
      email: email.trim().toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameFromEmail)}&backgroundColor=4f46e5`,
      designation: "",
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
    message: "Login successful",
    user,
    requiresOnboarding: !user.onboarded
  });
});

/**
 * Direct Google OAuth Login
 */
router.post('/google', (req, res) => {
  const { email, name, avatar } = req.body;
  const db = readDB();

  const userEmail = (email || 'user@igdtuw.ac.in').toLowerCase().trim();
  let user = db.users.find(u => u.email.toLowerCase() === userEmail);

  if (!user) {
    const isInitialAdmin = 
      userEmail.includes('aditya') || 
      userEmail.includes('arun') ||
      (name && (name.toLowerCase().includes('aditya') || name.toLowerCase().includes('arun')));

    user = {
      id: `usr_${Date.now()}`,
      name: name || "Faculty Member",
      email: userEmail,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Faculty')}&backgroundColor=4f46e5`,
      designation: "",
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
 * Complete Profile Onboarding
 */
router.post('/onboard', (req, res) => {
  const { userId, designation, department, employee_id, cabin } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.designation = designation || user.designation || "Assistant Professor";
  user.department = department || user.department || "Computer Science & Engineering";
  user.employee_id = employee_id || user.employee_id || `IGDTUW-EMP-${Math.floor(100 + Math.random() * 900)}`;
  user.cabin = cabin || user.cabin || "Main Faculty Block";
  user.onboarded = true;

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
 * Current user
 */
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

/**
 * User switch helper
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

/**
 * Update Profile Settings
 */
router.post('/update-profile', (req, res) => {
  const { userId, name, designation, department, employee_id, cabin, phone, bio } = req.body;
  const db = readDB();

  const targetId = userId || (req.user && req.user.id);
  const user = db.users.find(u => u.id === targetId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name) user.name = name;
  if (designation) user.designation = designation;
  if (department) user.department = department;
  if (employee_id) user.employee_id = employee_id;
  if (cabin) user.cabin = cabin;
  if (phone) user.phone = phone;
  if (bio) user.bio = bio;
  user.onboarded = true;

  writeDB(db);

  res.json({
    message: "Profile updated successfully",
    user
  });
});

module.exports = router;
