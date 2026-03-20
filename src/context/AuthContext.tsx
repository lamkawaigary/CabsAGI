/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, getDocs, query, where, collection } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebaseConfig'
import { TwilioService } from '../services/twilioService'

type UserRole = 'passenger' | 'driver' | 'admin'

export interface AuthUser {
  id: string
  name: string
  phone: string
  phoneVerified: boolean
  email: string
  role: UserRole
  points: number
  // Driver-specific fields
  kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'n/a'
  driverApproved?: boolean
  kycSubmittedAt?: string | null
  // KYC Documents
  idCardFront?: string // URL to ID card front image
  idCardBack?: string // URL to ID card back image
  driverLicense?: string // URL to driver's license image
  vehicleLicense?: string // URL to vehicle license image
  kycRejectionReason?: string // Reason if rejected
}

interface AuthContextValue {
  currentUser: AuthUser | null
  loading: boolean
  needsRoleSelection: boolean
  setNeedsRoleSelection: (value: boolean) => void
  loginWithPassword: (input: string, password: string, regionCode?: string) => Promise<{ ok: boolean; message: string }>
  loginWithGoogle: () => Promise<{ ok: boolean; message: string }>
  sendOtp: (regionCode: string, phone: string) => Promise<{ ok: boolean; message: string }>
  verifyOtp: (otpCode: string) => Promise<{ ok: boolean; message: string }>
  registerUser: (params: {
    regionCode: string
    phone: string
    password: string
    name: string
    role?: UserRole
  }) => Promise<{ ok: boolean; message: string }>
  resetPasswordByPhone: (regionCode: string, phone: string, newPassword?: string, otpCode?: string) => Promise<{ ok: boolean; message: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const MASTER_EMAIL = 'lamgary@p7s.app'
const MASTER_PHONE = '+85269277488'

// Admin emails - can be extended
const ADMIN_EMAILS = [
  'lamgary@p7s.app',
  'gary@zerototendesign.com',
  'gary@zerototendesign.com'.toLowerCase(),
]

const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

const getErrorCode = (err: unknown) =>
  err && typeof err === 'object' && 'code' in err && typeof (err as FirebaseError).code === 'string'
    ? (err as FirebaseError).code
    : ''

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error')

const normalizeUserRole = (role: unknown, fallbackEmail = ''): UserRole => {
  // First check if email is in admin list (this takes priority)
  if (fallbackEmail && isAdminEmail(fallbackEmail)) {
    console.log('[DEBUG] Admin email detected:', fallbackEmail, '-> admin')
    return 'admin'
  }
  
  if (typeof role === 'string') {
    const normalized = role.trim().toLowerCase()
    if (normalized === 'driver' || normalized.startsWith('driver')) return 'driver'
    if (normalized === 'admin' || normalized.startsWith('admin') || normalized.includes('admin_')) {
      return 'admin'
    }
    if (normalized === 'passenger' || normalized.startsWith('passenger')) return 'passenger'
  }
  // Legacy check for MASTER_EMAIL
  console.log('[DEBUG] Role from DB:', role, 'Email:', fallbackEmail)
  return fallbackEmail === MASTER_EMAIL ? 'admin' : 'passenger'
}

const normalizePhone = (regionCode: string, phone: string) => {
  let cleanPhone = phone.replace(/\D/g, '')
  const cleanRegion = regionCode.replace(/\D/g, '')
  if (cleanPhone.startsWith(cleanRegion)) {
    cleanPhone = cleanPhone.slice(cleanRegion.length)
  }
  return `+${cleanRegion}${cleanPhone}`
}

const formatEmailFromPhone = (fullPhone: string) => `${fullPhone.replace(/\D/g, '')}@p7s.app`

const getEmailFromInput = (input: string, regionCode = '852') => {
  const trimmed = input.trim().toLowerCase()
  if (['glam', 'gary', 'lamgary', 'admin'].includes(trimmed)) return MASTER_EMAIL
  if (trimmed.includes('@')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return `${trimmed}@p7s.app`

  if (trimmed.startsWith('+')) {
    return `${digits}@p7s.app`
  }

  const knownRegionCodes = ['852', '86', '853']
  if (knownRegionCodes.some((code) => digits.startsWith(code))) {
    return `${digits}@p7s.app`
  }

  const cleanRegion = regionCode.replace(/\D/g, '') || '852'
  return `${cleanRegion}${digits}@p7s.app`
}

const defaultProfile = (uid: string, email: string): AuthUser => ({
  id: uid,
  name: email.split('@')[0] || 'Cabs User',
  phone: email.endsWith('@p7s.app') ? `+${email.split('@')[0]}` : '',
  phoneVerified: false,
  email,
  role: normalizeUserRole(undefined, email),
  points: email === MASTER_EMAIL ? 999999 : 0,
  kycStatus: 'n/a',
  driverApproved: false,
  kycSubmittedAt: null,
  idCardFront: '',
  idCardBack: '',
  driverLicense: '',
  vehicleLicense: '',
  kycRejectionReason: '',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpSession, setOtpSession] = useState<{ verificationId: string; phone: string } | null>(null)
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false)

  useEffect(() => {
    // Timeout to prevent infinite loading if Firebase fails
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timeout, setting loading to false')
      setLoading(false)
    }, 10000) // 10 seconds timeout

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeoutId)
      if (!fbUser) {
        setCurrentUser(null)
        setLoading(false)
        return
      }

      const fallbackEmail = fbUser.email || (fbUser.phoneNumber ? formatEmailFromPhone(fbUser.phoneNumber) : '')
      if (!fallbackEmail) {
        setCurrentUser(null)
        setLoading(false)
        return
      }

      try {
        const ref = doc(db, 'users', fbUser.uid)
        const snap = await getDoc(ref)

        if (snap.exists()) {
          const data = snap.data() as Partial<AuthUser>
          const userRole = normalizeUserRole(data.role, data.email || fallbackEmail)
          console.log('[DEBUG] User data:', data.email, 'role from DB:', data.role, 'calculated role:', userRole)
          
          // Check if user needs to select role (new user without role)
          if (!data.role || (userRole === 'passenger' && !data.kycStatus)) {
            setNeedsRoleSelection(true)
          }
          
          setCurrentUser({
            id: fbUser.uid,
            name: data.name || 'Cabs User',
            phone: data.phone || fbUser.phoneNumber || '',
            phoneVerified: data.phoneVerified || false,
            email: data.email || fallbackEmail,
            role: userRole,
            points: data.points || 0,
            kycStatus: data.kycStatus || 'n/a',
            driverApproved: data.driverApproved || false,
            kycSubmittedAt: data.kycSubmittedAt || null,
          })
        } else {
          // New user - needs role selection
          setNeedsRoleSelection(true)
          const profile = defaultProfile(fbUser.uid, fallbackEmail)
          if (fbUser.phoneNumber) {
            profile.phone = fbUser.phoneNumber
          }
          await setDoc(ref, {
            ...profile,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            kycStatus: 'n/a',
            driverApproved: false,
            phoneVerified: false,
          })
          setCurrentUser({ ...profile, kycStatus: 'n/a', driverApproved: false, phoneVerified: false })
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
        // Still allow login even if Firestore fails
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Cabs User',
          phone: fbUser.phoneNumber || '',
          phoneVerified: false,
          email: fallbackEmail,
          role: 'passenger',
          points: 0,
        })
      }
      setLoading(false)
    }, (error) => {
      // Handle auth errors
      console.error('Auth state change error:', error)
      clearTimeout(timeoutId)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const loginWithPassword: AuthContextValue['loginWithPassword'] = async (input, password, regionCode = '852') => {
    if (!input || !password) return { ok: false, message: '請填寫帳號和密碼' }
    try {
      const email = getEmailFromInput(input, regionCode)
      await signInWithEmailAndPassword(auth, email, password)
      return { ok: true, message: '登入成功' }
    } catch (err: unknown) {
      const code = getErrorCode(err)
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        return { ok: false, message: '密碼錯誤或帳號不存在' }
      }
      if (code === 'auth/too-many-requests') {
        return { ok: false, message: '嘗試次數過多，請稍後再試' }
      }
      return { ok: false, message: `登入失敗: ${getErrorMessage(err)}` }
    }
  }

  const loginWithGoogle: AuthContextValue['loginWithGoogle'] = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      return { ok: true, message: 'Google 登入成功' }
    } catch (err: unknown) {
      const code = getErrorCode(err)
      if (code === 'auth/popup-closed-by-user') {
        return { ok: false, message: '已取消 Google 登入' }
      }
      if (code === 'auth/account-exists-with-different-credential') {
        return { ok: false, message: '此 Google 帳號已被用作其他登入方式' }
      }
      return { ok: false, message: `Google 登入失敗: ${getErrorMessage(err)}` }
    }
  }

  const sendOtp: AuthContextValue['sendOtp'] = async (regionCode, phone) => {
    if (!phone) return { ok: false, message: '請輸入手機號碼' }
    try {
      const fullPhone = normalizePhone(regionCode, phone)
      // Use Twilio for sending OTP
      const success = await TwilioService.sendOtp(fullPhone)
      if (success) {
        // Store phone for verification
        setOtpSession({ verificationId: `twilio_${Date.now()}`, phone: fullPhone })
        return { ok: true, message: '驗證碼已發送' }
      }
      return { ok: false, message: '發送驗證碼失敗，請稍後再試' }
    } catch (err: unknown) {
      return { ok: false, message: `發送失敗: ${getErrorMessage(err)}` }
    }
  }

  const verifyOtp: AuthContextValue['verifyOtp'] = async (otpCode) => {
    if (!otpSession?.phone) return { ok: false, message: '請先發送驗證碼' }
    if (!otpCode) return { ok: false, message: '請輸入驗證碼' }

    try {
      // Verify OTP via Twilio
      const valid = await TwilioService.verifyOtp(otpSession.phone, otpCode)
      if (!valid) {
        return { ok: false, message: '驗證碼錯誤' }
      }
      
      // Check if user exists in Firestore
      const q = query(collection(db, 'users'), where('phone', '==', otpSession.phone))
      const snap = await getDocs(q)
      
      if (snap.empty) {
        // Create new user (first time login)
        // For now, create a placeholder - user needs to complete registration
        return { ok: true, message: '電話驗證成功，請繼續註冊' }
      }
      
      // Update existing user to mark phone as verified
      await updateDoc(snap.docs[0].ref, {
        phoneVerified: true,
        updatedAt: new Date().toISOString(),
      })
      
      // Trigger auth state refresh by re-fetching user data
      const userDoc = await getDoc(snap.docs[0].ref)
      if (userDoc.exists()) {
        const data = userDoc.data()
        setCurrentUser({
          id: userDoc.id,
          name: data.name || 'Cabs User',
          phone: data.phone || otpSession.phone,
          phoneVerified: true,
          email: data.email || formatEmailFromPhone(otpSession.phone),
          role: data.role || 'passenger',
          points: data.points || 0,
          kycStatus: data.kycStatus || 'n/a',
          driverApproved: data.driverApproved || false,
          kycSubmittedAt: data.kycSubmittedAt || null,
        })
      }
      
      setOtpSession(null)
      return { ok: true, message: '電話驗證成功！' }
    } catch (err: unknown) {
      return { ok: false, message: `驗證失敗: ${getErrorMessage(err)}` }
    }
  }

  const registerUser: AuthContextValue['registerUser'] = async ({
    regionCode,
    phone,
    password,
    name,
    role = 'passenger',
  }) => {
    if (!name || !phone || !password) return { ok: false, message: '請完整填寫註冊資料' }

    try {
      const fullPhone = normalizePhone(regionCode, phone)
      const email = formatEmailFromPhone(fullPhone)
      const cred = await createUserWithEmailAndPassword(auth, email, password)

      const isMaster = fullPhone === MASTER_PHONE
      const isDriver = role === 'driver'
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name,
        phone: fullPhone,
        phoneVerified: true,
        email,
        role: isMaster ? 'admin' : role,
        points: isMaster ? 999999 : 0,
        // Driver-specific fields
        kycStatus: isDriver ? 'pending' : 'n/a',
        driverApproved: false,
        kycSubmittedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      return { ok: true, message: '註冊成功' }
    } catch (err: unknown) {
      if (getErrorCode(err) === 'auth/email-already-in-use') {
        return { ok: false, message: '此手機號碼已註冊' }
      }
      return { ok: false, message: `註冊失敗: ${getErrorMessage(err)}` }
    }
  }

  const resetPasswordByPhone: AuthContextValue['resetPasswordByPhone'] = async (regionCode, phone, newPassword?: string, otpCode?: string) => {
    if (!phone) return { ok: false, message: '請輸入手機號碼' }
    try {
      const fullPhone = normalizePhone(regionCode, phone)
      
      // If newPassword and otpCode provided, verify OTP and set new password
      if (newPassword && otpCode) {
        // Verify OTP
        const valid = await TwilioService.verifyOtp(fullPhone, otpCode)
        if (!valid) {
          return { ok: false, message: '驗證碼錯誤' }
        }
        // Update password in Firestore
        const q = query(collection(db, 'users'), where('phone', '==', fullPhone))
        const snap = await getDocs(q)
        if (snap.empty) {
          return { ok: false, message: '用戶不存在' }
        }
        await updateDoc(snap.docs[0].ref, { password: newPassword })
        return { ok: true, message: '密碼重設成功' }
      }
      
      // Otherwise, send OTP (Step 1)
      // Check if user exists
      const q = query(collection(db, 'users'), where('phone', '==', fullPhone))
      const snap = await getDocs(q)
      if (snap.empty) {
        return { ok: false, message: '此手機號碼未註冊' }
      }
      // Send OTP via Twilio
      const success = await TwilioService.sendOtp(fullPhone)
      if (success) {
        return { ok: true, message: '驗證碼已發送' }
      }
      return { ok: false, message: '發送驗證碼失敗' }
    } catch (err: unknown) {
      return { ok: false, message: `錯誤: ${getErrorMessage(err)}` }
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value = {
    currentUser,
    loading,
    needsRoleSelection,
    setNeedsRoleSelection,
    loginWithPassword,
    loginWithGoogle,
    sendOtp,
    verifyOtp,
    registerUser,
    resetPasswordByPhone,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
