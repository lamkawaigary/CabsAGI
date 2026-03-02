import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
import L from 'leaflet'

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Location {
  lat: number
  lng: number
  name: string
}

interface OSMMapProps {
  pickup?: Location | null
  dropoff?: Location | null
  routePath?: Array<{ lat: number; lng: number }>
  height?: string
}

export default function OSMMap({ pickup, dropoff, routePath, height = '400px' }: OSMMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([22.3193, 114.1694], 12) // Hong Kong default

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    markersLayer.current = L.layerGroup().addTo(mapInstance.current)
    routeLayer.current = L.layerGroup().addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Update markers
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return

    markersLayer.current.clearLayers()

    const bounds: L.LatLngBoundsExpression = []

    if (pickup) {
      const marker = L.marker([pickup.lat, pickup.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background: #667eea;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">上</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        }),
      }).bindPopup(pickup.name)
      markersLayer.current?.addLayer(marker)
      bounds.push([pickup.lat, pickup.lng])
    }

    if (dropoff) {
      const marker = L.marker([dropoff.lat, dropoff.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background: #f5576c;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">落</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        }),
      }).bindPopup(dropoff.name)
      markersLayer.current?.addLayer(marker)
      bounds.push([dropoff.lat, dropoff.lng])
    }

    // Fit bounds
    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [pickup, dropoff])

  // Update route
  useEffect(() => {
    if (!mapInstance.current || !routeLayer.current) return

    routeLayer.current.clearLayers()

    if (routePath && routePath.length >= 2) {
      const latlngs = routePath.map(p => [p.lat, p.lng] as L.LatLngTuple)
      
      L.polyline(latlngs, {
        color: '#1e4f43',
        weight: 6,
        opacity: 0.8,
      }).addTo(routeLayer.current)

      // Fit route in view
      const bounds = L.latLngBounds(latlngs)
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [routePath])

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        zIndex: 0,
      }}
    />
  )
}
