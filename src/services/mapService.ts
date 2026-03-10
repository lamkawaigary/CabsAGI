
import { LocationData, Region } from "../types";
import { STATIC_LOCATIONS } from "../data/staticLocations";

// --- GLOBAL TYPES & DECLARATIONS ---
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
    _amapLoaderPromise?: Promise<boolean>;
    google: any; // Google Maps Global
    _googleLoaderPromise?: Promise<boolean>;
    gm_authFailure?: () => void;
    TMap: any; // Tencent Maps Global
    _tmapLoaderPromise?: Promise<boolean>;
  }
}

export type MapProvider = 'GOOGLE' | 'TENCENT' | 'AMAP' | 'OSM' | 'AUTO';
export type CoordsSystem = 'WGS84' | 'GCJ02';

let isGoogleMapsBroken = false;

export interface SearchOptions {
    radius?: number; // meters
    center?: { lat: number; lng: number };
    strictBounds?: boolean;
}

// ============================================================================
// PART 1: MATH & COORDINATE UTILITIES (The Foundation)
// ============================================================================

const PI = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function transformLat(x: number, y: number) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformLon(x: number, y: number) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

function out_of_china(lng: number, lat: number) {
    // HK & Macau are considered "Inside China" for map shifting purposes relative to global standards
    return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271));
}

/**
 * GCJ-02 (Mars Coordinates) to WGS-84 (Global Standard)
 * Use this when receiving data FROM Tencent/AMap API before storing in DB.
 */
export const gcj02_to_wgs84 = (lng: number, lat: number) => {
    if (out_of_china(lng, lat)) return { lat, lng };
    let dlat = transformLat(lng - 105.0, lat - 35.0);
    let dlng = transformLon(lng - 105.0, lat - 35.0);
    let radlat = lat / 180.0 * PI;
    let magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    let sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    return { lat: lat * 2 - (lat + dlat), lng: lng * 2 - (lng + dlng) };
};

/**
 * WGS-84 to GCJ-02
 * Use this when sending App data (WGS84) TO Tencent/AMap API.
 */
export const wgs84_to_gcj02 = (lng: number, lat: number) => {
    if (out_of_china(lng, lat)) return { lat, lng };
    let dlat = transformLat(lng - 105.0, lat - 35.0);
    let dlng = transformLon(lng - 105.0, lat - 35.0);
    let radlat = lat / 180.0 * PI;
    let magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    let sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    return { lat: lat + dlat, lng: lng + dlng };
};

// Standard Haversine Distance
function deg2rad(deg: number) { return deg * (Math.PI/180); }
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; 
    var dLat = deg2rad(lat2-lat1);
    var dLon = deg2rad(lon2-lon1); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

// ============================================================================
// PART 2: SDK LOADERS (Initialization)
// ============================================================================

export const loadTencentSDK = (key: string): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.TMap && window.TMap.service) return Promise.resolve(true);
    if (window._tmapLoaderPromise) return window._tmapLoaderPromise;

    const loaderPromise = new Promise<boolean>((resolve) => {
        // console.log("[MapService] Loading Tencent Maps SDK...");
        const script = document.createElement('script');
        script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=service`;
        script.async = true;
        script.onload = () => {
            // console.log("[MapService] Tencent SDK Loaded.");
            resolve(true);
        };
        script.onerror = () => { 
            console.warn("[MapService] Tencent SDK Failed.");
            window._tmapLoaderPromise = undefined; 
            resolve(false); 
        };
        document.head.appendChild(script);
    });
    window._tmapLoaderPromise = loaderPromise;
    return loaderPromise;
};

export const loadGoogleMapsSDK = (key: string): Promise<boolean> => {
    if (isGoogleMapsBroken || !key) return Promise.resolve(false);
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve(true);
    if (window._googleLoaderPromise) return window._googleLoaderPromise;

    if (!(window as any).gm_authFailure) {
        (window as any).gm_authFailure = () => {
            console.error("Google Maps Auth Failed");
            isGoogleMapsBroken = true;
        };
    }

    const loaderPromise = new Promise<boolean>((resolve) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&language=zh-HK`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(true);
        script.onerror = () => { 
            window._googleLoaderPromise = undefined; 
            isGoogleMapsBroken = true; 
            resolve(false); 
        };
        document.head.appendChild(script);
    });
    window._googleLoaderPromise = loaderPromise;
    return loaderPromise;
};

