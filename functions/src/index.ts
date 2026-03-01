import * as functions from 'firebase-functions'

const admin = require('firebase-admin')
admin.initializeApp()

export const setUserPassword = functions
  .runWith({ secrets: ['FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'] })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', 'https://cabs-agi.vercel.app')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const idToken = authHeader.split('Bearer ')[1]
      let decodedToken
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken)
      } catch (e) {
        res.status(401).json({ error: 'Invalid token' })
        return
      }

      const userRecord = await admin.auth().getUser(decodedToken.uid)
      if (userRecord.email !== 'lamgary@p7s.app') {
        const customClaims = userRecord.customClaims || {}
        if (customClaims.role !== 'admin') {
          res.status(403).json({ error: 'Only admins can reset passwords' })
          return
        }
      }

      const { uid, newPassword } = req.body
      if (!uid || !newPassword || newPassword.length < 6) {
        res.status(400).json({ error: 'Invalid parameters' })
        return
      }

      await admin.auth().updateUser(uid, { password: newPassword })
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error:', error)
      res.status(500).json({ error: error.message })
    }
  })
