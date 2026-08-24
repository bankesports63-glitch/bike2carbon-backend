const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

/**
 * GET /api/badges/my
 */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [req.user.id]
    );

    res.json({ badges: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

/**
 * GET /api/badges
 * All badges with earned status
 */
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              CASE WHEN ub.user_id IS NOT NULL THEN TRUE ELSE FALSE END as earned,
              ub.earned_at
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
       ORDER BY b.rarity, b.requirement_value`,
      [req.user.id]
    );

    res.json({ badges: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

module.exports = router;
