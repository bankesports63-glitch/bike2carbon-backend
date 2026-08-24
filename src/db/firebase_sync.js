const { db, isFirebaseConnected } = require('./firebase');

const FirebaseSync = {
  async syncUser(user) {
    if (!isFirebaseConnected || !db || !user || !user.id) return;
    try {
      await db.collection('users').doc(user.id).set({
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image || '/avatars/avatar_1.jpg',
        profile_frame: user.profile_frame || 'frame_none',
        profile_banner: user.profile_banner || 'banner_cyber_forest',
        total_distance_km: Number(user.total_distance_km || 0),
        total_co2_reduced_kg: Number(user.total_co2_reduced_kg || 0),
        total_green_points: Number(user.total_green_points || 0),
        total_rides: Number(user.total_rides || 0),
        updated_at: new Date().toISOString(),
      }, { merge: true });
      console.log(`🔥 [Firestore] Synced user: ${user.name} pts=${user.total_green_points}`);
    } catch (err) {
      console.error('⚠️ [Firestore] Sync user error:', err.message);
    }
  },


  async syncRide(ride, gpsPoints = []) {
    if (!isFirebaseConnected || !db || !ride || !ride.id) return;
    try {
      await db.collection('rides').doc(ride.id).set({
        id: ride.id,
        user_id: ride.user_id,
        start_time: ride.start_time,
        end_time: ride.end_time || null,
        distance_km: Number(ride.distance_km || 0),
        duration_sec: Number(ride.duration_sec || 0),
        avg_speed_kmh: Number(ride.avg_speed_kmh || 0),
        max_speed_kmh: Number(ride.max_speed_kmh || 0),
        co2_reduced_kg: Number(ride.co2_reduced_kg || 0),
        green_points_earned: Number(ride.green_points_earned || 0),
        status: ride.status || 'completed',
        created_at: new Date().toISOString(),
      }, { merge: true });

      if (gpsPoints && gpsPoints.length > 0) {
        const batch = db.batch();
        for (const pt of gpsPoints) {
          const ptId = pt.id || `${ride.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const ref = db.collection('rides').doc(ride.id).collection('gps_points').doc(ptId);
          batch.set(ref, {
            latitude: Number(pt.latitude),
            longitude: Number(pt.longitude),
            altitude: Number(pt.altitude || 0),
            speed_kmh: Number(pt.speed_kmh || 0),
            accuracy: Number(pt.accuracy || 0),
            recorded_at: pt.recorded_at || new Date().toISOString(),
          });
        }
        await batch.commit();
      }
      console.log(`🔥 [Firestore] Synced ride: ${ride.id} with ${gpsPoints.length} GPS points`);
    } catch (err) {
      console.error('⚠️ [Firestore] Sync ride error:', err.message);
    }
  },

  async syncRedemption(redemption) {
    if (!isFirebaseConnected || !db || !redemption || !redemption.id) return;
    try {
      await db.collection('user_redemptions').doc(redemption.id).set({
        id: redemption.id,
        user_id: redemption.user_id,
        reward_id: redemption.reward_id,
        voucher_code: redemption.voucher_code,
        points_spent: Number(redemption.points_spent || 0),
        redeemed_at: redemption.redeemed_at || new Date().toISOString(),
      }, { merge: true });
      console.log(`🔥 [Firestore] Synced voucher redemption: ${redemption.voucher_code}`);
    } catch (err) {
      console.error('⚠️ [Firestore] Sync redemption error:', err.message);
    }
  },

  async syncCustomizationUnlock(unlock) {
    if (!isFirebaseConnected || !db || !unlock || !unlock.id) return;
    try {
      await db.collection('user_unlocked_items').doc(unlock.id).set({
        id: unlock.id,
        user_id: unlock.user_id,
        item_type: unlock.item_type,
        item_id: unlock.item_id,
        unlocked_at: unlock.unlocked_at || new Date().toISOString(),
      }, { merge: true });
      console.log(`🔥 [Firestore] Synced customization unlock: ${unlock.item_id}`);
    } catch (err) {
      console.error('⚠️ [Firestore] Sync customization error:', err.message);
    }
  },
};

module.exports = FirebaseSync;
