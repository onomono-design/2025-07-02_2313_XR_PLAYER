import { useEffect, useRef, useCallback, useState } from 'react';

// Device orientation permission types
interface DeviceOrientationPermissionState {
  granted: boolean;
  requested: boolean;
  supported: boolean;
  error?: string;
}

interface XRSceneProps {
  isPlaying: boolean;
  currentTrack: number;
  containerWidth: number;
  containerHeight: number;
  deviceOrientationPermission?: DeviceOrientationPermissionState;
  videoSrc?: string; // 360° video URL
  currentTime?: number; // Current audio time for sync
  onReady?: () => void; // Callback when viewer is ready
  onSeek?: (time: number) => void; // Callback when user seeks in viewer
}

// Message types for 360° viewer communication
interface ViewerMessage {
  channel: string;
  type: string;
  timestamp?: number;
  [key: string]: any;
}

export function XRScene({ 
  isPlaying, 
  currentTrack, 
  containerWidth, 
  containerHeight,
  deviceOrientationPermission,
  videoSrc,
  currentTime = 0,
  onReady,
  onSeek
}: XRSceneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [connectionHealth, setConnectionHealth] = useState({ 
    connected: false, 
    lastHeartbeat: 0 
  });

  // Heartbeat system to monitor iframe connection
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (isViewerReady && iframeRef.current) {
        sendToViewer('heartbeat', { timestamp: performance.now() });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isViewerReady]);

  // Send message to 360° viewer iframe
  const sendToViewer = useCallback((type: string, data: any = {}) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const message: ViewerMessage = {
        channel: 'viewer-360',
        type,
        timestamp: performance.now(),
        ...data
      };
      
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (error) {
        setViewerError('Communication error with 360° viewer');
      }
    }
  }, []);

  // Send inverse mouse control setting to viewer
  useEffect(() => {
    if (isViewerReady) {
      sendToViewer('set-inverse-controls', {
        inverseX: true,
        inverseY: false // Only reverse horizontal movement for natural feel
      });
    }
  }, [isViewerReady, sendToViewer]);

  // Handle messages from 360° viewer iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.channel !== 'viewer-360') return;

      const message: ViewerMessage = event.data;

      switch (message.type) {
        case 'ready':
          setIsViewerReady(true);
          setViewerError(null);
          setConnectionHealth({ connected: true, lastHeartbeat: performance.now() });
          onReady?.();
          
          // Initialize viewer with current state
          if (videoSrc) {
            sendToViewer('init', {
              videoUrl: videoSrc,
              currentTime,
              isPlaying,
              deviceOrientationPermission
            });
          }
          break;

        case 'error':
          setViewerError(message.error || 'Unknown viewer error');
          break;

        case 'seek':
          if (onSeek && message.currentTime !== undefined) {
            onSeek(message.currentTime);
          }
          break;

        case 'play':
        case 'pause':
          // These come from viewer UI interactions
          break;

        case 'fovchange':
          break;

        case 'heartbeat-response':
          setConnectionHealth({ 
            connected: true, 
            lastHeartbeat: performance.now() 
          });
          break;

        case 'loaded':
          break;
          
        case 'hls-manifest-parsed':
          break;

        case 'buffering':
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReady, onSeek, currentTime, isPlaying, videoSrc, sendToViewer]);

  // Sync playback state with viewer
  useEffect(() => {
    if (isViewerReady) {
      sendToViewer('playback-state', {
        isPlaying,
        currentTime,
        deviceOrientationPermission: deviceOrientationPermission || {
          granted: false,
          requested: false,
          supported: false
        }
      });
    }
  }, [isPlaying, deviceOrientationPermission, sendToViewer, isViewerReady]);

  // Sync time updates with viewer (throttled to avoid spam)
  useEffect(() => {
    if (isViewerReady && Math.abs(currentTime - lastSyncTime) > 0.5) {
      sendToViewer('time-update', { currentTime });
      setLastSyncTime(currentTime);
    }
  }, [currentTime, lastSyncTime, sendToViewer, isViewerReady]);

  // Handle track changes
  useEffect(() => {
    if (isViewerReady && videoSrc) {
      sendToViewer('track-change', {
        videoUrl: videoSrc,
        trackIndex: currentTrack,
        currentTime: 0 // Reset time on track change
      });
    }
  }, [currentTrack, videoSrc, sendToViewer, isViewerReady]);

  // Handle container size changes
  useEffect(() => {
    if (isViewerReady) {
      sendToViewer('resize', {
        width: containerWidth,
        height: containerHeight
      });
    }
  }, [containerWidth, containerHeight, sendToViewer, isViewerReady]);

  // Monitor connection health
  useEffect(() => {
    const checkConnection = setInterval(() => {
      const now = performance.now();
      const timeSinceLastHeartbeat = now - connectionHealth.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > 10000) { // 10 seconds without heartbeat
        setConnectionHealth({ connected: false, lastHeartbeat: 0 });
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, [connectionHealth.lastHeartbeat]);

  // Handle recenter command
  const recenterViewer = useCallback(() => {
    if (isViewerReady) {
      sendToViewer('recenter');
    }
  }, [isViewerReady, sendToViewer]);

  // Expose recenter method to parent
  useEffect(() => {
    // Add recenter method to window for parent access
    if (typeof window !== 'undefined') {
      (window as any).recenterXRViewer = recenterViewer;
    }
  }, [recenterViewer]);

  // Construct iframe URL based on video source
  const getViewerUrl = () => {
    if (!videoSrc) return '';
    
    // Build URL with parameters
    const url = new URL('./360viewer-headless.html', window.location.href);
    url.searchParams.set('video', videoSrc);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('autoPreload', 'true');
    
    return url.toString();
  };
  
  return (
    <div 
      className="relative w-full h-full bg-black" 
      style={{ 
        width: containerWidth, 
        height: containerHeight
      }}
      data-xr-scene
    >
      {/* 360° viewer iframe */}
      <iframe
        ref={iframeRef}
        src={getViewerUrl()}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; gyroscope; camera; microphone;"
        sandbox="allow-scripts allow-same-origin"
        loading="eager"
        title="360° viewer"
      />
      
      {/* Error overlay */}
      {viewerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white z-50">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">Error</div>
            <div>{viewerError}</div>
          </div>
        </div>
      )}
      
      {/* Connection health indicator */}
      {!connectionHealth.connected && isViewerReady && (
        <div className="absolute bottom-4 right-4 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
          Reconnecting...
        </div>
      )}
    </div>
  );
}