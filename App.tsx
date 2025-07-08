import { useState, useCallback, useEffect } from "react";
import {
  AudioPlayer,
  AudioMessage,
} from "./components/AudioPlayer";
import { Button } from "./components/ui/button";
import {
  MapPin,
  Headphones,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Play,
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
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [isTeaserMode, setIsTeaserMode] = useState(false);
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
      case "xr-mode-change":
        console.log(
          `${modePrefix} XR Mode ${message.data?.isXRMode ? "ENABLED" : "DISABLED"} for track: "${message.data?.trackData?.title}"`,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
          "| Device Orientation:",
          message.data?.deviceOrientationPermission?.granted ? "GRANTED" : "DENIED",
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

  // Enhanced handleGetStarted with proper permission flow
  const handleGetStarted = useCallback(
    async (isTeaserRequest: boolean = false) => {
      const modeConfig = isTeaserRequest ? TOUR_MODE_CONFIG.TEASER : TOUR_MODE_CONFIG.FULL;
      console.log(`🚀 Starting ${modeConfig.displayName}:`, modeConfig.description);
      
      setIsTeaserMode(isTeaserRequest);
      setShowLandingPage(false);
      
      // Request device orientation permission immediately
      console.log('🎯 Requesting device orientation permission for XR experience...');
      const permissionResult = await requestDeviceOrientationPermission();
      
      console.log('🎯 Permission result:', permissionResult);
      setDeviceOrientationPermission(permissionResult);
      
      // Log mode-specific features and limitations
      console.log(`📋 ${modeConfig.displayName} Features:`, modeConfig.features);
      if (modeConfig.limitations.length > 0) {
        console.log(`⚠️ ${modeConfig.displayName} Limitations:`, modeConfig.limitations);
      }
    },
    [],
  );

  // Simplified initialization - no complex permission handling
  useEffect(() => {
    console.log("🎯 App initialized - XR permissions will be handled by A-Frame when needed");
  }, []);

  return (
    <div className={`dark min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 to-slate-800 ${APP_Z_LAYERS.BACKGROUND} overflow-hidden fixed inset-0 mobile-optimized`}>
      {/* Mobile-First App Container - Using fixed viewport height to prevent scrolling */}
      <div className={`fixed inset-0 w-full h-full max-w-none mx-auto flex flex-col safe-top safe-bottom safe-left safe-right ${isKeyboardOpen ? 'keyboard-adaptive' : ''} ${orientation === 'landscape' ? 'landscape-compact' : ''}`}>
          {/* Main Content Area - AudioPlayer fills available space */}
          <div className={`flex-1 h-full overflow-hidden ${APP_Z_LAYERS.MAIN_CONTENT}`}>
            <AudioPlayer
              onAudioMessage={handleAudioMessage}
              deviceOrientationPermission={
                deviceOrientationPermission
              }
              isTeaserMode={isTeaserMode}
            />
          </div>

          {/* Landing Page Overlay - Renders on top when showLandingPage is true */}
          {showLandingPage && (
            <div className={`fixed inset-0 ${APP_Z_LAYERS.LANDING_OVERLAY} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col safe-top safe-bottom safe-left safe-right`}>
              {/* Landing Page Content */}
              <div className="flex-1 flex flex-col justify-between p-4 pt-12 sm:p-6 sm:pt-16 md:p-8 md:pt-20">
                {/* Top Section - Logo and Title */}
                <div className="text-center space-y-6">
                  {/* Logo Placeholder */}
                  <div className="w-20 h-20 mx-auto bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <MapPin className="h-10 w-10 text-white" />
                  </div>

                  {/* App Title */}
                  <div className="space-y-3">
                    <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-semibold">
                      Historic Downtown
                    </h1>
                    <div className="space-y-2">
                      <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-lg mx-auto">
                        Discover the rich history of our
                        downtown district through immersive
                        audio stories and XR experiences.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Headphones className="h-4 w-4" />
                        <span>
                          Audio walking tour with XR content
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Section - Features Preview */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm text-center">
                      <div className="w-8 h-8 mx-auto bg-blue-500/20 rounded-lg flex items-center justify-center mb-2">
                        <MapPin className="h-4 w-4 text-blue-400" />
                      </div>
                      <p className="text-white text-xs font-medium">
                        3 Historic Locations
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm text-center">
                      <div className="w-8 h-8 mx-auto bg-purple-500/20 rounded-lg flex items-center justify-center mb-2">
                        <Smartphone className="h-4 w-4 text-purple-400" />
                      </div>
                      <p className="text-white text-xs font-medium">
                        XR Experiences
                      </p>
                    </div>
                  </div>

                  {/* Permission status indicator (only show if permission was requested) */}
                  {deviceOrientationPermission.requested && (
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        {deviceOrientationPermission.granted ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400">
                              XR permissions ready
                            </span>
                          </>
                        ) : deviceOrientationPermission.supported ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            <span className="text-yellow-400">
                              XR permissions limited
                            </span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-400">
                              Desktop mode
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section - Action Buttons */}
                <div className="space-y-3">
                  {/* Free Preview Button */}
                  <Button
                    onClick={() => handleGetStarted(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Try Free Preview
                    </div>
                  </Button>

                  {/* Full Tour Button */}
                  <Button
                    onClick={() => handleGetStarted(false)}
                    className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02]"
                  >
                    Start Full Tour
                  </Button>

                  {/* Enhanced disclaimer */}
                  <p className="text-slate-500 text-xs text-center leading-relaxed">
                    Best experienced with headphones. XR features will request device permissions when needed.
                  </p>
                </div>
              </div>

              {/* Subtle animated background elements - Responsive sizing */}
              <div className={`absolute inset-0 overflow-hidden pointer-events-none ${APP_Z_LAYERS.DECORATIVE_ELEMENTS}`}>
                {/* Gradient orbs with responsive sizing */}
                <div className="absolute top-1/4 -left-16 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                <div
                  className="absolute bottom-1/4 -right-16 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-purple-500/10 rounded-full blur-2xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 bg-indigo-500/5 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "2s" }}
                ></div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}