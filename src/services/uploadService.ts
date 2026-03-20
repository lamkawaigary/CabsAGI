import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import imageCompression from 'browser-image-compression'

// Image compression options for KYC documents
const compressionOptions = {
  maxSizeMB: 0.5, // Compress to under 500KB
  maxWidthOrHeight: 1280, // Max dimension 1280px
  useWebWorker: true,
}

export const uploadService = {
  async compressImage(file: File): Promise<File> {
    try {
      console.log('Original size:', file.size / 1024 / 1024, 'MB')
      const compressedFile = await imageCompression(file, compressionOptions)
      console.log('Compressed size:', compressedFile.size / 1024 / 1024, 'MB')
      return compressedFile
    } catch (error) {
      console.error('Compression failed:', error)
      // Return original if compression fails
      return file
    }
  },

  async uploadKYCImage(
    userId: string, 
    type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense', 
    file: File
  ): Promise<{ ok: boolean; url?: string; message?: string }> {
    try {
      // Compress image first
      const compressedFile = await uploadService.compressImage(file)
      
      const storageRef = ref(storage, `kyc/${userId}/${type}/${Date.now()}_${compressedFile.name}`)
      const snapshot = await uploadBytes(storageRef, compressedFile)
      const url = await getDownloadURL(snapshot.ref)
      return { ok: true, url }
    } catch (error) {
      console.error('Upload failed:', error)
      return { ok: false, message: '上傳失敗，請稍後再試' }
    }
  },

  async uploadMultipleImages(
    userId: string,
    files: { type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense'; file: File }[]
  ): Promise<{ ok: boolean; urls?: Record<string, string>; message?: string }> {
    try {
      const urls: Record<string, string> = {}
      
      for (const { type, file } of files) {
        // Compress each image
        const compressedFile = await uploadService.compressImage(file)
        
        const storageRef = ref(storage, `kyc/${userId}/${type}/${Date.now()}_${compressedFile.name}`)
        const snapshot = await uploadBytes(storageRef, compressedFile)
        const url = await getDownloadURL(snapshot.ref)
        urls[type] = url
        console.log(`Uploaded ${type}:`, url)
      }
      
      return { ok: true, urls }
    } catch (error) {
      console.error('Upload failed:', error)
      return { ok: false, message: '上傳失敗，請稍後再試' }
    }
  }
}
