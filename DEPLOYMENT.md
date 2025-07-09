# Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Preparation
- [ ] All dependencies are properly installed and up-to-date
- [ ] Build completes without errors (`npm run build`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] All static assets are in the `public/` directory

### ✅ Configuration Files
- [ ] `vercel.json` - Deployment configuration
- [ ] `public/manifest.json` - PWA manifest
- [ ] `public/data/playlist.json` - Tour configuration data
- [ ] `public/data/tour_config.json` - Tour configuration data
- [ ] `public/360viewer-headless.html` - XR viewer
- [ ] `public/360viewer-parent.html` - XR viewer parent

### ✅ Build Optimization
- [ ] Vite build script is optimized (`"build": "vite build"`)
- [ ] No path mapping issues in TypeScript
- [ ] Static assets are properly referenced
- [ ] No missing dependencies

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Connect your GitHub repository to Vercel
   # Vercel will auto-detect the Vite framework
   ```

2. **Configure Build Settings** (Auto-detected)
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Deploy**
   ```bash
   # Automatic deployment on git push
   # Or manual deployment:
   npx vercel --prod
   ```

### Manual Build & Deploy

```bash
# 1. Install dependencies
npm install

# 2. Run type checking
npm run type-check

# 3. Build the application
npm run build

# 4. Preview the build (optional)
npm run preview

# 5. Deploy the dist/ folder to your hosting platform
```

## Common Issues & Solutions

### Issue: Build Fails with TypeScript Errors

**Symptoms:**
- Build fails during TypeScript compilation
- Type errors in console

**Solution:**
```bash
# Check TypeScript configuration
npm run type-check

# Fix any type errors
# Ensure all imports are correct
# Check for missing type definitions
```

### Issue: 404 Errors on Page Refresh

**Symptoms:**
- App works on initial load
- 404 errors when refreshing or accessing direct URLs

**Solution:**
- ✅ **Vercel**: Already configured with rewrites in `vercel.json`
- **Netlify**: Add `_redirects` file:
  ```
  /*    /index.html   200
  ```
- **Apache**: Add `.htaccess`:
  ```apache
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule . /index.html [L]
  ```

### Issue: Grey Screen After Configuration

**Symptoms:**
- Developer config completes successfully
- Screen goes grey instead of loading content

**Solution:**
```bash
# Check browser console for errors
# Verify playlist.json is accessible:
curl https://your-domain.com/data/playlist.json

# Check for CORS issues with external media
# Ensure proper JSON format in configuration files
```

### Issue: XR Mode Not Loading

**Symptoms:**
- XR button appears but doesn't load 360° content
- iframe fails to load

**Solution:**
```bash
# Check Content Security Policy headers
# Verify iframe permissions in browser
# Ensure A-Frame CDN is accessible
# Check for HTTPS requirement on mobile
```

### Issue: Audio/Video CORS Errors

**Symptoms:**
- Media files fail to load
- CORS errors in browser console

**Solution:**
```bash
# Ensure media files have proper CORS headers
# Configure CDN with Access-Control-Allow-Origin
# Use crossorigin="anonymous" on media elements
```

### Issue: Mobile Device Permissions

**Symptoms:**
- Device orientation not working
- Permission dialogs not appearing

**Solution:**
```bash
# Ensure HTTPS is used (required for device sensors)
# Check A-Frame device-orientation-permission-ui
# Test on actual devices, not desktop simulators
```

## Performance Optimization

### 1. Asset Optimization
```bash
# Images
- Use WebP/AVIF formats with fallbacks
- Implement responsive images
- Optimize image sizes for different screen densities

# Videos
- Use HLS streaming for 360° content
- Implement adaptive bitrate streaming
- Use CDN for global content delivery
```

### 2. Code Splitting
```javascript
// Lazy load XR components
const XRScene = lazy(() => import('./XRScene'));

// Preload critical components
const AudioPlayer = lazy(() => import('./AudioPlayer'));
```

### 3. Caching Strategy
```javascript
// Service Worker configuration
const CACHE_NAME = 'xr-audio-tour-v1';
const urlsToCache = [
  '/',
  '/data/playlist.json',
  '/360viewer-headless.html'
];
```

## Monitoring & Analytics

### 1. Error Tracking
```javascript
// Sentry configuration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV
});
```

### 2. Performance Monitoring
```javascript
// Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. User Analytics
```javascript
// Google Analytics 4
import { gtag } from 'ga-gtag';

gtag('config', 'GA_MEASUREMENT_ID');
gtag('event', 'xr_mode_entered', {
  event_category: 'engagement',
  event_label: 'xr_interaction'
});
```

## Security Considerations

### 1. Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://aframe.io https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  media-src 'self' https: blob:;
  connect-src 'self' https:;
  frame-src 'self';
  worker-src 'self';
">
```

### 2. HTTPS Requirements
- Required for device sensor access
- Required for service workers
- Required for modern browser features

### 3. Data Privacy
- No personal data collection by default
- Analytics should comply with privacy regulations
- Implement cookie consent if required

## Troubleshooting Commands

```bash
# Check build output
npm run build && ls -la dist/

# Test local production build
npm run build && npm run preview

# Debug TypeScript issues
npm run type-check

# Check for security vulnerabilities
npm audit

# Update dependencies
npm update

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json && npm install
```

## Support

For deployment issues:
1. Check browser console for errors
2. Verify all static assets are accessible
3. Test on multiple devices and browsers
4. Check network tab for failed requests
5. Verify CORS configuration for external media

For XR-specific issues:
1. Test on actual mobile devices
2. Ensure HTTPS is used
3. Check A-Frame console messages
4. Verify device sensor permissions
5. Test with different video formats 