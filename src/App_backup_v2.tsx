import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, limit } from 'firebase/firestore'
import { auth, db } from './firebaseConfig'
import './index.css'

// Auth helpers
const fmtEmail = (p: string) => p.replace(/\D/g, '') + '@p7s.app'

// Tencent Map Key
const TENCENT_MAP_KEY = 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'

// SVG Icons
const Icons = {
  Home: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  Clipboard: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  Message: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  User: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  CircleDot: ({ color = "#667eea" }: { color?: string }) => <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill={color} stroke="white" strokeWidth="2"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Car: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h-4l-3 4H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1a2 2 0 0 0 4 0h6a2 2 0 0 0 4 0h1a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/><circle cx="7.5" cy="16.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/></svg>,
  Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
}

// Locations data
const LOCATIONS = [
  { id: 'hkg', name: '香港國際機場', address: '赤鱲角', lat: 22.3080, lng: 113.9185 },
  { id: 'szw', name: '深圳灣口岸', address: '深圳南山', lat: 22.4908, lng: 113.9436 },
  { id: 'hg', name: '皇崗口岸', address: '深圳福田', lat: 22.5104, lng: 114.0743 },
  { id: 'lohu', name: '羅湖口岸', address: '深圳羅湖', lat: 22.5283, lng: 114.1253 },
  { id: 'lmg', name: '落馬洲口岸', address: '深圳福田', lat: 22.5145, lng: 114.0614 },
  { id: 'hzmb', name: '港珠澳大橋珠海', address: '珠海', lat: 22.3155, lng: 113.9372 },
  { id: 'central', name: '中環', address: '香港中環', lat: 22.2823, lng: 114.1586 },
  { id: 'mongkok', name: '旺角', address: '香港旺角', lat: 22.3178, lng: 114.1734 },
  { id: 'tst', name: '尖沙咀', address: '九龍尖沙咀', lat: 22.2964, lng: 114.1619 },
  { id: 'sz', name: '深圳市區', address: '深圳', lat: 22.5431, lng: 114.0579 },
  { id: 'gz', name: '廣州市區', address: '廣州', lat: 23.1291, lng: 113.2644 },
]

