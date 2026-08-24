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
