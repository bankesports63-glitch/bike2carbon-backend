const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const FirebaseSync = require('../db/firebase_sync');

// Auto-initialize rewards tables if not present
async function initRewardsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        category VARCHAR(50) DEFAULT 'discount',
        partner_name VARCHAR(100),
        icon VARCHAR(20) DEFAULT '🎁',
        stock INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_redemptions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
        points_spent INTEGER NOT NULL,
        code VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if rewards are seeded
    const count = await pool.query('SELECT COUNT(*) as count FROM rewards');
    if (parseInt(count.rows[0].count) === 0) {
      const seedRewards = [
        ['ส่วนลด Café Amazon 30 บาท', 'ใช้ลดเครื่องดื่มทุกเมนูที่ Café Amazon ทั่วประเทศ', 50, 'discount', 'Café Amazon', '☕', 200],
        ['บัตรกำนัล ปลูกต้นไม้ 1 ต้น', 'ร่วมปลูกต้นไม้ในโครงการ Bike2Carbon Forest เพื่อโลกสีเขียว', 100, 'tree', 'มูลนิธิโลกสีเขียว', '🌳', 999],
        ['ส่วนลด 100 บาท ร้าน ProBike Shop', 'ใช้เป็นส่วนลดซื้ออุปกรณ์จักรยานหรือเซอร์วิส', 150, 'discount', 'ProBike', '🚲', 50],
        ['ส่วนลด GrabRide / GrabFood 50 บาท', 'รหัสส่วนลด 50 บาท บริการ Grab ทั่วประเทศ', 80, 'voucher', 'Grab Thailand', '🚗', 150],
        ['เสื้อยืด Bike2Carbon Eco-Shirt', 'เสื้อยืดเนื้อผ้าไมโครโพลีเอสเตอร์รีไซเคิล 100%', 300, 'merchandise', 'Bike2Carbon', '👕', 30],
        ['กระบอกน้ำจักรยานสแตนเลส เก็บความเย็น', 'กระบอกน้ำเก็บความเย็น 24 ชม. ลายพิเศษ Bike2Carbon', 250, 'merchandise', 'Bike2Carbon', '🍶', 40],
        ['ฟรี ค่าบริการเช่าจักรยานสาธารณะ 1 วัน', 'ใช้บริการ Anywheel / Punpun Bike ได้ไม่จำกัด 1 วัน', 40, 'voucher', 'Anywheel', '🚴', 500],
      ];

      for (const r of seedRewards) {
        await pool.query(
          `INSERT INTO rewards (title, description, points_required, category, partner_name, icon, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          r
        );
      }
    }
  } catch (err) {
    console.error('Init rewards table error:', err);
  }
}

initRewardsTable();

/**
 * GET /api/rewards
 * Get all available rewards
 */
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rewards WHERE is_active = TRUE ORDER BY points_required ASC'
    );
    res.json({ rewards: result.rows });
  } catch (err) {
    console.error('Get rewards error:', err);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

/**
 * POST /api/rewards/:id/redeem
 * Redeem a reward with green points
 */
router.post('/:id/redeem', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get reward details
    const rewardResult = await pool.query('SELECT * FROM rewards WHERE id = $1 AND is_active = TRUE', [id]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบของรางวัลนี้' });
    }
    const reward = rewardResult.rows[0];

    // 2. Check stock
    if (reward.stock <= 0) {
      return res.status(400).json({ error: 'ของรางวัลนี้หมดแล้ว' });
    }

    // 3. Get user points
    const userResult = await pool.query('SELECT total_green_points FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userPoints = parseInt(userResult.rows[0].total_green_points || 0);

    if (userPoints < reward.points_required) {
      return res.status(400).json({ 
        error: `แต้ม Green Points ไม่พอ (คุณมี ${userPoints} pts, ต้องการ ${reward.points_required} pts)` 
      });
    }

    // 4. Generate unique voucher code
    const randomCode = 'B2C-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    // 5. Deduct points and insert redemption
    await pool.query(
      'UPDATE users SET total_green_points = total_green_points - $1 WHERE id = $2',
      [reward.points_required, req.user.id]
    );

    await pool.query(
      'UPDATE rewards SET stock = stock - 1 WHERE id = $1',
      [id]
    );

    const redemptionResult = await pool.query(
      `INSERT INTO user_redemptions (user_id, reward_id, points_spent, code, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [req.user.id, id, reward.points_required, randomCode]
    );

    const redemptionData = redemptionResult.rows[0];
    FirebaseSync.syncRedemption({
      id: redemptionData.id,
      user_id: req.user.id,
      reward_id: id,
      voucher_code: randomCode,
      points_spent: reward.points_required,
      redeemed_at: redemptionData.redeemed_at,
    });
    pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
      .then(r => { if (r.rows[0]) FirebaseSync.syncUser(r.rows[0]); })
      .catch(console.error);

    res.status(201).json({
      message: 'แลกของรางวัลสำเร็จ!',
      redemption: redemptionData,
      reward: reward,
      remaining_points: userPoints - reward.points_required,
      code: randomCode,
    });
  } catch (err) {
    console.error('Redeem reward error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแลกของรางวัล' });
  }
});

/**
 * GET /api/rewards/my
 * Get current user's redeemed rewards
 */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ur.*, r.title, r.description, r.category, r.partner_name, r.icon
       FROM user_redemptions ur
       JOIN rewards r ON r.id = ur.reward_id
       WHERE ur.user_id = $1
       ORDER BY ur.redeemed_at DESC`,
      [req.user.id]
    );
    res.json({ redemptions: result.rows });
  } catch (err) {
    console.error('Get my redemptions error:', err);
    res.status(500).json({ error: 'Failed to get redemptions' });
  }
});

module.exports = router;
