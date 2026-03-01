import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const setUserPassword = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated'
    )
  }

  // Verify admin
  const userRecord = await admin.auth().getUser(context.auth.uid)
  if (userRecord.email !== 'lamgary@p7s.app') {
    const customClaims = userRecord.customClaims || {}
    if (customClaims.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can reset passwords'
      )
    }
  }

  const { uid, newPassword } = data

  if (!uid || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'UID and newPassword are required'
    )
  }

  if (newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters'
    )
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword })
    return { success: true, message: 'Password updated' }
  } catch (error: any) {
    console.error('Error:', error)
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to update password'
    )
  }
})
