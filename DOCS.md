# Mobile XR Audio Walking Tour Documentation

## Overview

This documentation consolidates essential information about the Mobile XR Audio Walking Tour application, a comprehensive mobile-first audio walking tour application with 360° XR experiences, robust image galleries, and enhanced audio controls.

## Table of Contents

1. [XR Integration](#xr-integration)
2. [Responsive Design](#responsive-design)
3. [Z-Index Layer System](#z-index-layer-system)
4. [Component Architecture](#component-architecture)
5. [Guidelines for Development](#guidelines-for-development)

## XR Integration

### Architecture Overview

The application uses a **360° headless viewer** with full A-Frame integration instead of a basic Three.js placeholder. This provides immersive 360° video experiences that sync perfectly with audio tracks.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Walking Tour App                             │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   AudioPlayer   │◄───┤   XRScene.tsx   │                    │
│  │                 │    │                 │                    │
│  │ • Audio Control │    │ • Message Relay │                    │
│  │ • Track Management   │ • State Sync    │                    │
│  │ • Message Dispatch   │ • Error Handling│                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                   │                             │
│                                   │ postMessage API             │
│                                   ▼                             │
│  ┌─────────────────────────────────────────────────────────────┤
│  │              iframe: 360viewer-headless.html                │
│  │                                                             │
│  │  ┌─────────────────┐    ┌─────────────────┐                │
│  │  │   A-Frame Scene │    │   HLS Player    │                │
│  │  │                 │    │                 │                │
│  │  │ • 360° Video    │    │ • Adaptive      │                │
│  │  │ • Camera Control│    │   Streaming     │                │
│  │  │ • Touch/Mouse   │    │ • Error Handling│                │
│  │  │ • Device Motion │    │ • Buffer Mgmt   │                │
│  │  └─────────────────┘    └─────────────────┘                │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Message Protocol

#### Parent → 360° Viewer

| Message Type | Purpose | Data |
|-------------|---------|------|
| `init` | Initialize viewer | `videoUrl`, `currentTime`, `isPlaying` |
| `playback-state` | Sync play/pause | `isPlaying`, `currentTime` |
| `time-update` | Sync time position | `currentTime` |
| `seek` | Jump to specific time | `currentTime` |
| `track-change` | Switch video content | `videoUrl`, `trackIndex` |
| `recenter` | Reset camera position | `{}` |
| `heartbeat` | Connection health check | `timestamp` |

#### 360° Viewer → Parent

| Message Type | Purpose | Data |
|-------------|---------|------|
| `ready` | Viewer initialized | `isReady`, `videoUrl` |
| `loaded` | Video metadata ready | `duration`, `videoUrl` |
| `play` / `pause` | Playback state change | `currentTime` |
| `seek` | User seek interaction | `currentTime` |
| `fovchange` | Field of view change | `fov` |
| `error` | Error occurred | `error` |
| `buffering` | Loading status | `isBuffering` |

### User Experience

- **Desktop**: Mouse drag to look around, scroll wheel for zoom
- **Mobile**: Touch drag to pan, pinch to zoom, device orientation for head tracking

## Responsive Design

### Breakpoints

```css
xs: '375px'   // Small phones
sm: '640px'   // Large phones
md: '768px'   // Tablets portrait
lg: '1024px'  // Tablets landscape / small desktop
xl: '1280px'  // Desktop
2xl: '1536px' // Large desktop
```

### Dynamic Container Sizing

- **Mobile**: `max-w-md` (448px)
- **Tablet**: `max-w-2xl` (672px) 
- **Large**: `max-w-4xl` (896px)

### Adaptive Spacing & Typography

- **Padding**: Scales from `p-4` (mobile) → `md:p-6` (tablet) → `lg:p-8` (large)
- **Margins**: Responsive margins `mx-4 md:mx-6 lg:mx-8`
- **Typography**: 
  - Headers: `text-2xl md:text-3xl lg:text-4xl`
  - Body text: `text-base md:text-lg`

### Mobile Web App Optimizations

- **Viewport Meta**: Proper mobile viewport with `viewport-fit=cover` for notched devices
- **Safe Area Support**: CSS custom properties for device notches and safe areas
- **Touch Optimizations**: 44px minimum touch targets, improved scrolling
- **Performance**: Hardware acceleration, smooth animations, optimized rendering

## Z-Index Layer System

To prevent stacking conflicts, the application implements an organized Z-Index Layer System:

```typescript
const Z_LAYERS = {
  // Base content layers (0-9)
  BASE: 'z-0',
  CONTENT: 'z-10',
  
  // UI element layers (10-29)
  IMAGE_OVERLAY: 'z-20',
  UI_ELEMENTS: 'z-30',
  HOVER_ELEMENTS: 'z-40',
  
  // XR and background layers (30-39)  
  XR_BACKGROUND: 'z-30',
  
  // Modal and overlay layers (40-59)
  XR_CONTROLS: 'z-40',
  OVERLAY_LOW: 'z-50',
  
  // High priority overlays (60-79)
  LOADING_OVERLAY: 'z-60',
  TEASER_OVERLAY: 'z-60',
  
  // Critical UI layers (80-99)
  FULLSCREEN_MODE: 'z-80',
  FULLSCREEN_CONTROLS: 'z-85',
  
  // Top level system layers (90-99)
  SYSTEM_OVERLAY: 'z-90',
  DEBUG_OVERLAY: 'z-99'
}
```

## Component Architecture

### Core Components

#### AudioPlayer.tsx
- Core audio playback control
- Image gallery management
- XR mode integration
- Track configuration and management
- Enhanced audio scrubber visualization

#### XRScene.tsx
- 360° A-Frame viewer iframe management
- Bidirectional message handling with viewer
- Device orientation integration
- Connection health monitoring

#### ImageSlider.tsx
- Advanced image gallery with touch gestures
- Fullscreen mode with zoom capabilities
- Auto-advance and manual navigation
- Responsive design for all screen sizes

#### AudioSlider.tsx
- Visual progress regions (played/unplayed/buffered)
- Large touch targets for mobile optimization
- Time tooltips and scrubbing feedback
- Multiple visual themes

## Guidelines for Development

### Code Style & Conventions

- Always use `Z_LAYERS` constants instead of hardcoded z-index values
- Follow responsive spacing patterns: `px-4 md:px-6 lg:px-8`
- Apply safe area utilities to all absolute positioned elements
- Use `touch-target` class for interactive elements
- Test responsive behavior on real devices regularly

### Performance Optimization

- Use hardware acceleration for animations
- Implement proper memory management in XRScene
- Optimize canvas sizing for responsive containers
- Scale particle counts based on screen size
- Monitor frame rates in XR mode

### Browser Support

- iOS Safari 13+ (with device orientation permissions)
- Chrome Mobile 80+ (Android 8+)
- Firefox Mobile 80+
- Desktop browsers (as responsive mobile view)

### Testing Recommendations

1. **Device Testing**: Test on actual phones and tablets in both orientations
2. **Safe Area Testing**: Test on devices with notches (iPhone X+)
3. **Responsive Testing**: Use browser DevTools responsive mode
4. **Z-Index Testing**: Verify overlay stacking in all modes
5. **Performance Testing**: Monitor frame rates and memory usage 