export const loadAMapSDK = (key: string, securityCode?: string): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    try {
        if (!(window as any)._AMapSecurityConfig) {
            (window as any)._AMapSecurityConfig = { securityJsCode: securityCode || '' };
        }
    } catch(e) {}
    
    if (window.AMap && window.AMap.Driving && window.AMap.AutoComplete) return Promise.resolve(true);
    if (window._amapLoaderPromise) return window._amapLoaderPromise;

    const loaderPromise = new Promise<boolean>((resolve) => {
        const callbackName = `_amap_init_${Math.random().toString(36).slice(2)}`;
        (window as any)[callbackName] = () => { delete (window as any)[callbackName]; resolve(true); };
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Driving,AMap.AutoComplete&callback=${callbackName}`;
        script.onerror = () => { 
            window._amapLoaderPromise = undefined; 
            resolve(false); 
        };
        document.head.appendChild(script);
    });
    window._amapLoaderPromise = loaderPromise;
    return loaderPromise;
};

// ============================================================================
// PART 3: URL GENERATORS (Iframe Visualization)
// ============================================================================

export const generateOSMUrl = (lat: number, lng: number, popupText?: string, coordsType: CoordsSystem = 'WGS84') => {
    let wgs = { lat, lng };
    if (coordsType === 'GCJ02') wgs = gcj02_to_wgs84(lng, lat);
    const delta = 0.008; 
    const bbox = `${wgs.lng - delta},${wgs.lat - delta},${wgs.lng + delta},${wgs.lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${wgs.lat},${wgs.lng}`;
};

export const generateGoogleMapUrl = (lat: number, lng: number, apiKey: string, coordsType: CoordsSystem = 'WGS84') => {
    if (isGoogleMapsBroken) return generateOSMUrl(lat, lng, undefined, coordsType);
    let wgs = { lat, lng };
    if (coordsType === 'GCJ02') wgs = gcj02_to_wgs84(lng, lat);
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${wgs.lat},${wgs.lng}&zoom=15&language=zh-HK`;
};

export const generateTencentMapUrl = (lat: number, lng: number, apiKey: string, label: string = 'Location', coordsType: CoordsSystem = 'WGS84') => {
    let gcj = { lat, lng };
    if (coordsType === 'WGS84') gcj = wgs84_to_gcj02(lng, lat);
    return `https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${gcj.lat},${gcj.lng};title:${encodeURIComponent(label)};addr:${encodeURIComponent(label)}&key=${apiKey}&referer=P7S`;
};

export const generateTencentRouteUrl = (
    start: { lat: number, lng: number, name?: string },
    end: { lat: number, lng: number, name?: string },
    apiKey: string,
    coordsType: CoordsSystem = 'WGS84'
) => {
    let s = { lat: start.lat, lng: start.lng };
    let e = { lat: end.lat, lng: end.lng };
    if (coordsType === 'WGS84') {
        s = wgs84_to_gcj02(start.lng, start.lat);
        e = wgs84_to_gcj02(end.lng, end.lat);
    }
    return `https://apis.map.qq.com/tools/routeplan?type=drive&from=${encodeURIComponent(start.name||'Start')}&fromcoord=${s.lat},${s.lng}&to=${encodeURIComponent(end.name||'End')}&tocoord=${e.lat},${e.lng}&policy=1&coord_type=5&referer=P7S&key=${apiKey}`;
};

export const generateAMapRouteUrl = (
    start: { lat: number, lng: number, name?: string },
    end: { lat: number, lng: number, name?: string },
    coordsType: CoordsSystem = 'WGS84'
) => {
    let s = { lat: start.lat, lng: start.lng };
    let e = { lat: end.lat, lng: end.lng };
    if (coordsType === 'WGS84') {
        s = wgs84_to_gcj02(start.lng, start.lat);
        e = wgs84_to_gcj02(end.lng, end.lat);
    }
    return `https://uri.amap.com/navigation?from=${s.lng},${s.lat},${encodeURIComponent(start.name||'Start')}&to=${e.lng},${e.lat},${encodeURIComponent(end.name||'End')}&mode=car&policy=1&src=P7S&coordinate=gaode&callnative=0`;
};

export const generateAMapMarkerUrl = (lat: number, lng: number, name: string = 'Location', coordsType: CoordsSystem = 'WGS84') => {
    let gcj = { lat, lng };
    if (coordsType === 'WGS84') gcj = wgs84_to_gcj02(lng, lat);
    return `https://uri.amap.com/marker?position=${gcj.lng},${gcj.lat}&name=${encodeURIComponent(name)}&src=P7S&coordinate=gaode&callnative=0`;
};

// Legacy Generator (Backward Compatibility)
export const generateMapUrl = (arg1: any, arg2: any, arg3: any = 'GOOGLE', arg4: any = {}): string => {
    try {
        if (typeof arg1 === 'number' && typeof arg2 === 'number') {
            return generateGoogleMapUrl(arg1, arg2, typeof arg3 === 'string' ? arg3 : '', typeof arg4 === 'string' ? arg4 as CoordsSystem : 'WGS84');
        }
        // Fallback for legacy signature
        const apiKey = String(arg2);
        const params = arg4 || {};
        if (arg3 === 'TENCENT' && params.center) return generateTencentMapUrl(params.center.lat, params.center.lng, apiKey, 'Location', 'WGS84');
        return generateGoogleMapUrl(params.center?.lat || 22.3, params.center?.lng || 114.1, apiKey);
    } catch (e) { return ""; }
};

// ============================================================================
// PART 4: INTERNAL IMPLEMENTATIONS (Specific Providers)
// ============================================================================

// Internal: Google Search
const _searchGoogle = async (query: string, key: string, options?: SearchOptions): Promise<LocationData[]> => {
    try {
        if (isGoogleMapsBroken) return [];
        await loadGoogleMapsSDK(key);
        if (!window.google?.maps?.places) return [];

        return new Promise((resolve) => {
            const service = new window.google.maps.places.PlacesService(document.createElement('div'));
            const request: any = { query: query };
            if (options?.center && options?.radius) {
                request.location = new window.google.maps.LatLng(options.center.lat, options.center.lng);
                request.radius = options.radius;
            } else {
                request.bounds = new window.google.maps.LatLngBounds(
                    new window.google.maps.LatLng(21.8, 112.5),
                    new window.google.maps.LatLng(23.5, 115.0)
                );
            }
            service.textSearch(request, (results: any[], status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    // Google returns WGS84 by default, no conversion needed
                    resolve(results.map(place => ({
                        placeName: place.name || 'Unknown',
                        address: place.formatted_address || '',
                        latitude: typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat,
                        longitude: typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng,
                        uri: "",
                        provider: 'GOOGLE'
                    })));
                } else resolve([]);
            });
        });
    } catch (e) { return []; }
};

// Internal: Tencent Search (Auto-converts GCJ02 -> WGS84 for App)
const _searchTencent = async (query: string, key: string): Promise<LocationData[]> => {
    try {
        await loadTencentSDK(key);
        if (!window.TMap || !window.TMap.service) return [];
        
        return new Promise((resolve) => {
            const suggest = new window.TMap.service.Suggestion({ pageSize: 10, region: '深圳' });
            suggest.getSuggestions({ keyword: query })
                .then((res: any) => {
                    if (res && res.data) {
                        const locs = res.data.map((item: any) => {
                            // Tencent returns GCJ02. Convert to WGS84 for app storage.
                            const wgs = gcj02_to_wgs84(item.location.lng, item.location.lat);
                            return {
                                placeName: item.title,
                                address: item.address,
                                latitude: wgs.lat,
                                longitude: wgs.lng,
                                uri: ""
                            };
                        });
                        resolve(locs);
                    } else resolve([]);
                })
                .catch(() => resolve([]));
        });
    } catch (e) { return []; }
};

// Internal: AMap Search (Auto-converts GCJ02 -> WGS84 for App)
const _searchAMap = async (query: string, key: string, securityCode?: string): Promise<LocationData[]> => {
    try {
        await loadAMapSDK(key, securityCode);
        if (!window.AMap?.AutoComplete) return [];
        
        return new Promise((resolve) => {
            new window.AMap.AutoComplete({ city: '全国' }).search(query, (status: string, result: any) => {
                if (status === 'complete' && result.tips) {
                    const locs = result.tips.filter((t: any) => t.id && t.location).map((t: any) => {
                        // AMap returns GCJ02. Convert to WGS84.
                        const wgs = gcj02_to_wgs84(t.location.lng, t.location.lat);
                        return {
                            placeName: t.name,
                            address: t.district || t.name,
                            latitude: wgs.lat,
                            longitude: wgs.lng,
                            uri: ""
                        };
                    });
                    resolve(locs);
                } else resolve([]);
            });
        });
    } catch (e) { return []; }
};

// Internal: Tencent Route (Inputs WGS84 -> Converts to GCJ02 for API)
const _calculateTencentRoute = async (origin: {lat: number, lng: number}, dest: {lat: number, lng: number}, key: string): Promise<{distanceKm: number, duration: string}> => {
    try {
        await loadTencentSDK(key);
        if (!window.TMap || !window.TMap.service) return { distanceKm: 0, duration: '' };
        
        // App coordinates are WGS84. Convert to GCJ02 for Tencent API.
        const startGCJ = wgs84_to_gcj02(origin.lng, origin.lat);
        const endGCJ = wgs84_to_gcj02(dest.lng, dest.lat);

        return new Promise((resolve) => {
            const driving = new window.TMap.service.Driving();
            driving.search({ 
                from: new window.TMap.LatLng(startGCJ.lat, startGCJ.lng), 
                to: new window.TMap.LatLng(endGCJ.lat, endGCJ.lng) 
            }).then((result: any) => {
                if (result && result.result?.routes?.length > 0) {
                    const route = result.result.routes[0];
                    resolve({ 
                        distanceKm: parseFloat((route.distance / 1000).toFixed(1)), 
                        duration: `${Math.ceil(route.duration / 60)} mins`
                    });
                } else resolve({ distanceKm: 0, duration: '' });
            }).catch(() => resolve({ distanceKm: 0, duration: '' }));
        });
    } catch (e) { return { distanceKm: 0, duration: '' }; }
};

// Internal: AMap Route (Inputs WGS84 -> Converts to GCJ02 for API)
const _calculateAMapRoute = async (origin: {lat: number, lng: number}, dest: {lat: number, lng: number}, key: string, securityCode?: string): Promise<{distanceKm: number, duration: string}> => {
    try {
        await loadAMapSDK(key, securityCode);
        if (!window.AMap || !window.AMap.Driving) return { distanceKm: 0, duration: '' };

        // App coordinates are WGS84. Convert to GCJ02 for AMap API.
        const startGCJ = wgs84_to_gcj02(origin.lng, origin.lat);
        const endGCJ = wgs84_to_gcj02(dest.lng, dest.lat);

        return new Promise((resolve) => {
            window.AMap.plugin('AMap.Driving', function() {
                const driving = new window.AMap.Driving({ policy: 0 });
                driving.search(
                    new window.AMap.LngLat(startGCJ.lng, startGCJ.lat),
                    new window.AMap.LngLat(endGCJ.lng, endGCJ.lat),
                    function(status: string, result: any) {
                        if (status === 'complete' && result.routes?.length > 0) {
                            const r = result.routes[0];
                            const mins = Math.ceil(r.time / 60);
                            resolve({ 
                                distanceKm: parseFloat((r.distance / 1000).toFixed(1)), 
                                duration: mins >= 60 ? `${Math.floor(mins/60)} hr ${mins%60} min` : `${mins} mins`
                            });
                        } else resolve({ distanceKm: 0, duration: '' });
                    }
                );
            });
        });
    } catch (e) { return { distanceKm: 0, duration: '' }; }
};

// ============================================================================
// PART 5: UNIFIED PUBLIC API (The Interface)
// ============================================================================

export const preloadMapSDKs = (tencentKey?: string) => {
    if (tencentKey) loadTencentSDK(tencentKey);
};

export const calculateTencentRoute = _calculateTencentRoute; // Export specific implementation if needed directly
export const calculateAMapRoute = _calculateAMapRoute; // Export specific implementation if needed directly

/**
 * Unified Search Function
 * Defaults to TENCENT. Handles all coordinate conversions transparently.
 * Returns WGS84 coordinates regardless of provider.
 */
export const searchLocation = async (
    query: string, 
    provider: MapProvider = 'TENCENT', // Default changed to Tencent
    amapKey?: string,
    amapSecurityCode?: string,
    googleKey?: string,
    options?: SearchOptions, 
    tencentKey?: string 
): Promise<LocationData[]> => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    // Check Static Matches (Always fast)
    const staticMatches = STATIC_LOCATIONS.filter(l => l.keywords.some(k => q.includes(k)) || l.placeName.toLowerCase().includes(q))
        .map(l => ({ placeName: l.placeName, address: l.address, latitude: l.lat, longitude: l.lng, uri: "" }));
    if (staticMatches.length > 0) return staticMatches.slice(0, 5);

    // Tencent (Primary)
    if (provider === 'TENCENT' && tencentKey) {
        return await _searchTencent(q, tencentKey);
    }

    // Google
    if (provider === 'GOOGLE' && googleKey && !isGoogleMapsBroken) {
        const res = await _searchGoogle(q, googleKey, options);
        if (res.length > 0) return res;
    }

    // AMap
    if (provider === 'AMAP' && amapKey) {
        return await _searchAMap(q, amapKey, amapSecurityCode);
    }

    // OSM Fallback (Returns WGS84)
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
            const data = await res.json();
            return data.map((i: any) => ({ placeName: i.name || i.display_name.split(',')[0], address: i.display_name, latitude: parseFloat(i.lat), longitude: parseFloat(i.lon), uri: "" }));
        }
    } catch(e) {}
    
    return [];
};

