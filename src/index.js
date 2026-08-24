require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets (Avatars & Frames)
app.use('/avatars', express.static(path.join(__dirname, '../public/avatars')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const pool = require('./db/pool');
const fs = require('fs');

async function autoInitDb() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);

    const rideCheck = await pool.query("SELECT COUNT(*) as count FROM rides");
    const count = rideCheck.rows && rideCheck.rows[0] ? (rideCheck.rows[0].count || 0) : 0;
    if (count === 0) {
      console.log('🌱 Restoring full database (users, rides, badges, rewards, customizations)...');
      const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
      await pool.query(seed);
      console.log('✅ Full database restored successfully!');
    }
  } catch (err) {
    console.error('⚠️ Auto init error:', err.message);
  }
}
autoInitDb();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/rewards', require('./routes/rewards'));

// Root & Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Bike2Carbon API 24/7 Cloud', uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Bike2Carbon API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚲 Bike2Carbon API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
}

module.exports = app;
