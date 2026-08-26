const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const FirebaseSync = require('../db/firebase_sync');

/**
 * Helper to compute real-time challenge progress for a user
 */
async function getRealtimeChallenges(userId) {
  // 1. Get user current real-time stats
  const userRes = await pool.query(
    'SELECT total_distance_km, total_co2_reduced_kg, total_green_points, total_rides FROM users WHERE id = $1',
    [userId]
  );
  const user = userRes.rows[0] || { total_distance_km: 0, total_co2_reduced_kg: 0, total_green_points: 0, total_rides: 0 };

  // 2. Get weekly distance
  const weekRes = await pool.query(
    `SELECT COALESCE(SUM(distance_km), 0) as total FROM rides 
     WHERE user_id = $1 AND status = 'completed' AND start_time >= datetime('now', '-7 days')`,
    [userId]
  );
  const weekDist = parseFloat(weekRes.rows[0]?.total || 0);

  // 3. Get distinct ride days in last 7 days
  const streakRes = await pool.query(
    `SELECT COUNT(DISTINCT DATE(start_time)) as streak FROM rides 
     WHERE user_id = $1 AND status = 'completed' AND start_time >= datetime('now', '-7 days')`,
    [userId]
  );
  const streakDays = parseInt(streakRes.rows[0]?.streak || 0);

  // 4. Get all challenges & user challenge claim records
  const challengesRes = await pool.query('SELECT * FROM challenges WHERE is_active = TRUE ORDER BY reward_points ASC');
  const userChallengesRes = await pool.query('SELECT * FROM user_challenges WHERE user_id = $1', [userId]);
  const userMap = new Map(userChallengesRes.rows.map(uc => [uc.challenge_id, uc]));

  return challengesRes.rows.map(c => {
    const uc = userMap.get(c.id);
    const target = parseFloat(c.target_value || 1);
    let currentProgress = 0;

    const cat = (c.category || c.type || '').toLowerCase();
    const title = (c.title || '').toLowerCase();

    if (cat.includes('distance') || title.includes('กม') || title.includes('ระยะทาง')) {
      if (title.includes('สัปดาห์') || target <= 15) {
        currentProgress = weekDist;
      } else {
        currentProgress = parseFloat(user.total_distance_km || 0);
      }
    } else if (cat.includes('co2') || title.includes('co2') || title.includes('คาร์บอน')) {
      currentProgress = parseFloat(user.total_co2_reduced_kg || 0);
    } else if (cat.includes('streak') || title.includes('วัน') || title.includes('ต่อเนื่อง')) {
      currentProgress = streakDays;
    } else if (cat.includes('ride') || title.includes('ทริป') || title.includes('ครั้ง')) {
      currentProgress = parseInt(user.total_rides || 0);
    } else {
      currentProgress = parseFloat(user.total_distance_km || 0);
    }

    const isCompleted = currentProgress >= target;
    const isClaimed = uc?.reward_claimed === true || uc?.reward_claimed === 1;

    return {
      ...c,
      progress: Math.min(currentProgress, target),
      current_value: currentProgress,
      target_value: target,
      progress_percent: Math.min(currentProgress / target, 1.0),
      completed: isCompleted,
      reward_claimed: isClaimed,
      completed_at: isCompleted ? (uc?.completed_at || new Date().toISOString()) : null,
    };
  });
}

/**
 * GET /api/challenges
 * Get all challenges with live real-time progress
 */
router.get('/', auth, async (req, res) => {
  try {
    const challenges = await getRealtimeChallenges(req.user.id);
    res.json({ challenges });
  } catch (err) {
    console.error('Challenges error:', err);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

/**
 * GET /api/challenges/my
 */
router.get('/my', auth, async (req, res) => {
  try {
    const challenges = await getRealtimeChallenges(req.user.id);
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get my challenges' });
  }
});

/**
 * POST /api/challenges/:id/claim
 * Claim challenge reward points
 */
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const challenges = await getRealtimeChallenges(req.user.id);
    const challenge = challenges.find(c => c.id === id);

    if (!challenge) {
      return res.status(404).json({ error: 'ไม่พบภารกิจนี้' });
    }

    if (!challenge.completed) {
      return res.status(400).json({ error: 'ยังทำภารกิจไม่สำเร็จ' });
    }

    if (challenge.reward_claimed) {
      return res.status(400).json({ error: 'รับแต้มรางวัลไปแล้ว' });
    }

    // Check if user_challenge record already exists
    const existing = await pool.query(
      'SELECT id FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [req.user.id, id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE user_challenges SET reward_claimed = 1, completed_at = datetime('now'), progress = $1 WHERE user_id = $2 AND challenge_id = $3",
        [challenge.progress, req.user.id, id]
      );
    } else {
      const ucId = `uc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pool.query(
        "INSERT INTO user_challenges (id, user_id, challenge_id, progress, completed_at, reward_claimed) VALUES ($1, $2, $3, $4, datetime('now'), 1)",
        [ucId, req.user.id, id, challenge.progress]
      );
    }

    // Add points to user
    await pool.query(
      "UPDATE users SET total_green_points = total_green_points + $1, updated_at = datetime('now') WHERE id = $2",
      [challenge.reward_points, req.user.id]
    );

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const updatedUser = userRes.rows[0];
    if (updatedUser) FirebaseSync.syncUser(updatedUser);

    // Sync challenge claim to Firestore
    FirebaseSync.syncChallengeClaim({
      user_id: req.user.id,
      challenge_id: id,
      progress: challenge.progress,
      completed_at: new Date().toISOString(),
    });

    res.json({
      message: `รับแต้ม +${challenge.reward_points} Green Points สำเร็จ! 🎉`,
      reward_points: challenge.reward_points,
      total_green_points: updatedUser?.total_green_points || 0,
      challenge_id: id,
    });

  } catch (err) {
    console.error('Claim challenge error:', err);
    res.status(500).json({ error: 'ไม่สามารถรับแต้มรางวัลได้' });
  }
});

module.exports = router;