// Load Tencent Map SDK
const loadTencentMap = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).TMap) { resolve(true); return }
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}`
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

// Helper functions
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const calculatePrice = (pickup: typeof LOCATIONS[0], dropoff: typeof LOCATIONS[0]) => {
  const dist = getDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
  const hkAreas = ['hkg', 'central', 'mongkok', 'tst']
  const isCrossBorder = hkAreas.includes(pickup.id) !== hkAreas.includes(dropoff.id)
  const toll = (dropoff.id === 'szw' || dropoff.id === 'hzmb') ? 50 : 0
  const base = 80
  const mileage = dist * 10
  return { distance: dist.toFixed(1), duration: Math.round(dist * 1.5), price: Math.round(base + mileage + toll), isCrossBorder, toll }
}

// Location Search Component  
function LocationInput({ value, onSelect, placeholder, type, onFocus }: { value: string, onSelect: (loc: typeof LOCATIONS[0]) => void, placeholder: string, type: 'pickup' | 'dropoff', onFocus?: () => void }) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<typeof LOCATIONS[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 1) { setResults([]); setShow(false); return }
    
    // Debounce search
    const timer = setTimeout(() => {
      // Local search
      const local = LOCATIONS.filter(l => 
        l.name.toLowerCase().includes(query.toLowerCase()) || 
        l.address.toLowerCase().includes(query.toLowerCase())
      )
      
      if (local.length > 0) {
        setResults(local.slice(0, 5))
        setShow(true)
      } else {
        // Try Tencent API
        setLoading(true)
        searchTencent(query).then(tencentResults => {
          setResults(tencentResults.slice(0, 5))
          setShow(tencentResults.length > 0)
          setLoading(false)
        })
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div style={{ position: 'relative', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f8f9fa', borderRadius: '16px' }}>
        <Icons.CircleDot color={type === 'pickup' ? '#667eea' : '#f5576c'} />
        <input type="text" value={query} 
          onChange={e => { setQuery(e.target.value); setShow(true) }} 
          onFocus={() => { setShow(true); onFocus?.() }}
          placeholder={placeholder} 
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', outline: 'none' }} 
        />
        {loading && <span style={{ fontSize: '12px', color: '#8e8e93' }}>搜尋中...</span>}
        {query && !loading && <button onClick={() => { setQuery(''); setResults([]); setShow(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icons.X /></button>}
      </div>
      {show && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '240px', overflow: 'auto', marginTop: '4px' }}>
          {results.map(loc => (
            <div key={loc.id} onClick={() => { onSelect(loc); setQuery(loc.name); setShow(false) }} 
              style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1c1e' }}>{loc.name}</div>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>{loc.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Tencent Map Search API
const searchTencent = async (query: string): Promise<typeof LOCATIONS[]> => {
  try {
    const res = await fetch(
      `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(query)}&region=華南&key=${TENCENT_MAP_KEY}`
    )
    const data = await res.json()
    if (data.status === 0 && data.data) {
      return data.data.map((item: any) => ({
        id: item.id,
        name: item.title,
        address: item.address,
        lat: item.location.lat,
        lng: item.location.lng
      }))
    }
  } catch (e) { console.error('Tencent search error:', e) }
  return []
}

// Tencent Map Component
function TencentMap({ pickup, dropoff }: { pickup?: typeof LOCATIONS[0], dropoff?: typeof LOCATIONS[0] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any>(null)

  useEffect(() => {
    loadTencentMap().then(loaded => {
      if (!loaded || !mapRef.current) return
      
      // Initialize map
      const center = pickup ? new (window as any).TMap.LatLng(pickup.lat, pickup.lng) 
                    : new (window as any).TMap.LatLng(22.3193, 114.1694)
      
      mapInstance.current = new (window as any).TMap.Map(mapRef.current, {
        center,
        zoom: 12,
        mapStyleId: 'style1'
      })

      // Markers layer
      markersRef.current = new (window as any).TMap.MultiMarker({
        map: mapInstance.current,
        geometries: []
      })
    })
  }, [])

  // Update markers when locations change
  useEffect(() => {
    if (!markersRef.current) return
    
    const geometries = []
    
    if (pickup) {
      geometries.push({
        id: 'pickup',
        position: new (window as any).TMap.LatLng(pickup.lat, pickup.lng),
        icon: new (window as any).TMap.Icon({
          url: 'data:image/svg+xml;base64,' + btoa(`<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#667eea" stroke="white" stroke-width="3"/></svg>`),
          size: new (window as any).TMap.Size(30, 30),
          anchor: new (window as any).TMap.Point(15, 15)
        })
      })
    }
    
    if (dropoff) {
      geometries.push({
        id: 'dropoff',
        position: new (window as any).TMap.LatLng(dropoff.lat, dropoff.lng),
        icon: new (window as any).TMap.Icon({
          url: 'data:image/svg+xml;base64,' + btoa(`<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#f5576c" stroke="white" stroke-width="3"/></svg>`),
          size: new (window as any).TMap.Size(30, 30),
          anchor: new (window as any).TMap.Point(15, 15)
        })
      })
    }

    markersRef.current.setGeometries(geometries)

    // Fit bounds
    if (pickup && dropoff) {
      const bounds = new (window as any).TMap.LatLngBounds()
      bounds.extend(new (window as any).TMap.LatLng(pickup.lat, pickup.lng))
      bounds.extend(new (window as any).TMap.LatLng(dropoff.lat, dropoff.lng))
      mapInstance.current.fitBounds(bounds, { padding: 50 })
    } else if (pickup) {
      mapInstance.current.setCenter(new (window as any).TMap.LatLng(pickup.lat, pickup.lng))
    }
  }, [pickup, dropoff])

  return (
    <div ref={mapRef} style={{ height: '220px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
      {!pickup && !dropoff && (
        <div style={{ height: '100%', background: 'linear-gradient(135deg, #e8ecf1, #d4dde8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <Icons.Search />
          <span style={{ color: '#8e8e93', fontSize: '14px' }}>輸入地點顯示地圖</span>
        </div>
      )}
    </div>
  )
}

// Main App
function App() {
  const [page, setPage] = useState<'login' | 'home' | 'orders' | 'profile'>('login')
  const [pickup, setPickup] = useState<typeof LOCATIONS[0] | null>(null)
  const [dropoff, setDropoff] = useState<typeof LOCATIONS[0] | null>(null)
  const [priceData, setPriceData] = useState<ReturnType<typeof calculatePrice> | null>(null)
  const [user, setUser] = useState<{id: string, phone: string, role: string, name: string, points: number} | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auth effect
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fb) => {
      if (fb) {
        const d = await getDoc(doc(db, 'users', fb.uid))
        if (d.exists()) {
          const data = d.data()
          setUser({ id: fb.uid, phone: fb.email?.replace('@p7s.app', '') || '', role: data.role || 'passenger', name: data.name || '用戶', points: data.points || 0 })
          setPage('home')
        } else {
          setUser({ id: fb.uid, phone: fb.email?.replace('@p7s.app', '') || '', role: 'passenger', name: '新用戶', points: 0 })
          setPage('home')
        }
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  const handleLogin = async () => {
    setError('')
    setSubmitting(true)
    try {
      const r = await signInWithEmailAndPassword(auth, fmtEmail(phone), password)
      const d = await getDoc(doc(db, 'users', r.user.uid))
      if (d.exists()) {
        const data = d.data()
        setUser({ id: r.user.uid, phone, role: data.role || 'passenger', name: data.name || '用戶', points: data.points || 0 })
        setPage('home')
      }
    } catch (e: any) {
      setError(e.message || '登入失敗')
    }
    setSubmitting(false)
  }

  const handleRegister = async () => {
    if (!name) { setError('請輸入名稱'); return }
    setError('')
    setSubmitting(true)
    try {
      const r = await createUserWithEmailAndPassword(auth, fmtEmail(phone), password)
      await setDoc(doc(db, 'users', r.user.uid), { id: r.user.uid, phone, name, role, points: 0, createdAt: new Date().toISOString() })
      setUser({ id: r.user.uid, phone, role, name, points: 0 })
      setPage('home')
    } catch (e: any) {
      setError(e.message || '註冊失敗')
    }
    setSubmitting(false)
  }

  if (authLoading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#8e8e93'}}>載入中...</div>

  useEffect(() => {
    if (pickup && dropoff) {
      setPriceData(calculatePrice(pickup, dropoff))
    } else {
      setPriceData(null)
    }
  }, [pickup, dropoff])

  if (page === 'login' || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #1a1a2e, #2d2d4a)', boxShadow: '0 4px 15px rgba(26,26,46,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '28px', margin: '0 auto 16px' }}>C</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>Cabs</h1>
            <p style={{ fontSize: '12px', color: '#8e8e93', marginTop: '4px' }}>跨境商務出行</p>
          </div>
          <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
            <button onClick={() => setLoginMode('login')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: loginMode === 'login' ? 'white' : 'transparent', color: loginMode === 'login' ? '#1a1a2e' : '#8e8e93', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>登入</button>
            <button onClick={() => setLoginMode('register')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: loginMode === 'register' ? 'white' : 'transparent', color: loginMode === 'register' ? '#1a1a2e' : '#8e8e93', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>註冊</button>
          </div>
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1c1c1e', marginBottom: '20px' }}>{loginMode === 'login' ? '登入帳戶' : '建立帳戶'}</h2>
            {loginMode === 'register' && (
              <>
                <div style={{marginBottom:'16px'}}><label style={{fontSize:'11px',color:'#8e8e93'}}>名稱</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="你的名稱" style={{width:'100%',marginTop:'8px',padding:'14px 16px',background:'#f2f2f7',borderRadius:'12px',border:'none',fontSize:'16px'}}/></div>
                <div style={{marginBottom:'16px'}}><label style={{fontSize:'11px',color:'#8e8e93'}}>身份</label><div style={{display:'flex',gap:'8px',marginTop:'8px'}}><button type="button" onClick={()=>setRole('passenger')} style={{flex:1,padding:'12px',borderRadius:'12px',border:role==='passenger'?'2px solid #667eea':'2px solid #f2f2f7',background:role==='passenger'?'rgba(102,126,234,0.1)':'#f2f2f7',color:role==='passenger'?'#667eea':'#8e8e93',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>乘客</button><button type="button" onClick={()=>setRole('driver')} style={{flex:1,padding:'12px',borderRadius:'12px',border:role==='driver'?'2px solid #667eea':'2px solid #f2f2f7',background:role==='driver'?'rgba(102,126,234,0.1)':'#f2f2f7',color:role==='driver'?'#667eea':'#8e8e93',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>司機</button></div></div>
              </>
            )}
            <div style={{marginBottom:'16px'}}><label style={{fontSize:'11px',color:'#8e8e93'}}>手機號碼</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+852 1234 5678" style={{width:'100%',marginTop:'8px',padding:'14px 16px',background:'#f2f2f7',borderRadius:'12px',border:'none',fontSize:'16px'}}/></div>
            <div style={{marginBottom:'16px'}}><label style={{fontSize:'11px',color:'#8e8e93'}}>密碼</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="輸入密碼" style={{width:'100%',marginTop:'8px',padding:'14px 16px',background:'#f2f2f7',borderRadius:'12px',border:'none',fontSize:'16px'}}/></div>
            {error && <div style={{padding:'12px',background:'#fee2e2',borderRadius:'12px',color:'#dc2626',fontSize:'13px',marginBottom:'16px'}}>{error}</div>}
            <button onClick={loginMode==='login'?handleLogin:handleRegister} disabled={submitting} style={{width:'100%',padding:'16px',background:submitting?'#ccc':'linear-gradient(135deg, #667eea, #764ba2)',color:'white',border:'none',borderRadius:'14px',fontSize:'16px',fontWeight:600,cursor:submitting?'not-allowed':'pointer'}}>{submitting?'處理中...':(loginMode==='login'?'登入':'註冊')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <header style={{ background: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1a1a2e, #2d2d4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px' }}>C</div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>Cabs</span>
        </div>
      </header>

      <main style={{ padding: '20px', maxWidth: '420px', margin: '0 auto', paddingBottom: '100px' }}>
        {/* Tencent Map */}
        <TencentMap pickup={pickup || undefined} dropoff={dropoff || undefined} />

        {/* Booking Card */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '40px', height: '5px', background: '#d1d1d6', borderRadius: '3px', margin: '0 auto 20px' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#1c1c1e' }}>確認行程</span>
            {priceData && <span style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HK$ {priceData.price}</span>}
          </div>

          <LocationInput value={pickup?.name || ''} onSelect={setPickup} placeholder="上車地點" type="pickup" />
          <LocationInput value={dropoff?.name || ''} onSelect={setDropoff} placeholder="目的地" type="dropoff" />

          {/* Route Info */}
          {priceData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '12px' }}>
                <Icons.Clock />
                <span style={{ fontSize: '14px', color: '#1c1c1e' }}>{priceData.distance} km · 約 {priceData.duration} 分鐘</span>
              </div>
              {priceData.isCrossBorder && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(102,126,234,0.08)', borderRadius: '12px' }}>
                  <Icons.Car />
                  <span style={{ flex: 1, fontSize: '13px', color: '#667eea', fontWeight: 500 }}>跨境路線</span>
                  {priceData.toll > 0 && <span style={{ fontSize: '12px', color: '#92400e' }}>+HK$ {priceData.toll} 隧道費</span>}
                </div>
              )}
            </div>
          )}

          <button disabled={!pickup || !dropoff} style={{ width: '100%', padding: '16px', background: (!pickup || !dropoff) ? '#ccc' : 'linear-gradient(135deg, #1a1a2e, #2d2d4a)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, cursor: (!pickup || !dropoff) ? 'not-allowed' : 'pointer' }}>
            確認叫車
          </button>
        </div>
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '90px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '20px' }}>
        {[{ icon: Icons.Home, label: '首頁', key: 'home' }, { icon: Icons.Clipboard, label: '行程', key: 'orders' }, { icon: Icons.Message, label: '訊息', key: 'messages' }, { icon: Icons.User, label: '我的', key: 'profile' }].map(nav => (
          <button key={nav.key} onClick={() => setPage(nav.key as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', color: page === nav.key ? '#1a1a2e' : '#aeaeb2', borderRadius: '12px', backgroundColor: page === nav.key ? 'rgba(102,126,234,0.1)' : 'transparent' }}>
            <nav.icon />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{nav.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
