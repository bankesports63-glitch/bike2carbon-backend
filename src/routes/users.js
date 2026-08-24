const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const FirebaseSync = require('../db/firebase_sync');
const fs = require('fs');
const path = require('path');

// Auto-init customization tables & columns
async function initCustomizationTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_customizations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Ensure profile_banner column exists safely
    try {
      const colCheck = await pool.query("PRAGMA table_info(users)");
      const hasBanner = colCheck.rows && colCheck.rows.some(col => col.name === 'profile_banner');
      if (!hasBanner) {
        await pool.query('ALTER TABLE users ADD COLUMN profile_banner TEXT DEFAULT "banner_cyber_forest"');
      }
    } catch (_) {}
  } catch (e) {
    console.error('Customization table init error:', e.message);
  }
}
initCustomizationTable();

const CUSTOMIZATION_CATALOG = {
  avatars: [
    {
      id: 'avatar_1',
      name: 'Green Rider (นักปั่นสายกรีน)',
      image: '/avatars/avatar_1.jpg',
      assetPath: 'assets/avatars/avatar_1.jpg',
      rarity: 'COMMON',
      cost: 0,
      description: 'อวาตาร์นักปั่นสายกรีนพื้นฐาน',
    },
    {
      id: 'avatar_2',
      name: 'Eco Warrior (นักปั่นรักษ์โลก)',
      image: '/avatars/avatar_2.jpg',
      assetPath: 'assets/avatars/avatar_2.jpg',
      rarity: 'COMMON',
      cost: 0,
      description: 'อวาตาร์นักปั่นสาวผู้พิทักษ์ธรรมชาติ',
    },
    {
      id: 'avatar_3',
      name: 'Cyber Eco (มาสคอตนักปั่น)',
      image: '/avatars/avatar_3.jpg',
      assetPath: 'assets/avatars/avatar_3.jpg',
      rarity: 'COMMON',
      cost: 0,
      description: 'มาสคอตนักปั่นหมวกเขียวสุดสดใส',
    },
    {
      id: 'avatar_4',
      name: 'Legendary Astral Cyclist (นักปั่นจักรวาลคอสมิก)',
      image: '/avatars/avatar_4.jpg',
      assetPath: 'assets/avatars/avatar_4.jpg',
      rarity: 'LIMITED',
      cost: 150,
      description: '🌟 ลิมิเต็ดอวาตาร์: นักปั่นแห่งดวงดาว ออร่ากาแล็กซี่สีม่วงนีออนระดับตำนาน',
    },
    {
      id: 'avatar_5',
      name: 'Neon Thunder Champion (แชมป์เปี้ยนสายฟ้านีออน)',
      image: '/avatars/avatar_5.jpg',
      assetPath: 'assets/avatars/avatar_5.jpg',
      rarity: 'ULTRA RARE',
      cost: 250,
      description: '⚡ ลิมิเต็ดอวาตาร์: แชมป์เปี้ยนเกราะคาร์บอนสายฟ้าทองคำประกายนีออนขั้นสูงสุด',
    },
  ],
  frames: [
    {
      id: 'frame_none',
      name: 'ไม่ใส่กรอบ (None)',
      rarity: 'COMMON',
      cost: 0,
      description: 'ไม่มีกรอบโปรไฟล์',
    },
    {
      id: 'frame_phoenix_gold',
      name: 'Solar Phoenix Gold (กรอบสุริยะทองคำ)',
      rarity: 'LEGENDARY',
      cost: 150,
      description: '🔥 กรอบลิมิเต็ด: ประกายแสงสุริยะสีทองอร่าม ออร่าเพลิงฟีนิกซ์เรืองรอง',
      colors: ['#FFE259', '#FFA751', '#FF4E50'],
      borderColor: '#FFD700',
    },
    {
      id: 'frame_cyber_matrix',
      name: 'Cyber Neon Matrix (กรอบไซเบอร์พังค์นีออน)',
      rarity: 'EPIC RARE',
      cost: 200,
      description: '⚡ กรอบลิมิเต็ด: วงแหวนพลังงานโฮโลแกรม นีออนไซยานและม่วงไซเบอร์สุดล้ำ',
      colors: ['#00F2FE', '#4FACFE', '#7F00FF'],
      borderColor: '#00F2FE',
    },
    {
      id: 'frame_emerald_dragon',
      name: 'Emerald Guardian (กรอบมรกตพฤกษา)',
      rarity: 'MYTHIC ECO',
      cost: 300,
      description: '🌿 กรอบลิมิเต็ด: เถาวัลย์มรกตเรืองแสง ประดับผลึกหยกพิทักษ์ผืนป่า',
      colors: ['#00FF87', '#60EFFF', '#059669'],
      borderColor: '#00FF87',
    },
    {
      id: 'frame_hades_flame',
      name: 'Hades Netherflame (กรอบเฮเดส จ้าวแห่งยมโลก)',
      rarity: 'MYTHIC RARE',
      cost: 350,
      description: '💀 กรอบลิมิเต็ด: เปลวเพลิงวิญญาณสีฟ้าเทอร์ควอยซ์และกะโหลกยมโลกเรืองแสง',
      colors: ['#00F2FE', '#4FACFE', '#00C9FF', '#00223E'],
      borderColor: '#00F2FE',
    },
    {
      id: 'frame_spider_neon',
      name: 'Spider Cyber Web (กรอบสไปเดอร์เว็บนีออน)',
      rarity: 'EPIC RARE',
      cost: 250,
      description: '🕸️ กรอบลิมิเต็ด: ใยแมงมุมไซเบอร์พังค์สีแดงเลือดหมูและนีออนสไปเดอร์',
      colors: ['#FF0844', '#FF4E50', '#8A2387', '#E94057'],
      borderColor: '#FF0844',
    },
    {
      id: 'frame_cosmic_galaxy',
      name: 'Cosmic Nebula Void (กรอบคอสมิกเนบิวลา)',
      rarity: 'LEGENDARY',
      cost: 200,
      description: '🌌 กรอบลิมิเต็ด: วงแหวนเนบิวลาดวงดาวและออร่ากาแล็กซี่สีม่วงคอสมิก',
      colors: ['#B224EF', '#7579FF', '#8E2DE2', '#4A00E0'],
      borderColor: '#B224EF',
    },
  ],
  banners: [
    {
      id: 'banner_cyber_forest',
      name: 'Cyber Forest Eco (ป่าไซเบอร์เขียวธรรมชาติ)',
      rarity: 'FREE',
      cost: 0,
      description: '🌿 เบนเนอร์ฟรี: ผืนป่าไซเบอร์เขียวธรรมชาติประกายแสงเรืองรอง',
      theme: 'forest',
      colors: ['#0B3A26', '#051D13', '#030D08'],
    },
    {
      id: 'banner_midnight_star',
      name: 'Midnight Starlight (ฟ้าราตรีดวงดาว)',
      rarity: 'FREE',
      cost: 0,
      description: '🌌 เบนเนอร์ฟรี: ท้องฟ้าราตรีระยิบระยับด้วยละอองดวงดาว',
      theme: 'starlight',
      colors: ['#0F2027', '#203A43', '#2C5364'],
    },
    {
      id: 'banner_solar_phoenix',
      name: 'Solar Phoenix Inferno (สุริยะเพลิงฟีนิกซ์ทองคำ 60FPS)',
      rarity: 'LEGENDARY',
      cost: 150,
      description: '🔥 ลิมิเต็ดเบนเนอร์: เปลวเพลิงสุริยะสีทองคำระเบิดอนุภาคประกายเพลิงฟีนิกซ์เคลื่อนไหววนลูป',
      theme: 'phoenix',
      colors: ['#5A2A00', '#2E1000', '#140700'],
    },
    {
      id: 'banner_hades_flame',
      name: 'Hades Netherrealm Flame (เพลิงวิญญาณยมโลกสีฟ้า)',
      rarity: 'MYTHIC RARE',
      cost: 250,
      description: '💀 ลิมิเต็ดเบนเนอร์: เปลวไฟวิญญาณยมโลกสีฟ้าเทอร์ควอยซ์และกะโหลกเวทมนตร์เคลื่อนไหววนลูป',
      theme: 'hades',
      colors: ['#003D4C', '#001E29', '#000D14'],
    },
    {
      id: 'banner_spider_city',
      name: 'Cyber Neon Spider City (มหานครสไปเดอร์นีออน)',
      rarity: 'EPIC RARE',
      cost: 300,
      description: '🕸️ ลิมิเต็ดเบนเนอร์: ใยแมงมุมเลเซอร์นีออนสีแดงเลือดหมูพาดผ่านตึกระฟ้าไซเบอร์พังค์',
      theme: 'spider',
      colors: ['#4C0018', '#29000B', '#140005'],
    },
  ],
};

