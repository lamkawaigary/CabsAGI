import { useCallback, useEffect, useRef, useState } from 'react'
import OSMMap from './OSMMap'

// Tencent Map API Key
const TENCENT_MAP_KEY = 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'

// SDK Loader
const loadTencentSDK = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.TMap && window.TMap.Map) return Promise.resolve(true)
  
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}`
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

interface TMapMap {
  destroy: () => void
  fitBounds: (bounds: unknown, options?: { padding: number }) => void
  setCenter: (latLng: unknown) => void
  setZoom: (zoom: number) => void
}

interface TMapMultiMarker {
  setGeometries: (geometries: MarkerGeometry[]) => void
}

interface TMapMultiPolyline {
  setGeometries: (geometries: PolylineGeometry[]) => void
}

interface TMapLatLngBounds {
  extend: (latLng: unknown) => void
}

interface MarkerGeometry {
  id: 'pickup' | 'dropoff'
  styleId: 'pickup' | 'dropoff'
  position: unknown
  properties: { title: string }
}

interface PolylineGeometry {
  id: string
  styleId: 'route'
  paths: unknown[]
}

interface TMapSDK {
  Map: new (
    container: HTMLDivElement,
    options: {
      center: unknown
      zoom: number
      pitch: number
      rotation: number
    },
  ) => TMapMap
  LatLng: new (lat: number, lng: number) => unknown
  MultiMarker: new (options: {
    map: TMapMap
    styles: Record<string, unknown>
    geometries: MarkerGeometry[]
  }) => TMapMultiMarker
  MarkerStyle: new (options: Record<string, unknown>) => unknown
  MultiPolyline: new (options: {
    map: TMapMap
    styles: Record<string, unknown>
    geometries: PolylineGeometry[]
  }) => TMapMultiPolyline
  PolylineStyle: new (options: Record<string, unknown>) => unknown
  LatLngBounds: new () => TMapLatLngBounds
}

declare global {
  interface Window {
    TMap?: TMapSDK
  }
}

interface Location {
  lat: number
  lng: number
  name: string
}

interface TencentMapProps {
  pickup?: Location | null
  dropoff?: Location | null
  routePath?: Array<{ lat: number; lng: number }>
  height?: string
}

export default function TencentMap({ pickup, dropoff, routePath, height = '400px' }: TencentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<TMapMap | null>(null)
  const markersRef = useRef<TMapMultiMarker | null>(null)
  const routeRef = useRef<TMapMultiPolyline | null>(null)
  const initFailedRef = useRef(false)
  const [mapUnavailable, setMapUnavailable] = useState(false)

  const markUnavailable = useCallback(() => {
    queueMicrotask(() => setMapUnavailable(true))
  }, [])

  // Load SDK and initialize map
  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!mapRef.current || initFailedRef.current) return
      
      // Load SDK first
      const loaded = await loadTencentSDK()
      if (!mounted || !loaded) {
        markUnavailable()
        return
      }

      const tmap = window.TMap
      if (!tmap || !mapRef.current) {
        markUnavailable()
        return
      }

      try {
      const defaultCenter = [114.0579, 22.5431] as const
      mapInstance.current = new tmap.Map(mapRef.current, {
        center: new tmap.LatLng(defaultCenter[1], defaultCenter[0]),
        zoom: 12,
        pitch: 0,
        rotation: 0,
      })

      markersRef.current = new tmap.MultiMarker({
        map: mapInstance.current,
        styles: {
          pickup: new tmap.MarkerStyle({
            width: 40,
            height: 50,
            anchor: { x: 20, y: 45 },
            src: 'data:image/svg+xml;base64,' +
              btoa(`
            <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.9 0 0 8.9 0 20c0 15 20 30 20 30s20-15 20-30C40 8.9 31.1 0 20 0z" fill="#667eea"/>
              <circle cx="20" cy="18" r="8" fill="white"/>
              <text x="20" y="22" text-anchor="middle" font-size="10" fill="#667eea" font-weight="bold">上</text>
            </svg>
          `),
          }),
          dropoff: new tmap.MarkerStyle({
            width: 40,
            height: 50,
            anchor: { x: 20, y: 45 },
            src: 'data:image/svg+xml;base64,' +
              btoa(`
            <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.9 0 0 8.9 0 20c0 15 20 30 20 30s20-15 20-30C40 8.9 31.1 0 20 0z" fill="#f5576c"/>
              <circle cx="20" cy="18" r="8" fill="white"/>
              <text x="20" y="22" text-anchor="middle" font-size="10" fill="#f5576c" font-weight="bold">落</text>
            </svg>
          `),
          }),
        },
        geometries: [],
      })

      routeRef.current = new tmap.MultiPolyline({
        map: mapInstance.current,
        styles: {
          route: new tmap.PolylineStyle({
            color: '#1e4f43',
            width: 10,
            borderWidth: 4,
            borderColor: '#ffffff',
            lineCap: 'round',
            lineJoin: 'round',
          }),
        },
        geometries: [],
      })
    } catch (err) {
      initFailedRef.current = true
      markUnavailable()
      console.warn('TencentMap init failed:', err)
    }

    return () => {
      mounted = false
      try {
        if (mapInstance.current) mapInstance.current.destroy()
        mapInstance.current = null
        markersRef.current = null
        routeRef.current = null
      } catch (err) {
        console.warn('TencentMap destroy failed:', err)
      }
    }
  }, [markUnavailable])

  useEffect(() => {
    const tmap = window.TMap
    if (!mapInstance.current || !markersRef.current || !tmap || initFailedRef.current) return

    try {
      const geometries: MarkerGeometry[] = []

      if (pickup) {
        geometries.push({
          id: 'pickup',
          styleId: 'pickup',
          position: new tmap.LatLng(pickup.lat, pickup.lng),
          properties: { title: pickup.name },
        })
      }

      if (dropoff) {
        geometries.push({
          id: 'dropoff',
          styleId: 'dropoff',
          position: new tmap.LatLng(dropoff.lat, dropoff.lng),
          properties: { title: dropoff.name },
        })
      }

      markersRef.current.setGeometries(geometries)

      if (pickup && dropoff) {
        const bounds = new tmap.LatLngBounds()
        bounds.extend(new tmap.LatLng(pickup.lat, pickup.lng))
        bounds.extend(new tmap.LatLng(dropoff.lat, dropoff.lng))
        mapInstance.current.fitBounds(bounds, { padding: 50 })
      } else if (pickup) {
        mapInstance.current.setCenter(new tmap.LatLng(pickup.lat, pickup.lng))
        mapInstance.current.setZoom(15)
      } else if (dropoff) {
        mapInstance.current.setCenter(new tmap.LatLng(dropoff.lat, dropoff.lng))
        mapInstance.current.setZoom(15)
      }

      if (routeRef.current) {
        if (routePath && routePath.length >= 2) {
          routeRef.current.setGeometries([
            {
              id: 'route-main',
              styleId: 'route',
              paths: routePath.map((p) => new tmap.LatLng(p.lat, p.lng)),
            },
          ])
        } else {
          routeRef.current.setGeometries([])
        }
      }
    } catch (err) {
      console.warn('TencentMap update failed:', err)
      markUnavailable()
    }
  }, [pickup, dropoff, routePath, markUnavailable])

  if (mapUnavailable) {
    // Fallback to OpenStreetMap when Tencent fails
    return <OSMMap pickup={pickup} dropoff={dropoff} routePath={routePath} height={height} />
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    />
  )
}
