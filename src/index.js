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

    // 1. Seed base data (badges, challenges, default structure) if rides table is empty
    const rideCheck = await pool.query("SELECT COUNT(*) as count FROM rides");
    const count = rideCheck.rows && rideCheck.rows[0] ? (rideCheck.rows[0].count || 0) : 0;
    if (count === 0) {
      console.log('🌱 Loading base seed data from seed.sql...');
      const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
      await pool.query(seed);
      console.log('✅ Base seed data loaded');
    }

    // 2. Comprehensive Cloud Restore from Google Firestore (Source of Truth)
    try {
      const { db: fbDb, isFirebaseConnected: fbOk } = require('./db/firebase');
      if (fbOk && fbDb) {
        console.log('🔥 Connecting to Google Firestore Cloud for full system restore...');

        // 2.1 Restore Users (Stats, Points, Avatar, Frame, Banner)
        const usersSnap = await fbDb.collection('users').get();
        if (!usersSnap.empty) {
          console.log(`🔥 Restoring ${usersSnap.size} users from Firestore...`);
          for (const doc of usersSnap.docs) {
            const u = doc.data();
            await pool.query(
              `UPDATE users SET 
                total_distance_km = ?, total_co2_reduced_kg = ?, total_green_points = ?,
                total_rides = ?, profile_image = ?, profile_frame = ?, profile_banner = ?, updated_at = ?
               WHERE id = ?`,
              [Number(u.total_distance_km || 0), Number(u.total_co2_reduced_kg || 0), Number(u.total_green_points || 0),
               Number(u.total_rides || 0), u.profile_image || null, u.profile_frame || 'frame_none',
               u.profile_banner || 'banner_cyber_forest', u.updated_at || new Date().toISOString(), u.id]
            ).catch(e => console.error('User update error:', e.message));
          }
          console.log('✅ Users restored with exact Cloud points & customizations!');
        }

        // 2.2 Restore Unlocked Customizations (Banners, Frames, Avatars)
        const unlockSnap = await fbDb.collection('user_unlocked_items').get();
        if (!unlockSnap.empty) {
          console.log(`🔥 Restoring ${unlockSnap.size} unlocked items from Firestore...`);
          for (const doc of unlockSnap.docs) {
            const un = doc.data();
            await pool.query(
              `INSERT OR REPLACE INTO user_unlocked_items (id, user_id, item_type, item_id, unlocked_at)
               VALUES (?, ?, ?, ?, ?)`,
              [un.id || doc.id, un.user_id, un.item_type, un.item_id, un.unlocked_at || new Date().toISOString()]
            ).catch(e => console.error('Unlock restore error:', e.message));
          }
          console.log('✅ Unlocked customizations restored!');
        }

        // 2.3 Restore Vouchers & Redemptions (Coupons)
        const redeemSnap = await fbDb.collection('user_redemptions').get();
        if (!redeemSnap.empty) {
          console.log(`🔥 Restoring ${redeemSnap.size} coupon redemptions from Firestore...`);
          for (const doc of redeemSnap.docs) {
            const r = doc.data();
            await pool.query(
              `INSERT OR REPLACE INTO user_redemptions (id, user_id, reward_id, points_spent, code, status, redeemed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [r.id || doc.id, r.user_id, r.reward_id, Number(r.points_spent || 0), r.voucher_code || r.code || 'CODE', r.status || 'active', r.redeemed_at || new Date().toISOString()]
            ).catch(e => console.error('Redemption restore error:', e.message));
          }
          console.log('✅ Coupon redemptions restored!');
        }

        // 2.4 Restore Completed Rides
        const ridesSnap = await fbDb.collection('rides').get();
        if (!ridesSnap.empty) {
          console.log(`🔥 Restoring ${ridesSnap.size} rides from Firestore...`);
          for (const doc of ridesSnap.docs) {
            const rd = doc.data();
            await pool.query(
              `INSERT OR REPLACE INTO rides (id, user_id, status, start_time, end_time, distance_km, duration_sec, avg_speed_kmh, max_speed_kmh, co2_reduced_kg, green_points, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [rd.id || doc.id, rd.user_id, rd.status || 'completed', rd.start_time, rd.end_time || null,
               Number(rd.distance_km || 0), Number(rd.duration_sec || 0), Number(rd.avg_speed_kmh || 0),
               Number(rd.max_speed_kmh || 0), Number(rd.co2_reduced_kg || 0), Number(rd.green_points_earned || rd.green_points || 0),
               rd.created_at || new Date().toISOString()]
            ).catch(e => console.error('Ride restore error:', e.message));
          }
          console.log('✅ Rides restored from Cloud!');
        }

        // 2.5 Restore Claimed Challenges
        const chalSnap = await fbDb.collection('user_challenges').get();
        if (!chalSnap.empty) {
          console.log(`🔥 Restoring ${chalSnap.size} challenge records from Firestore...`);
          for (const doc of chalSnap.docs) {
            const ch = doc.data();
            await pool.query(
              `INSERT OR REPLACE INTO user_challenges (id, user_id, challenge_id, progress, completed_at, reward_claimed)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [ch.id || doc.id, ch.user_id, ch.challenge_id, Number(ch.progress || 0), ch.completed_at || new Date().toISOString(), ch.reward_claimed ? 1 : 0]
            ).catch(e => console.error('Challenge restore error:', e.message));
          }
          console.log('✅ Challenges restored from Cloud!');
        }

        // 2.6 Restore Avatar Image Files
        const avatarsDir = path.join(__dirname, '../public/avatars');
        if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

        const avatarSnap = await fbDb.collection('user_avatars').get();
        let restoredCount = 0;
        for (const doc of avatarSnap.docs) {
          const data = doc.data();
          if (!data.image_base64 || !data.filename) continue;
          const filePath = path.join(avatarsDir, data.filename);
          if (!fs.existsSync(filePath)) {
            try {
              const buffer = Buffer.from(data.image_base64, 'base64');
              fs.writeFileSync(filePath, buffer);
              restoredCount++;
              console.log(`📸 Restored avatar file: ${data.filename}`);
            } catch (e) {
              console.error('Avatar restore write error:', e.message);
            }
          }
        }
        if (restoredCount > 0) console.log(`✅ Restored ${restoredCount} avatar file(s) from Firestore!`);
      }
    } catch (fbErr) {
      console.error('⚠️ Firestore Cloud Restore error:', fbErr.message);
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
