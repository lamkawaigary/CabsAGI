// Cabs Carpool - Driver QR Scanner
// 司機掃描乘客上車令牌

import { useState, useRef } from 'react'
import { tripService } from '../services/tripService'

interface QRScannerProps {
  tripId: string
  onScanSuccess?: () => void
  onScanError?: (error: string) => void
}

export default function QRScanner({ tripId, onScanSuccess, onScanError }: QRScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual')
  const [code, setCode] = useState(['', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all filled
    if (newCode.every(c => c) && newCode.join('').length === 4) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const digits = pastedData.replace(/\D/g, '').slice(0, 4)
    
    if (digits.length > 0) {
      const newCode = [...code]
      for (let i = 0; i < digits.length; i++) {
        newCode[i] = digits[i]
      }
      setCode(newCode)
      
      // Focus last filled or first empty
      const focusIndex = Math.min(digits.length, 3)
      inputRefs.current[focusIndex]?.focus()
      
      if (digits.length === 4) {
        handleVerify(digits)
      }
    }
  }

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    if (codeToVerify.length !== 4) {
      setResult({ success: false, message: '請輸入4位驗證碼' })
      return
    }

    try {
      setVerifying(true)
      setResult(null)
      
      // Find passenger by QR code
      const success = await tripService.verifyAndMarkOnboard(tripId, codeToVerify)
      
      if (success) {
        setResult({ success: true, message: '✅ 驗證成功！已標記乘客上車' })
        setCode(['', '', '', ''])
        onScanSuccess?.()
        
        // Clear success message after 3 seconds
        setTimeout(() => setResult(null), 3000)
      } else {
        setResult({ success: false, message: '❌ 驗證碼無效或已使用' })
        setCode(['', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || '驗證失敗' })
      onScanError?.(error.message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.icon}>📷</div>
        <div style={styles.title}>掃描上車令牌</div>
        <div style={styles.subtitle}>乘客展示 QR Code 或提供4位驗證碼</div>
      </div>

      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button 
          style={{...styles.modeBtn, ...(mode === 'manual' ? styles.modeBtnActive : {})}}
          onClick={() => setMode('manual')}
        >
          手動輸入
        </button>
        <button 
          style={{...styles.modeBtn, ...(mode === 'camera' ? styles.modeBtnActive : {})}}
          onClick={() => setMode('camera')}
        >
          相機掃描
        </button>
      </div>

      {mode === 'manual' ? (
        /* Manual Input Mode */
        <div style={styles.manualMode}>
          <div style={styles.codeInput} onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                style={{
                  ...styles.codeDigit,
                  ...(digit ? styles.codeDigitFilled : {})
                }}
                disabled={verifying}
              />
            ))}
          </div>
          
          <button 
            style={{
              ...styles.verifyBtn,
              ...(code.join('').length !== 4 || verifying ? styles.verifyBtnDisabled : {})
            }}
            onClick={() => handleVerify()}
            disabled={code.join('').length !== 4 || verifying}
          >
            {verifying ? '驗證中...' : '確認驗證'}
          </button>
        </div>
      ) : (
        /* Camera Mode */
        <div style={styles.cameraMode}>
          <div style={styles.cameraPlaceholder}>
            <div style={styles.cameraIcon}>📷</div>
            <div style={styles.cameraText}>相機掃描功能</div>
            <div style={styles.cameraHint}>
              需要配置 camera 權限<br/>
              目前僅支援手動輸入
            </div>
            <button 
              style={styles.switchBtn}
              onClick={() => setMode('manual')}
            >
              切換到手動輸入
            </button>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div style={{
          ...styles.result,
          background: result.success ? '#e8f5e9' : '#ffebee',
          color: result.success ? '#4caf50' : '#f44336',
        }}>
          {result.message}
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions}>
        <div style={styles.instructionTitle}>使用方法：</div>
        <div style={styles.instructionItem}>1. 請乘客打開「我的行程」</div>
        <div style={styles.instructionItem}>2. 點擊對應行程查看 QR Code</div>
        <div style={styles.instructionItem}>3. 掃描 QR 或輸入顯示的4位驗證碼</div>
        <div style={styles.instructionItem}>4. 確認乘客上車</div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8b7355',
  },
  modeToggle: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    color: '#666',
  },
  modeBtnActive: {
    background: '#e07b4c',
    color: '#fff',
  },
  manualMode: {
    textAlign: 'center' as const,
  },
  codeInput: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  codeDigit: {
    width: 56,
    height: 64,
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center' as const,
    border: '2px solid #e0d6cc',
    borderRadius: 12,
    outline: 'none',
    color: '#4a3728',
    background: '#fff',
  },
  codeDigitFilled: {
    borderColor: '#e07b4c',
    background: '#fff9f5',
  },
  verifyBtn: {
    width: '100%',
    padding: '14px 24px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  verifyBtnDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  cameraMode: {
    textAlign: 'center' as const,
  },
  cameraPlaceholder: {
    padding: 40,
    background: '#f5f5f5',
    borderRadius: 12,
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cameraText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 8,
  },
  cameraHint: {
    fontSize: 13,
    color: '#8b7355',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  switchBtn: {
    padding: '10px 20px',
    background: '#fff',
    color: '#e07b4c',
    border: '2px solid #e07b4c',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  result: {
    marginTop: 16,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center' as const,
  },
  instructions: {
    marginTop: 20,
    padding: 16,
    background: '#f8f8f8',
    borderRadius: 12,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 4,
  },
}