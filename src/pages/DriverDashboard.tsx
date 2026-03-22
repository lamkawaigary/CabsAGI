import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shiftService, bookingService } from '../services/shiftService'
import { chatService, systemMessageService } from '../services/chatService'
import { uploadService } from '../services/uploadService'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Shift, Booking } from '../types/shift'

// Icons
const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
    </svg>
  ),
  Orders: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  ),
  Wallet: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>
  ),
  Car: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  ),
}

type Tab = 'dashboard' | 'shifts' | 'orders' | 'earnings' | 'profile'

const formatDateTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleString('zh-HK', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: '待出發', color: '#7a5a1a', bg: '#fff3cd' },
  OPEN: { label: '可接單', color: '#1e56a3', bg: '#e3f2fd' },
  IN_PROGRESS: { label: '進行中', color: '#1a7a3a', bg: '#d4edda' },
  COMPLETED: { label: '已完成', color: '#155724', bg: '#c3e6cb' },
  CANCELLED: { label: '已取消', color: '#c62828', bg: '#f8d7da' },
}

export default function DriverDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  
  // KYC Document Upload State
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null)
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null)
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null)
  const [vehicleLicenseFile, setVehicleLicenseFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const idCardFrontRef = useRef<HTMLInputElement>(null)
  const idCardBackRef = useRef<HTMLInputElement>(null)
  const driverLicenseRef = useRef<HTMLInputElement>(null)
  const vehicleLicenseRef = useRef<HTMLInputElement>(null)

  const canAcceptOrders = currentUser?.kycStatus === 'approved' && currentUser?.driverApproved

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allShifts, allBookings] = await Promise.all([
        shiftService.getAll(),
        bookingService.getAll()
      ])
      
      // For driver: get shifts where driverId matches current user
      const myShifts = allShifts.filter((s: Shift) => s.driverId === currentUser?.id)
      const myShiftIds = new Set(myShifts.map(s => s.id))
      
      // Get ALL bookings for driver's shifts (from passengers)
      const driverShiftBookings = allBookings.filter((b: Booking) => myShiftIds.has(b.shiftId))
      
      const activeStatuses = ['SCHEDULED', 'OPEN', 'IN_PROGRESS', 'COMPLETED']
      setShifts(allShifts.filter((s: Shift) => 
        activeStatuses.includes(s.status) && 
        (s.driverId === currentUser?.id || s.status === 'OPEN' || s.status === 'SCHEDULED')
      ))
      
      // Use passenger bookings for driver's view, not driver's own bookings
      setBookings(driverShiftBookings)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleUploadDocument = async () => {
    if (!currentUser?.id) return
    
    setUploading(true)
    setUploadMessage('')
    
    try {
      const filesToUpload: { type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense'; file: File }[] = []
      
      if (idCardFrontFile) filesToUpload.push({ type: 'idCardFront', file: idCardFrontFile })
      if (idCardBackFile) filesToUpload.push({ type: 'idCardBack', file: idCardBackFile })
      if (driverLicenseFile) filesToUpload.push({ type: 'driverLicense', file: driverLicenseFile })
      if (vehicleLicenseFile) filesToUpload.push({ type: 'vehicleLicense', file: vehicleLicenseFile })
      
      if (filesToUpload.length === 0) {
        setUploadMessage('請選擇至少一個文件上傳')
        setUploading(false)
        return
      }
      
      const result = await uploadService.uploadMultipleImages(currentUser.id, filesToUpload)
      
      if (result.ok && result.urls) {
        // Update user document URLs in Firestore
        const userRef = doc(db, 'users', currentUser.id)
        await updateDoc(userRef, {
          ...result.urls,
          kycStatus: 'submitted',
          kycSubmittedAt: new Date().toISOString(),
          driverApproved: false,
        })
        setUploadMessage('✅ 文件上傳成功！已提交審批')
        
        // Force refresh to get updated user data with URLs
        window.location.reload()
        
        // Reset file inputs
        setIdCardFrontFile(null)
        setIdCardBackFile(null)
        setDriverLicenseFile(null)
        setVehicleLicenseFile(null)
        if (idCardFrontRef.current) idCardFrontRef.current.value = ''
        if (idCardBackRef.current) idCardBackRef.current.value = ''
        if (driverLicenseRef.current) driverLicenseRef.current.value = ''
        if (vehicleLicenseRef.current) vehicleLicenseRef.current.value = ''
      } else {
        setUploadMessage(result.message || '上傳失敗')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadMessage('上傳失敗，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (type: 'idCardFront' | 'idCardBack' | 'driverLicense' | 'vehicleLicense') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('文件大小不能超過 5MB')
        return
      }
      switch (type) {
        case 'idCardFront': setIdCardFrontFile(file); break
        case 'idCardBack': setIdCardBackFile(file); break
        case 'driverLicense': setDriverLicenseFile(file); break
        case 'vehicleLicense': setVehicleLicenseFile(file); break
      }
    }
  }

  const handleAcceptShift = async (shift: Shift) => {
    if (!canAcceptOrders) return
    try {
      await shiftService.update(shift.id, {
        driverId: currentUser?.id,
        driverName: currentUser?.name,
        driverPhone: currentUser?.phone,
        status: 'IN_PROGRESS'
      })
      
      const shiftBookings = bookings.filter(b => b.shiftId === shift.id)
      for (const booking of shiftBookings) {
        const conversationId = await chatService.getOrCreateShiftConversation(
          shift.id,
          currentUser?.id || '',
          currentUser?.name || '司機',
          booking.userId,
          booking.passengerName || '乘客',
          shift.routeName || '行程對話'
        )
        await systemMessageService.driverAcceptedShift(conversationId, currentUser?.name || '司機')
      }
      
      loadData()
      alert('已接單！')
    } catch (error) {
      console.error('Failed to accept shift:', error)
      alert('接單失敗，請稍後再試')
    }
  }

  const handleCompleteShift = async (shift: Shift) => {
    try {
      await shiftService.update(shift.id, { status: 'COMPLETED' })
      loadData()
      alert('已完成行程！')
    } catch (error) {
      console.error('Failed to complete shift:', error)
    }
  }

  const handleOpenChat = async (shift: Shift) => {
    if (!shift.driverId || !shift.driverName) return
    const shiftBookings = bookings.filter(b => b.shiftId === shift.id)
    if (shiftBookings.length === 0) {
      alert('暂无乘客')
      return
    }
    const conversationId = await chatService.getOrCreateShiftConversation(
      shift.id,
      shift.driverId,
      shift.driverName,
      shiftBookings[0].userId,
      shiftBookings[0].passengerName || '乘客',
      shift.routeName || '行程對話'
    )
    navigate(`/driver/chat/${conversationId}`)
  }

  const myShifts = shifts.filter(s => s.driverId === currentUser?.id)
  const completedShifts = myShifts.filter(s => s.status === 'COMPLETED')
  const todayCompleted = completedShifts.filter(s => {
    const shiftDate = new Date(parseInt(s.departureTime))
    const today = new Date()
    return shiftDate.toDateString() === today.toDateString()
  })
  const totalEarnings = completedShifts.reduce((sum, s) => sum + (s.price || 0) * (s.totalSeats - s.availableSeats), 0)
  const todayEarnings = todayCompleted.reduce((sum, s) => sum + (s.price || 0) * (s.totalSeats - s.availableSeats), 0)

  const availableShifts = shifts.filter(s => (s.status === 'OPEN' || s.status === 'SCHEDULED') && !s.driverId)
  
  // 已有乘客既班次 - 顯示需求高既班次俾司機鼓勵接單
  const shiftsWithPassengers = availableShifts
    .map(shift => ({
      ...shift,
      passengerCount: bookings.filter(b => b.shiftId === shift.id).length
    }))
    .filter(s => s.passengerCount > 0)
    .sort((a, b) => b.passengerCount - a.passengerCount) // Sort by most passengers first
  
  const activeShifts = myShifts.filter(s => s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED')
  const orderHistory = myShifts.filter(s => s.status === 'COMPLETED')

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>🚗 CabsAGI 司機</h1>
          <p style={styles.welcome}>歡迎，{currentUser?.name || '司機'} 👋</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <Icons.Logout />
        </button>
      </header>

      {/* Main Content */}
      <div style={styles.content}>
        {activeTab === 'dashboard' && (
          <div style={styles.dashboard}>
            {!canAcceptOrders && (
              <div style={styles.kycWarning}>
                <span>⚠️ 你需要完成 KYC 認證先可以接單</span>
                <button onClick={() => setActiveTab('profile')} style={styles.kycBtn}>
                  前往認證
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📅</div>
                <div style={styles.statValue}>{todayCompleted.length}</div>
                <div style={styles.statLabel}>今日完成</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statValue}>${todayEarnings}</div>
                <div style={styles.statLabel}>今日收入</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>⭐</div>
                <div style={styles.statValue}>{completedShifts.length}</div>
                <div style={styles.statLabel}>總完成</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💵</div>
                <div style={styles.statValue}>${totalEarnings}</div>
                <div style={styles.statLabel}>總收入</div>
              </div>
            </div>

            {/* Hot Shifts - Have Passengers */}
            {shiftsWithPassengers.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>
                    🔥 搶手班次 <span style={{ fontSize: 12, color: '#c62828', fontWeight: 600 }}>已有乘客</span>
                  </h2>
                  <button onClick={() => setActiveTab('shifts')} style={styles.viewAllBtn}>
                    搶單 →
                  </button>
                </div>
                <div style={styles.shiftList}>
                  {shiftsWithPassengers.slice(0, 3).map(shift => (
                    <div key={shift.id} style={{ ...styles.shiftCard, borderLeft: '4px solid #4caf50' }}>
                      <div style={styles.shiftInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={styles.shiftRoute}>{shift.routeName || '路線'}</span>
                          <span style={{ background: '#4caf50', color: '#fff', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                            {shift.passengerCount} 位乘客
                          </span>
                        </div>
                        <div style={styles.shiftTime}>
                          <Icons.Clock /> {formatDateTime(shift.departureTime)}
                        </div>
                        <div style={styles.shiftSeats}>
                          💺 剩餘 {shift.availableSeats} 位 / 共 {shift.totalSeats} 位
                        </div>
                      </div>
                      <div style={styles.shiftPrice}>
                        <span style={styles.priceValue}>${shift.price}</span>
                        <button 
                          onClick={() => handleAcceptShift(shift)}
                          style={{ 
                            marginTop: 8, 
                            padding: '8px 16px', 
                            background: '#4caf50', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 8, 
                            fontSize: 13, 
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          立即搶單
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {shiftsWithPassengers.length > 3 && (
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#666' }}>
                    仲有 {shiftsWithPassengers.length - 3} 個班次有乘客等緊你 →
                  </div>
                )}
              </div>
            )}

            {/* Current Trip */}
            {activeShifts.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>🚗 當前行程</h2>
                {activeShifts.map(shift => {
                  const status = statusConfig[shift.status] || { label: shift.status, color: '#666', bg: '#eee' }
                  const shiftBookings = bookings.filter(b => b.shiftId === shift.id)
                  const hasPassengers = shiftBookings.length > 0
                  
                  return (
                    <div key={shift.id} style={styles.currentTripCard}>
                      <div style={styles.tripHeader}>
                        <span style={styles.routeName}>{shift.routeName || '路線'}</span>
                        <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={styles.tripInfo}>
                        <div style={styles.tripRow}>
                          <Icons.Clock />
                          <span>{formatDateTime(shift.departureTime)}</span>
                        </div>
                        <div style={styles.tripRow}>
                          <Icons.Car />
                          <span>座位: {shift.totalSeats - shift.availableSeats}/{shift.totalSeats}</span>
                        </div>
                      </div>
                      
                      {/* Passengers in Current Trip */}
                      {hasPassengers ? (
                        <div style={{ marginTop: 12, padding: 10, background: '#e3f2fd', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', marginBottom: 8 }}>
                            👥 乘客 ({shiftBookings.length} 位)
                          </div>
                          {shiftBookings.map((booking, idx) => (
                            <div key={booking.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < shiftBookings.length - 1 ? '1px solid #bbdefb' : 'none' }}>
                              <div style={{ fontSize: 13, color: '#333' }}>{booking.passengerName || '乘客'}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{booking.seatCount || 1} 位</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, padding: 10, background: '#fff8e1', borderRadius: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: '#f57c00' }}>⏳ 等待乘客預訂...</span>
                        </div>
                      )}
                      
                      <div style={styles.tripActions}>
                        <button 
                          onClick={() => handleOpenChat(shift)} 
                          disabled={!hasPassengers}
                          style={{
                            ...styles.chatBtn,
                            opacity: hasPassengers ? 1 : 0.5,
                            cursor: hasPassengers ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {hasPassengers ? '💬 乘客對話' : '💬 等待乘客'}
                        </button>
                        {shift.status === 'IN_PROGRESS' && (
                          <button onClick={() => handleCompleteShift(shift)} style={styles.completeBtn}>
                            ✅ 完成行程
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Available Shifts Preview */}
            {availableShifts.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>📋 可接班次</h2>
                  <button onClick={() => setActiveTab('shifts')} style={styles.viewAllBtn}>
                    查看全部 →
                  </button>
                </div>
                <div style={styles.shiftList}>
                  {availableShifts.slice(0, 3).map(shift => (
                    <div key={shift.id} style={styles.shiftCard}>
                      <div style={styles.shiftInfo}>
                        <div style={styles.shiftRoute}>{shift.routeName || '路線'}</div>
                        <div style={styles.shiftTime}>
                          <Icons.Clock /> {formatDateTime(shift.departureTime)}
                        </div>
                        <div style={styles.shiftSeats}>
                          💺 {shift.availableSeats}/{shift.totalSeats} 座位
                        </div>
                      </div>
                      <div style={styles.shiftPrice}>
                        <span style={styles.priceValue}>${shift.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shifts' && (
          <div style={styles.page}>
            <h2 style={styles.pageTitle}>📋 可接班次</h2>
            {!canAcceptOrders ? (
              <div style={styles.kycWarning}>
                <span>⚠️ 完成 KYC 認證後先可以接單</span>
              </div>
            ) : availableShifts.length === 0 ? (
              <div style={styles.empty}>暫無可接班次</div>
            ) : (
              <div style={styles.shiftList}>
                {availableShifts.map(shift => (
                  <div key={shift.id} style={styles.shiftCardLarge}>
                    <div style={styles.shiftCardHeader}>
                      <span style={styles.shiftRoute}>{shift.routeName || '路線'}</span>
                      <span style={styles.shiftPriceLarge}>${shift.price}</span>
                    </div>
                    <div style={styles.shiftDetails}>
                      <div style={styles.shiftDetail}>
                        <Icons.Clock />
                        <span>{formatDateTime(shift.departureTime)}</span>
                      </div>
                      <div style={styles.shiftDetail}>
                        <Icons.Car />
                        <span>剩餘座位: {shift.availableSeats}/{shift.totalSeats}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAcceptShift(shift)}
                      style={styles.acceptBtn}
                    >
                      接單
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={styles.page}>
            <h2 style={styles.pageTitle}>📝 我的訂單</h2>
            {orderHistory.length === 0 && activeShifts.length === 0 ? (
              <div style={styles.empty}>暫無訂單</div>
            ) : (
              <div style={styles.orderList}>
                {activeShifts.map(shift => {
                  const status = statusConfig[shift.status] || { label: shift.status, color: '#666', bg: '#eee' }
                  const shiftBookings = bookings.filter(b => b.shiftId === shift.id)
                  const passengers = shiftBookings.map(b => ({
                    name: b.passengerName || '乘客',
                    phone: b.passengerPhone || '',
                    seats: b.seatCount || 1,
                    status: b.status
                  }))
                  return (
                    <div key={shift.id} style={styles.orderCardActive}>
                      <div style={styles.orderHeader}>
                        <span style={styles.orderRoute}>{shift.routeName || '路線'}</span>
                        <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={styles.orderTime}>
                        <Icons.Clock /> {formatDateTime(shift.departureTime)} • 💺 {shift.totalSeats - shift.availableSeats}/{shift.totalSeats} 位
                      </div>
                      
                      {/* Passengers Info */}
                      {passengers.length > 0 && (
                        <div style={{ marginTop: 12, padding: 10, background: '#f5f9ff', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e56a3', marginBottom: 8 }}>
                            👥 乘客資料 ({passengers.length} 位)
                          </div>
                          {passengers.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < passengers.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{p.name}</div>
                                {p.phone && <div style={{ fontSize: 11, color: '#666' }}>📞 {p.phone}</div>}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 12, color: '#666' }}>{p.seats} 位</div>
                                <div style={{ fontSize: 10, color: p.status === 'CONFIRMED' ? '#2e7d32' : '#f57c00' }}>
                                  {p.status === 'CONFIRMED' ? '✅ 已確認' : '⏳ 待確認'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div style={styles.orderActions}>
                        <button onClick={() => handleOpenChat(shift)} style={styles.orderChatBtn}>
                          💬 對話
                        </button>
                        {shift.status === 'IN_PROGRESS' && (
                          <button onClick={() => handleCompleteShift(shift)} style={styles.orderCompleteBtn}>
                            ✅ 完成
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {orderHistory.map(shift => {
                  const shiftBookings = bookings.filter(b => b.shiftId === shift.id)
                  const passengerCount = shiftBookings.length
                  return (
                    <div key={shift.id} style={styles.orderCard}>
                      <div style={styles.orderHeader}>
                        <span style={styles.orderRoute}>{shift.routeName || '路線'}</span>
                        <span style={styles.orderPrice}>+${(shift.price || 0) * (shift.totalSeats - shift.availableSeats)}</span>
                      </div>
                      <div style={styles.orderTime}>
                        <Icons.Clock /> {formatDateTime(shift.departureTime)} • 👥 {passengerCount} 位乘客
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div style={styles.page}>
            <h2 style={styles.pageTitle}>💰 收入統計</h2>
            
            <div style={styles.earningsSummary}>
              <div style={styles.earningsCard}>
                <div style={styles.earningsLabel}>今日收入</div>
                <div style={styles.earningsValue}>${todayEarnings}</div>
                <div style={styles.earningsSub}>{todayCompleted.length} 單</div>
              </div>
              <div style={styles.earningsCard}>
                <div style={styles.earningsLabel}>總收入</div>
                <div style={styles.earningsValue}>${totalEarnings}</div>
                <div style={styles.earningsSub}>{completedShifts.length} 單</div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📊 收入記錄</h3>
              {orderHistory.length === 0 ? (
                <div style={styles.empty}>暫無收入記錄</div>
              ) : (
                <div style={styles.earningsList}>
                  {orderHistory.slice().reverse().map(shift => (
                    <div key={shift.id} style={styles.earningsItem}>
                      <div style={styles.earningsItemInfo}>
                        <div style={styles.earningsItemRoute}>{shift.routeName || '路線'}</div>
                        <div style={styles.earningsItemDate}>{formatDateTime(shift.departureTime)}</div>
                      </div>
                      <div style={styles.earningsItemAmount}>
                        +${(shift.price || 0) * (shift.totalSeats - shift.availableSeats)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={styles.page}>
            <h2 style={styles.pageTitle}>👤 個人資料</h2>
            
            <div style={styles.profileCard}>
              <div style={styles.profileAvatar}>
                {currentUser?.name?.charAt(0) || '司'}
              </div>
              <div style={styles.profileName}>{currentUser?.name || '司機'}</div>
              <div style={styles.profilePhone}>
                <Icons.Phone /> {currentUser?.phone || '未設置'}
              </div>
            </div>

            <div style={styles.infoSection}>
              <h3 style={styles.infoTitle}>帳號資訊</h3>
              <div style={styles.infoRow}>
                <span>電郵</span>
                <span>{currentUser?.email || '-'}</span>
              </div>
              <div style={styles.infoRow}>
                <span>電話</span>
                <span>{currentUser?.phone || '未設置'}</span>
              </div>
              <div style={styles.infoRow}>
                <span>電話驗證</span>
                <span style={currentUser?.phoneVerified ? styles.verified : styles.unverified}>
                  {currentUser?.phoneVerified ? '✅ 已驗證' : '❌ 未驗證'}
                </span>
              </div>
            </div>

            <div style={styles.infoSection}>
              <h3 style={styles.infoTitle}>KYC 認證</h3>
              <div style={styles.kycStatusCard}>
                <div style={styles.kycStatusRow}>
                  <span>認證狀態</span>
                  <span style={{
                    ...styles.kycBadge,
                    background: currentUser?.kycStatus === 'approved' ? '#d4edda' : '#fff3cd',
                    color: currentUser?.kycStatus === 'approved' ? '#155724' : '#7a5a1a'
                  }}>
                    {currentUser?.kycStatus === 'approved' ? '✅ 已通過' : 
                     currentUser?.kycStatus === 'pending' ? '⏳ 審批中' : 
                     currentUser?.kycStatus === 'submitted' ? '📋 已提交' : '❌ 未提交'}
                  </span>
                </div>
                <div style={styles.kycStatusRow}>
                  <span>接單權限</span>
                  <span style={{
                    ...styles.kycBadge,
                    background: currentUser?.driverApproved ? '#d4edda' : '#f8d7da',
                    color: currentUser?.driverApproved ? '#155724' : '#c62828'
                  }}>
                    {currentUser?.driverApproved ? '✅ 可以接單' : '❌ 不能接單'}
                  </span>
                </div>
              </div>
              
              {/* Rejection Reason */}
              {currentUser?.kycStatus === 'rejected' && currentUser?.kycRejectionReason && (
                <div style={styles.rejectionReason}>
                  <strong>📋 駁回原因：</strong>
                  <p>{currentUser.kycRejectionReason}</p>
                </div>
              )}
            </div>

            {/* KYC Document Upload Section */}
            <div style={styles.infoSection}>
              <h3 style={styles.infoTitle}>📄 證件上載</h3>
              <p style={styles.docNote}>請上載以下證件以完成認證：</p>
              
              {/* ID Card Front */}
              <div style={styles.uploadItem}>
                <label style={styles.uploadLabel}>
                  🪪 身份證正面
                  <input
                    ref={idCardFrontRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange('idCardFront')}
                    style={styles.fileInput}
                  />
                </label>
                {idCardFrontFile ? (
                  <div style={styles.fileSelected}>✅ {idCardFrontFile.name}</div>
                ) : currentUser?.idCardFront ? (
                  <img 
                    src={currentUser.idCardFront} 
                    alt="身份證正面" 
                    style={styles.docPreviewThumb}
                    onClick={() => setPreviewImage(currentUser.idCardFront || null)}
                  />
                ) : (
                  <div style={styles.filePlaceholder}>未上載</div>
                )}
              </div>

              {/* ID Card Back */}
              <div style={styles.uploadItem}>
                <label style={styles.uploadLabel}>
                  🪪 身份證背面
                  <input
                    ref={idCardBackRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange('idCardBack')}
                    style={styles.fileInput}
                  />
                </label>
                {idCardBackFile ? (
                  <div style={styles.fileSelected}>✅ {idCardBackFile.name}</div>
                ) : currentUser?.idCardBack ? (
                  <img 
                    src={currentUser.idCardBack} 
                    alt="身份證背面" 
                    style={styles.docPreviewThumb}
                    onClick={() => setPreviewImage(currentUser.idCardBack || null)}
                  />
                ) : (
                  <div style={styles.filePlaceholder}>未上載</div>
                )}
              </div>

              {/* Driver License */}
              <div style={styles.uploadItem}>
                <label style={styles.uploadLabel}>
                  🚗 駕駛執照
                  <input
                    ref={driverLicenseRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange('driverLicense')}
                    style={styles.fileInput}
                  />
                </label>
                {driverLicenseFile ? (
                  <div style={styles.fileSelected}>✅ {driverLicenseFile.name}</div>
                ) : currentUser?.driverLicense ? (
                  <img 
                    src={currentUser.driverLicense} 
                    alt="駕駛執照" 
                    style={styles.docPreviewThumb}
                    onClick={() => setPreviewImage(currentUser.driverLicense || null)}
                  />
                ) : (
                  <div style={styles.filePlaceholder}>未上載</div>
                )}
              </div>

              {/* Vehicle License */}
              <div style={styles.uploadItem}>
                <label style={styles.uploadLabel}>
                  🚙 車輛登記文件
                  <input
                    ref={vehicleLicenseRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange('vehicleLicense')}
                    style={styles.fileInput}
                  />
                </label>
                {vehicleLicenseFile ? (
                  <div style={styles.fileSelected}>✅ {vehicleLicenseFile.name}</div>
                ) : currentUser?.vehicleLicense ? (
                  <img 
                    src={currentUser.vehicleLicense} 
                    alt="車輛登記" 
                    style={styles.docPreviewThumb}
                    onClick={() => setPreviewImage(currentUser.vehicleLicense || null)}
                  />
                ) : (
                  <div style={styles.filePlaceholder}>未上載</div>
                )}
              </div>

              {/* Preview Modal */}
              {previewImage && (
                <div style={styles.previewModal} onClick={() => setPreviewImage(null)}>
                  <img src={previewImage} alt="預覽" style={styles.previewModalImage} />
                  <button style={styles.previewCloseBtn} onClick={() => setPreviewImage(null)}>✕ 關閉</button>
                </div>
              )}

              {/* Upload Message */}
              {uploadMessage && (
                <div style={{
                  ...styles.uploadMessage,
                  color: uploadMessage.includes('成功') ? '#155724' : '#c62828'
                }}>
                  {uploadMessage}
                </div>
              )}

              {/* Upload Button - Always visible */}
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleUploadDocument}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    border: 'none',
                    borderRadius: 12,
                    background: uploading ? '#999' : '#284a41',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {uploading ? '⏳ 上傳中...' : '📤 上載/更新認證資料'}
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#888', marginTop: 12, lineHeight: 1.6 }}>
                * 每個文件大小上限為 5MB<br/>
                * 你可以隨時上載或更新認證資料<br/>
                * 更新後需要重新審批
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.nav}>
        {[
          { id: 'dashboard', label: '主頁', icon: Icons.Home },
          { id: 'shifts', label: '班次', icon: Icons.List },
          { id: 'orders', label: '訂單', icon: Icons.Orders },
          { id: 'earnings', label: '收入', icon: Icons.Wallet },
          { id: 'profile', label: '個人', icon: Icons.User },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            style={{
              ...styles.navItem,
              ...(activeTab === tab.id ? styles.navItemActive : {})
            }}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: 'Avenir Next, Noto Sans TC, sans-serif',
    paddingBottom: 80,
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#284a41',
    color: '#fff',
  },
  logo: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  welcome: {
    margin: '4px 0 0',
    fontSize: 13,
    opacity: 0.9,
  },
  logoutBtn: {
    padding: 10,
    border: 'none',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
  },
  content: {
    padding: 16,
  },
  dashboard: {
    display: 'grid',
    gap: 16,
  },
  kycWarning: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    background: '#fff3cd',
    border: '1px solid #ffe0b2',
    borderRadius: 12,
    color: '#7a5a1a',
    fontSize: 14,
  },
  kycBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#284a41',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  statCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#284a41',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  viewAllBtn: {
    border: 'none',
    background: 'none',
    color: '#1e56a3',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  currentTripCard: {
    background: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
  },
  tripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 12,
  },
  tripInfo: {
    display: 'grid',
    gap: 6,
    marginBottom: 12,
  },
  tripRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#555',
  },
  tripActions: {
    display: 'flex',
    gap: 10,
  },
  chatBtn: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #1e56a3',
    borderRadius: 8,
    background: '#fff',
    color: '#1e56a3',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  completeBtn: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 8,
    background: '#1a7a3a',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  shiftList: {
    display: 'grid',
    gap: 10,
  },
  shiftCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderRadius: 12,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftRoute: {
    fontSize: 15,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  shiftSeats: {
    fontSize: 13,
    color: '#666',
  },
  shiftPrice: {
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#284a41',
  },
  page: {
    paddingBottom: 20,
  },
  pageTitle: {
    margin: '0 0 16px',
    fontSize: 20,
    fontWeight: 700,
    color: '#333',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
    background: '#fff',
    borderRadius: 12,
  },
  shiftCardLarge: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: 12,
  },
  shiftCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftPriceLarge: {
    fontSize: 22,
    fontWeight: 700,
    color: '#284a41',
  },
  shiftDetails: {
    display: 'grid',
    gap: 8,
    marginBottom: 14,
  },
  shiftDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#555',
  },
  acceptBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 10,
    background: '#284a41',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  orderList: {
    display: 'grid',
    gap: 10,
  },
  orderCardActive: {
    background: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
  },
  orderCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRoute: {
    fontSize: 15,
    fontWeight: 700,
    color: '#333',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a7a3a',
  },
  orderTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  orderActions: {
    display: 'flex',
    gap: 10,
  },
  orderChatBtn: {
    flex: 1,
    padding: '8px',
    border: '1px solid #1e56a3',
    borderRadius: 8,
    background: '#fff',
    color: '#1e56a3',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  orderCompleteBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: 8,
    background: '#1a7a3a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  earningsSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  earningsCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 20,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  earningsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#284a41',
  },
  earningsSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  earningsList: {
    display: 'grid',
    gap: 8,
  },
  earningsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderRadius: 10,
    padding: 12,
  },
  earningsItemInfo: {
    flex: 1,
  },
  earningsItemRoute: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  earningsItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  earningsItemAmount: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a7a3a',
  },
  profileCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 24,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    background: '#284a41',
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  profilePhone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: 16,
  },
  infoTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 700,
    color: '#333',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
    fontSize: 14,
    color: '#555',
  },
  verified: {
    color: '#1a7a3a',
    fontWeight: 600,
  },
  unverified: {
    color: '#c62828',
    fontWeight: 600,
  },
  kycStatusCard: {
    display: 'grid',
    gap: 10,
    marginBottom: 12,
  },
  kycStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    color: '#555',
  },
  kycBadge: {
    fontSize: 13,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 12,
  },
  kycUploadBtn: {
    width: '100%',
    padding: '12px',
    border: '1px solid #284a41',
    borderRadius: 10,
    background: '#fff',
    color: '#284a41',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // KYC Document Upload Styles
  rejectionReason: {
    padding: 12,
    background: '#fff3cd',
    border: '1px solid #ffe0b2',
    borderRadius: 8,
    marginTop: 10,
    fontSize: 13,
    color: '#7a5a1a',
  },
  docNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  uploadItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  uploadLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#333',
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
  fileSelected: {
    fontSize: 12,
    color: '#1a7a3a',
    fontWeight: 600,
  },
  docUploaded: {
    fontSize: 12,
    color: '#1a7a3a',
    fontWeight: 600,
  },
  filePlaceholder: {
    fontSize: 12,
    color: '#999',
  },
  uploadMessage: {
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    background: '#f5f5f5',
  },
  uploadBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 10,
    background: '#284a41',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 12,
    lineHeight: 1.5,
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    background: '#fff',
    borderTop: '1px solid #eee',
    padding: '8px 0',
    zIndex: 100,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    color: '#999',
    fontSize: 11,
    cursor: 'pointer',
  },
  navItemActive: {
    color: '#284a41',
    fontWeight: 600,
  },
  // Document Preview
  docPreviewThumb: {
    width: 50,
    height: 50,
    objectFit: 'cover' as const,
    borderRadius: 6,
    cursor: 'pointer',
    border: '2px solid #284a41',
  },
  // Preview Modal
  previewModal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  previewModalImage: {
    maxWidth: '90%',
    maxHeight: '80vh',
    objectFit: 'contain' as const,
    borderRadius: 8,
  },
  previewCloseBtn: {
    marginTop: 20,
    padding: '10px 30px',
    borderRadius: 8,
    border: 'none',
    background: '#fff',
    color: '#333',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
}