/**
 * Unified Trip Estimator
 * Defaults to TENCENT. Handles all coordinate conversions transparently.
 * Input coordinates MUST be WGS84 (standard app format).
 */
export const estimateTripDetails = async (
    origin: string | LocationData, 
    destination: string | LocationData, 
    provider: MapProvider = 'TENCENT', // Default changed to Tencent
    amapKey?: string,
    amapSecurityCode?: string,
    tencentKey?: string
): Promise<{distanceKm: number, duration: string}> => {
    const p1 = typeof origin === 'object' && origin.latitude ? origin : null;
    const p2 = typeof destination === 'object' && destination.latitude ? destination : null;

    if (p1 && p2 && p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
        // Tencent Route
        if (provider === 'TENCENT' && tencentKey) {
            return _calculateTencentRoute(
                {lat: p1.latitude, lng: p1.longitude}, 
                {lat: p2.latitude, lng: p2.longitude}, 
                tencentKey
            );
        }
        
        // AMap Route
        if (provider === 'AMAP' && amapKey) {
            return _calculateAMapRoute(
                {lat: p1.latitude, lng: p1.longitude}, 
                {lat: p2.latitude, lng: p2.longitude}, 
                amapKey, amapSecurityCode
            );
        }
    }
    
    // Fallback: Haversine (WGS84 direct calc)
    if (p1 && p2 && p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
        const d = getDistanceFromLatLonInKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const estDist = parseFloat((d * 1.4).toFixed(1)); 
        const estMins = Math.ceil(estDist * 1.8); 
        return { distanceKm: estDist, duration: estMins >= 60 ? `~${Math.floor(estMins/60)}h` : `~${estMins}m` };
    }
    return { distanceKm: 0, duration: '' };
};

export const getAMapDiagnostics = () => {
    if (typeof window === 'undefined') return { status: 'SSR', details: 'Server Side' };
    const isLoaded = !!window.AMap;
    return {
        status: isLoaded ? 'LOADED' : 'NOT_LOADED',
        version: window.AMap?.v || 'N/A',
        plugins: isLoaded && window.AMap.Driving ? ['Driving'] : [],
        securityConfig: !!(window as any)._AMapSecurityConfig
    };
};