/**
 * GET /api/users/:id/inspect
 * Inspect any user's profile card in real-time
 */
router.get('/:id/inspect', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      `SELECT id, name, email, profile_image, profile_frame, profile_banner,
              total_distance_km, total_co2_reduced_kg, total_green_points, total_rides,
              created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    user.total_distance_km = parseFloat(user.total_distance_km || 0);
    user.total_co2_reduced_kg = parseFloat(user.total_co2_reduced_kg || 0);
    user.total_green_points = parseInt(user.total_green_points || 0);
    user.total_rides = parseInt(user.total_rides || 0);

    // Get rank
    const rankResult = await pool.query(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY total_green_points DESC) as rank
         FROM users
       ) r WHERE id = $1`,
      [id]
    );
    user.rank = rankResult.rows[0]?.rank || 1;

    // Get badges
    const badgesResult = await pool.query(
      `SELECT b.name, b.icon, b.description, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [id]
    );

    // Get recent rides
    const ridesResult = await pool.query(
      `SELECT id, distance_km, duration_sec, avg_speed_kmh, co2_reduced_kg, green_points, start_time
       FROM rides
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY start_time DESC LIMIT 3`,
      [id]
    );

    res.json({
      user,
      badges: badgesResult.rows,
      recent_rides: ridesResult.rows,
    });
  } catch (err) {
    console.error('Inspect user error:', err);
    res.status(500).json({ error: 'Failed to inspect user' });
  }
});

/**
 * GET /api/users/profile
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.profile_image, u.profile_frame, u.profile_banner,
              u.total_distance_km, u.total_co2_reduced_kg, u.total_green_points, u.total_rides,
              u.created_at,
              COUNT(ub.badge_id) as badge_count
       FROM users u
       LEFT JOIN user_badges ub ON ub.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all-time rank
    const rankResult = await pool.query(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY total_green_points DESC) as rank
         FROM users
       ) r WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    user.rank = rankResult.rows[0]?.rank || null;

    res.json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * POST /api/users/upload-avatar
 * Upload custom image file (base64)
 */
router.post('/upload-avatar', auth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพ' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const avatarsDir = path.join(__dirname, '../../public/avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const safeFilename = `uploaded_${req.user.id}_${Date.now()}.png`;
    const filePath = path.join(avatarsDir, safeFilename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/avatars/${safeFilename}`;

    // Update user profile in DB
    await pool.query(
      'UPDATE users SET profile_image = $1, updated_at = NOW() WHERE id = $2',
      [publicUrl, req.user.id]
    );

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const updatedUser = userRes.rows[0];
    if (updatedUser) FirebaseSync.syncUser(updatedUser);

    res.json({
      message: 'อัปโหลดรูปโปรไฟล์สำเร็จ!',
      profile_image: publicUrl,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'ไม่สามารถอัปโหลดรูปภาพได้' });
  }
});

