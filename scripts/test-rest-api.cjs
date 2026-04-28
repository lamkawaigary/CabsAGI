// Test Firestore REST API with Firebase ID token
const https = require('https')

const PROJECT_ID = 'cabs-agi-a779f'
const API_KEY = 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4'

// Step 1: Sign in to get ID token
async function getIdToken(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true
    })
    
    const options = {
      hostname: 'www.googleapis.com',
      path: '/identitytoolkit/v3/relyingparty/verifyPassword?key=' + API_KEY,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          if (result.idToken) {
            resolve(result.idToken)
          } else {
            reject(new Error(result.error?.message || 'No ID token'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// Step 2: Make Firestore request with ID token
async function firestoreRequest(path, method, body, idToken) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`
    
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + (urlObj.search || ''),
      method: method,
      headers: {
        'Authorization': 'Bearer ' + idToken,
        'Content-Type': 'application/json'
      }
    }
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data)
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })
    
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function test() {
  console.log('=== Testing Firestore REST API ===\n')
  
  // Sign in
  console.log('1. Signing in as lamkawaigary@gmail.com...')
  try {
    const idToken = await getIdToken('lamkawaigary@gmail.com', 'lamka123')
    console.log(`   ✅ Got ID token: ${idToken.substring(0, 20)}...`)
    
    // Try to read chatRooms
    console.log('\n2. Reading chatRooms...')
    const readResult = await firestoreRequest('/chatRooms', 'GET', null, idToken)
    console.log(`   Status: ${readResult.status}`)
    if (readResult.data.documents) {
      console.log(`   ✅ Found ${readResult.data.documents.length} chat rooms`)
    } else if (readResult.data.error) {
      console.log(`   ❌ Error: ${readResult.data.error.message}`)
    } else {
      console.log(`   Response: ${JSON.stringify(readResult.data).substring(0, 200)}`)
    }
    
    // Try to create chat room
    console.log('\n3. Creating chat room...')
    const createResult = await firestoreRequest('/chatRooms', 'POST', {
      fields: {
        test: { stringValue: 'REST API test' },
        roomType: { stringValue: 'trip' },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    }, idToken)
    console.log(`   Status: ${createResult.status}`)
    if (createResult.data.name) {
      console.log(`   ✅ Created: ${createResult.data.name.split('/').pop()}`)
    } else if (createResult.data.error) {
      console.log(`   ❌ Error: ${createResult.data.error.message}`)
    } else {
      console.log(`   Response: ${JSON.stringify(createResult.data).substring(0, 200)}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
  
  console.log('\n=== Done ===')
}

test()