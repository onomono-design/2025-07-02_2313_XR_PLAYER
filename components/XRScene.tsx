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
  onVideosphereMaterialReady?: () => void; // Callback when videosphere material is loaded and ready
}

// Enhanced message types for comprehensive 360° viewer communication
interface ViewerMessage {
  channel: string;
  type: string;
  timestamp?: number;
  [key: string]: any;
}

// Performance monitoring interface
interface PerformanceStats {
  fps: number;
  frameDrops: number;
  averageFps: number;
  drift: number;
}

// Connection health monitoring
interface ConnectionHealth {
  connected: boolean;
  lastHeartbeat: number;
  timeSinceLastHeartbeat: number;
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
  onSeek,
  onVideosphereMaterialReady
}: XRSceneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({ 
    connected: false, 
    lastHeartbeat: 0,
    timeSinceLastHeartbeat: 0
  });
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    fps: 0,
    frameDrops: 0,
    averageFps: 0,
    drift: 0
  });
  const [syncTolerance, setSyncTolerance] = useState(0.1);
  const [syncThreshold, setSyncThreshold] = useState(1.0);
  const [isInSyncGracePeriod, setIsInSyncGracePeriod] = useState(false);
  const [devicePerformance, setDevicePerformance] = useState<string>('unknown');
  const [networkQuality, setNetworkQuality] = useState<string>('unknown');
  const initializationTimeoutRef = useRef<number | null>(null);

  // Enhanced initialization system with mobile-optimized fallback strategies
  useEffect(() => {
    console.log('🎯 XRScene mounted, starting enhanced initialization');
    
    // Detect mobile device for optimized initialization
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    
    let attemptCount = 0;
    const maxAttempts = isMobile ? 2 : 3; // Fewer attempts on mobile to save battery
    const retryDelay = isMobile ? 1500 : 1000; // Longer delays on mobile
    
    const attemptInitialization = () => {
      attemptCount++;
      console.log(`🎯 Initialization attempt ${attemptCount}/${maxAttempts} (Mobile: ${isMobile})`);
      
      if (attemptCount >= maxAttempts) {
        console.warn('🎯 XRScene initialization failed after max attempts - forcing ready state');
        setIsViewerReady(true);
        setViewerError(null);
        setConnectionHealth({ connected: true, lastHeartbeat: performance.now(), timeSinceLastHeartbeat: 0 });
        onReady?.();
        return;
      }
      
      // Try to ping the iframe to check if it's responsive
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            channel: 'viewer-360-headless',
            type: 'ping',
            timestamp: performance.now(),
            deviceInfo: {
              isMobile,
              isLowEndDevice,
              hardwareConcurrency: navigator.hardwareConcurrency
            }
          }, '*');
          
          // Adaptive timeout based on device capability
          const timeout = isMobile || isLowEndDevice ? 3000 : 2000;
          setTimeout(() => {
            if (!isViewerReady) {
              console.log('🎯 No response to ping, retrying initialization...');
              attemptInitialization();
            }
          }, timeout);
          
        } catch (error) {
          console.error('🎯 Error pinging iframe:', error);
          setTimeout(attemptInitialization, retryDelay);
        }
      } else {
        console.log('🎯 Iframe not ready, waiting before retry...');
        setTimeout(attemptInitialization, retryDelay);
      }
    };
    
    // Mobile-optimized initial delay
    const initialDelay = isMobile ? 800 : 500;
    initializationTimeoutRef.current = setTimeout(attemptInitialization, initialDelay) as unknown as number;

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [onReady, isViewerReady]);

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
        channel: 'viewer-360-headless',
        type,
        timestamp: performance.now(),
        ...data
      };
      
      console.log('🎯 Sending message to iframe:', { type, data });
      
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('🎯 Error sending message to iframe:', error);
        setViewerError('Communication error with 360° viewer');
      }
    } else {
      console.warn('🎯 Cannot send message - iframe not available:', { 
        hasIframe: !!iframeRef.current,
        hasContentWindow: !!iframeRef.current?.contentWindow,
        type,
        data
      });
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

  // Enhanced command methods from AI agent's instructions
  const sendEnhancedCommand = useCallback((type: string, data: any = {}) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = {
        channel: 'viewer-360-headless',
        type,
        timestamp: performance.now(),
        ...data
      };
      
      console.log('🎯 Sending enhanced command:', { type, data });
      
      try {
        iframeRef.current.contentWindow.postMessage(command, '*');
      } catch (error) {
        console.error('🎯 Error sending enhanced command:', error);
      }
    }
  }, []);

  // Advanced sync methods
  const syncSeek = useCallback((time: number, tolerance: number = 0.1) => {
    sendEnhancedCommand('syncSeek', { time, tolerance });
  }, [sendEnhancedCommand]);

  const smoothSeek = useCallback((time: number, tolerance: number = 0.1) => {
    sendEnhancedCommand('smoothSeek', { time, tolerance });
  }, [sendEnhancedCommand]);

  const setFov = useCallback((fov: number) => {
    sendEnhancedCommand('setFov', { value: fov });
  }, [sendEnhancedCommand]);

  const toggleMute = useCallback(() => {
    sendEnhancedCommand('toggleMute');
  }, [sendEnhancedCommand]);

  const requestOrientationPermission = useCallback(() => {
    sendEnhancedCommand('requestOrientationPermission');
  }, [sendEnhancedCommand]);

  const setVideoSource = useCallback((videoUrl: string) => {
    sendEnhancedCommand('setVideoSource', { videoUrl });
  }, [sendEnhancedCommand]);

  const switchChapter = useCallback((chapterNumber: number, videoUrl: string) => {
    sendEnhancedCommand('switchChapter', { chapterNumber, videoUrl });
  }, [sendEnhancedCommand]);

  const getConnectionHealth = useCallback(() => {
    sendEnhancedCommand('getConnectionHealth');
  }, [sendEnhancedCommand]);

  const forcePreload = useCallback(() => {
    sendEnhancedCommand('preload');
  }, [sendEnhancedCommand]);

  // Handle messages from 360° viewer iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.channel !== 'viewer-360-headless') return;

      const message: ViewerMessage = event.data;

      // Reset connection state on any successful message
      setConnectionHealth(prev => ({
        ...prev,
        connected: true,
        lastHeartbeat: performance.now(),
        timeSinceLastHeartbeat: 0
      }));

      switch (message.type) {
        case 'ready':
          setIsViewerReady(true);
          setViewerError(null);
          setConnectionHealth({ connected: true, lastHeartbeat: performance.now(), timeSinceLastHeartbeat: 0 });
          onReady?.();
          
          // Clear initialization timeout since we got a proper ready message
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
            initializationTimeoutRef.current = null;
          }
          
          // Send permission state to viewer immediately after ready
          if (deviceOrientationPermission) {
            console.log('🎯 Sending permission state to viewer:', deviceOrientationPermission);
            sendToViewer('setOrientationPermission', {
              granted: deviceOrientationPermission.granted,
              requested: deviceOrientationPermission.requested,
              supported: deviceOrientationPermission.supported,
              error: deviceOrientationPermission.error
            });
          }
          
          // Initialize viewer with current state
          if (videoSrc) {
            console.log('🎯 Initializing viewer with:', { videoSrc, currentTime, isPlaying });
            // Use the enhanced setVideoSource command instead of init
            sendToViewer('setVideoSource', {
              videoUrl: videoSrc
            });
            
            // Then set playback state
            sendToViewer('playback-state', {
              isPlaying,
              currentTime,
              deviceOrientationPermission
            });
          }
          break;

        case 'error':
          const errorMessage = message.error || 'Unknown viewer error';
          console.error('🎯 Viewer error received:', errorMessage);
          setViewerError(errorMessage);
          
          // Enhanced error recovery
          if (message.recoverable !== false) { // Only attempt recovery if not explicitly marked as unrecoverable
            setTimeout(() => {
              console.log('🎯 Attempting viewer recovery...');
              setViewerError(null);
              
              // Try to reinitialize the viewer
              if (videoSrc) {
                console.log('🎯 Reinitializing viewer with video source:', videoSrc);
                sendToViewer('setVideoSource', { 
                  videoUrl: videoSrc,
                  currentTime: currentTime, // Sync current time
                  isPlaying: isPlaying // Sync play state
                });
              }
            }, 3000);
          }
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
            lastHeartbeat: performance.now(),
            timeSinceLastHeartbeat: 0
          });
          break;

        case 'pong':
          console.log('🎯 Pong received from iframe:', message);
          if (!isViewerReady && message.isReady) {
            console.log('🎯 Iframe is ready, setting viewer ready state');
            setIsViewerReady(true);
            setViewerError(null);
            setConnectionHealth({ connected: true, lastHeartbeat: performance.now(), timeSinceLastHeartbeat: 0 });
            onReady?.();
            
            // Clear initialization timeout since we got a proper response
            if (initializationTimeoutRef.current) {
              clearTimeout(initializationTimeoutRef.current);
              initializationTimeoutRef.current = null;
            }
          }
          break;

        case 'loadstart':
          console.log('🎯 Videosphere material loading started');
          // Don't trigger ready callback yet, just log for debugging
          break;
          
        case 'loaded':
          console.log('🎯 Videosphere material loaded (direct video)');
          onVideosphereMaterialReady?.();
          break;
          
        case 'loadedmetadata':
          console.log('🎯 Videosphere metadata loaded');
          onVideosphereMaterialReady?.();
          break;
          
        case 'hls-manifest-parsed':
          console.log('🎯 Videosphere material loaded (HLS manifest parsed)');
          onVideosphereMaterialReady?.();
          break;

        case 'canplaythrough':
          console.log('🎯 Videosphere material can play through');
          onVideosphereMaterialReady?.();
          break;

        case 'buffering':
          break;

        case 'sync-report':
          console.log('🎯 Sync report received:', message);
          break;

        case 'sync-reset-complete':
          console.log('🎯 Sync reset completed');
          break;

        case 'cleanup-complete':
          console.log('🎯 Viewer cleanup completed');
          break;

        // Enhanced message types from AI agent's instructions
        case 'started':
          console.log('🎯 Viewer started:', message);
          break;

        case 'preloaded':
          console.log('🎯 Content preloaded - videosphere material ready:', message);
          onVideosphereMaterialReady?.();
          break;

        case 'mutechange':
          console.log('🎯 Mute state changed:', message.muted);
          break;

        case 'fpsupdate':
          setPerformanceStats(prev => ({
            ...prev,
            fps: message.fps || 0,
            frameDrops: message.frameDrops || 0,
            averageFps: message.averageFps || 0
          }));
          break;

        case 'devicebenchmark':
          setDevicePerformance(message.category || 'unknown');
          console.log('📊 Device benchmark:', message.category);
          break;

        case 'networkdetected':
          setNetworkQuality(message.quality || 'unknown');
          console.log('🌐 Network quality:', message.quality);
          break;

        case 'orientationpermission':
          console.log('📱 Device orientation permission from viewer:', message.granted);
          // Don't override the main app's permission state - this is just for logging
          break;

        case 'orientationrequested':
          console.log('📱 Viewer requested orientation permission - but this should be handled by main app');
          // Send the current permission state back to viewer
          if (deviceOrientationPermission) {
            sendToViewer('setOrientationPermission', {
              granted: deviceOrientationPermission.granted,
              requested: deviceOrientationPermission.requested,
              supported: deviceOrientationPermission.supported,
              error: deviceOrientationPermission.error
            });
          }
          break;

        case 'connectionhealthresponse':
          console.log('🔗 Connection health:', message);
          setConnectionHealth(prev => ({
            ...prev,
            connected: message.healthy,
            timeSinceLastHeartbeat: message.timeSinceLastHeartbeat || 0
          }));
          break;

        case 'commandresponse':
          console.log('✅ Command executed successfully:', message.command);
          break;

        case 'recenter':
          if (message.success) {
            console.log('✅ Recenter successful:', message.rotation);
          } else {
            console.error('❌ Recenter failed:', message.error);
          }
          break;

        case 'commanderror':
          console.error('❌ Command failed:', message.command, message.error);
          break;

        case 'lowpowermode':
          console.log('🔋 Low power mode activated');
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReady, onSeek, currentTime, isPlaying, videoSrc, sendToViewer, deviceOrientationPermission]);

  // Send device orientation permission to viewer when it changes
  useEffect(() => {
    if (isViewerReady && deviceOrientationPermission) {
      console.log('�� Device orientation permission changed, sending to viewer:', deviceOrientationPermission);
      sendToViewer('setOrientationPermission', {
        granted: deviceOrientationPermission.granted,
        requested: deviceOrientationPermission.requested,
        supported: deviceOrientationPermission.supported,
        error: deviceOrientationPermission.error
      });
    }
  }, [deviceOrientationPermission, isViewerReady, sendToViewer]);

  // Sync playback state with viewer
  useEffect(() => {
    console.log('🎯 XRScene playback state useEffect triggered:', { 
      isPlaying, 
      currentTime, 
      isViewerReady,
      videoSrc: !!videoSrc 
    });
    
    if (isViewerReady) {
      console.log('🎯 Sending playback-state to viewer:', { isPlaying, currentTime });
      sendToViewer('playback-state', {
        isPlaying,
        currentTime,
        deviceOrientationPermission: deviceOrientationPermission || {
          granted: false,
          requested: false,
          supported: false
        }
      });
    } else {
      console.warn('🎯 XRScene viewer not ready - cannot send playback state');
    }
  }, [isPlaying, deviceOrientationPermission, sendToViewer, isViewerReady]);

  // Sync time updates with viewer (throttled to avoid spam) - only when playing
  useEffect(() => {
    if (isViewerReady && isPlaying && Math.abs(currentTime - lastSyncTime) > 0.1) {
      sendToViewer('time-update', { currentTime });
      setLastSyncTime(currentTime);
    }
  }, [currentTime, lastSyncTime, sendToViewer, isViewerReady, isPlaying]);

  // CRITICAL FIX: Throttled seek handling to prevent videosphere material lag
  const lastSeekSent = useRef(0);
  const SEEK_THROTTLE = 50; // Max 20fps for smooth seeking
  
  const sendThrottledSeek = useCallback((time: number) => {
    const now = performance.now();
    if (now - lastSeekSent.current > SEEK_THROTTLE && isViewerReady) {
      lastSeekSent.current = now;
      console.log('🎯 Sending throttled seek to viewer:', time);
      sendToViewer('seek', { currentTime: time });
    }
  }, [sendToViewer, isViewerReady, SEEK_THROTTLE]);

  // Enhanced current time sync with smooth seeking
  useEffect(() => {
    if (isViewerReady && Math.abs(currentTime - lastSyncTime) > 0.05) {
      // Use throttled seek for smooth videosphere material progress
      sendThrottledSeek(currentTime);
      setLastSyncTime(currentTime);
    }
  }, [currentTime, lastSyncTime, sendThrottledSeek, isViewerReady]);

  // Add sync monitoring and debugging capabilities
  const requestSyncReport = useCallback(() => {
    if (isViewerReady) {
      sendToViewer('get-sync-report');
    }
  }, [isViewerReady, sendToViewer]);

  const resetSync = useCallback(() => {
    if (isViewerReady) {
      console.log('🎯 Requesting sync reset from XRScene');
      sendToViewer('reset-sync');
    }
  }, [isViewerReady, sendToViewer]);

  const cleanupViewer = useCallback(() => {
    if (isViewerReady) {
      sendToViewer('cleanup');
    }
  }, [isViewerReady, sendToViewer]);

  // Expose debugging methods to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).xrDebug = {
        requestSyncReport,
        resetSync,
        cleanupViewer,
        isReady: isViewerReady,
        connectionHealth,
        performanceStats,
        devicePerformance,
        networkQuality,
        // Enhanced methods from AI agent's instructions
        syncSeek,
        smoothSeek,
        setFov,
        toggleMute,
        requestOrientationPermission,
        setVideoSource,
        switchChapter,
        getConnectionHealth,
        forcePreload,
        sendEnhancedCommand,
        // New throttled seek for debugging
        sendThrottledSeek
      };
    }
  }, [
    requestSyncReport, resetSync, cleanupViewer, isViewerReady, connectionHealth,
    performanceStats, devicePerformance, networkQuality,
    syncSeek, smoothSeek, setFov, toggleMute, requestOrientationPermission,
    setVideoSource, switchChapter, getConnectionHealth, forcePreload, sendEnhancedCommand,
    sendThrottledSeek
  ]);

  // Handle track changes
  useEffect(() => {
    if (isViewerReady && videoSrc) {
      console.log('🎯 Track change detected:', { videoSrc, currentTrack });
      // Use setVideoSource for track changes
      sendToViewer('setVideoSource', {
        videoUrl: videoSrc
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

  // Add new connection monitoring interval
  useEffect(() => {
    const CONNECTION_TIMEOUT = 10000; // 10 seconds
    const RECONNECT_INTERVAL = 5000; // 5 seconds
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    const checkConnection = () => {
      const now = performance.now();
      const timeSinceLastHeartbeat = now - connectionHealth.lastHeartbeat;

      if (isViewerReady && timeSinceLastHeartbeat > CONNECTION_TIMEOUT) {
        console.warn('🎯 Connection timeout detected:', { timeSinceLastHeartbeat });
        setConnectionHealth(prev => ({ ...prev, connected: false }));
        setViewerError('Connection lost with 360° viewer');

        // Attempt reconnection if under max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`🎯 Attempting reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          // Reset iframe src to force reconnection
          if (iframeRef.current) {
            const currentSrc = iframeRef.current.src;
            iframeRef.current.src = '';
            setTimeout(() => {
              if (iframeRef.current) {
                iframeRef.current.src = currentSrc;
              }
            }, 100);
          }
        } else {
          console.error('🎯 Max reconnection attempts reached');
        }
      }
    };

    const connectionMonitor = setInterval(checkConnection, RECONNECT_INTERVAL);
    
    return () => {
      clearInterval(connectionMonitor);
    };
  }, [isViewerReady, connectionHealth.lastHeartbeat]);

  // Handle recenter command with enhanced reliability
  const recenterViewer = useCallback(() => {
    console.log('🎯 Recenter viewer called:', { isViewerReady, hasIframe: !!iframeRef.current });
    
    if (isViewerReady && iframeRef.current) {
      console.log('🎯 Sending recenter command to viewer');
      sendToViewer('recenter');
      
      // Send recenter confirmation back to parent
      setTimeout(() => {
        console.log('🎯 Recenter command sent successfully');
      }, 100);
    } else {
      console.warn('🎯 Cannot recenter - viewer not ready or iframe not available:', {
        isViewerReady,
        hasIframe: !!iframeRef.current,
        hasContentWindow: !!iframeRef.current?.contentWindow
      });
      
      // Fallback: Try to force recenter by reinitializing viewer state
      if (iframeRef.current?.contentWindow) {
        console.log('🎯 Attempting fallback recenter via direct message');
        try {
          iframeRef.current.contentWindow.postMessage({
            channel: 'viewer-360-headless',
            type: 'recenter',
            timestamp: performance.now(),
            fallback: true
          }, '*');
        } catch (error) {
          console.error('🎯 Fallback recenter failed:', error);
        }
      }
    }
  }, [isViewerReady, sendToViewer]);

  // Expose recenter method to parent with enhanced error handling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).recenterXRViewer = recenterViewer;
      
      // Also expose debug method for troubleshooting
      (window as any).debugRecenterXR = () => {
        console.log('🎯 Recenter debug info:', {
          isViewerReady,
          hasIframe: !!iframeRef.current,
          hasContentWindow: !!iframeRef.current?.contentWindow,
          connectionHealth,
          viewerError
        });
      };
    }
  }, [recenterViewer, isViewerReady, connectionHealth, viewerError]);

  // Construct iframe URL - always load the headless viewer
  const getViewerUrl = () => {
    // Always build URL, even without initial video source
    const url = new URL('./360viewer-headless.html', window.location.href);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('autoPreload', 'true');
    
    // Add video source if available
    if (videoSrc) {
      url.searchParams.set('video', videoSrc);
    }
    
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
        /* "autoplay" is required so the muted video inside the iframe can start playing immediately.  
           Without it WebKit/Chrome block play() calls that happen outside a user-gesture context, which
           leaves the <a-videosphere> stuck on the first frame. */
        allow="autoplay; accelerometer; gyroscope; camera; microphone; fullscreen; picture-in-picture; encrypted-media;"
        sandbox="allow-scripts allow-same-origin"
        loading="eager"
        title="360° viewer"
        onLoad={() => {
          console.log('🎯 Iframe loaded successfully');
        }}
        onError={(e) => {
          console.error('🎯 Iframe failed to load:', e);
          setViewerError('Failed to load 360° viewer');
        }}
      />
      
      {/* Enhanced error overlay with user-friendly messaging */}
      {viewerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white z-50">
          <div className="text-center p-6 max-w-md mx-4">
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-lg font-semibold mb-2">XR Viewer Error</div>
            <div className="text-sm opacity-90 mb-4">{viewerError}</div>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.log('🎯 User requested error retry');
                  setViewerError(null);
                  
                  // Try to reinitialize
                  if (videoSrc) {
                    setTimeout(() => {
                      sendToViewer('setVideoSource', { videoUrl: videoSrc });
                    }, 1000);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => {
                  console.log('🎯 User dismissed error');
                  setViewerError(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors ml-2"
              >
                Dismiss
              </button>
            </div>
            
            <div className="text-xs opacity-60 mt-3">
              If the problem persists, try refreshing the page
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced connection health indicator */}
      {!connectionHealth.connected && isViewerReady && (
        <div className="absolute bottom-4 right-4 bg-yellow-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-yellow-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
            <span>Reconnecting...</span>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {Math.round(connectionHealth.timeSinceLastHeartbeat / 1000)}s
          </div>
        </div>
      )}
      
      {/* Connection restored indicator */}
      {connectionHealth.connected && isViewerReady && connectionHealth.timeSinceLastHeartbeat > 5000 && (
        <div className="absolute bottom-4 right-4 bg-green-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-green-400 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      )}
    </div>
  );
}