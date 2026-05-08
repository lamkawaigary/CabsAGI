# Trip Card Design Standard

## Overview
Trip cards on OpenCabs use a clean, modern design with Material Symbols icons and a light blue/white color scheme.

## Design Elements

### Card Container
```typescript
card: {
  background: colors.surfaceContainerLowest,  // white
  borderRadius: radius.lg,  // 16px
  padding: spacing.lg,  // 16px
  position: 'relative',
  overflow: 'hidden',
  boxShadow: shadows.card,  // subtle blue shadow
  cursor: 'pointer',
  transition: 'all 0.2s',
}
```

### Decorative Corner
- 96x96px circle in top-right
- Background: `${colors.primary}20` (amber with 12% opacity)
- BorderRadius: '0 0 0 96px'
- Creates a subtle decorative effect

### Header Row
- Flex space-between
- Route code badge (uppercase, bold)
- Price display (large, right-aligned)

### Route Visualization
- Left side: dot + line (using Material Symbols)
- Right side: place names with times

### Footer
- Driver avatar (ui-avatars.com)
- Rating with star icon
- Seat icons showing occupancy

## Color Palette
- Primary: `#f59e0b` (amber/orange)
- Secondary: `#1d4ed8` (blue)
- Background: `#f9f9ff`
- Surface: `#ffffff`
- Text: `#111c2d`, `#534434`

## Icons
- Material Symbols Outlined
- Font variation: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
- Filled when active: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24`

## File Location
Design is implemented in: `src/pages/passenger/PassengerHomePage.tsx`
Design system at: `src/styles/designSystem.ts`
