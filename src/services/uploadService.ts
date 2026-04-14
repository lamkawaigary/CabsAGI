import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const uploadService = {
  async uploadWithRetry(
    userId: string, 
    type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense', 
    file: File
  ): Promise<{ ok: boolean; url?: string; message?: string }> {
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${MAX_RETRIES}: ${type}`)
        
        // Create a smaller reference path
        const timestamp = Date.now()
        const fileName = `${type}_${timestamp}.jpg`
        const storageRef = ref(storage, `kyc/${userId}/${fileName}`)
        
        // Convert to JPEG if it's a PNG to reduce size
        let fileToUpload = file
        
        // Upload with metadata
        const metadata = {
          contentType: file.type || 'image/jpeg',
          customMetadata: {
            userId,
            type,
            uploadedAt: new Date().toISOString()
          }
        }
        
        const snapshot = await uploadBytes(storageRef, fileToUpload, metadata)
        const url = await getDownloadURL(snapshot.ref)
        
        console.log(`Upload success: ${url}`)
        return { ok: true, url }
        
      } catch (error: any) {
        console.error(`Upload attempt ${attempt} failed:`, error)
        lastError = error
        
        // Wait before retry
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt)
        }
      }
    }
    
    console.error('All upload attempts failed:', lastError)
    return { 
      ok: false, 
      message: `上傳失敗 (嘗試${MAX_RETRIES}次): ${lastError?.message || '未知錯誤'}` 
    }
  },

  async uploadKYCImage(
    userId: string, 
    type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense', 
    file: File
  ): Promise<{ ok: boolean; url?: string; message?: string }> {
    return uploadService.uploadWithRetry(userId, type, file)
  },

  async uploadMultipleImages(
    userId: string,
    files: { type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense'; file: File }[]
  ): Promise<{ ok: boolean; urls?: Record<string, string>; message?: string }> {
    const urls: Record<string, string> = {}
    const errors: string[] = []
    
    for (const { type, file } of files) {
      const result = await uploadService.uploadWithRetry(userId, type, file)
      if (result.ok && result.url) {
        urls[type] = result.url
      } else {
        errors.push(`${type}: ${result.message}`)
      }
    }
    
    if (Object.keys(urls).length === 0) {
      return { ok: false, message: errors.join(', ') || '所有上傳失敗' }
    }
    
    return { ok: true, urls }
  }
}