/**
 * GET /api/users/customization
 * Get catalog of avatars, frames & banners with user's unlock status
 */
router.get('/customization', auth, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT total_green_points, profile_image, profile_frame, profile_banner FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    const unlockedSet = new Set(['avatar_1', 'avatar_2', 'avatar_3', 'frame_none', 'banner_cyber_forest', 'banner_midnight_star']);
    
    try {
      const unlockedRes = await pool.query('SELECT item_id FROM user_unlocked_items WHERE user_id = $1', [req.user.id]);
      if (unlockedRes.rows) {
        unlockedRes.rows.forEach(r => unlockedSet.add(r.item_id));
      }
    } catch (_) {}

    const avatars = CUSTOMIZATION_CATALOG.avatars.map(a => ({
      ...a,
      isUnlocked: unlockedSet.has(a.id),
      isEquipped: user.profile_image === a.image || user.profile_image === a.assetPath || user.profile_image === a.id,
    }));

    const frames = CUSTOMIZATION_CATALOG.frames.map(f => ({
      ...f,
      isUnlocked: unlockedSet.has(f.id),
      isEquipped: (user.profile_frame || 'frame_none') === f.id,
    }));

    const banners = CUSTOMIZATION_CATALOG.banners.map(b => ({
      ...b,
      isUnlocked: unlockedSet.has(b.id),
      isEquipped: (user.profile_banner || 'banner_cyber_forest') === b.id,
    }));

    res.json({
      greenPoints: user.total_green_points,
      currentAvatar: user.profile_image,
      currentFrame: user.profile_frame || 'frame_none',
      currentBanner: user.profile_banner || 'banner_cyber_forest',
      avatars,
      frames,
      banners,
    });
  } catch (err) {
    console.error('Customization catalog error:', err);
    res.status(500).json({ error: 'Failed to get customization catalog', details: err.message });
  }
});

/**
 * POST /api/users/unlock-item
 * Unlock a limited avatar, frame, or banner with Green Points
 */
