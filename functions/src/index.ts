import * as functions from 'firebase-functions/v2'

export const helloWorld = functions.https.onRequest((req, res) => {
  res.json({ message: 'Hello from Firebase V2!' })
})
