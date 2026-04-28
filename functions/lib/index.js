"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserPassword = exports.completeStaleTrips = exports.expireOldTrips = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// ============================================
// Scheduled Function: Auto-expire old trips
// Runs every hour
// ============================================
exports.expireOldTrips = functions.pubsub
    .schedule('every 60 minutes')
    .timeZone('Asia/Hong_Kong')
    .onRun(async () => {
    var _a, _b, _c, _d;
    console.log('Running expireOldTrips function...');
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    try {
        // Find trips that:
        // 1. Status is OPEN or CONFIRMED
        // 2. Departure time is more than 2 hours ago
        const tripsSnapshot = await db
            .collection('trips')
            .where('status', 'in', ['OPEN', 'CONFIRMED'])
            .get();
        let expiredCount = 0;
        for (const doc of tripsSnapshot.docs) {
            const trip = doc.data();
            const departureTime = trip.departureTime ? new Date(trip.departureTime) : null;
            // If departure time exists and is in the past (more than 2 hours ago)
            if (departureTime && departureTime < cutoffTime) {
                console.log(`Expiring trip: ${doc.id} - ${(_b = (_a = trip.route) === null || _a === void 0 ? void 0 : _a.pickup) === null || _b === void 0 ? void 0 : _b.placeName} → ${(_d = (_c = trip.route) === null || _c === void 0 ? void 0 : _c.dropoff) === null || _d === void 0 ? void 0 : _d.placeName}`);
                await doc.ref.update({
                    status: 'EXPIRED',
                    updatedAt: now.toISOString(),
                    expiredAt: now.toISOString(),
                });
                expiredCount++;
            }
        }
        console.log(`Expired ${expiredCount} trips`);
        return { success: true, expiredCount };
    }
    catch (error) {
        console.error('Error expiring trips:', error);
        return { success: false, error: String(error) };
    }
});
// ============================================
// Scheduled Function: Auto-complete stale trips
// Runs every hour
// If trip is IN_PROGRESS and departure was more than 4 hours ago, auto-complete
// ============================================
exports.completeStaleTrips = functions.pubsub
    .schedule('every 60 minutes')
    .timeZone('Asia/Hong_Kong')
    .onRun(async () => {
    console.log('Running completeStaleTrips function...');
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
    try {
        const tripsSnapshot = await db
            .collection('trips')
            .where('status', '==', 'IN_PROGRESS')
            .get();
        let completedCount = 0;
        for (const doc of tripsSnapshot.docs) {
            const trip = doc.data();
            const departureTime = trip.departureTime ? new Date(trip.departureTime) : null;
            // If departure time is more than 4 hours ago, auto-complete
            if (departureTime && departureTime < cutoffTime) {
                console.log(`Auto-completing trip: ${doc.id}`);
                await doc.ref.update({
                    status: 'COMPLETED',
                    updatedAt: now.toISOString(),
                    completedAt: now.toISOString(),
                });
                completedCount++;
            }
        }
        console.log(`Completed ${completedCount} stale trips`);
        return { success: true, completedCount };
    }
    catch (error) {
        console.error('Error completing trips:', error);
        return { success: false, error: String(error) };
    }
});
exports.setUserPassword = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Verify admin
    const userRecord = await admin.auth().getUser(context.auth.uid);
    if (userRecord.email !== 'lamgary@p7s.app') {
        const customClaims = userRecord.customClaims || {};
        if (customClaims.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can reset passwords');
        }
    }
    const payload = (data !== null && data !== void 0 ? data : {});
    const uid = typeof payload.uid === 'string' ? payload.uid : '';
    const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';
    if (!uid || !newPassword) {
        throw new functions.https.HttpsError('invalid-argument', 'UID and newPassword are required');
    }
    if (newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
    try {
        await admin.auth().updateUser(uid, { password: newPassword });
        return { success: true, message: 'Password updated' };
    }
    catch (error) {
        console.error('Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to update password';
        throw new functions.https.HttpsError('internal', message);
    }
});
//# sourceMappingURL=index.js.map