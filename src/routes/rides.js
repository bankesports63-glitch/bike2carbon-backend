const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const FirebaseSync = require('../db/firebase_sync');
const { calculateCO2Reduced, calculateGreenPoints, calculateRouteDistance, getSettings } = require('../utils/co2Calculator');

/**
 * POST /api/rides/start
 * Start a new ride
 */
router.post('/start', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO rides (user_id, start_time, status)
       VALUES ($1, NOW(), 'active')
       RETURNING *`,
      [req.user.id]
    );
    
    res.status(201).json({ ride: result.rows[0] });
  } catch (err) {
    console.error('Start ride error:', err);
    res.status(500).json({ error: 'Failed to start ride' });
  }
});

/**
 * POST /api/rides/:id/gps
 * Add GPS points to a ride (batch)
 */
router.post('/:id/gps', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body; // [{latitude, longitude, altitude, speed_kmh, accuracy, recorded_at}]

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Points array required' });
    }

    // Verify ride belongs to user
    const rideCheck = await pool.query(
      'SELECT id FROM rides WHERE id = $1 AND user_id = $2 AND status != $3',
      [id, req.user.id, 'completed']
    );
    if (rideCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Active ride not found' });
    }

    // Batch insert GPS points
    const placeholders = [];
    const params = [];
    points.forEach(p => {
      placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
      params.push(
        id,
        p.latitude,
        p.longitude,
        p.altitude || null,
        p.speed_kmh || null,
        p.accuracy || null,
        p.recorded_at || new Date().toISOString()
      );
    });

    await pool.query(
      `INSERT INTO gps_points (ride_id, latitude, longitude, altitude, speed_kmh, accuracy, recorded_at)
       VALUES ${placeholders.join(', ')}`,
      params
    );

    res.json({ inserted: points.length });
  } catch (err) {
    console.error('GPS points error:', err);
    res.status(500).json({ error: 'Failed to save GPS points' });
  }
});

/**
 * PUT /api/rides/:id/end
 * End a ride — calculates CO2, green points, updates user stats
 */
router.put('/:id/end', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { distance_km, duration_sec, avg_speed_kmh, max_speed_kmh } = req.body;

    await client.query('BEGIN');

    // Verify ride
    const rideResult = await client.query(
      'SELECT * FROM rides WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, req.user.id, 'active']
    );
    if (rideResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active ride not found' });
    }

    // Get settings
    const settings = await getSettings(pool);

    // Fetch all recorded GPS points for this ride
    const gpsResult = await client.query(
      'SELECT latitude, longitude, altitude, speed_kmh, accuracy, recorded_at FROM gps_points WHERE ride_id = $1 ORDER BY recorded_at ASC',
      [id]
    );

    // Calculate from GPS if distance not provided or 0
    let finalDistance = parseFloat(distance_km) || 0;
    if (finalDistance <= 0 && gpsResult.rows.length > 0) {
      finalDistance = calculateRouteDistance(gpsResult.rows);
    }

    const co2Reduced = calculateCO2Reduced(finalDistance, settings.emissionFactor);
    const greenPoints = calculateGreenPoints(finalDistance, settings.pointsPerKm);
    const finalDuration = parseInt(duration_sec) || 0;
    const finalAvgSpeed = parseFloat(avg_speed_kmh) || 0;
    const finalMaxSpeed = parseFloat(max_speed_kmh) || 0;

    // Update ride
    const updatedRide = await client.query(
      `UPDATE rides SET
        status = 'completed',
        end_time = NOW(),
        distance_km = $1,
        duration_sec = $2,
        avg_speed_kmh = $3,
        max_speed_kmh = $4,
        co2_reduced_kg = $5,
        green_points = $6
       WHERE id = $7
       RETURNING *`,
      [finalDistance, finalDuration, finalAvgSpeed, finalMaxSpeed, co2Reduced, greenPoints, id]
    );

    // Update user stats
    await client.query(
      `UPDATE users SET
        total_distance_km = total_distance_km + $1,
        total_co2_reduced_kg = total_co2_reduced_kg + $2,
        total_green_points = total_green_points + $3,
        total_rides = total_rides + 1,
        updated_at = NOW()
       WHERE id = $4`,
      [finalDistance, co2Reduced, greenPoints, req.user.id]
    );

    await client.query('COMMIT');

    // Sync to Google Cloud Firestore (async)
    FirebaseSync.syncRide(updatedRide.rows[0], gpsResult.rows).catch(console.error);
    pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
      .then(res => { if (res.rows[0]) FirebaseSync.syncUser(res.rows[0]); })
      .catch(console.error);

    // Update challenge progress (async — don't block response)
    updateChallengeProgress(req.user.id, finalDistance, finalDuration).catch(console.error);
    checkAndAwardBadges(req.user.id).catch(console.error);

    res.json({
      ride: updatedRide.rows[0],
      summary: {
        distance_km: finalDistance,
        duration_sec: finalDuration,
        avg_speed_kmh: finalAvgSpeed,
        co2_reduced_kg: co2Reduced,
        green_points: greenPoints,
        emission_factor_used: settings.emissionFactor,
      }
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('End ride error:', err);
    res.status(500).json({ error: 'Failed to end ride' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/rides/history
 * Get ride history for current user
 */
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT id, status, start_time, end_time, distance_km, duration_sec, 
              avg_speed_kmh, max_speed_kmh, co2_reduced_kg, green_points, created_at
       FROM rides
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY start_time DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM rides WHERE user_id = $1 AND status = $2',
      [req.user.id, 'completed']
    );

    res.json({
      rides: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ride history' });
  }
});

/**
 * GET /api/rides/:id
 * Get single ride with GPS route
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const rideResult = await pool.query(
      'SELECT * FROM rides WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const gpsResult = await pool.query(
      'SELECT latitude, longitude, altitude, speed_kmh, recorded_at FROM gps_points WHERE ride_id = $1 ORDER BY recorded_at ASC',
      [req.params.id]
    );

    res.json({
      ride: rideResult.rows[0],
      gps_route: gpsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ride' });
  }
});

/**
 * Update user_challenges progress after a ride
 */
async function updateChallengeProgress(userId, distanceKm, durationSec) {
  try {
    // Get user totals
    const userResult = await pool.query(
      'SELECT total_distance_km, total_co2_reduced_kg, total_rides FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return;
    const user = userResult.rows[0];

    // Get all active challenges
    const challenges = await pool.query('SELECT * FROM challenges WHERE is_active = TRUE');

    for (const challenge of challenges.rows) {
      let progress = 0;
      
      switch (challenge.type) {
        case 'distance_single':
          progress = distanceKm;
          break;
        case 'distance_weekly':
          const weekResult = await pool.query(
            `SELECT COALESCE(SUM(distance_km), 0) as total FROM rides 
             WHERE user_id = $1 AND status = 'completed' AND start_time >= DATE_TRUNC('week', NOW())`,
            [userId]
          );
          progress = parseFloat(weekResult.rows[0].total);
          break;
        case 'total_distance':
          progress = parseFloat(user.total_distance_km);
          break;
        case 'total_rides':
          progress = parseInt(user.total_rides);
          break;
        case 'co2_total':
          progress = parseFloat(user.total_co2_reduced_kg);
          break;
        case 'streak_days':
          // Count consecutive days with rides
          const streakResult = await pool.query(
            `SELECT COUNT(DISTINCT DATE(start_time)) as streak
             FROM rides
             WHERE user_id = $1 AND status = 'completed'
               AND start_time >= NOW() - INTERVAL '30 days'`,
            [userId]
          );
          progress = parseInt(streakResult.rows[0].streak);
          break;
      }

      // Upsert user_challenge progress
      const completed = progress >= parseFloat(challenge.target_value);
      await pool.query(
        `INSERT INTO user_challenges (user_id, challenge_id, progress, completed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, challenge_id) DO UPDATE
         SET progress = GREATEST(user_challenges.progress, $3),
             completed_at = CASE WHEN $4 IS NOT NULL AND user_challenges.completed_at IS NULL THEN $4 ELSE user_challenges.completed_at END`,
        [userId, challenge.id, progress, completed ? new Date() : null]
      );

      // Award points for newly completed challenges
      if (completed) {
        const existing = await pool.query(
          'SELECT reward_claimed FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
          [userId, challenge.id]
        );
        if (existing.rows[0] && !existing.rows[0].reward_claimed) {
          await pool.query(
            `UPDATE user_challenges SET reward_claimed = TRUE WHERE user_id = $1 AND challenge_id = $2`,
            [userId, challenge.id]
          );
          await pool.query(
            'UPDATE users SET total_green_points = total_green_points + $1 WHERE id = $2',
            [challenge.reward_points, userId]
          );
        }
      }
    }
  } catch (err) {
    console.error('Challenge update error:', err);
  }
}

/**
 * Check and award badges based on user progress
 */
async function checkAndAwardBadges(userId) {
  try {
    const userResult = await pool.query(
      'SELECT total_distance_km, total_co2_reduced_kg, total_green_points FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return;
    const user = userResult.rows[0];

    const badges = await pool.query('SELECT * FROM badges');
    for (const badge of badges.rows) {
      let meetsRequirement = false;
      switch (badge.requirement_type) {
        case 'total_distance':
          meetsRequirement = parseFloat(user.total_distance_km) >= parseFloat(badge.requirement_value);
          break;
        case 'total_co2':
          meetsRequirement = parseFloat(user.total_co2_reduced_kg) >= parseFloat(badge.requirement_value);
          break;
        case 'total_points':
          meetsRequirement = parseInt(user.total_green_points) >= parseInt(badge.requirement_value);
          break;
        case 'total_rides':
          const rideCount = await pool.query(
            "SELECT COUNT(*) FROM rides WHERE user_id = $1 AND status = 'completed'", [userId]
          );
          meetsRequirement = parseInt(rideCount.rows[0].count) >= parseInt(badge.requirement_value);
          break;
      }

      if (meetsRequirement) {
        await pool.query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, badge.id]
        );
      }
    }
  } catch (err) {
    console.error('Badge check error:', err);
  }
}

module.exports = router;
