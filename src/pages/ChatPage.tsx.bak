// Cabs Carpool - Chat Page v2.3
// 聊天室頁面 - 支持圖片發送、報價功能、評價系統

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chatService'
import { priceQuoteService, type PriceQuote } from '../services/priceQuoteService'
import { ratingService } from '../services/ratingService'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebaseConfig'
import RatingModal from '../components/RatingModal'

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [room, setRoom] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [quotes, setQuotes] = useState<PriceQuote[]>([])
  const [confirmedQuote, setConfirmedQuote] = useState<PriceQuote | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quotePrice, setQuotePrice] = useState('')
  const [tunnelFee, setTunnelFee] = useState('')
  const [freeWaitingMinutes, setFreeWaitingMinutes] = useState(15)  // 免費等候分鐘
  const [extraChargePer10Min, setExtraChargePer10Min] = useState(30)  // 超時每10分鐘收費
  const [quoteExpanded, setQuoteExpanded] = useState(true)  // Quote section collapsible
  const [tripInfo, setTripInfo] = useState<any>(null)  // Trip info for this chat
  const [showRatingModal, setShowRatingModal] = useState(false)  // Rating modal
  const [ratingTarget, setRatingTarget] = useState<any>(null)  // User to rate
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat on mount
  useEffect(() => {
    if (!roomId || !currentUser) return
    
    // Initialize priceQuotes collection first
    priceQuoteService.initialize().catch(console.warn)
    
    loadChat()
  }, [roomId, currentUser])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChat = async () => {
    if (!roomId || !currentUser) return
    
    try {
      setLoading(true)
      setError('')
      
      // Load room
      const roomData = await chatService.getRoom(roomId)
      
      // If no room found, might be a trip ID without chat room yet
      if (!roomData && roomId) {
        // Try to find chat room for this trip
        let tripRoomId = await chatService.getTripRoom(roomId)
        if (tripRoomId) {
          // Redirect to actual chat room
          navigate(`/chat/${tripRoomId}`, { replace: true })
          setLoading(false)
          return
        }
      }
      
      if (!roomData) {
        setError('找不到聊天室')
        setLoading(false)
        return
      }
      
      setRoom(roomData)
      
      // Load trip info if this is a trip chat
      if (roomData.roomType === 'trip' && roomData.roomTypeId) {
        try {
          const { tripService } = await import('../services/tripService')
          const trip = await tripService.getById(roomData.roomTypeId)
          if (trip) setTripInfo(trip)
        } catch (e) {
          console.warn('Failed to load trip info:', e)
        }
      }
      
      // Load messages using simple query
      const msgs = await getRoomMessages(roomId)
      setMessages(msgs)
      
      // Load price quotes
      const roomQuotes = await priceQuoteService.getRoomQuotes(roomId).catch(e => {
        console.warn('Failed to load quotes:', e)
        return []
      })
      setQuotes(roomQuotes)
      
      // Load confirmed quote if exists
      const accepted = await priceQuoteService.getAcceptedQuote(roomId).catch(e => {
        console.warn('Failed to load accepted quote:', e)
        return null
      })
      setConfirmedQuote(accepted)
      
      // Check if trip is completed and user hasn't rated yet
      if (tripInfo && (tripInfo.status === 'COMPLETED' || tripInfo.status === 'IN_PROGRESS')) {
        const otherParticipant = roomData.participants?.find(
          (p: any) => p.passengerId !== currentUser?.id
        )
        if (otherParticipant && tripInfo.status === 'COMPLETED') {
          // Check if current user has already rated
          const hasRated = await ratingService.hasRated(tripInfo.id, currentUser.id)
          if (!hasRated) {
            // Show rating prompt
            setRatingTarget(otherParticipant)
            setShowRatingModal(true)
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading chat:', err)
      setError('載入失敗: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoomMessages = async (rid: string): Promise<any[]> => {
    try {
      const ref = collection(db, 'chatMessages')
      const q = query(ref, where('conversationId', '==', rid))
      const snap = await getDocs(q)
      const msgs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      return msgs.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime()
        const bTime = new Date(b.createdAt || 0).getTime()
        return aTime - bTime
      })
    } catch (e) {
      console.error('getRoomMessages error:', e)
      return []
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || sending || !roomId) return
    
    try {
      setSending(true)
      
      // Send using chatService's message send
      const ref = collection(db, 'chatMessages')
      await addDoc(ref, {
        conversationId: roomId,
        senderId: currentUser.id,
        senderName: currentUser.name || '用戶',
        senderRole: currentUser.role || 'passenger',
        content: newMessage.trim(),
        messageType: 'text',
        readBy: [currentUser.id],
        createdAt: new Date().toISOString(),
        participantIds: room?.participantIds || []
      })
      
      // Reload messages
      const msgs = await getRoomMessages(roomId)
      setMessages(msgs)
      setNewMessage('')
    } catch (err: any) {
      console.error('Error sending message:', err)
      alert('發送失敗: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!currentUser || !roomId) {
      alert('請先登入')
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片文件')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過 5MB')
      return
    }
    
    try {
      setUploadingImage(true)
      console.log('Starting image upload...')
      
      // Upload image to Firebase Storage
      const fileName = `img_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const storageRef = ref(storage, `chatImages/${roomId}/${fileName}`)
      console.log('Storage ref created:', storageRef.fullPath)
      
      const snapshot = await uploadBytes(storageRef, file)
      console.log('Upload complete, getting URL...')
      
      const imageUrl = await getDownloadURL(snapshot.ref)
      console.log('Image URL:', imageUrl)
      
      // Send image message
      const msgRef = collection(db, 'chatMessages')
      await addDoc(msgRef, {
        conversationId: roomId,
        senderId: currentUser.id,
        senderName: currentUser.name || '用戶',
        senderRole: currentUser.role || 'passenger',
        content: imageUrl,
        messageType: 'image',
        readBy: [currentUser.id],
        createdAt: new Date().toISOString(),
        participantIds: room?.participantIds || []
      })
      console.log('Message sent!')
      
      // Reload messages
      const msgs = await getRoomMessages(roomId)
      setMessages(msgs)
    } catch (err: any) {
      console.error('Image upload error:', err)
      alert('圖片上傳失敗: ' + (err.message || '未知錯誤'))
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirm = async () => {
    if (!roomId || !currentUser) return
    try {
      await chatService.confirmRide(roomId, currentUser.id)
      loadChat()
    } catch (err) {
      console.error('Confirm error:', err)
    }
  }

  // ========== PRICE QUOTE HANDLERS ==========

  const handleSendQuote = async () => {
    if (!quotePrice || !currentUser || !roomId) return
    
    const price = Number(quotePrice)
    const tunnel = Number(tunnelFee) || 0
    const freeWaiting = freeWaitingMinutes || 0
    const extraCharge = currentUser.role === 'driver' ? extraChargePer10Min : 0
    
    if (isNaN(price) || price <= 0) {
      alert('請輸入有效的價格')
      return
    }
    
    try {
      const type = currentUser.role === 'driver' ? 'offer' : 'counter'
      
      // Create or update the quote (one quote per user)
      await priceQuoteService.createOrUpdate({
        roomId,
        oderId: currentUser.id,
        oderName: currentUser.name || '用戶',
        oderRole: currentUser.role as 'driver' | 'passenger',
        type,
        pricePerSeat: price,
        tunnelFee: tunnel,
        waitingTime: freeWaiting,  // 免費等候分鐘
        extraChargePer10Min: extraCharge,  // 超時收費
      })
      
      // Build content string with all details
      let content = `💰 ${currentUser.role === 'driver' ? '司機' : '乘客'}報價：\n`
      content += `每位 HK$ ${price}`
      if (tunnel > 0) content += `\n隧道費 HK$ ${tunnel}`
      if (freeWaiting > 0 && currentUser.role === 'driver') content += `\n免費等候 ${freeWaiting} 分鐘`
      if (extraChargePer10Min > 0 && currentUser.role === 'driver') content += `\n超時費 HK$ ${extraChargePer10Min}/10分`
      
      // Send a system message about the quote
      const msgType = type === 'offer' ? 'price_offer' : 'price_counter'
      const ref = collection(db, 'chatMessages')
      await addDoc(ref, {
        conversationId: roomId,
        senderId: currentUser.id,
        senderName: currentUser.name || '用戶',
        senderRole: currentUser.role || 'passenger',
        content,
        messageType: msgType,
        readBy: [currentUser.id],
        createdAt: new Date().toISOString(),
        participantIds: room?.participantIds || [],
        quotePrice: price,
        quoteTunnelFee: tunnel,
        quoteFreeWaitingMinutes: freeWaiting,
        quoteExtraChargePer10Min: extraChargePer10Min,
      })
      
      // Reload
      setQuotePrice('')
      setTunnelFee('')
      setShowQuoteModal(false)
      loadChat()
    } catch (err: any) {
      console.error('Quote error:', err)
      alert('報價失敗: ' + err.message)
    }
  }

  const handleAcceptQuote = async (quote: PriceQuote) => {
    try {
      // Accept the quote - this will now create a Trip!
      const tripId = await priceQuoteService.accept(
        quote.id, 
        currentUser!.id, 
        currentUser!.name || '用戶',
        room ? {
          roomId: room.id,
          roomType: room.roomType as 'trip' | 'request',
          roomTypeId: room.roomTypeId || '',
          participants: room.participants || [],
          topicPickup: room.topicPickup,
          topicDropoff: room.topicDropoff,
          topicTime: room.topicTime,
        } : undefined
      )
      
      // Also confirm the ride in chat room
      await chatService.confirmRide(roomId!, currentUser!.id)
      
      // Reload chat to get updated trip info
      loadChat()
      
      // Send confirmation message
      const msgRef = collection(db, 'chatMessages')
      const tripInfoMsg = tripId 
        ? `✅ 已接受報價：每位 HK$ ${quote.pricePerSeat}\n🚗 行程已創建！`
        : `✅ 已接受報價：每位 HK$ ${quote.pricePerSeat}`
      
      await addDoc(msgRef, {
        conversationId: roomId,
        senderId: currentUser!.id,
        senderName: currentUser!.name || '用戶',
        senderRole: currentUser!.role || 'passenger',
        content: tripInfoMsg,
        messageType: 'price_confirmed',
        readBy: [currentUser!.id],
        createdAt: new Date().toISOString(),
        participantIds: room?.participantIds || [],
      })
      
      loadChat()
    } catch (err: any) {
      console.error('Accept error:', err)
      alert('接受失敗: ' + err.message)
    }
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  const getOtherName = () => {
    if (!room || !currentUser) return '未知'
    const other = room.participants?.find((p: any) => p.passengerId !== currentUser.id)
    return other?.name || '未知'
  }

  const isHost = room?.hostId === currentUser?.id
  const bothConfirmed = room?.confirmedBy?.length === 2
  const hasConfirmedQuote = !!confirmedQuote

  if (loading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
          <div style={styles.headerTitle}>載入中...</div>
          <div style={{width: 40}} />
        </header>
        <div style={styles.loading}>載入聊天記錄...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
          <div style={styles.headerTitle}>錯誤</div>
          <div style={{width: 40}} />
        </header>
        <div style={styles.error}>{error}</div>
        <div style={styles.backLink} onClick={() => navigate('/chats')}>
          返回聊天室列表
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/chats')}>←</button>
        <div style={styles.headerContent}>
          <div style={styles.headerTitle}>{getOtherName()}</div>
          <div style={styles.headerSubtitle}>
            {room?.topicPickup} → {room?.topicDropoff}
          </div>
        </div>
        <div style={{width: 40}} />
      </header>

      {/* Trip Status Card - Show trip info if available */}
      {tripInfo && (
        <div style={styles.tripStatusCard}>
          <div style={styles.tripStatusHeader}>
            <span style={styles.tripStatusTitle}>🚗 行程狀態</span>
            <span style={{
              ...styles.tripStatusBadge,
              background: tripInfo.status === 'OPEN' ? '#e8f5e9' : 
                         tripInfo.status === 'IN_PROGRESS' ? '#e3f2fd' :
                         tripInfo.status === 'COMPLETED' ? '#f5f5f5' : '#ffebee',
              color: tripInfo.status === 'OPEN' ? '#4caf50' : 
                     tripInfo.status === 'IN_PROGRESS' ? '#2196f3' :
                     tripInfo.status === 'COMPLETED' ? '#9e9e9e' : '#f44336',
            }}>
              {tripInfo.status === 'OPEN' ? '🟢 開放中' :
               tripInfo.status === 'CONFIRMED' ? '✅ 已確認' :
               tripInfo.status === 'IN_PROGRESS' ? '🔵 行程中' :
               tripInfo.status === 'COMPLETED' ? '✅ 已完成' : '❌ 已取消'}
            </span>
          </div>
          <div style={styles.tripStatusInfo}>
            <div>💺 {tripInfo.availableSeats || tripInfo.totalSeats} 剩餘 / {tripInfo.totalSeats} 總位</div>
            <div>👤 司機: {tripInfo.driverName}</div>
          </div>
          {/* Pending Passenger Status */}
          {currentUser.role === 'passenger' && tripInfo.pendingPassengers?.some((p: any) => p.passengerId === currentUser.id) && (
            <div style={styles.tripStatusActions}>
              <div style={{...styles.tripActionBtn, background: '#fff3cd', color: '#856404', cursor: 'default'}}>
                ⏳ 等待司機確認你的加入請求
              </div>
            </div>
          )}
          {currentUser.role === 'passenger' && tripInfo.passengers?.some((p: any) => p.passengerId === currentUser.id) && (
            <div style={styles.tripStatusActions}>
              {tripInfo.status === 'IN_PROGRESS' && (
                <button 
                  onClick={async () => {
                    try {
                      const { tripService } = await import('../services/tripService')
                      await tripService.confirm(tripInfo.id, currentUser.id)
                      loadChat() // Reload to get updated trip info
                      alert('已確認乘車')
                    } catch (e: any) {
                      alert('操作失敗: ' + e.message)
                    }
                  }}
                  style={{...styles.tripActionBtn, background: '#4caf50'}}
                >
                  ✅ 確認乘車
                </button>
              )}
              {tripInfo.status === 'OPEN' && (
                <button 
                  onClick={async () => {
                    if (!confirm('確定要離開這個行程嗎？')) return
                    try {
                      const { tripService } = await import('../services/tripService')
                      await tripService.passengerLeave(tripInfo.id, currentUser.id)
                      navigate('/my-trips')
                    } catch (e: any) {
                      alert('操作失敗: ' + e.message)
                    }
                  }}
                  style={{...styles.tripActionBtn, background: '#ff9800'}}
                >
                  🚪 離開行程
                </button>
              )}
              {tripInfo.status === 'COMPLETED' && (
                <button 
                  onClick={() => setShowRatingModal(true)}
                  style={{...styles.tripActionBtn, background: '#ffc107', color: '#333'}}
                >
                  ⭐ 評價
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmed Banner */}
      {hasConfirmedQuote && (
        <div style={styles.priceConfirmedBanner}>
          <div style={styles.confirmedPrice}>
            💰 價格已確認：HK$ {confirmedQuote.pricePerSeat}/位
          </div>
          {(confirmedQuote.tunnelFee > 0 || confirmedQuote.freeWaitingMinutes > 0 || confirmedQuote.extraChargePer10Min > 0) && (
            <div style={styles.confirmedExtra}>
              {confirmedQuote.tunnelFee > 0 && <span>🚇 隧道費 HK$ {confirmedQuote.tunnelFee}</span>}
              {confirmedQuote.freeWaitingMinutes > 0 && <span>⏱️ 免費等候 {confirmedQuote.freeWaitingMinutes} 分鐘</span>}
              {confirmedQuote.extraChargePer10Min > 0 && <span>⏱️ 超時費 HK$ {confirmedQuote.extraChargePer10Min}/10分</span>}
            </div>
          )}
          <div style={{ fontSize: 12, marginTop: 4 }}>
            由 {confirmedQuote.oderName} 提供，{confirmedQuote.acceptedByName} 接受
          </div>
        </div>
      )}
      
      {/* Both Confirmed Banner (if no price quote) */}
      {bothConfirmed && !hasConfirmedQuote && (
        <div style={styles.confirmedBanner}>✅ 共乘已確認</div>
      )}

      {/* Price Quote Section - Collapsible */}
      {quotes.length > 0 && !hasConfirmedQuote && (
        <div style={styles.quoteSection}>
          {/* Header */}
          <div 
            style={styles.quoteSectionHeader}
            onClick={() => setQuoteExpanded(!quoteExpanded)}
          >
            <span>💰 {quoteExpanded ? '▼' : '▶'} 報價</span>
            <span style={styles.quoteCountBadge}>
              {quotes.filter(q => q.status === 'pending').length}個待回應
            </span>
          </div>
          
          {/* Expanded Content */}
          {quoteExpanded && (
            <div style={styles.quoteContent}>
              {quotes.filter(q => q.status === 'pending').slice(0, 2).map(quote => {
                const isMyQuote = quote.oderId === currentUser?.id
                return (
                  <div key={quote.id} style={styles.quoteCardCompact}>
                    <div style={styles.quoteCardTop}>
                      <span style={styles.quoteRoleCompact}>
                        {isMyQuote ? '📤 你的' : `📥 ${quote.oderName}`}
                      </span>
                      <span style={styles.quotePriceCompact}>
                        HK$ {quote.pricePerSeat}/位
                      </span>
                    </div>
                    {(quote.tunnelFee > 0 || quote.freeWaitingMinutes > 0) && (
                      <div style={styles.quoteExtraCompact}>
                        {quote.tunnelFee > 0 && <span>🚇+{quote.tunnelFee}</span>}
                        {quote.freeWaitingMinutes > 0 && <span>⏱️ {quote.freeWaitingMinutes}分鐘免費</span>}
                      </div>
                    )}
                    {!isMyQuote && (
                      <button 
                        style={styles.acceptBtnCompact}
                        onClick={() => handleAcceptQuote(quote)}
                      >
                        ✅ 接受
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Empty Quote State */}
      {quotes.length === 0 && !hasConfirmedQuote && (
        <div style={styles.emptyQuotes}>
          <div style={styles.emptyQuotesIcon}>💰</div>
          <div style={styles.emptyQuotesTitle}>尚無報價</div>
          <div style={styles.emptyQuotesText}>
            點擊下方 💰 按鈕發送報價<br/>
            或等待對方發送報價
          </div>
        </div>
      )}

        {/* Messages */}
        <div style={styles.messagesArea}>
          {messages.filter(m => !['price_offer', 'price_counter', 'price_confirmed'].includes(m.messageType)).length === 0 ? (
            <div style={styles.noMessages}>
              暫時沒有消息<br/>成為第一個發消息的人吧！
            </div>
          ) : (
          messages.filter(m => !['price_offer', 'price_counter', 'price_confirmed'].includes(m.messageType)).map((msg, index) => {
            const isMe = msg.senderId === currentUser?.id
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId
            
            return (
              <div 
                key={msg.id || index} 
                style={{
                  ...styles.messageRow,
                  ...(isMe ? styles.myMessageRow : styles.theirMessageRow)
                }}
              >
                {!isMe && showAvatar && (
                  <div style={styles.avatar}>
                    {msg.senderName?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  {showAvatar && !isMe && (
                    <div style={styles.senderName}>{msg.senderName}</div>
                  )}
                  {msg.messageType === 'image' ? (
                    <img 
                      src={msg.content} 
                      alt="圖片" 
                      style={styles.messageImage}
                      onClick={() => window.open(msg.content, '_blank')}
                    />
                  ) : (
                    <div style={{
                      ...styles.bubble,
                      ...(isMe ? styles.myBubble : styles.theirBubble)
                    }}>
                      {msg.content}
                    </div>
                  )}
                  <div style={{
                    ...styles.time,
                    ...(isMe ? styles.myTime : styles.theirTime)
                  }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirm Button (for host) */}
      {isHost && !bothConfirmed && (
        <div style={styles.confirmSection}>
          <button style={styles.confirmBtn} onClick={handleConfirm}>
            ✅ 確認共乘
          </button>
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <div style={styles.modalOverlay} onClick={() => setShowQuoteModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              💰 {currentUser?.role === 'driver' ? '發送報價' : '發送還價'}
            </div>
            
            {/* Price per seat */}
            <div style={styles.modalContent}>
              <label style={styles.modalLabel}>每位價格 (HK$)</label>
              <input
                type="number"
                style={styles.modalInput}
                placeholder="例如：150"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
                min="1"
              />
            </div>
            
            {/* Tunnel Fee */}
            <div style={styles.modalContent}>
              <label style={styles.modalLabel}>🚇 隧道費 (每位 HK$)</label>
              <input
                type="number"
                style={styles.modalInput}
                placeholder="例如：30"
                value={tunnelFee}
                onChange={(e) => setTunnelFee(e.target.value)}
                min="0"
              />
            </div>
            
            {/* Waiting Time Settings (only for drivers) */}
            {currentUser?.role === 'driver' && (
              <div style={styles.modalContent}>
                <label style={styles.modalLabel}>⏱️ 免費等候時間</label>
                <div style={styles.waitingTimeRow}>
                  {[5, 10, 15, 20, 30].map(min => (
                    <button
                      key={min}
                      style={{
                        ...styles.waitingTimeBtn,
                        ...(freeWaitingMinutes === min ? styles.waitingTimeBtnActive : {})
                      }}
                      onClick={() => setFreeWaitingMinutes(min)}
                    >
                      {min}分鐘
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {currentUser?.role === 'driver' && (
              <div style={styles.modalContent}>
                <label style={styles.modalLabel}>⏱️ 超時費（每10分鐘 HK$）</label>
                <input
                  type="number"
                  style={styles.modalInput}
                  placeholder="例如：30"
                  value={extraChargePer10Min}
                  onChange={(e) => setExtraChargePer10Min(Number(e.target.value))}
                  min="0"
                />
              </div>
            )}
            
            {/* Total calculation preview */}
            {quotePrice && (
              <div style={styles.totalPreview}>
                <div style={styles.totalRow}>
                  <span>每位價格</span>
                  <span>HK$ {quotePrice}</span>
                </div>
                {tunnelFee && (
                  <div style={styles.totalRow}>
                    <span>+ 隧道費</span>
                    <span>HK$ {tunnelFee}</span>
                  </div>
                )}
                {currentUser?.role === 'driver' && extraChargePer10Min > 0 && (
                  <div style={styles.totalRow}>
                    <span>+ 超時費（每10分鐘）</span>
                    <span>HK$ {extraChargePer10Min}</span>
                  </div>
                )}
                <div style={styles.totalDivider} />
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>每位總計</span>
                  <span style={styles.totalValue}>
                    HK$ {Number(quotePrice) + (Number(tunnelFee) || 0) + (currentUser?.role === 'driver' ? extraChargePer10Min : 0)}
                  </span>
                </div>
              </div>
            )}
            
            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancelBtn}
                onClick={() => {
                  setShowQuoteModal(false)
                  setQuotePrice('')
                  setTunnelFee('')
                }}
              >
                取消
              </button>
              <button 
                style={styles.modalConfirmBtn}
                onClick={handleSendQuote}
              >
                發送報價
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={styles.inputArea}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <button 
          style={styles.imageBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          title="發送圖片"
        >
          📷
        </button>
        <button 
          style={styles.quoteBtn}
          onClick={() => setShowQuoteModal(true)}
          title="報價"
        >
          💰
        </button>
        <input
          style={styles.input}
          placeholder="輸入消息..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          style={styles.sendBtn}
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? '...' : '發送'}
        </button>
      </div>

      {/* Rating Modal */}
      {ratingTarget && tripInfo?.status === 'COMPLETED' && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false)
            setRatingTarget(null)
          }}
          tripId={tripInfo.id}
          roomId={roomId || ''}
          userId={currentUser?.id || ''}
          userName={currentUser?.name || ''}
          otherUserId={ratingTarget.oderId}
          otherUserName={ratingTarget.name}
          userRole={currentUser?.role as 'driver' | 'passenger'}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100dvh',
    background: '#fff9f5',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  backBtn: {
    fontSize: 24,
    background: 'none',
    border: 'none',
    color: '#e07b4c',
    cursor: 'pointer',
    padding: 0,
  },
  headerContent: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8b7355',
  },
  tripStatusCard: {
    background: '#fff',
    borderBottom: '1px solid #f0e0d6',
    padding: '10px 16px',
  },
  tripStatusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripStatusTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a3728',
  },
  tripStatusBadge: {
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
  },
  tripStatusInfo: {
    fontSize: 12,
    color: '#8b7355',
    display: 'flex',
    gap: 16,
  },
  tripStatusActions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  tripActionBtn: {
    flex: 1,
    padding: '8px 12px',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b7355',
  },
  error: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#c62828',
    padding: 20,
    textAlign: 'center',
  },
  backLink: {
    textAlign: 'center',
    color: '#e07b4c',
    padding: 16,
    cursor: 'pointer',
  },
  confirmedBanner: {
    background: '#e8f5e8',
    color: '#5a9a5a',
    textAlign: 'center',
    padding: '8px',
    fontSize: 14,
    fontWeight: 600,
  },
  priceConfirmedBanner: {
    background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%)',
    color: '#2e7d32',
    textAlign: 'center',
    padding: '12px',
    fontSize: 16,
    fontWeight: 700,
    borderBottom: '2px solid #81c784',
  },
  confirmedPrice: {
    fontSize: 18,
    fontWeight: 700,
  },
  confirmedExtra: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    fontSize: 13,
    fontWeight: 500,
    marginTop: 4,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    minHeight: 0,  // Important for flex child
  },
  noMessages: {
    textAlign: 'center',
    color: '#8b7355',
    padding: 40,
    fontSize: 14,
  },
  messageRow: {
    display: 'flex',
    marginBottom: 12,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#f0e0d6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    fontSize: 14,
    color: '#4a3728',
  },
  senderName: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: 15,
    lineHeight: 1.4,
  },
  myBubble: {
    background: '#e07b4c',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    background: '#fff',
    color: '#4a3728',
    border: '2px solid #f0e0d6',
    borderBottomLeftRadius: 4,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  myTime: {
    textAlign: 'right',
    color: '#8b7355',
  },
  theirTime: {
    textAlign: 'left',
    color: '#8b7355',
  },
  confirmSection: {
    padding: '8px 16px',
    background: '#fff',
    borderTop: '2px solid #f0e0d6',
  },
  confirmBtn: {
    width: '100%',
    padding: '12px',
    background: '#e8f5e8',
    color: '#5a9a5a',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  inputArea: {
    display: 'flex',
    padding: '8px 12px',
    paddingBottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 75px)',
    background: '#fff',
    borderTop: '2px solid #f0e0d6',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '12px 14px',
    border: '2px solid #f0e0d6',
    borderRadius: 20,
    fontSize: 15,
    outline: 'none',
    color: '#4a3728',
  },
  sendBtn: {
    flexShrink: 0,
    padding: '10px 16px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  imageBtn: {
    flexShrink: 0,
    width: 40,
    height: 40,
    background: '#f5f5f5',
    border: '2px solid #f0e0d6',
    borderRadius: 20,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBtn: {
    flexShrink: 0,
    width: 40,
    height: 40,
    background: '#fff3e0',
    border: '2px solid #e07b4c',
    borderRadius: 20,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: 12,
    cursor: 'pointer',
    objectFit: 'cover',
  },
  // Quote Section Styles
  quoteSection: {
    background: '#fff9f5',
    borderBottom: '2px solid #f0e0d6',
    flexShrink: 0,
  },
  quoteSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#4a3728',
    cursor: 'pointer',
  },
  quoteCountBadge: {
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 500,
  },
  quoteContent: {
    padding: '0 16px 12px',
  },
  // Compact Quote Card for new design
  quoteCardCompact: {
    background: '#fff',
    border: '2px solid #e07b4c',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  quoteCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteRoleCompact: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a3728',
  },
  quotePriceCompact: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e07b4c',
  },
  quoteExtraCompact: {
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  acceptBtnCompact: {
    width: '100%',
    marginTop: 8,
    padding: '8px',
    background: '#e8f5e8',
    color: '#5a9a5a',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Quote Card Styles
  quoteCard: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  quoteCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteRole: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4a3728',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  counterBadge: {
    background: '#fff3e0',
    color: '#e07b4c',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  quoteStatus: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 600,
  },
  pendingStatus: {
    background: '#fff3e0',
    color: '#e07b4c',
  },
  acceptedStatus: {
    background: '#e8f5e8',
    color: '#5a9a5a',
  },
  rejectedStatus: {
    background: '#ffebee',
    color: '#c62828',
  },
  expiredStatus: {
    background: '#f5f5f5',
    color: '#999',
  },
  quotePriceMain: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#8b7355',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e07b4c',
  },
  quoteTime: {
    fontSize: 11,
    color: '#8b7355',
    marginBottom: 10,
  },
  quoteActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  acceptBtn: {
    flex: 1,
    minWidth: '80px',
    padding: '10px 14px',
    background: '#e8f5e8',
    color: '#5a9a5a',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    minWidth: '80px',
    padding: '10px 14px',
    background: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  counterBtn: {
    flex: 1,
    minWidth: '80px',
    padding: '10px 14px',
    background: '#fff3e0',
    color: '#e07b4c',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    minWidth: '80px',
    padding: '10px 14px',
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  acceptedQuote: {
    background: '#e8f5e8',
    border: '2px solid #81c784',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  expiredQuote: {
    background: '#f5f5f5',
    border: '2px solid #e0e0e0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    opacity: 0.7,
  },
  acceptedInfo: {
    fontSize: 12,
    color: '#5a9a5a',
    marginTop: 8,
  },
  emptyQuotes: {
    textAlign: 'center',
    padding: '24px 16px',
    background: '#fff9f5',
    borderBottom: '2px solid #f0e0d6',
  },
  emptyQuotesIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyQuotesTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 4,
  },
  emptyQuotesText: {
    fontSize: 13,
    color: '#8b7355',
    lineHeight: 1.5,
  },
  helpText: {
    fontSize: 12,
    color: '#8b7355',
    textAlign: 'center',
    marginTop: 12,
    padding: '8px 12px',
    background: '#fff',
    borderRadius: 8,
    border: '1px dashed #f0e0d6',
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#8b7355',
    marginBottom: 8,
    display: 'block',
  },
  modalInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '12px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Waiting time selector
  waitingTimeRow: {
    display: 'flex',
    gap: 8,
  },
  waitingTimeBtn: {
    flex: 1,
    padding: '10px 8px',
    background: '#f5f5f5',
    color: '#666',
    border: '2px solid #f0e0d6',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  waitingTimeBtnActive: {
    background: '#e07b4c',
    color: '#fff',
    borderColor: '#e07b4c',
  },
  // Total preview
  totalPreview: {
    background: '#fff9f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#4a3728',
    marginBottom: 4,
  },
  totalDivider: {
    borderTop: '1px solid #f0e0d6',
    margin: '8px 0',
  },
  totalLabel: {
    fontWeight: 600,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e07b4c',
  },
  // Extra fees in quote card
  quoteExtraFees: {
    background: '#f9f9f9',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 8,
  },
  extraFeeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
}