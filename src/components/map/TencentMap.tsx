import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    TMap: any
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
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const routeRef = useRef<any>(null)
  const initFailedRef = useRef(false)
  const [mapUnavailable, setMapUnavailable] = useState(false)

  useEffect(() => {
    if (!mapRef.current || !window.TMap || initFailedRef.current) return

    try {
      const center = pickup ? [pickup.lng, pickup.lat] : [114.0579, 22.5431]
      mapInstance.current = new window.TMap.Map(mapRef.current, {
        center: new window.TMap.LatLng(center[1], center[0]),
        zoom: 12,
        pitch: 0,
        rotation: 0,
      })

      markersRef.current = new window.TMap.MultiMarker({
        map: mapInstance.current,
        styles: {
          pickup: new window.TMap.MarkerStyle({
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
          dropoff: new window.TMap.MarkerStyle({
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

      routeRef.current = new window.TMap.MultiPolyline({
        map: mapInstance.current,
        styles: {
          route: new window.TMap.PolylineStyle({
            color: '#1e4f43',
            width: 6,
            borderWidth: 2,
            borderColor: '#ffffff',
            lineCap: 'round',
          }),
        },
        geometries: [],
      })

      setMapUnavailable(false)
    } catch (err) {
      initFailedRef.current = true
      setMapUnavailable(true)
      console.warn('TencentMap init failed:', err)
    }

    return () => {
      try {
        if (mapInstance.current) mapInstance.current.destroy()
      } catch (err) {
        console.warn('TencentMap destroy failed:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || initFailedRef.current) return

    try {
      const geometries: any[] = []

      if (pickup) {
        geometries.push({
          id: 'pickup',
          styleId: 'pickup',
          position: new window.TMap.LatLng(pickup.lat, pickup.lng),
          properties: { title: pickup.name },
        })
      }

      if (dropoff) {
        geometries.push({
          id: 'dropoff',
          styleId: 'dropoff',
          position: new window.TMap.LatLng(dropoff.lat, dropoff.lng),
          properties: { title: dropoff.name },
        })
      }

      markersRef.current.setGeometries(geometries)

      if (pickup && dropoff) {
        const bounds = new window.TMap.LatLngBounds()
        bounds.extend(new window.TMap.LatLng(pickup.lat, pickup.lng))
        bounds.extend(new window.TMap.LatLng(dropoff.lat, dropoff.lng))
        mapInstance.current.fitBounds(bounds, { padding: 50 })
      } else if (pickup) {
        mapInstance.current.setCenter(new window.TMap.LatLng(pickup.lat, pickup.lng))
        mapInstance.current.setZoom(15)
      } else if (dropoff) {
        mapInstance.current.setCenter(new window.TMap.LatLng(dropoff.lat, dropoff.lng))
        mapInstance.current.setZoom(15)
      }

      if (routeRef.current) {
        if (routePath && routePath.length >= 2) {
          routeRef.current.setGeometries([
            {
              id: 'route-main',
              styleId: 'route',
              paths: routePath.map((p) => new window.TMap.LatLng(p.lat, p.lng)),
            },
          ])
        } else {
          routeRef.current.setGeometries([])
        }
      }
    } catch (err) {
      console.warn('TencentMap update failed:', err)
      setMapUnavailable(true)
    }
  }, [pickup, dropoff, routePath])

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
