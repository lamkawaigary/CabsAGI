"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserPassword = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.setUserPassword = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        // Check authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        // Verify the token and get user
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (e) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        // Check if user is admin
        const userRecord = await admin.auth().getUser(decodedToken.uid);
        const customClaims = userRecord.customClaims || {};
        if (customClaims.role !== 'admin' && userRecord.email !== 'lamgary@p7s.app') {
            res.status(403).json({ error: 'Only admins can reset user passwords' });
            return;
        }
        const { uid, newPassword } = req.body;
        if (!uid || !newPassword) {
            res.status(400).json({ error: 'UID and newPassword are required' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }
        await admin.auth().updateUser(uid, {
            password: newPassword,
        });
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});
//# sourceMappingURL=index.js.map