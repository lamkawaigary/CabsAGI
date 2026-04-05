import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAuth } from '../context/AuthContext'

interface RoleSelectionModalProps {
  isOpen: boolean
  onComplete: (role: 'passenger' | 'driver') => void
}

export default function RoleSelectionModal({ isOpen, onComplete }: RoleSelectionModalProps) {
  const { currentUser } = useAuth()
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen || !currentUser) return null

  const handleSelectRole = async (role: 'passenger' | 'driver') => {
    if (!currentUser) return
    
    setLoading(true)
    setSelectedRole(role)

    try {
      // Update user role in Firestore
      const userRef = doc(db, 'users', currentUser.id)
      await setDoc(userRef, {
        role,
        kycStatus: role === 'driver' ? 'pending' : 'n/a', // Drivers start with pending KYC
        kycSubmittedAt: role === 'driver' ? new Date().toISOString() : null,
        driverApproved: false, // Needs admin approval after KYC
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true })

      onComplete(role)
    } catch (error) {
      console.error('Error saving role:', error)
      setLoading(false)
      setSelectedRole(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">
          歡迎使用 CabsAGI！🎉
        </h2>
        <p className="text-gray-600 text-center mb-8">
          請選擇你的身份：
        </p>

        <div className="space-y-4">
          {/* Passenger Option */}
          <button
            onClick={() => handleSelectRole('passenger')}
            disabled={loading}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">乘客</h3>
                <p className="text-sm text-gray-500">即時使用，無需審批</p>
              </div>
            </div>
          </button>

          {/* Driver Option */}
          <button
            onClick={() => handleSelectRole('driver')}
            disabled={loading}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM16 17a2 2 0 104 0 2 2 0 00-4 0zM3 9h13a2 2 0 012 2v3H3V9zm13 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v3m11 0H5" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">司機</h3>
                <p className="text-sm text-gray-500">需要完成KYC審批</p>
              </div>
            </div>
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            ⚠️ 成為司機需要提交KYC文件，完成後才能接單
          </div>
          </button>
        </div>

        {loading && selectedRole && (
          <div className="mt-4 text-center text-gray-500">
            正在設定...
          </div>
        )}
      </div>
    </div>
  )
}
