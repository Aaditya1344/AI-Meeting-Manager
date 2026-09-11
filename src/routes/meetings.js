const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db/database');
const { computeAvailabilityMatrix } = require('../services/scheduler');
const aiDaemon = require('../services/ai_daemon');

/**
 * List meetings
 */
router.get('/', (req, res) => {
  const db = readDB();
  const userId = req.query.userId || req.user.id;
  const status = req.query.status;

  let meetings = db.meetings.filter(m => m.organizer_id === userId || m.participants.some(p => p.user_id === userId));

  if (status) {
    meetings = meetings.filter(m => m.status === status);
  }

  // Populate participant details
  const enriched = meetings.map(m => {
    const organizer = db.users.find(u => u.id === m.organizer_id) || { name: "Faculty" };
    const participantDetails = m.participants.map(p => {
      const u = db.users.find(user => user.id === p.user_id) || { name: p.user_id };
      return { ...p, name: u.name, designation: u.designation, department: u.department, avatar: u.avatar };
    });

    const mom = db.moms.find(momItem => momItem.meeting_id === m.id);

    return {
      ...m,
      organizerName: organizer.name,
      organizerRole: organizer.designation,
      participantDetails,
      momStatus: mom ? mom.status : "not_started"
    };
  });

  res.json({ meetings: enriched });
});

/**
 * Check Real-time Availability Matrix & AI Recommendation (Step 3 & Step 4 of Wizard)
 */
router.post('/check-availability', (req, res) => {
  const { participantIds, targetDate, duration } = req.body;
  if (!participantIds || !participantIds.length || !targetDate) {
    return res.status(400).json({ error: 'Please provide selected participant IDs and a target date.' });
  }

  const availabilityResult = computeAvailabilityMatrix(participantIds, targetDate);
  res.json(availabilityResult);
});

/**
 * Schedule New Meeting (Step 5 of Wizard)
 */
router.post('/create', (req, res) => {
  const { title, description, date, start_time, duration_minutes, location, gmeet_link, participantIds } = req.body;
  const db = readDB();
  const organizerId = req.user.id;

  if (!title || !date || !start_time || !participantIds || !participantIds.length) {
    return res.status(400).json({ error: 'Missing required meeting parameters.' });
  }

  // Calculate end time
  const startParts = start_time.split(':');
  let startHour = parseInt(startParts[0]);
  let startMin = parseInt(startParts[1]);
  let totalMin = startHour * 60 + startMin + parseInt(duration_minutes || 60);
  let endHour = Math.floor(totalMin / 60) % 24;
  let endMin = totalMin % 60;
  const end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  const newMeeting = {
    id: `mtg_${Date.now()}`,
    title,
    description: description || "Institutional Staff Meeting",
    date,
    start_time,
    end_time,
    duration_minutes: parseInt(duration_minutes || 60),
    location: location || "IGDTUW Committee Room",
    gmeet_link: gmeet_link || `https://meet.google.com/igdtuw-${Math.random().toString(36).substring(2, 7)}`,
    organizer_id: organizerId,
    status: "scheduled",
    participants: participantIds.map(id => ({ user_id: id, status: id === organizerId ? "accepted" : "accepted" }))
  };

  db.meetings.unshift(newMeeting);

  // Add Google Calendar event record
  db.calendar_events.push({
    id: `cal_ev_${Date.now()}`,
    user_id: organizerId,
    title: `Staff Meeting: ${title}`,
    date,
    start_time,
    end_time,
    source: "google_calendar"
  });

  // Log AI Daemon task
  db.ai_logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    task_name: "Meeting Scheduled & Calendar Sync Trigger",
    meeting_id: newMeeting.id,
    action_taken: `Scheduled meeting '${title}' for ${date} at ${start_time}. Created Google Meet room and registered 30m reminder trigger.`,
    status: "success",
    latency_ms: 16
  });

  // Pre-register notification
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    user_id: organizerId,
    type: "meeting_scheduled",
    title: `Meeting Scheduled: ${title}`,
    message: `Successfully scheduled for ${date} from ${start_time} to ${end_time}. Invites sent to ${participantIds.length} faculty.`,
    link: "my-meetings",
    read: false,
    created_at: new Date().toISOString()
  });

  writeDB(db);

  res.json({
    message: "Meeting scheduled successfully",
    meeting: newMeeting
  });
});

/**
 * Get single meeting details
 */
router.get('/:id', (req, res) => {
  const db = readDB();
  const meeting = db.meetings.find(m => m.id === req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const organizer = db.users.find(u => u.id === meeting.organizer_id) || { name: "Faculty" };
  const participantDetails = meeting.participants.map(p => {
    const u = db.users.find(user => user.id === p.user_id) || { name: p.user_id };
    return { ...p, name: u.name, designation: u.designation, department: u.department, avatar: u.avatar, email: u.email };
  });
  const mom = db.moms.find(momItem => momItem.meeting_id === meeting.id);

  res.json({
    meeting: {
      ...meeting,
      organizerName: organizer.name,
      organizerRole: organizer.designation,
      participantDetails,
      mom
    }
  });
});

/**
 * Cancel meeting
 */
router.post('/:id/cancel', (req, res) => {
  const db = readDB();
  const meeting = db.meetings.find(m => m.id === req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  meeting.status = 'cancelled';
  writeDB(db);
  res.json({ message: "Meeting cancelled successfully", meeting });
});

module.exports = router;
