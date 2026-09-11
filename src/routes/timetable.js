const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { readDB, writeDB } = require('../db/database');
const { parseTimetableFile } = require('../services/timetable_parser');

// Configure Multer storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|pdf|csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype.includes('image') || file.mimetype.includes('pdf') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv');
    
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error("Supported formats: PDF, Images (PNG, JPG, JPEG), Excel, CSV"));
  }
});

/**
 * Get timetable for current user
 */
router.get('/', (req, res) => {
  const userId = req.query.userId || req.user.id;
  const db = readDB();
  const userTimetable = db.timetables.filter(tt => tt.user_id === userId);
  res.json({
    userId,
    totalEntries: userTimetable.length,
    timetable: userTimetable
  });
});

/**
 * Upload timetable file (PDF, Picture/Image, CSV, Excel)
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    const userId = req.body.userId || req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a PDF, image, or spreadsheet timetable file to upload.' });
    }

    const parsedResult = parseTimetableFile(req.file.path, req.file.originalname, userId);
    
    // Save/merge into DB for user
    const db = readDB();
    // Remove existing uploaded ones for user if requested, or append
    db.timetables = db.timetables.filter(tt => tt.user_id !== userId);
    db.timetables.push(...parsedResult.entries);
    
    // Log AI action
    db.ai_logs.unshift({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      task_name: "Timetable File Ingestion & Parsing",
      meeting_id: "GLOBAL",
      action_taken: `Parsed ${parsedResult.fileType} (${parsedResult.filename}) with ${parsedResult.ocrConfidence} OCR accuracy. Mapped ${parsedResult.teachingHours} lecture hours.`,
      status: "success",
      latency_ms: 32
    });

    writeDB(db);

    res.json({
      message: "Timetable parsed and synchronized successfully",
      summary: parsedResult
    });
  } catch (err) {
    console.error('Upload parse error:', err);
    res.status(500).json({ error: 'Failed to process timetable file: ' + err.message });
  }
});

/**
 * Manually add / edit a timetable slot
 */
router.post('/entry', (req, res) => {
  const { id, userId, day, time_slot, subject, room, type, is_free } = req.body;
  const targetUserId = userId || req.user.id;
  const db = readDB();

  if (id) {
    // Edit
    const index = db.timetables.findIndex(tt => tt.id === id);
    if (index !== -1) {
      db.timetables[index] = { ...db.timetables[index], day, time_slot, subject, room, type, is_free: Boolean(is_free) };
    }
  } else {
    // Add
    const newEntry = {
      id: `tt_${Date.now()}`,
      user_id: targetUserId,
      day: day || "Monday",
      time_slot: time_slot || "09:00 - 10:00",
      subject: subject || "Lecture",
      room: room || "LH-1",
      type: type || "lecture",
      is_free: Boolean(is_free)
    };
    db.timetables.push(newEntry);
  }

  writeDB(db);
  res.json({ message: "Timetable updated successfully", timetables: db.timetables.filter(t => t.user_id === targetUserId) });
});

module.exports = router;
