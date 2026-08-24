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

    // Restore rides/users if missing
    const rideCheck = await pool.query("SELECT COUNT(*) as count FROM rides");
    const count = rideCheck.rows && rideCheck.rows[0] ? (rideCheck.rows[0].count || 0) : 0;
    if (count === 0) {
      console.log('🌱 Restoring full database (users, rides, badges, rewards, customizations)...');
      const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
      await pool.query(seed);
      console.log('✅ Full database restored successfully!');
    }

    // Migrate rewards table if it has the old wrong schema (missing is_active column)
    try {
      const rewardsCols = await pool.query("PRAGMA table_info(rewards)");
      const colNames = rewardsCols.rows.map(r => r.name);
      const needsMigration = colNames.length > 0 && !colNames.includes('is_active');

      if (needsMigration) {
        console.log('🔄 Migrating rewards table to new schema...');
        // Backup redemptions first
        let redemptionBackup = [];
        try {
          const rb = await pool.query('SELECT * FROM user_redemptions');
          redemptionBackup = rb.rows;
        } catch (_) {}

        await pool.query('DROP TABLE IF EXISTS user_redemptions');
        await pool.query('DROP TABLE IF EXISTS rewards');
        console.log('✅ Old rewards tables dropped, will recreate with correct schema');
      }

      // Create correct rewards table
      await pool.query(`CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        category VARCHAR(50) DEFAULT 'discount',
        partner_name VARCHAR(100),
        icon VARCHAR(20) DEFAULT '🎁',
        stock INTEGER DEFAULT 100,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await pool.query(`CREATE TABLE IF NOT EXISTS user_redemptions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        points_spent INTEGER NOT NULL,
        code VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await pool.query(`CREATE TABLE IF NOT EXISTS user_unlocked_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id)
      )`);

      // Seed rewards if empty
      const rewardCheck = await pool.query("SELECT COUNT(*) as count FROM rewards");
      if (parseInt(rewardCheck.rows[0]?.count || 0) === 0) {
        console.log('🎁 Seeding rewards data...');
        const seedFile = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
        const rewardLines = seedFile.split('\n').filter(l =>
          l.startsWith('INSERT OR REPLACE INTO rewards') ||
          l.startsWith('INSERT OR REPLACE INTO user_redemptions') ||
          l.startsWith('INSERT OR REPLACE INTO user_unlocked_items')
        );
        for (const line of rewardLines) {
          if (line.trim()) {
            try { await pool.query(line); } catch (e) { console.error('Seed line error:', e.message); }
          }
        }
        console.log('✅ Rewards data seeded!');
      } else {
        console.log(`✅ Rewards table OK (${rewardCheck.rows[0]?.count} items)`);
      }
    } catch (e) {
      console.error('Rewards migration error:', e.message, e.stack);
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
