// Cabs Carpool - Landing Page (Public Home)
// Version: 1.0
// 未登入用戶的官網首頁

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginModal from '../components/LoginModal'

export default function LandingPage() {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🚗 Cabs</div>
        <button 
          style={styles.loginBtn}
          onClick={() => setShowLoginModal(true)}
        >
          開始使用
        </button>
      </header>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroIcon}>🚗</div>
        <h1 style={styles.heroTitle}>共乘出行</h1>
        <p style={styles.heroSubtitle}>
          跨境七人車預訂平台<br/>
          直接與司機/乘客聊天配對
        </p>
      </div>

      {/* How it works */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>如何運作</h2>
        
        <div style={styles.step}>
          <div style={styles.stepNum}>1</div>
          <div style={styles.stepContent}>
            <div style={styles.stepTitle}>發布行程或需求</div>
            <div style={styles.stepDesc}>司機發布行程，乘客發布乘車需求</div>
          </div>
        </div>

        <div style={styles.step}>
          <div style={styles.stepNum}>2</div>
          <div style={styles.stepContent}>
            <div style={styles.stepTitle}>直接聊天配對</div>
            <div style={styles.stepDesc}>透過平台聊天功能直接聯絡對方</div>
          </div>
        </div>

        <div style={styles.step}>
          <div style={styles.stepNum}>3</div>
          <div style={styles.stepContent}>
            <div style={styles.stepTitle}>確認共乘</div>
            <div style={styles.stepDesc}>雙方確認後，乘客現金/FPS 直接付款給司機</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <button 
          style={styles.ctaBtn}
          onClick={() => setShowLoginModal(true)}
        >
          開始使用
        </button>
      </div>

      {/* Features */}
      <div style={styles.features}>
        <div style={styles.feature}>
          <div style={styles.featureIcon}>💬</div>
          <div style={styles.featureTitle}>直接聊天</div>
          <div style={styles.featureDesc}>平台不干預成交決定</div>
        </div>
        <div style={styles.feature}>
          <div style={styles.featureIcon}>💰</div>
          <div style={styles.featureTitle}>現金付款</div>
          <div style={styles.featureDesc}>乘客直接付款司機</div>
        </div>
        <div style={styles.feature}>
          <div style={styles.featureIcon}>🚗</div>
          <div style={styles.featureTitle}>七人車</div>
          <div style={styles.featureDesc}>跨境出行首選</div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Cabs 共乘出行</p>
      </footer>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false)
          navigate('/home')
        }}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e07b4c',
  },
  loginBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid #e07b4c',
    background: '#fff',
    color: '#e07b4c',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  hero: {
    textAlign: 'center',
    padding: '60px 24px 40px',
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#8b7355',
    lineHeight: 1.6,
  },
  section: {
    padding: '0 24px 40px',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 24,
    textAlign: 'center',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: 20,
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    border: '2px solid #f0e0d6',
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#e07b4c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    marginRight: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#8b7355',
  },
  cta: {
    textAlign: 'center',
    padding: '0 24px 40px',
  },
  ctaBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  features: {
    display: 'flex',
    padding: '0 24px',
    gap: 12,
  },
  feature: {
    flex: 1,
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    textAlign: 'center',
    border: '2px solid #f0e0d6',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#8b7355',
  },
  footer: {
    textAlign: 'center',
    padding: '40px 24px',
    color: '#8b7355',
    fontSize: 12,
  },
}
