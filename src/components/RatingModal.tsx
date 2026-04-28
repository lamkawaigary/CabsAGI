// Cabs Carpool - Rating Modal
// 行程完成後的評價彈窗

import { useState } from 'react'
import { ratingService } from '../services/ratingService'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  roomId: string
  userId: string
  userName: string
  otherUserId: string
  otherUserName: string
  userRole: 'driver' | 'passenger'
}

export default function RatingModal({
  isOpen,
  onClose,
  tripId,
  roomId,
  userId,
  userName,
  otherUserId,
  otherUserName,
  userRole
}: RatingModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('請選擇評分')
      return
    }

    try {
      setSubmitting(true)
      await ratingService.submitRating({
        tripId,
        roomId,
        fromUserId: userId,
        fromUserName: userName,
        toUserId: otherUserId,
        toUserName: otherUserName,
        rating,
        comment: comment.trim() || undefined,
        role: userRole,
      })
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setSubmitted(false)
      }, 1500)
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('提交失敗，請重試')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          onClick={() => setRating(i)}
          style={{
            ...styles.starBtn,
            color: i <= rating ? '#ffc107' : '#ddd',
          }}
        >
          ★
        </button>
      )
    }
    return stars
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {submitted ? (
          <div style={styles.success}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successText}>感謝你的評價！</div>
          </div>
        ) : (
          <>
            <div style={styles.header}>
              <h3 style={styles.title}>評價乘客</h3>
              <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.content}>
              <p style={styles.label}>
                給 <strong>{otherUserName}</strong> 的評分
              </p>
              
              <div style={styles.stars}>
                {renderStars()}
              </div>
              
              <div style={styles.ratingText}>
                {rating === 0 && '點擊選擇評分'}
                {rating === 1 && '😠 很差'}
                {rating === 2 && '😕 一般'}
                {rating === 3 && '😐 還行'}
                {rating === 4 && '🙂 滿意'}
                {rating === 5 && '😍 非常滿意'}
              </div>
              
              <textarea
                style={styles.textarea}
                placeholder="留言（可選）"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={200}
              />
            </div>
            
            <div style={styles.footer}>
              <button 
                style={styles.skipBtn}
                onClick={onClose}
              >
                跳過
              </button>
              <button 
                style={styles.submitBtn}
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
              >
                {submitting ? '提交中...' : '提交評價'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f0e0d6',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#999',
    cursor: 'pointer',
    padding: 4,
  },
  content: {
    padding: 20,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 14,
    color: '#8b7355',
    marginBottom: 12,
  },
  stars: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    fontSize: 36,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    transition: 'transform 0.1s',
  },
  ratingText: {
    fontSize: 14,
    color: '#e07b4c',
    marginBottom: 16,
    height: 20,
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: 12,
    border: '2px solid #f0e0d6',
    borderRadius: 10,
    fontSize: 14,
    resize: 'none' as const,
    fontFamily: 'inherit',
  },
  footer: {
    display: 'flex',
    gap: 12,
    padding: 16,
    borderTop: '1px solid #f0e0d6',
  },
  skipBtn: {
    flex: 1,
    padding: '12px 16px',
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 16px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  success: {
    padding: 40,
    textAlign: 'center' as const,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: 600,
  },
}