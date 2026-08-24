const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

/**
 * GET /api/leaderboard?period=daily|weekly|monthly|all
 * Get leaderboard rankings
 */
router.get('/', auth, async (req, res) => {
  try {
    const { period = 'all', limit = 50 } = req.query;

    let query;

    switch (period) {
      case 'daily':
        query = `
          SELECT u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner,
                 COALESCE(SUM(r.distance_km), 0)::float as period_distance,
                 COALESCE(SUM(r.co2_reduced_kg), 0)::float as period_co2,
                 COALESCE(SUM(r.green_points), 0)::int as period_points,
                 COALESCE(COUNT(r.id), 0)::int as period_rides,
                 RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as rank
          FROM users u
          LEFT JOIN rides r ON r.user_id = u.id
            AND r.status = 'completed'
            AND r.start_time >= DATE_TRUNC('day', NOW())
          GROUP BY u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner
          ORDER BY period_points DESC
          LIMIT $1`;
        break;

      case 'weekly':
        query = `
          SELECT u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner,
                 COALESCE(SUM(r.distance_km), 0)::float as period_distance,
                 COALESCE(SUM(r.co2_reduced_kg), 0)::float as period_co2,
                 COALESCE(SUM(r.green_points), 0)::int as period_points,
                 COALESCE(COUNT(r.id), 0)::int as period_rides,
                 RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as rank
          FROM users u
          LEFT JOIN rides r ON r.user_id = u.id
            AND r.status = 'completed'
            AND r.start_time >= DATE_TRUNC('week', NOW())
          GROUP BY u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner
          ORDER BY period_points DESC
          LIMIT $1`;
        break;

      case 'monthly':
        query = `
          SELECT u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner,
                 COALESCE(SUM(r.distance_km), 0)::float as period_distance,
                 COALESCE(SUM(r.co2_reduced_kg), 0)::float as period_co2,
                 COALESCE(SUM(r.green_points), 0)::int as period_points,
                 COALESCE(COUNT(r.id), 0)::int as period_rides,
                 RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as rank
          FROM users u
          LEFT JOIN rides r ON r.user_id = u.id
            AND r.status = 'completed'
            AND r.start_time >= DATE_TRUNC('month', NOW())
          GROUP BY u.id, u.name, u.profile_image, u.profile_frame, u.profile_banner
          ORDER BY period_points DESC
          LIMIT $1`;
        break;

      default: // all time
        query = `
          SELECT id, name, profile_image, profile_frame, profile_banner,
                 total_distance_km::float as period_distance,
                 total_co2_reduced_kg::float as period_co2,
                 total_green_points::int as period_points,
                 total_rides::int as period_rides,
                 RANK() OVER (ORDER BY total_green_points DESC) as rank
          FROM users
          ORDER BY total_green_points DESC
          LIMIT $1`;
        break;
    }

    const result = await pool.query(query, [parseInt(limit)]);

    // Find current user rank
    const myRankResult = await pool.query(
      `SELECT rank FROM (${query.replace('LIMIT $1', '')}) ranked WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      period,
      rankings: result.rows,
      my_rank: myRankResult.rows[0]?.rank || null,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
