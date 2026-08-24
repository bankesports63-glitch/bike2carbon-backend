-- ============================================================
-- Bike2Carbon Seed Data
-- ============================================================

-- Settings
INSERT INTO settings (key, value, description) VALUES
  ('co2_emission_factor', '0.18', 'CO2 emission factor kg per km (car avg)'),
  ('green_points_per_km', '5', 'Green Points awarded per kilometer'),
  ('min_ride_distance_km', '0.1', 'Minimum distance to count a ride'),
  ('max_speed_kmh', '60', 'Maximum valid speed for bike (fraud detection)')
ON CONFLICT (key) DO NOTHING;

-- Challenges
INSERT INTO challenges (title, description, type, target_value, reward_points, icon, difficulty) VALUES
  -- Easy
  ('First Ride 🚲', 'ออกปั่นครั้งแรกของคุณ', 'total_rides', 1, 50, '🚲', 'easy'),
  ('Morning Rider', 'ปั่น 5 km ภายในวันเดียว', 'distance_single', 5, 30, '🌅', 'easy'),
  ('Green Starter', 'สะสม CO₂ Reduced รวม 1 kg', 'co2_total', 1, 40, '🌱', 'easy'),
  -- Medium
  ('10K Club', 'ปั่นรวม 10 km', 'total_distance', 10, 100, '🏃', 'medium'),
  ('Weekly Warrior', 'ปั่น 50 km ในหนึ่งสัปดาห์', 'distance_weekly', 50, 200, '⚡', 'medium'),
  ('3-Day Streak', 'ปั่นจักรยาน 3 วันติดต่อกัน', 'streak_days', 3, 150, '🔥', 'medium'),
  ('Eco Hero', 'ลด CO₂ รวม 5 kg', 'co2_total', 5, 120, '♻️', 'medium'),
  -- Hard
  ('Century Rider', 'ปั่นรวม 100 km', 'total_distance', 100, 500, '💯', 'hard'),
  ('7-Day Streak', 'ปั่นจักรยาน 7 วันติดต่อกัน', 'streak_days', 7, 400, '🌟', 'hard'),
  ('Green Champion', 'ลด CO₂ รวม 20 kg', 'co2_total', 20, 350, '🌍', 'hard'),
  ('Speed Demon', 'ปั่น 20 km ในครั้งเดียว', 'distance_single', 20, 300, '💨', 'hard'),
  -- Legendary
  ('Iron Cyclist', 'ปั่นรวม 500 km', 'total_distance', 500, 2000, '🦾', 'legendary'),
  ('Planet Savior', 'ลด CO₂ รวม 100 kg', 'co2_total', 100, 1500, '🌏', 'legendary'),
  ('30-Day Legend', 'ปั่นจักรยาน 30 วันติดต่อกัน', 'streak_days', 30, 2500, '👑', 'legendary'),
  ('Hundred Rides', 'ปั่นครบ 100 ครั้ง', 'total_rides', 100, 1000, '🏆', 'legendary');

-- Badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value, rarity) VALUES
  ('First Step', 'ปั่นครั้งแรก', '🚲', 'total_rides', 1, 'common'),
  ('5K Rider', 'ปั่นรวม 5 km', '🌿', 'total_distance', 5, 'common'),
  ('10K Rider', 'ปั่นรวม 10 km', '🍃', 'total_distance', 10, 'common'),
  ('50K Rider', 'ปั่นรวม 50 km', '🌱', 'total_distance', 50, 'rare'),
  ('100K Rider', 'ปั่นรวม 100 km', '🌲', 'total_distance', 100, 'rare'),
  ('500K Rider', 'ปั่นรวม 500 km', '🌳', 'total_distance', 500, 'epic'),
  ('1000K Legend', 'ปั่นรวม 1,000 km', '🏔️', 'total_distance', 1000, 'legendary'),
  ('Eco Beginner', 'ลด CO₂ ได้ 1 kg', '♻️', 'total_co2', 1, 'common'),
  ('Eco Advocate', 'ลด CO₂ ได้ 10 kg', '🌍', 'total_co2', 10, 'rare'),
  ('Eco Champion', 'ลด CO₂ ได้ 50 kg', '🌏', 'total_co2', 50, 'epic'),
  ('Planet Guardian', 'ลด CO₂ ได้ 200 kg', '🌠', 'total_co2', 200, 'legendary'),
  ('Point Collector', 'สะสม 100 Green Points', '⭐', 'total_points', 100, 'common'),
  ('Point Master', 'สะสม 1,000 Green Points', '🌟', 'total_points', 1000, 'rare'),
  ('Point Legend', 'สะสม 10,000 Green Points', '💫', 'total_points', 10000, 'legendary');

-- Real Users
INSERT OR REPLACE INTO users (id, name, email, password_hash, profile_image, total_distance_km, total_co2_reduced_kg, total_green_points, total_rides, created_at, updated_at, profile_frame, profile_banner) VALUES
  ('a3336b75298b318127ba4bfbbeaefbba', 'กัญจนพร เหมือนทิพย์', 'kanjanaphon.9@gmail.com', '$2a$12$Kj4w3otH2GtYbJW5fiuB6uklosoODAX/3VfwkKWXjJxtvCzY3oFt6', '/avatars/uploaded_a3336b75298b318127ba4bfbbeaefbba_1787550457329.png', 64.04, 11.53, 205, 9, '2026-08-24 05:44:18', '2026-08-24 05:58:31', 'frame_cosmic_galaxy', 'banner_spider_city'),
  ('02e91aab25bca1d5aab650770d7e5448', 'banknx_xz27', 'bank@gmail.com', '$2a$12$.vvEtTF5SF1CQF2bSU2fVe/VMID4r3C3us3pQGB2qllH9OfjjyyGq', '/avatars/avatar_4.jpg', 36.48, 6.57, 76, 17, '2026-08-17 06:38:07', '2026-08-24 05:32:18', 'frame_phoenix_gold', 'banner_hades_flame'),
  ('0903cd62568f029c3c5db621f8af27fd', 'อันยอง เซฮา', 'beem@gmail.com', '$2a$12$qp3cHWpNUK1XOI1RYJJ6u.ygbajxyyUAqmeMuOsjy0WQCMH5mhUwC', '/avatars/avatar_3.jpg', 0, 0, 0, 0, '2026-08-20 12:55:50', '2026-08-20 13:44:50', 'frame_none', 'banner_midnight_star'),
  ('18ae36b011e5232af6d33b8ecefa81d7', 'pook', 'pook@gmail.con', '$2a$12$EI5w6FJdF.I6Oe82LdxUd.czAbJBQIj4xOf28.JVa88CXBH7U1UQu', null, 0, 0, 0, 0, '2026-08-23 12:26:13', '2026-08-23 12:26:13', 'frame_none', 'banner_cyber_forest');
