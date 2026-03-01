import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'p7s-web',
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  // @ts-ignore - additional fields
  universe_domain: 'googleapis.com',
}

// Initialize Firebase Admin only once
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount as any),
    })
  } catch (e) {
    console.error('Firebase init error:', e)
  }
}

export async function POST(request: NextRequest) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse('', { headers: corsHeaders })
  }

  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const auth = getAuth()
    
    // Verify token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
    }

    // Check if admin
    const userRecord = await auth.getUser(decodedToken.uid)
    const customClaims = userRecord.customClaims || {}
    
    if (customClaims.role !== 'admin' && userRecord.email !== 'lamgary@p7s.app') {
      return NextResponse.json({ error: 'Only admins can reset passwords' }, { status: 403, headers: corsHeaders })
    }

    const { uid, newPassword } = await request.json()

    if (!uid || !newPassword) {
      return NextResponse.json({ error: 'UID and newPassword required' }, { status: 400, headers: corsHeaders })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400, headers: corsHeaders })
    }

    await auth.updateUser(uid, { password: newPassword })

    return NextResponse.json({ success: true, message: 'Password updated' }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500, headers: corsHeaders })
  }
}
