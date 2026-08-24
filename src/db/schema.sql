-- ============================================================
-- Bike2Carbon Database Schema (SQLite Version)
-- ============================================================

DROP VIEW IF EXISTS leaderboard_monthly;
DROP VIEW IF EXISTS leaderboard_daily;
DROP VIEW IF EXISTS leaderboard_weekly;
DROP VIEW IF EXISTS leaderboard_view;

-- NOTE: rewards, user_redemptions, user_unlocked_items are NOT dropped to preserve data
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS user_challenges;
DROP TABLE IF EXISTS gps_points;
DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS challenges;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image TEXT,
  profile_frame TEXT DEFAULT 'frame_none',
  profile_banner TEXT DEFAULT 'banner_cyber_forest',
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  total_co2_reduced_kg DECIMAL(10,3) DEFAULT 0,
  total_green_points INTEGER DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rides
CREATE TABLE rides (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  distance_km DECIMAL(10,3) DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  avg_speed_kmh DECIMAL(6,2) DEFAULT 0,
  max_speed_kmh DECIMAL(6,2) DEFAULT 0,
  co2_reduced_kg DECIMAL(10,3) DEFAULT 0,
  green_points INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GPS Points
CREATE TABLE gps_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  altitude DECIMAL(8,2),
  speed_kmh DECIMAL(6,2),
  accuracy DECIMAL(6,2),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Challenges
CREATE TABLE challenges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('distance_single', 'distance_weekly', 'streak_days', 'total_distance', 'total_rides', 'co2_total')),
  target_value DECIMAL(10,2) NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 0,
  icon VARCHAR(10) DEFAULT '🚲',
  difficulty VARCHAR(20) DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Challenges Progress
CREATE TABLE user_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress DECIMAL(10,2) DEFAULT 0,
  completed_at DATETIME,
  reward_claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, challenge_id)
);

-- Badges
CREATE TABLE badges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '🏅',
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value DECIMAL(10,2) NOT NULL,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Badges
CREATE TABLE user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Settings
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  category VARCHAR(50) DEFAULT 'discount',
  partner_name VARCHAR(100),
  icon VARCHAR(20) DEFAULT '🎁',
  stock INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Redemptions
CREATE TABLE IF NOT EXISTS user_redemptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Unlocked Customizations
CREATE TABLE IF NOT EXISTS user_unlocked_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id)
);

-- Indexes
CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_start_time ON rides(start_time);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_gps_ride_id ON gps_points(ride_id);
CREATE INDEX idx_gps_recorded_at ON gps_points(recorded_at);
CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_users_email ON users(email);

-- Leaderboards
CREATE VIEW leaderboard_view AS
SELECT
  u.id, u.name, u.profile_image, u.total_distance_km, u.total_co2_reduced_kg,
  u.total_green_points, u.total_rides,
  RANK() OVER (ORDER BY u.total_green_points DESC) as all_time_rank
FROM users u
WHERE u.total_rides > 0;

CREATE VIEW leaderboard_weekly AS
SELECT
  u.id, u.name, u.profile_image,
  COALESCE(SUM(r.distance_km), 0) as week_distance,
  COALESCE(SUM(r.co2_reduced_kg), 0) as week_co2,
  COALESCE(SUM(r.green_points), 0) as week_points,
  COALESCE(COUNT(r.id), 0) as week_rides,
  RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as week_rank
FROM users u
LEFT JOIN rides r ON r.user_id = u.id
  AND r.status = 'completed'
  AND r.start_time >= datetime('now', '-7 days')
GROUP BY u.id, u.name, u.profile_image;

CREATE VIEW leaderboard_daily AS
SELECT
  u.id, u.name, u.profile_image,
  COALESCE(SUM(r.distance_km), 0) as day_distance,
  COALESCE(SUM(r.co2_reduced_kg), 0) as day_co2,
  COALESCE(SUM(r.green_points), 0) as day_points,
  COALESCE(COUNT(r.id), 0) as day_rides,
  RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as day_rank
FROM users u
LEFT JOIN rides r ON r.user_id = u.id
  AND r.status = 'completed'
  AND r.start_time >= datetime('now', 'start of day')
GROUP BY u.id, u.name, u.profile_image;

CREATE VIEW leaderboard_monthly AS
SELECT
  u.id, u.name, u.profile_image,
  COALESCE(SUM(r.distance_km), 0) as month_distance,
  COALESCE(SUM(r.co2_reduced_kg), 0) as month_co2,
  COALESCE(SUM(r.green_points), 0) as month_points,
  COALESCE(COUNT(r.id), 0) as month_rides,
  RANK() OVER (ORDER BY COALESCE(SUM(r.green_points), 0) DESC) as month_rank
FROM users u
LEFT JOIN rides r ON r.user_id = u.id
  AND r.status = 'completed'
  AND r.start_time >= datetime('now', 'start of month')
GROUP BY u.id, u.name, u.profile_image;
