import { useEffect, useRef } from 'react'

interface Location {
  lat?: number
  lng?: number
  name?: string
}

interface TencentMapProps {
  pickup?: Location | null
  dropoff?: Location | null
  routePath?: Array<{ lat: number; lng: number }>
  height?: string
}

interface TMapMap {
  fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void
  destroy: () => void
}

interface TMapLatLngBounds {
  extend: (point: unknown) => void
}

interface TMapMarkerLayer {
  setGeometries: (geometries: MarkerGeometry[]) => void
}

interface TMapPolylineLayer {
  setGeometries: (geometries: PolylineGeometry[]) => void
}

interface MarkerGeometry {
  id: string
  styleId: 'pickup' | 'dropoff'
  position: unknown
  properties: {
    title: string
  }
}

interface PolylineGeometry {
  id: 'route'
  styleId: 'route'
  paths: unknown[]
}

interface TMapConstructor {
  Map: new (
    element: HTMLDivElement,
    options: { center: unknown; zoom: number; viewMode: '2D' | '3D' },
  ) => TMapMap
  LatLng: new (lat: number, lng: number) => unknown
  LatLngBounds: new () => TMapLatLngBounds
  MarkerStyle: new (options: Record<string, unknown>) => unknown
  PolylineStyle: new (options: Record<string, unknown>) => unknown
  MultiMarker: new (options: {
    map: TMapMap
    styles: Record<string, unknown>
    geometries: MarkerGeometry[]
  }) => TMapMarkerLayer
  MultiPolyline: new (options: {
    map: TMapMap
    styles: Record<string, unknown>
    geometries: PolylineGeometry[]
  }) => TMapPolylineLayer
}

type WindowWithTMap = Window & { TMap?: TMapConstructor }

const TENCENT_MAP_KEY = 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'
const PI = Math.PI
const EARTH_A = 6378245.0
const EARTH_EE = Number.parseFloat('0.00669342162296594323')

const getTMap = (): TMapConstructor | null => {
  if (typeof window === 'undefined') return null
  return (window as WindowWithTMap).TMap || null
}

// Convert WGS84 to GCJ02
const wgs84ToGcj02 = (lng: number, lat: number) => {
  if ((lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271)) {
    return { lat, lng }
  }

  let dlat = (lng - 105.0) * PI * 3000.0 / 180.0
  let dlng = (lat - 35.0) * PI * 3000.0 / 180.0

  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - EARTH_EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)

  dlat = (dlat * 180.0) / ((EARTH_A * (1 - EARTH_EE)) / (magic * sqrtmagic) * PI)
  dlng = (dlng * 180.0) / (EARTH_A / sqrtmagic * Math.cos(radlat) * PI)

  return { lat: lat + dlat, lng: lng + dlng }
}

// Load Tencent SDK
const loadTencentSDK = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (getTMap()?.Map) return Promise.resolve(true)

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}`
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export default function TencentMap({ pickup, dropoff, routePath, height = '400px' }: TencentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<TMapMap | null>(null)
  const markersRef = useRef<TMapMarkerLayer | null>(null)
  const polylineRef = useRef<TMapPolylineLayer | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!mapRef.current) return

      const loaded = await loadTencentSDK()
      if (!mounted || !loaded || !mapRef.current) return

      const T = getTMap()
      if (!T) return

      try {
        mapInstance.current = new T.Map(mapRef.current, {
          center: new T.LatLng(22.3193, 114.1694),
          zoom: 11,
          viewMode: '2D',
        })

        markersRef.current = new T.MultiMarker({
          map: mapInstance.current,
          styles: {
            pickup: new T.MarkerStyle({
              width: 30,
              height: 40,
              anchor: { x: 15, y: 36 },
              src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
            }),
            dropoff: new T.MarkerStyle({
              width: 30,
              height: 40,
              anchor: { x: 15, y: 36 },
              src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
            }),
          },
          geometries: [],
        })

        polylineRef.current = new T.MultiPolyline({
          map: mapInstance.current,
          styles: {
            route: new T.PolylineStyle({
              color: '#1e4f43',
              width: 6,
              borderWidth: 2,
              borderColor: '#ffffff',
              lineCap: 'round',
              lineJoin: 'round',
            }),
          },
          geometries: [],
        })
      } catch (error) {
        console.error('TencentMap init error:', error)
      }
    }

    void init()

    return () => {
      mounted = false
      if (mapInstance.current) {
        try {
          mapInstance.current.destroy()
        } catch (cleanupError) {
          console.error('TencentMap destroy error:', cleanupError)
        } finally {
          mapInstance.current = null
          markersRef.current = null
          polylineRef.current = null
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || !polylineRef.current) return

    const T = getTMap()
    if (!T) return

    const markerGeometries: MarkerGeometry[] = []
    const bounds = new T.LatLngBounds()

    if (pickup) {
      const gcj = wgs84ToGcj02(pickup.lng, pickup.lat)
      const position = new T.LatLng(gcj.lat, gcj.lng)
      markerGeometries.push({
        id: 'pickup',
        styleId: 'pickup',
        position,
        properties: { title: pickup.name },
      })
      bounds.extend(position)
    }

    if (dropoff) {
      const gcj = wgs84ToGcj02(dropoff.lng, dropoff.lat)
      const position = new T.LatLng(gcj.lat, gcj.lng)
      markerGeometries.push({
        id: 'dropoff',
        styleId: 'dropoff',
        position,
        properties: { title: dropoff.name },
      })
      bounds.extend(position)
    }

    markersRef.current.setGeometries(markerGeometries)

    const routePoints = routePath && routePath.length >= 2
      ? routePath
      : pickup && dropoff
        ? [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: dropoff.lat, lng: dropoff.lng },
          ]
        : []

    if (routePoints.length >= 2) {
      const gcjPath = routePoints.map((point) => {
        const gcj = wgs84ToGcj02(point.lng, point.lat)
        const latLngPoint = new T.LatLng(gcj.lat, gcj.lng)
        bounds.extend(latLngPoint)
        return latLngPoint
      })

      polylineRef.current.setGeometries([
        {
          id: 'route',
          styleId: 'route',
          paths: [gcjPath],
        },
      ])
    } else {
      polylineRef.current.setGeometries([])
    }

    if (markerGeometries.length > 0 || routePoints.length >= 2) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [pickup, dropoff, routePath])

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
