import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { messageService } from '../services/chatService'
import type { ChatMessage } from '../types/shift'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!conversationId) return
    
    // Subscribe to messages
    const unsubscribe = messageService.getMessages(conversationId, (msgs) => {
      setMessages(msgs)
    })
    
    return () => unsubscribe()
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUser) return
    
    setSending(true)
    try {
      await messageService.sendMessage(
        conversationId,
        currentUser.id,
        currentUser.name || 'User',
        newMessage.trim()
      )
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !conversationId || !currentUser) return
    
    setUploading(true)
    try {
      await messageService.sendImageMessage(
        conversationId,
        currentUser.id,
        currentUser.name || 'User',
        file
      )
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
  }

  const isOwnMessage = (msg: ChatMessage) => msg.senderId === currentUser?.id

  if (!conversationId) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>無效的對話</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <span style={styles.title}>對話</span>
      </div>

      {/* Messages */}
      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <div style={styles.empty}>暫無訊息</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                ...(isOwnMessage(msg) ? styles.ownMessage : styles.otherMessage)
              }}
            >
              <div style={styles.senderName}>
                {isOwnMessage(msg) ? '你' : msg.senderName}
              </div>
              
              {msg.imageUrl && (
                <img 
                  src={msg.imageUrl} 
                  alt="Image" 
                  style={styles.image}
                  onClick={() => window.open(msg.imageUrl, '_blank')}
                />
              )}
              
              {msg.content !== '[圖片]' && (
                <div style={styles.messageContent}>{msg.content}</div>
              )}
              
              <div style={styles.messageTime}>
                {formatTime(msg.createdAt)}
                {isOwnMessage(msg) && ' ✓✓'}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <button 
          style={styles.imageBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '...' : '📷'}
        </button>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="輸入訊息..."
          style={styles.input}
          disabled={sending}
        />
        
        <button 
          style={styles.sendBtn}
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f5f5f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#284a41',
    color: '#fff',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 18,
  },
  messagesArea: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    background: '#284a41',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    background: '#fff',
    color: '#333',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    opacity: 0.8,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 1.4,
  },
  image: {
    maxWidth: '100%',
    borderRadius: 8,
    marginBottom: 6,
    cursor: 'pointer',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
    textAlign: 'right',
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fff',
    borderTop: '1px solid #eee',
    gap: 8,
  },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    border: 'none',
    background: '#f0f0f0',
    fontSize: 20,
    cursor: 'pointer',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 20,
    border: '1px solid #ddd',
    fontSize: 15,
    outline: 'none',
  },
  sendBtn: {
    padding: '12px 20px',
    borderRadius: 20,
    border: 'none',
    background: '#284a41',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    textAlign: 'center',
    padding: 40,
    color: '#f44336',
  },
}
