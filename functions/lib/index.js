"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserPassword = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.setUserPassword = functions.https.onCall(async (data, context) => {
    // Check if the caller is an admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }
    // Verify the user is an admin
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const customClaims = userRecord.customClaims || {};
    if (customClaims.role !== 'admin' && userRecord.email !== 'lamgary@p7s.app') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can reset user passwords');
    }
    const { uid, newPassword } = data;
    if (!uid || !newPassword) {
        throw new functions.https.HttpsError('invalid-argument', 'UID and newPassword are required');
    }
    // Validate password length
    if (newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
    try {
        await admin.auth().updateUser(uid, {
            password: newPassword,
        });
        return { success: true, message: 'Password updated successfully' };
    }
    catch (error) {
        console.error('Error updating password:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update password');
    }
});
//# sourceMappingURL=index.js.map