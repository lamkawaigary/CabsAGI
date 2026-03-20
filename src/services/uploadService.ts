import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'

export const uploadService = {
  async uploadKYCImage(userId: string, type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense', file: File): Promise<{ ok: boolean; url?: string; message?: string }> {
    try {
      const storageRef = ref(storage, `kyc/${userId}/${type}/${Date.now()}_${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
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
        const storageRef = ref(storage, `kyc/${userId}/${type}/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(storageRef, file)
        const url = await getDownloadURL(snapshot.ref)
        urls[type] = url
      }
      
      return { ok: true, urls }
    } catch (error) {
      console.error('Upload failed:', error)
      return { ok: false, message: '上傳失敗，請稍後再試' }
    }
  }
}
