# Mobile XR Audio Walking Tour Application

A comprehensive mobile-first audio walking tour application built with React, TypeScript, Tailwind CSS, and integrated 360° XR experiences. Features immersive XR experiences, robust image galleries, enhanced audio controls, and comprehensive audio synchronization with A-Frame 360° viewer integration.

## Quick Start

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. For HTTPS development (required for device orientation on mobile):
   ```bash
   # Install mkcert if you haven't already
   brew install mkcert  # macOS with Homebrew

   # Create certificates directory
   mkdir -p .certs

   # Generate certificates
   mkcert -key-file .certs/key.pem -cert-file .certs/cert.pem localhost 127.0.0.1

   # Start development server
   npm run dev
   ```

### Production Build

```bash
npm run build
```

### Deployment to Vercel

The application is configured for seamless deployment to Vercel. Simply connect your GitHub repository to Vercel for automatic deployment, or use the Vercel CLI:

```bash
npx vercel --prod
```

## Key Features

- **Mobile-first design** with proper safe area handling
- **Enhanced audio player** with progress visualization and touch controls
- **Integrated 360° XR experiences** with A-Frame and device orientation support
- **Touch-optimized image gallery** with fullscreen mode and zoom
- **Full-featured tour system** with chapter navigation
- **Progressive Web App** capabilities with offline support

## Technical Overview

This application provides an immersive audio walking tour experience optimized for mobile devices. Users can navigate through historic locations with synchronized audio, interactive image galleries, and optional XR experiences that utilize device orientation controls and 360° video content.

### Main Components

- **App.tsx**: Main application entry point with landing page and permission handling
- **AudioPlayer.tsx**: Core component for audio playback and track management
- **XRScene.tsx**: Manages A-Frame 360° video experiences
- **DeveloperConfig.tsx**: Configuration interface for tour settings
- **ImageSlider.tsx**: Touch-responsive image carousel with fullscreen support

### Content Configuration

The application uses two main configuration files in `/public/data/`:

- **playlist.json**: Defines available locations and their media content
- **tour_config.json**: Configures the walking tour structure and chapters

### A-Frame Integration

The 360° XR experience is powered by A-Frame, with a custom headless viewer implementation:

- **360viewer-headless.html**: Self-contained A-Frame 360° player
- Communication happens via postMessage API between React and the iframe
- Supports both direct MP4 video and adaptive HLS streaming

## Project Structure

```
/
├── App.tsx                 # Main application entry point
├── components/
│   ├── AudioPlayer.tsx     # Core audio player component
│   ├── DeveloperConfig.tsx # Configuration interface
│   ├── ImageSlider.tsx     # Image gallery component
│   ├── XRScene.tsx         # 360° viewer integration
│   └── ui/                 # UI components (shadcn/ui)
├── public/
│   ├── data/
│   │   ├── playlist.json   # Tour location definitions
│   │   └── tour_config.json # Tour content structure
│   └── 360viewer-headless.html # A-Frame 360° viewer
├── styles/
│   └── globals.css         # Global styles with Tailwind
├── vercel.json             # Vercel deployment configuration
└── vite.config.ts          # Build configuration
```

## Architecture

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Walking Tour App                           │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │ AudioPlayer │◄───┤  XRScene    │                        │
│  └─────────────┘    └─────────────┘                        │
│                            │                                │
│                      postMessage API                        │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────────┤
│  │         360viewer-headless.html (iframe)                │
│  │                                                         │
│  │  ┌─────────────┐    ┌─────────────┐                    │
│  │  │ A-Frame     │    │  HLS.js     │                    │
│  │  │ Scene       │    │  Player     │                    │
│  │  └─────────────┘    └─────────────┘                    │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Message Types

| From Parent | From Viewer |
|-------------|-------------|
| `play`/`pause` | `ready` |
| `seek` | `loaded` |
| `time-update` | `play`/`pause` |
| `recenter` | `buffering` |

## Content Configuration

### Tour Chapter Structure
```typescript
interface TourChapter {
  chapterName: string;
  chapterOrder: number;
  audio_src: string;
  isXR: boolean;
  xr_src: string;
  thumbnail: (string | TourImageData)[];
}

interface TourImageData {
  url: string;
  title?: string;
  description?: string;
}
```

### Media Configuration
Update `public/data/tour_config.json` with your tour content:

```json
{
  "chapters": [
    {
      "chapterName": "Historic Main Street",
      "isXR": true,
      "xr_src": "https://example.com/videos/360-main-street.m3u8",
      "thumbnail": [
        {
          "url": "https://example.com/image1.jpg",
          "title": "Main Street View",
          "description": "Historic description..."
        }
      ]
    }
  ]
}
```

## Mobile Optimizations

- **Responsive design** that works across all mobile device sizes
- **Network quality detection** for optimized media loading
- **Touch-optimized controls** and gestures
- **Device orientation support** for immersive experiences
- **Battery optimization** for mobile devices
- **Performance scaling** based on device capabilities

## Browser Support

- iOS Safari 13+ (with device orientation permissions)
- Chrome Mobile 80+ (Android 8+)
- Firefox Mobile 80+
- Desktop browsers (responsive mobile view)

## Deployment

The application is optimized for Vercel deployment with:
- Automatic framework detection (Vite)
- SPA routing configuration
- Optimized caching headers
- Security headers
- PWA manifest

## License

MIT