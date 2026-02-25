import { useCallback, useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    const tmap = window.TMap
    if (!mapRef.current || !tmap || initFailedRef.current) return

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
            width: 25,
            height: 35,
            anchor: { x: 16, y: 32 },
            src: 'data:image/svg+xml;base64,' +
              btoa(`
            <svg width="25" height="35" viewBox="0 0 25 35" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.3 12.5 22.5 12.5 22.5s12.5-12.2 12.5-22.5C25 5.6 19.4 0 12.5 0z" fill="#667eea"/>
              <circle cx="12.5" cy="12.5" r="6" fill="white"/>
            </svg>
          `),
          }),
          dropoff: new tmap.MarkerStyle({
            width: 25,
            height: 35,
            anchor: { x: 16, y: 32 },
            src: 'data:image/svg+xml;base64,' +
              btoa(`
            <svg width="25" height="35" viewBox="0 0 25 35" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.3 12.5 22.5 12.5 22.5s12.5-12.2 12.5-22.5C25 5.6 19.4 0 12.5 0z" fill="#f5576c"/>
              <circle cx="12.5" cy="12.5" r="6" fill="white"/>
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
            width: 6,
            borderWidth: 2,
            borderColor: '#ffffff',
            lineCap: 'round',
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
    return (
      <div
        style={{
          width: '100%',
          height,
          borderRadius: '16px',
          border: '1px solid #dce6dd',
          background: '#f6faf8',
          color: '#5b726b',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
        }}
      >
        地圖暫時不可用，但訂單與頁面功能正常。
      </div>
    )
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