router.post('/unlock-item', auth, async (req, res) => {
  const itemId = req.body.itemId || req.body.item_id;
  const itemType = req.body.itemType || req.body.item_type;

  try {
    let item = null;
    if (itemType === 'avatar') {
      item = CUSTOMIZATION_CATALOG.avatars.find(a => a.id === itemId);
    } else if (itemType === 'frame') {
      item = CUSTOMIZATION_CATALOG.frames.find(f => f.id === itemId);
    } else if (itemType === 'banner') {
      item = CUSTOMIZATION_CATALOG.banners.find(b => b.id === itemId);
    }

    if (!item) {
      return res.status(404).json({ error: 'ไม่พบไอเทมที่ระบุ' });
    }

    // Check user points
    const userRes = await pool.query('SELECT total_green_points FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    if (user.total_green_points < item.cost) {
      return res.status(400).json({
        error: `แต้ม Green Points ไม่เพียงพอ (ต้องการ ${item.cost} pts, คุณมี ${user.total_green_points} pts)`
      });
    }

    // Check if already unlocked
    const checkUnlocked = await pool.query(
      'SELECT id FROM user_unlocked_items WHERE user_id = $1 AND item_id = $2',
      [req.user.id, itemId]
    );
    if (checkUnlocked.rows.length > 0) {
      return res.status(400).json({ error: 'คุณปลดล็อกไอเทมนี้แล้ว' });
    }

    // Deduct points and record unlock
    const newPoints = user.total_green_points - item.cost;
    await pool.query('UPDATE users SET total_green_points = $1 WHERE id = $2', [newPoints, req.user.id]);

    const unlockId = require('crypto').randomBytes(8).toString('hex');
    await pool.query(
      'INSERT INTO user_unlocked_items (id, user_id, item_type, item_id) VALUES ($1, $2, $3, $4)',
      [unlockId, req.user.id, itemType, itemId]
    );

    FirebaseSync.syncCustomizationUnlock({ id: unlockId, user_id: req.user.id, item_type: itemType, item_id: itemId });
    pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
      .then(r => { if (r.rows[0]) FirebaseSync.syncUser(r.rows[0]); })
      .catch(console.error);

    res.json({
      message: `ปลดล็อก ${item.name} สำเร็จ! 🎉`,
      remainingPoints: newPoints,
      itemId,
    });
  } catch (err) {
    console.error('Unlock item error:', err);
    res.status(500).json({ error: 'ไม่สามารถปลดล็อกไอเทมได้' });
  }
});

/**
 * PUT /api/users/equip
 * Equip an avatar, frame, or banner
 */
router.put('/equip', auth, async (req, res) => {
  const { avatarId, frameId, bannerId, profile_image, profile_frame, profile_banner } = req.body;

  try {
    const updateFields = [];
    const params = [];
    let paramIdx = 1;

    if (avatarId !== undefined) {
      const avatar = CUSTOMIZATION_CATALOG.avatars.find(a => a.id === avatarId);
      if (avatar) {
        updateFields.push(`profile_image = $${paramIdx++}`);
        params.push(avatar.image);
      }
    } else if (profile_image !== undefined) {
      updateFields.push(`profile_image = $${paramIdx++}`);
      params.push(profile_image);
    }

    if (frameId !== undefined) {
      updateFields.push(`profile_frame = $${paramIdx++}`);
      params.push(frameId);
    } else if (profile_frame !== undefined) {
      updateFields.push(`profile_frame = $${paramIdx++}`);
      params.push(profile_frame);
    }

    if (bannerId !== undefined) {
      updateFields.push(`profile_banner = $${paramIdx++}`);
      params.push(bannerId);
    } else if (profile_banner !== undefined) {
      updateFields.push(`profile_banner = $${paramIdx++}`);
      params.push(profile_banner);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user.id);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING id, name, email, profile_image, profile_frame, profile_banner, total_green_points`;
    const result = await pool.query(query, params);

    const updatedUser = result.rows[0];
    if (updatedUser) FirebaseSync.syncUser(updatedUser);

    res.json({
      message: 'สวมใส่อุปกรณ์สำเร็จ! ✨',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Equip item error:', err);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

/**
 * PUT /api/users/profile
 */
router.put('/profile', auth, async (req, res) => {
  const { name, email, profileImage, profile_banner } = req.body;

  try {
    const updateFields = [];
    const params = [];
    let paramIdx = 1;

    if (name) {
      updateFields.push(`name = $${paramIdx++}`);
      params.push(name);
    }
    if (email) {
      updateFields.push(`email = $${paramIdx++}`);
      params.push(email);
    }
    if (profileImage !== undefined) {
      updateFields.push(`profile_image = $${paramIdx++}`);
      params.push(profileImage);
    }
    if (profile_banner !== undefined) {
      updateFields.push(`profile_banner = $${paramIdx++}`);
      params.push(profile_banner);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user.id);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING id, name, email, profile_image, profile_frame, profile_banner, total_green_points`;
    const result = await pool.query(query, params);

    const updatedUser = result.rows[0];
    if (updatedUser) FirebaseSync.syncUser(updatedUser);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PUT /api/users/password
 */
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
