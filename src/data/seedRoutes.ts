import { db } from '../firebaseConfig'
import { collection, addDoc } from 'firebase/firestore'

const sampleRoutes = [
  {
    name: '香港機場 ↔ 銅鑼灣',
    description: '機場往返銅鑼灣市中心，方便快捷',
    type: 'AIRPORT',
    origin: { name: '香港機場', address: '香港國際機場', latitude: 22.3080, longitude: 113.9185, sequence: 0 },
    destination: { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 1 },
    stops: [
      { name: '香港機場', address: '香港國際機場', latitude: 22.3080, longitude: 113.9185, sequence: 0 },
      { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 1 }
    ],
    price: 250,
    originalPrice: 300,
    duration: 45,
    distance: 40,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '香港機場 ↔ 尖沙咀',
    description: '機場往返尖沙咀商業區',
    type: 'AIRPORT',
    origin: { name: '香港機場', address: '香港國際機場', latitude: 22.3080, longitude: 113.9185, sequence: 0 },
    destination: { name: '尖沙咀', address: '尖沙咀海港城', latitude: 22.2950, longitude: 114.1688, sequence: 1 },
    stops: [
      { name: '香港機場', address: '香港國際機場', latitude: 22.3080, longitude: 113.9185, sequence: 0 },
      { name: '尖沙咀', address: '尖沙咀海港城', latitude: 22.2950, longitude: 114.1688, sequence: 1 }
    ],
    price: 220,
    originalPrice: 280,
    duration: 40,
    distance: 35,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '深圳灣口岸 ↔ 銅鑼灣',
    description: '跨境直通，經深圳灣口岸往返香港市區',
    type: 'CROSS_BORDER',
    origin: { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 0 },
    destination: { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 1 },
    stops: [
      { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 0 },
      { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 1 }
    ],
    price: 350,
    originalPrice: 400,
    duration: 90,
    distance: 55,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '深圳灣口岸 ↔ 中環',
    description: '跨境直通至香港商業中心',
    type: 'CROSS_BORDER',
    origin: { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 0 },
    destination: { name: '中環', address: '中環置地廣場', latitude: 22.2818, longitude: 114.1587, sequence: 1 },
    stops: [
      { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 0 },
      { name: '中環', address: '中環置地廣場', latitude: 22.2818, longitude: 114.1587, sequence: 1 }
    ],
    price: 380,
    duration: 95,
    distance: 60,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '市區 ↔ 迪士尼樂園',
    description: '家庭出遊首選，去程朝早，回程晚間',
    type: 'THEME_PARK',
    origin: { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 0 },
    destination: { name: '迪士尼樂園', address: '大嶼山迪士尼樂園', latitude: 22.3129, longitude: 114.0436, sequence: 1 },
    stops: [
      { name: '銅鑼灣', address: '銅鑼灣時代廣場', latitude: 22.2783, longitude: 114.1822, sequence: 0 },
      { name: '迪士尼樂園', address: '大嶼山迪士尼樂園', latitude: 22.3129, longitude: 114.0436, sequence: 1 }
    ],
    price: 120,
    originalPrice: 150,
    duration: 50,
    distance: 30,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '市區 ↔ 海洋公園',
    description: '方便快捷直達海洋公園',
    type: 'THEME_PARK',
    origin: { name: '尖沙咀', address: '尖沙咀海港城', latitude: 22.2950, longitude: 114.1688, sequence: 0 },
    destination: { name: '海洋公園', address: '香港島黃竹坑道180號', latitude: 22.2460, longitude: 114.1741, sequence: 1 },
    stops: [
      { name: '尖沙咀', address: '尖沙咀海港城', latitude: 22.2950, longitude: 114.1688, sequence: 0 },
      { name: '海洋公園', address: '香港島黃竹坑道180號', latitude: 22.2460, longitude: 114.1741, sequence: 1 }
    ],
    price: 80,
    duration: 25,
    distance: 15,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '演唱會散場 ↔ 深圳灣口岸',
    description: '深夜演唱會跨境快線',
    type: 'EVENT',
    origin: { name: '亞洲國際博覽館', address: '大嶼山機場博覽館', latitude: 22.2974, longitude: 113.9356, sequence: 0 },
    destination: { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 1 },
    stops: [
      { name: '亞洲國際博覽館', address: '大嶼山機場博覽館', latitude: 22.2974, longitude: 113.9356, sequence: 0 },
      { name: '深圳灣口岸', address: '深圳市南山區深圳灣口岸', latitude: 22.4708, longitude: 113.9065, sequence: 1 }
    ],
    price: 280,
    duration: 60,
    distance: 40,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  },
  {
    name: '演唱會散場 ↔ 廣州',
    description: '演唱會後直通廣州',
    type: 'EVENT',
    origin: { name: '亞洲國際博覽館', address: '大嶼山機場博覽館', latitude: 22.2974, longitude: 113.9356, sequence: 0 },
    destination: { name: '廣州市區', address: '廣州市天河區', latitude: 23.1291, longitude: 113.2644, sequence: 1 },
    stops: [
      { name: '亞洲國際博覽館', address: '大嶼山機場博覽館', latitude: 22.2974, longitude: 113.9356, sequence: 0 },
      { name: '廣州市區', address: '廣州市天河區', latitude: 23.1291, longitude: 113.2644, sequence: 1 }
    ],
    price: 450,
    duration: 120,
    distance: 100,
    status: 'ACTIVE',
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  }
]

export async function seedRoutes() {
  const routesRef = collection(db, 'routes')
  
  for (const route of sampleRoutes) {
    await addDoc(routesRef, route)
    console.log(`Added: ${route.name}`)
  }
  
  console.log('All routes seeded!')
}

// Run if called directly - add ?seed=true to URL
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('seed') === 'true') {
    seedRoutes().then(() => {
      alert('Routes seeded!')
    })
  }
}
