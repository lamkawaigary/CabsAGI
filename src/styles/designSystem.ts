// Cabs Carpool - Design System v2.0
// With Material Symbols support

export const colors = {
  // Primary (Amber/Orange)
  primary: '#f59e0b',
  primaryDark: '#855300',
  primaryLight: '#fef3c7',
  primaryContainer: '#f59e0b',
  
  // Secondary (Blue)
  secondary: '#1d4ed8',
  secondaryContainer: '#4069f2',
  
  // Background/Surface
  background: '#f9f9ff',
  surface: '#ffffff',
  surfaceContainer: '#e7eeff',
  surfaceContainerHigh: '#dee8ff',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainerLowest: '#ffffff',
  cardBg: '#ffffff',
  
  // Text
  textPrimary: '#111c2d',
  textSecondary: '#534434',
  textLight: '#b8a090',
  textMuted: '#999999',
  tertiary: '#5f5f59',
  
  // Status
  success: '#4caf50',
  successBg: '#e8f5e9',
  warning: '#ff9800',
  warningBg: '#fff3e0',
  error: '#ba1a1a',
  errorBg: '#ffebee',
  info: '#2196f3',
  infoBg: '#e3f2fd',
  
  // Borders
  border: '#e0d6d0',
  outline: '#867461',
  outlineVariant: '#d8c3ad',
  
  // Basic
  white: '#ffffff',
  black: '#000000',
  
  // Aliases
  onPrimary: '#ffffff',
  onSurface: '#111c2d',
  onSurfaceVariant: '#534434',
}

export const shadows = {
  card: '0 4px 20px rgba(29,78,216,0.05)',
  cardHover: '0 8px 30px rgba(29,78,216,0.08)',
  fab: '0 8px 30px rgba(245,158,11,0.3)',
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 2px 8px rgba(0,0,0,0.1)',
  lg: '0 4px 16px rgba(0,0,0,0.12)',
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  container: 20,
}

// Material Symbols CSS for icons
export const materialSymbols: React.CSSProperties = {
  fontFamily: "'Material Symbols Outlined'",
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

export const materialSymbolsFilled: React.CSSProperties = {
  fontFamily: "'Material Symbols Outlined'",
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}