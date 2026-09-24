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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the bundled frontend for local development
app.use(express.static(path.join(__dirname, 'public')));

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

// Root API Endpoint (Render Pure Backend Notice)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'MeetFlow Backend API Engine',
    institution: 'Indira Gandhi Delhi Technical University (IGDTUW)',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      timetable: '/api/timetable',
      calendar: '/api/calendar',
      meetings: '/api/meetings',
      mom: '/api/mom',
      ai: '/api/ai',
      admin: '/api/admin'
    },
    frontend: 'The MeetFlow web application interface is hosted exclusively on Vercel.'
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on MeetFlow API Backend' });
});

// Start AI daemon
aiDaemon.start();

// Start Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🎓 IGDTUW AI Staff Meeting Organizer Server Active`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏛️ Institution: Indira Gandhi Delhi Technical University`);
  console.log(`🛡️ Access: Role-Based Institutional Access Control`);
  console.log(`================================================================`);
});
