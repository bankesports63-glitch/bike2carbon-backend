const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

/**
 * GET /api/stats/overview
 * Get user's summary stats
 */
router.get('/overview', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT total_distance_km, total_co2_reduced_kg, total_green_points, total_rides FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // This week
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(distance_km), 0)::float as distance,
              COALESCE(SUM(co2_reduced_kg), 0)::float as co2,
              COALESCE(SUM(green_points), 0)::int as points,
              COUNT(*)::int as rides
       FROM rides
       WHERE user_id = $1 AND status = 'completed'
         AND start_time >= DATE_TRUNC('week', NOW())`,
      [req.user.id]
    );

    // This month
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(distance_km), 0)::float as distance,
              COALESCE(SUM(co2_reduced_kg), 0)::float as co2,
              COALESCE(SUM(green_points), 0)::int as points,
              COUNT(*)::int as rides
       FROM rides
       WHERE user_id = $1 AND status = 'completed'
         AND start_time >= DATE_TRUNC('month', NOW())`,
      [req.user.id]
    );

    // All-time rank
    const rankResult = await pool.query(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY total_green_points DESC) as rank
         FROM users
       ) r WHERE id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];
    
    res.json({
      all_time: {
        distance_km: parseFloat(user.total_distance_km),
        co2_reduced_kg: parseFloat(user.total_co2_reduced_kg),
        green_points: parseInt(user.total_green_points),
        rides: parseInt(user.total_rides),
        rank: rankResult.rows[0]?.rank || null,
      },
      this_week: weekResult.rows[0],
      this_month: monthResult.rows[0],
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/stats/chart?period=daily|weekly|monthly
 * Chart data for environmental impact
 */
router.get('/chart', auth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;

    let query;
    let params = [req.user.id];

    switch (period) {
      case 'daily':
        query = `
          SELECT strftime('%Y-%m-%d', start_time) as date,
                 COALESCE(SUM(distance_km), 0) as distance,
                 COALESCE(SUM(co2_reduced_kg), 0) as co2,
                 COALESCE(SUM(green_points), 0) as points,
                 COUNT(*) as rides
          FROM rides
          WHERE user_id = $1 AND status = 'completed'
            AND start_time >= datetime('now', '-30 days')
          GROUP BY strftime('%Y-%m-%d', start_time)
          ORDER BY date DESC
          LIMIT 30`;
        break;

      case 'weekly':
        query = `
          SELECT strftime('%Y-%W', start_time) as date,
                 COALESCE(SUM(distance_km), 0) as distance,
                 COALESCE(SUM(co2_reduced_kg), 0) as co2,
                 COALESCE(SUM(green_points), 0) as points,
                 COUNT(*) as rides
          FROM rides
          WHERE user_id = $1 AND status = 'completed'
            AND start_time >= datetime('now', '-84 days')
          GROUP BY strftime('%Y-%W', start_time)
          ORDER BY date DESC
          LIMIT 12`;
        break;

      case 'monthly':
        query = `
          SELECT strftime('%Y-%m', start_time) as date,
                 COALESCE(SUM(distance_km), 0) as distance,
                 COALESCE(SUM(co2_reduced_kg), 0) as co2,
                 COALESCE(SUM(green_points), 0) as points,
                 COUNT(*) as rides
          FROM rides
          WHERE user_id = $1 AND status = 'completed'
            AND start_time >= datetime('now', '-12 months')
          GROUP BY strftime('%Y-%m', start_time)
          ORDER BY date DESC
          LIMIT 12`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, monthly' });
    }

    const result = await pool.query(query, params);
    res.json({ period, data: result.rows });
  } catch (err) {
    console.error('Stats chart error:', err);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

module.exports = router;
