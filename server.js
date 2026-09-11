const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./src/middleware/auth');
const aiDaemon = require('./src/services/ai_daemon');

// Import routes
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const timetableRoutes = require('./src/routes/timetable');
const calendarRoutes = require('./src/routes/calendar');
const meetingsRoutes = require('./src/routes/meetings');
const momRoutes = require('./src/routes/mom');
const aiRoutes = require('./src/routes/ai');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply Auth Middleware to API endpoints
app.use('/api', authMiddleware);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/mom', momRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    institution: 'Indira Gandhi Delhi Technical University (IGDTUW)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime()
  });
});

// Fallback to single page app index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start AI daemon
aiDaemon.start();

// Start Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🎓 IGDTUW AI Staff Meeting Organizer Server Active`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏛️ Institution: Indira Gandhi Delhi Technical University`);
  console.log(`🛡️ Designated Admins: Aditya & Arun`);
  console.log(`================================================================`);
});
