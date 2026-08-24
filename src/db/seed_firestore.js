const { db, isFirebaseConnected } = require('./firebase');
const bcrypt = require('bcryptjs');

async function seedFirestore() {
  if (!isFirebaseConnected || !db) {
    console.log('⚠️ Firebase is not connected. Please provide serviceAccountKey.json first.');
    return;
  }

  console.log('🌱 Seeding initial data into Google Cloud Firestore...');

  // 1. Seed Demo User
  const passwordHash = await bcrypt.hash('123456', 12);
  const demoUserId = 'demo_user_bank';
  await db.collection('users').doc(demoUserId).set({
    id: demoUserId,
    name: 'จตุพิธพร แก้วเนตร',
    email: 'bank@gmail.com',
    password_hash: passwordHash,
    profile_image: '/avatars/avatar_1.jpg',
    profile_frame: 'frame_none',
    total_distance_km: 125.4,
    total_co2_reduced_kg: 22.57,
    total_green_points: 620,
    total_rides: 18,
    created_at: new Date().toISOString(),
  }, { merge: true });
  console.log('✅ Demo user seeded');

  // 2. Seed Challenges
  const challenges = [
    { id: 'ch_1', title: 'ปั่นเพื่อโลก 10 กม.', description: 'สะสมระยะทางปั่นครบ 10 กิโลเมตรในสัปดาห์นี้', category: 'distance', target_value: 10, unit: 'km', reward_points: 50, is_active: true },
    { id: 'ch_2', title: 'ลดคาร์บอน 2 กก.', description: 'ลดการปล่อย CO₂ รวม 2 กิโลกรัม', category: 'co2', target_value: 2.0, unit: 'kg', reward_points: 80, is_active: true },
    { id: 'ch_3', title: 'นักปั่นต่อเนื่อง 3 วัน', description: 'บันทึกการปั่นอย่างน้อย 3 วันใน 1 สัปดาห์', category: 'streak', target_value: 3, unit: 'วัน', reward_points: 100, is_active: true },
    { id: 'ch_4', title: 'ปั่นระยะไกล 25 กม.', description: 'สะสมระยะทางครบ 25 กิโลเมตร', category: 'distance', target_value: 25, unit: 'km', reward_points: 150, is_active: true },
    { id: 'ch_5', title: 'ผู้พิทักษ์โลก 5 กก. CO₂', description: 'ลด CO₂ สะสมครบ 5 กิโลกรัม', category: 'co2', target_value: 5.0, unit: 'kg', reward_points: 200, is_active: true },
  ];

  for (const ch of challenges) {
    await db.collection('challenges').doc(ch.id).set(ch, { merge: true });
  }
  console.log(`✅ Seeded ${challenges.length} challenges`);

  // 3. Seed Badges
  const badges = [
    { id: 'b_first_ride', name: 'ก้าวแรกสู่วิถีกรีน', description: 'บันทึกการปั่นครั้งแรกสำเร็จ', icon: '🌱', category: 'first_ride', requirement_value: 1 },
    { id: 'b_dist_10', name: 'นักปั่น 10 กม.', description: 'สะสมระยะทางครบ 10 กิโลเมตร', icon: '🚴', category: 'distance', requirement_value: 10 },
    { id: 'b_dist_50', name: 'นักปั่น 50 กม.', description: 'สะสมระยะทางครบ 50 กิโลเมตร', icon: '🥉', category: 'distance', requirement_value: 50 },
    { id: 'b_dist_100', name: 'เซียนทางไกล 100 กม.', description: 'สะสมระยะทางครบ 100 กิโลเมตร', icon: '🥈', category: 'distance', requirement_value: 100 },
    { id: 'b_co2_5', name: 'ผู้ลด CO₂ 5 กก.', description: 'ลดการปล่อยคาร์บอนครบ 5 กิโลกรัม', icon: '🌿', category: 'co2', requirement_value: 5 },
    { id: 'b_co2_20', name: 'ฮีโร่พิทักษ์ป่า 20 กก.', description: 'ลดการปล่อยคาร์บอนครบ 20 กิโลกรัม', icon: '🌳', category: 'co2', requirement_value: 20 },
  ];

  for (const b of badges) {
    await db.collection('badges').doc(b.id).set(b, { merge: true });
  }
  console.log(`✅ Seeded ${badges.length} badges`);

  // 4. Seed Rewards
  const rewards = [
    { id: 'rew_1', title: 'ส่วนลด Café Amazon 30 บาท', description: 'ใช้เป็นส่วนลดเครื่องดื่มทุกเมนูที่ Café Amazon', category: 'discount', points_cost: 50, original_price: '30 บาท', discount_text: 'ลด 30.-', image_emoji: '☕', stock: 100, is_active: true },
    { id: 'rew_2', title: 'ร่วมปลูกต้นไม้ 1 ต้น (โครงการ Care the Wild)', description: 'แต้มของคุณจะถูกนำไปปลูกและดูแลต้นไม้ 1 ต้นในป่าชุมชน', category: 'tree', points_cost: 100, original_price: '100 บาท', discount_text: 'ฟรี 1 ต้น', image_emoji: '🌳', stock: 500, is_active: true },
    { id: 'rew_3', title: 'ส่วนลด 100 บาท ร้านจักรยาน ProBike', description: 'ส่วนลดสำหรับการซื้ออุปกรณ์จักรยานและบริการซ่อมบำรุง', category: 'bike_gear', points_cost: 150, original_price: '100 บาท', discount_text: 'ลด 100.-', image_emoji: '🚲', stock: 50, is_active: true },
    { id: 'rew_4', title: 'บัตรกำนัล Grab 50 บาท (GrabRide/GrabFood)', description: 'คูปองส่วนลดสำหรับบริการเรียกรถหรือสั่งอาหาร Grab', category: 'voucher', points_cost: 80, original_price: '50 บาท', discount_text: 'ลด 50.-', image_emoji: '🚗', stock: 80, is_active: true },
    { id: 'rew_5', title: 'เสื้อยืด Bike2Carbon Eco-Shirt (ผลิตจากผ้ารีไซเคิล)', description: 'เสื้อยืดรักษ์โลก ผลิตจากขวดพลาสติก PET รีไซเคิล 100%', category: 'goods', points_cost: 300, original_price: '390 บาท', discount_text: 'รับฟรี', image_emoji: '👕', stock: 20, is_active: true },
  ];

  for (const rew of rewards) {
    await db.collection('rewards').doc(rew.id).set(rew, { merge: true });
  }
  console.log(`✅ Seeded ${rewards.length} rewards`);

  console.log('🎉 Firestore seeding completed successfully!');
}

if (require.main === module) {
  seedFirestore().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedFirestore;
