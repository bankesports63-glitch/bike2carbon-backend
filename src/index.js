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

    // Restore rides/users if missing - Try Firebase first, then seed.sql as fallback
    const rideCheck = await pool.query("SELECT COUNT(*) as count FROM rides");
    const count = rideCheck.rows && rideCheck.rows[0] ? (rideCheck.rows[0].count || 0) : 0;
    if (count === 0) {
      console.log('📦 SQLite is empty. Attempting Firebase restore first...');
      let firebaseRestored = false;

      try {
        const { db, isFirebaseConnected } = require('./db/firebase');
        if (isFirebaseConnected && db) {
          // Restore users from Firebase
          const usersSnap = await db.collection('users').get();
          if (!usersSnap.empty) {
            console.log(`🔥 Restoring ${usersSnap.size} users from Firebase...`);
            for (const doc of usersSnap.docs) {
              const u = doc.data();
              await pool.query(
                `INSERT OR REPLACE INTO users 
                  (id, name, email, password_hash, profile_image, profile_frame, profile_banner,
                   total_distance_km, total_co2_reduced_kg, total_green_points, total_rides, created_at, updated_at)
                 SELECT ?, u.name, u.email, u.password_hash, ?, ?, ?,
                        ?, ?, ?, ?, u.created_at, ?
                 FROM (SELECT name, email, password_hash, created_at FROM users WHERE id = ? LIMIT 1) u`,
                [u.id, u.profile_image || null, u.profile_frame || 'frame_none', u.profile_banner || 'banner_cyber_forest',
                 u.total_distance_km || 0, u.total_co2_reduced_kg || 0, u.total_green_points || 0, u.total_rides || 0,
                 u.updated_at || new Date().toISOString(), u.id]
              ).catch(() => {});
            }

            // Fall back seed to get password_hashes (Firebase doesn't store passwords)
            console.log('🌱 Seeding base data (passwords + rides) from seed.sql...');
            const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
            await pool.query(seed);
            console.log('🌱 seed.sql restored base data');

            // Now overwrite user stats with Firebase latest data (more recent than seed)
            for (const doc of usersSnap.docs) {
              const u = doc.data();
              await pool.query(
                `UPDATE users SET 
                  total_distance_km = ?, total_co2_reduced_kg = ?, total_green_points = ?,
                  total_rides = ?, profile_image = ?, profile_frame = ?, profile_banner = ?, updated_at = ?
                 WHERE id = ?`,
                [u.total_distance_km || 0, u.total_co2_reduced_kg || 0, u.total_green_points || 0,
                 u.total_rides || 0, u.profile_image || null, u.profile_frame || 'frame_none',
                 u.profile_banner || 'banner_cyber_forest', u.updated_at || new Date().toISOString(), u.id]
              ).catch(e => console.error('User update error:', e.message));
            }
            console.log('✅ Firebase user stats restored successfully!');
            firebaseRestored = true;
          }
        }
      } catch (fbErr) {
        console.error('⚠️ Firebase restore failed:', fbErr.message);
      }

      if (!firebaseRestored) {
        console.log('🌱 Restoring from seed.sql (no Firebase data)...');
        const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
        await pool.query(seed);
        console.log('✅ seed.sql database restored!');
      }
    } else {
      // DB has data — still sync latest Firebase user stats to ensure up-to-date
      try {
        const { db, isFirebaseConnected } = require('./db/firebase');
        if (isFirebaseConnected && db) {
          const usersSnap = await db.collection('users').get();
          for (const doc of usersSnap.docs) {
            const u = doc.data();
            // Only update if Firebase data is newer
            await pool.query(
              `UPDATE users SET 
                total_distance_km = ?, total_co2_reduced_kg = ?, total_green_points = ?,
                total_rides = ?, profile_frame = ?, profile_banner = ?, updated_at = ?
               WHERE id = ? AND (updated_at IS NULL OR updated_at < ?)`,
              [u.total_distance_km || 0, u.total_co2_reduced_kg || 0, u.total_green_points || 0,
               u.total_rides || 0, u.profile_frame || 'frame_none',
               u.profile_banner || 'banner_cyber_forest', u.updated_at || '',
               u.id, u.updated_at || '']
            ).catch(() => {});
          }
          console.log('🔥 Synced latest user stats from Firebase on startup');
        }
      } catch (_) {}
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
