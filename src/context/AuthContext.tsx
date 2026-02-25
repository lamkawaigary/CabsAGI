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
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebaseConfig'

type UserRole = 'passenger' | 'driver' | 'admin'

export interface AuthUser {
  id: string
  name: string
  phone: string
  email: string
  role: UserRole
  points: number
}

interface AuthContextValue {
  currentUser: AuthUser | null
  loading: boolean
  loginWithPassword: (input: string, password: string, regionCode?: string) => Promise<{ ok: boolean; message: string }>
  sendOtp: (regionCode: string, phone: string) => Promise<{ ok: boolean; message: string }>
  verifyOtp: (otpCode: string) => Promise<{ ok: boolean; message: string }>
  registerUser: (params: {
    regionCode: string
    phone: string
    password: string
    name: string
    role?: UserRole
  }) => Promise<{ ok: boolean; message: string }>
  resetPasswordByPhone: (regionCode: string, phone: string) => Promise<{ ok: boolean; message: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
  }
}

const MASTER_EMAIL = 'lamgary@p7s.app'
const MASTER_PHONE = '+85269277488'

const getErrorCode = (err: unknown) =>
  err && typeof err === 'object' && 'code' in err && typeof (err as FirebaseError).code === 'string'
    ? (err as FirebaseError).code
    : ''

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error')

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
  email,
  role: email === MASTER_EMAIL ? 'admin' : 'passenger',
  points: email === MASTER_EMAIL ? 999999 : 0,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpSession, setOtpSession] = useState<{ verificationId: string; phone: string } | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
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

      const ref = doc(db, 'users', fbUser.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        const data = snap.data() as Partial<AuthUser>
        setCurrentUser({
          id: fbUser.uid,
          name: data.name || 'Cabs User',
          phone: data.phone || fbUser.phoneNumber || '',
          email: data.email || fallbackEmail,
          role: (data.role as UserRole) || 'passenger',
          points: data.points || 0,
        })
      } else {
        const profile = defaultProfile(fbUser.uid, fallbackEmail)
        if (fbUser.phoneNumber) {
          profile.phone = fbUser.phoneNumber
        }
        await setDoc(ref, {
          ...profile,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        setCurrentUser(profile)
      }
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

  const getRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) return window.recaptchaVerifier
    const container = document.getElementById('recaptcha-container')
    if (!container) throw new Error('OTP 驗證元件未就緒')
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
    return window.recaptchaVerifier
  }

  const sendOtp: AuthContextValue['sendOtp'] = async (regionCode, phone) => {
    if (!phone) return { ok: false, message: '請輸入手機號碼' }
    try {
      const fullPhone = normalizePhone(regionCode, phone)
      const verifier = getRecaptchaVerifier()
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier)
      setOtpSession({ verificationId: confirmation.verificationId, phone: fullPhone })
      return { ok: true, message: '驗證碼已發送' }
    } catch (err: unknown) {
      return { ok: false, message: `發送失敗: ${getErrorMessage(err)}` }
    }
  }

  const verifyOtp: AuthContextValue['verifyOtp'] = async (otpCode) => {
    if (!otpSession?.verificationId) return { ok: false, message: '請先發送驗證碼' }
    if (!otpCode) return { ok: false, message: '請輸入驗證碼' }

    try {
      const credential = PhoneAuthProvider.credential(otpSession.verificationId, otpCode)
      const cred = await signInWithCredential(auth, credential)
      const ref = doc(db, 'users', cred.user.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          id: cred.user.uid,
          name: `用戶${otpSession.phone.slice(-4)}`,
          phone: otpSession.phone,
          email: formatEmailFromPhone(otpSession.phone),
          role: 'passenger',
          points: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      setOtpSession(null)
      return { ok: true, message: 'OTP 登入成功' }
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
      await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name,
        phone: fullPhone,
        email,
        role: isMaster ? 'admin' : role,
        points: isMaster ? 999999 : 0,
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

  const resetPasswordByPhone: AuthContextValue['resetPasswordByPhone'] = async (regionCode, phone) => {
    if (!phone) return { ok: false, message: '請輸入手機號碼' }
    try {
      const fullPhone = normalizePhone(regionCode, phone)
      const email = formatEmailFromPhone(fullPhone)
      await sendPasswordResetEmail(auth, email)
      return { ok: true, message: `重設密碼郵件已發送到 ${email}` }
    } catch (err: unknown) {
      if (getErrorCode(err) === 'auth/user-not-found') {
        return { ok: false, message: '此手機帳號未註冊' }
      }
      return { ok: false, message: `重設失敗: ${getErrorMessage(err)}` }
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value = {
    currentUser,
    loading,
    loginWithPassword,
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
