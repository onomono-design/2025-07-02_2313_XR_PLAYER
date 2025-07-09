import { useState, useCallback, useEffect } from "react";
import {
  AudioPlayer,
  AudioMessage,
} from "./components/AudioPlayer";
import { DeveloperConfig, DeveloperConfigSelection } from "./components/DeveloperConfig";
import { Button } from "./components/ui/button";
import {
  MapPin,
  Headphones,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Play,
  Loader2,
} from "lucide-react";

// Device orientation permission types
interface DeviceOrientationPermissionState {
  granted: boolean;
  requested: boolean;
  supported: boolean;
  error?: string;
}

// Z-Index Layer System for App - Lower z-indexes to avoid blocking native permission dialogs
const APP_Z_LAYERS = {
  BACKGROUND: 'z-0',
  MAIN_CONTENT: 'z-10', 
  LANDING_OVERLAY: 'z-20', // Lowered from z-50 to avoid blocking permission dialogs
  DECORATIVE_ELEMENTS: 'z-30'
} as const;

// Tour mode configuration
const TOUR_MODE_CONFIG = {
  TEASER: {
    name: 'teaser',
    displayName: 'Preview Mode',
    description: 'Experience a sample of our historic walking tour',
    limitations: ['Single location preview', 'Limited duration', 'No track selection'],
    features: ['Full XR experience', 'Immersive audio', 'Reset camera view']
  },
  FULL: {
    name: 'full',
    displayName: 'Full Tour',
    description: 'Complete historic district walking tour experience',
    limitations: [],
    features: ['Multiple locations', 'Full playlist', 'Audio-only mode', 'Track selection', 'Full XR controls']
  }
} as const;

// Enhanced device orientation permission request function
const requestDeviceOrientationPermission = async (): Promise<DeviceOrientationPermissionState> => {
  console.log('🎯 Requesting device orientation permission...');
  
  // Check if device orientation is supported
  const isSupported = 'DeviceOrientationEvent' in window;
  
  if (!isSupported) {
    console.log('🎯 Device orientation not supported');
    return {
      granted: false,
      requested: true,
      supported: false,
      error: 'Device orientation not supported'
    };
  }

  // For iOS 13+ devices, request permission
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      console.log('🎯 Requesting iOS device orientation permission...');
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      
      console.log('🎯 iOS permission result:', permission);
      
      return {
        granted: permission === 'granted',
        requested: true,
        supported: true,
        error: permission === 'denied' ? 'Permission denied by user' : undefined
      };
    } catch (error) {
      console.error('🎯 Error requesting device orientation permission:', error);
      return {
        granted: false,
        requested: true,
        supported: true,
        error: error instanceof Error ? error.message : 'Permission request failed'
      };
    }
  }

  // For other devices, assume permission is granted
  console.log('🎯 Non-iOS device - assuming permission granted');
  return {
    granted: true,
    requested: true,
    supported: true
  };
};

