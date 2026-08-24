/**
 * CO₂ and Green Points Calculator
 * All values are configurable via settings table
 */

// Default fallback values (overridden by DB settings)
const DEFAULTS = {
  emissionFactor: parseFloat(process.env.CO2_EMISSION_FACTOR) || 0.18, // kg CO2 per km
  pointsPerKm: parseFloat(process.env.GREEN_POINTS_PER_KM) || 5,       // points per km
};

/**
 * Calculate CO₂ reduced by cycling instead of driving
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} emissionFactor - kg CO2 per km (default 0.18)
 * @returns {number} CO₂ reduced in kg
 */
function calculateCO2Reduced(distanceKm, emissionFactor = DEFAULTS.emissionFactor) {
  return parseFloat((distanceKm * emissionFactor).toFixed(3));
}

/**
 * Calculate Green Points earned
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} pointsPerKm - Points per km (default 5)
 * @returns {number} Green Points (integer)
 */
function calculateGreenPoints(distanceKm, pointsPerKm = DEFAULTS.pointsPerKm) {
  return Math.floor(distanceKm * pointsPerKm);
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate total distance from array of GPS points
 * @param {Array} points - [{latitude, longitude}, ...]
 * @returns {number} Total distance in km
 */
function calculateRouteDistance(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      parseFloat(points[i-1].latitude),
      parseFloat(points[i-1].longitude),
      parseFloat(points[i].latitude),
      parseFloat(points[i].longitude)
    );
  }
  return parseFloat(total.toFixed(3));
}

/**
 * Get settings from DB or return defaults
 */
async function getSettings(pool) {
  try {
    const res = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    res.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return {
      emissionFactor: parseFloat(settings.co2_emission_factor) || DEFAULTS.emissionFactor,
      pointsPerKm: parseFloat(settings.green_points_per_km) || DEFAULTS.pointsPerKm,
    };
  } catch {
    return DEFAULTS;
  }
}

module.exports = {
  calculateCO2Reduced,
  calculateGreenPoints,
  haversineDistance,
  calculateRouteDistance,
  getSettings,
  DEFAULTS,
};