export default function App() {
  const [showDeveloperConfig, setShowDeveloperConfig] = useState(true);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [isTeaserMode, setIsTeaserMode] = useState(false);
  const [teaserPreloaded, setTeaserPreloaded] = useState(false);
  const [teaserPreloading, setTeaserPreloading] = useState(false);
  const [developerConfig, setDeveloperConfig] = useState<DeveloperConfigSelection | null>(null);
  const [
    deviceOrientationPermission,
    setDeviceOrientationPermission,
  ] = useState<DeviceOrientationPermissionState>({
    granted: false,
    requested: false,
    supported: false,
  });
  
  // Mobile-specific state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Mobile-specific optimization effects
  useEffect(() => {
    // Detect initial orientation
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    // Virtual keyboard detection for mobile
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // If viewport is significantly smaller than window, keyboard is likely open
      const keyboardOpen = (windowHeight - viewportHeight) > 150;
      setIsKeyboardOpen(keyboardOpen);
      
      updateOrientation();
    };
    
    // Orientation change detection
    const handleOrientationChange = () => {
      // Small delay to allow for layout changes
      setTimeout(updateOrientation, 100);
    };
    
    // Initial setup
    updateOrientation();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Handle developer configuration completion
  const handleDeveloperConfigComplete = useCallback((config: DeveloperConfigSelection) => {
    console.log('🔧 Developer configuration received:', config);
    setDeveloperConfig(config);
    setIsTeaserMode(config.mode === 'teaser');
    setShowDeveloperConfig(false);
    
    // If valid configuration, start preloading
    if (config.isValid) {
      setTeaserPreloading(true);
      setTimeout(() => {
        setTeaserPreloaded(true);
        setTeaserPreloading(false);
      }, 1000);
    }
  }, []);

  // Handle audio sync messages from AudioPlayer with mode-aware logging
  const handleAudioMessage = (message: AudioMessage) => {
    const modePrefix = isTeaserMode ? "🎬 [TEASER]" : "🎵 [FULL]";
    console.log(`${modePrefix} Audio Sync Message:`, message);

    // Enhanced message handling for 360° viewer integration with mode-specific behavior
    switch (message.type) {
      case "init":
        console.log(
          `${modePrefix} 360° Viewer initialized with track:`,
          message.data?.trackData?.title,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
          "| Mode:",
          isTeaserMode ? "Preview" : "Full Tour"
        );
        break;
      case "playback-state":
        console.log(
          `${modePrefix} Playback ${message.data?.isPlaying ? "started" : "paused"} at ${message.data?.currentTime}s`,
        );
        // Also hide landing page when audio starts playing in teaser mode 
        if (isTeaserMode && showLandingPage && message.data?.isPlaying) {
          console.log(`${modePrefix} Audio started playing - hiding landing page (content is ready)`);
          setShowLandingPage(false);
        }
        break;
      case "time-update":
        // These fire frequently, so we'll only log occasionally
        if (Math.floor(message.data?.currentTime) % 10 === 0) {
          console.log(
            `${modePrefix} Time sync ${message.data?.currentTime}s / ${message.data?.duration}s`,
          );
        }
        break;
      case "seek":
        console.log(
          `${modePrefix} Seek from ${message.data?.previousTime}s to ${message.data?.currentTime}s`,
        );
        break;
      case "xr-scene-fully-ready":
        // Handle teaser preloading completion
        if (!isTeaserMode && teaserPreloading) {
          console.log("🎬 [PRELOAD] Teaser preloading completed successfully");
          setTeaserPreloaded(true);
          setTeaserPreloading(false);
        }
        // Hide landing page when XR scene is fully loaded in teaser mode
        if (isTeaserMode && showLandingPage) {
          console.log(`${modePrefix} XR scene fully ready - hiding landing page and revealing auto-playing scene`);
          setShowLandingPage(false);
        }
        break;
      case "xr-mode-change":
        // Hide landing page immediately when XR mode activates in teaser mode
        if (isTeaserMode && showLandingPage && message.data?.isXRMode) {
          console.log(`${modePrefix} XR mode activated - hiding landing page immediately`);
          setShowLandingPage(false);
        }
        // Enhanced XR mode logging
        const xrMessage = message as any;
        console.log(
          `${modePrefix} XR Mode ${xrMessage.data?.isXRMode ? "ENABLED" : "DISABLED"} for track: "${xrMessage.data?.trackData?.title}"`,
          "| Video URL:",
          xrMessage.data?.trackData?.xrSrc,
          "| Device Orientation:",
          xrMessage.data?.deviceOrientationPermission?.granted ? "GRANTED" : "DENIED",
        );
        break;
      case "track-change":
        console.log(
          `${modePrefix} Track changed to "${message.data?.trackData?.title}" (Index: ${message.data?.trackIndex})`,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
        );
        break;
      case "volume-change":
        console.log(
          `${modePrefix} Volume changed: muted=${message.data?.isMuted}, level=${message.data?.volume}`,
        );
        break;
      case "recenter":
        const recenterData = message.data as any;
        const success = recenterData?.success;
        if (success !== undefined) {
          console.log(`${modePrefix} Camera recenter ${success ? "successful" : "failed"}`, 
            success ? "" : `- ${recenterData?.error}`);
        } else {
          console.log(`${modePrefix} Camera recenter requested`);
        }
        break;
      case "device-orientation-permission":
        console.log(
          `${modePrefix} Device orientation permission:`,
          message.data?.granted ? "GRANTED" : "DENIED",
          "| Supported:",
          message.data?.supported,
        );
        break;
      default:
        console.log(`${modePrefix} Unknown message type:`, (message as any).type, (message as any).data);
    }
  };

  // Enhanced handleGetStarted with proper permission flow and background preloading
  const handleGetStarted = useCallback(
    async (isTeaserRequest: boolean = false) => {
      const modeConfig = isTeaserRequest ? TOUR_MODE_CONFIG.TEASER : TOUR_MODE_CONFIG.FULL;
      console.log(`🚀 Starting ${modeConfig.displayName}:`, modeConfig.description);
      
      setIsTeaserMode(isTeaserRequest);
      
      // Start background preloading immediately while permission is being requested
      console.log('🎯 Starting background preloading for all content...');
      // The AudioPlayer will automatically start preloading once it's rendered
      
      // Request device orientation permission - keep landing page visible during this process
      console.log('🎯 Requesting device orientation permission for XR experience...');
      const permissionResult = await requestDeviceOrientationPermission();
      
      console.log('🎯 Permission result:', permissionResult);
      setDeviceOrientationPermission(permissionResult);
      
      // For teaser mode, keep landing page visible until XR scene is fully ready
      if (isTeaserRequest) {
        console.log('🎬 Teaser mode - keeping landing page visible until XR scene is fully loaded');
        // Landing page will be hidden by XR loading completion in AudioPlayer
        
        // Add fallback timeout to ensure landing page doesn't get stuck forever
        setTimeout(() => {
          if (showLandingPage && isTeaserMode) {
            console.warn('🎬 Teaser landing page timeout - forcing hide after 15 seconds');
            setShowLandingPage(false);
          }
        }, 15000);
      } else {
        // For full tour, hide landing page after permission is handled
        console.log('🎯 Full tour mode - hiding landing page after permission handled');
        setShowLandingPage(false);
      }
      
      // Log mode-specific features and limitations
      console.log(`📋 ${modeConfig.displayName} Features:`, modeConfig.features);
      if (modeConfig.limitations.length > 0) {
        console.log(`⚠️ ${modeConfig.displayName} Limitations:`, modeConfig.limitations);
      }
    },
    [],
  );

  // Start teaser preloading immediately when app mounts
  useEffect(() => {
    console.log("🎯 App initialized - starting teaser preloading");
    
    // Start preloading teaser content in background
    const startTeaserPreload = () => {
      console.log("🎬 [PRELOAD] Starting teaser preload in background...");
      setTeaserPreloading(true);
      // The AudioPlayer will be mounted with preload mode to handle this
    };
    
    // Small delay to ensure DOM is ready
    const preloadTimer = setTimeout(startTeaserPreload, 100);
    
    return () => clearTimeout(preloadTimer);
  }, []);

  return (
    <div className={`dark viewport-fit bg-gradient-to-br from-slate-900 to-slate-800 ${APP_Z_LAYERS.BACKGROUND} overflow-hidden fixed inset-0 mobile-optimized`}>
      {/* Developer Configuration - Shown first before everything else */}
      {showDeveloperConfig && (
        <DeveloperConfig onConfigurationComplete={handleDeveloperConfigComplete} />
      )}
      
      {/* Mobile-First App Container - Using fixed viewport height to prevent scrolling */}
      {!showDeveloperConfig && (
        <div className={`fixed inset-0 w-full h-full max-w-none mx-auto flex flex-col safe-top safe-bottom safe-left safe-right ${isKeyboardOpen ? 'keyboard-adaptive' : ''} ${orientation === 'landscape' ? 'landscape-compact' : ''}`}>
            {/* Main Content Area - AudioPlayer fills available space */}
            <div className={`flex-1 h-full overflow-hidden ${APP_Z_LAYERS.MAIN_CONTENT}`}>
              <AudioPlayer
                onAudioMessage={handleAudioMessage}
                deviceOrientationPermission={
                  deviceOrientationPermission
                }
                isTeaserMode={isTeaserMode}
                teaserPreloading={teaserPreloading}
              />
            </div>

            {/* Landing Page Overlay - Renders on top when showLandingPage is true */}
            {showLandingPage && (
            <div className={`fixed inset-0 ${APP_Z_LAYERS.LANDING_OVERLAY} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col mobile-viewport compact-mobile short-viewport`}>
              {/* Landing Page Content - Optimized for mobile viewport */}
              <div className="flex-1 flex flex-col justify-between min-h-0 safe-all">
                {/* Top Section - Logo and Title - Compact spacing */}
                <div className="flex-shrink-0 text-center space-y-3 pt-4 sm:pt-8 px-4 sm:px-6">
                  {/* Logo Placeholder - Smaller on mobile */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>

                  {/* App Title - More compact */}
                  <div className="space-y-2">
                    <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-semibold leading-tight">
                      Historic Downtown
                    </h1>
                    <div className="space-y-1.5">
                      <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-sm mx-auto px-2">
                        Discover the rich history of our
                        downtown district through immersive
                        audio stories and XR experiences.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm">
                        <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>
                          Audio walking tour with XR content
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Section - Features Preview - Flexible spacing */}
                <div className="flex-1 flex flex-col justify-center space-y-3 px-4 sm:px-6 py-2">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-xs mx-auto">
                    <div className="bg-white/5 rounded-lg p-2.5 sm:p-3 border border-white/10 backdrop-blur-sm text-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto bg-blue-500/20 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                      </div>
                      <p className="text-white text-xs font-medium">
                        3 Historic Locations
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2.5 sm:p-3 border border-white/10 backdrop-blur-sm text-center">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto bg-purple-500/20 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2">
                        <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                      </div>
                      <p className="text-white text-xs font-medium">
                        XR Experiences
                      </p>
                    </div>
                  </div>

                  {/* Permission status indicator (only show if permission was requested) */}
                  {deviceOrientationPermission.requested && (
                    <div className="bg-white/5 rounded-lg p-2.5 sm:p-3 border border-white/10 backdrop-blur-sm max-w-xs mx-auto">
                      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
                        {deviceOrientationPermission.granted ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                            <span className="text-green-400">
                              XR permissions ready
                            </span>
                          </>
                        ) : deviceOrientationPermission.supported ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                            <span className="text-yellow-400">
                              XR permissions limited
                            </span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <span className="text-slate-400">
                              Desktop mode
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section - Action Buttons - Compact on mobile */}
                <div className="flex-shrink-0 space-y-2.5 sm:space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                  {/* Free Preview Button */}
                  <Button
                    onClick={() => handleGetStarted(true)}
                    disabled={teaserPreloading || !teaserPreloaded}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:opacity-75 text-white h-11 sm:h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] disabled:hover:scale-100 disabled:active:scale-100 border-0 text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      {teaserPreloading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          Loading Preview...
                        </>
                      ) : teaserPreloaded ? (
                        <>
                          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Try Free Preview
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          Preparing Preview...
                        </>
                      )}
                    </div>
                  </Button>

                  {/* Full Tour Button */}
                  <Button
                    onClick={() => handleGetStarted(false)}
                    className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 h-11 sm:h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] text-sm sm:text-base"
                  >
                    Start Full Tour
                  </Button>

                  {/* Enhanced disclaimer - More compact */}
                  <p className="text-slate-500 text-xs text-center leading-relaxed px-2">
                    Best experienced with headphones. XR features will request device permissions when needed.
                  </p>
                </div>
              </div>

              {/* Subtle animated background elements - Responsive sizing and positioning */}
              <div className={`absolute inset-0 overflow-hidden pointer-events-none ${APP_Z_LAYERS.DECORATIVE_ELEMENTS}`}>
                {/* Gradient orbs with mobile-optimized sizing */}
                <div className="absolute top-1/4 -left-12 sm:-left-16 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                <div
                  className="absolute bottom-1/4 -right-12 sm:-right-16 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-purple-500/10 rounded-full blur-2xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 bg-indigo-500/5 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "2s" }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}