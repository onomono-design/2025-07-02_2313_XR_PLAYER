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

// Z-Index Layer System for App - Consistent with AudioPlayer
const APP_Z_LAYERS = {
  BACKGROUND: 'z-0',
  MAIN_CONTENT: 'z-10', 
  LANDING_OVERLAY: 'z-50',
  DECORATIVE_ELEMENTS: 'z-30'
} as const;

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
  const [isRequestingPermission, setIsRequestingPermission] =
    useState(false);

  // Handle audio sync messages from AudioPlayer
  const handleAudioMessage = (message: AudioMessage) => {
    console.log("🎵 Audio Sync Message:", message);

    // Enhanced message handling for 360° viewer integration
    // Messages are now properly routed to the embedded 360° viewer iframe
    switch (message.type) {
      case "init":
        console.log(
          "🎬 360° Viewer initialized with track:",
          message.data?.trackData?.title,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
        );
        break;
      case "playback-state":
        console.log(
          `⏯️  360° Viewer: Playback ${message.data?.isPlaying ? "started" : "paused"} at ${message.data?.currentTime}s`,
        );
        break;
      case "time-update":
        // These fire frequently, so we'll only log occasionally
        if (Math.floor(message.data?.currentTime) % 10 === 0) {
          console.log(
            `⏱️  360° Viewer: Time sync ${message.data?.currentTime}s / ${message.data?.duration}s`,
          );
        }
        break;
      case "seek":
        console.log(
          `⏩ 360° Viewer: Seek from ${message.data?.previousTime}s to ${message.data?.currentTime}s`,
        );
        break;
      case "track-change":
        console.log(
          `🎵 360° Viewer: Track changed to "${message.data?.trackData?.title}" (Index: ${message.data?.trackIndex})`,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
        );
        break;
      case "volume-change":
        console.log(
          `🔊 360° Viewer: Volume changed: muted=${message.data?.isMuted}, level=${message.data?.volume}`,
        );
        break;
      case "xr-mode-change":
        console.log(
          `🥽 360° Viewer: XR Mode ${message.data?.isXRMode ? "ENABLED" : "DISABLED"} for track: "${message.data?.trackData?.title}"`,
          "| Video URL:",
          message.data?.trackData?.xrSrc,
          "| Device Orientation:",
          message.data?.deviceOrientationPermission?.granted ? "GRANTED" : "DENIED",
        );
        break;
      case "recenter":
        console.log("🎯 360° Viewer: Camera recenter requested");
        break;
      case "device-orientation-permission":
        console.log(
          "📱 360° Viewer: Device orientation permission:",
          message.data?.granted ? "GRANTED" : "DENIED",
          "| Supported:",
          message.data?.supported,
        );
        break;
      default:
        console.log("📨 360° Viewer: Unknown message type:", (message as any).type, (message as any).data);
    }
  };

  // Request device orientation permission
  const requestDeviceOrientationPermission =
    useCallback(async (): Promise<DeviceOrientationPermissionState> => {
      const result: DeviceOrientationPermissionState = {
        granted: false,
        requested: true,
        supported: false,
      };

      // Check if DeviceOrientationEvent is supported
      if (typeof DeviceOrientationEvent === "undefined") {
        result.error = "Device orientation not supported";
        return result;
      }

      result.supported = true;

      // For iOS 13+ devices, we need to request permission
      if (
        typeof (DeviceOrientationEvent as any)
          .requestPermission === "function"
      ) {
        try {
          console.log(
            "🧭 Requesting iOS device orientation permission..."
          );
          const permission = await (
            DeviceOrientationEvent as any
          ).requestPermission();

          if (permission === "granted") {
            result.granted = true;
            console.log(
              "✅ iOS device orientation permission granted"
            );
          } else {
            result.error = `iOS permission ${permission}`;
            console.log(
              "❌ iOS device orientation permission denied:",
              permission
            );
          }
        } catch (error) {
          result.error = `iOS permission error: ${error}`;
          console.error(
            "❌ Error requesting iOS device orientation permission:",
            error
          );
        }
      } else {
        // For Android and older iOS devices, permission is automatically granted
        result.granted = true;
        console.log(
          "✅ Device orientation permission automatically granted (non-iOS 13+)"
        );
      }

      return result;
    }, []);

  // Enhanced handleGetStarted to support both full tour and teaser mode
  const handleGetStarted = useCallback(
    async (isTeaserRequest: boolean = false) => {
      setIsRequestingPermission(true);
      setIsTeaserMode(isTeaserRequest);

      try {
        // Check if this is a mobile device (basic check)
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          );

        if (isMobile) {
          console.log(
            `📱 Mobile device detected, requesting device orientation permission for ${isTeaserRequest ? "teaser" : "full tour"} mode...`
          );
          const permissionResult =
            await requestDeviceOrientationPermission();
          setDeviceOrientationPermission(permissionResult);

          // Store permission in sessionStorage for the tour duration
          sessionStorage.setItem(
            "deviceOrientationPermission",
            JSON.stringify(permissionResult)
          );

          // Log the result for debugging
          if (permissionResult.granted) {
            console.log(
              `🎉 Device orientation permission granted and stored for ${isTeaserRequest ? "teaser" : "full tour"} session`
            );
          } else {
            console.log(
              `⚠️ Device orientation permission not granted for ${isTeaserRequest ? "teaser" : "full tour"}:`,
              permissionResult.error
            );
          }
        } else {
          console.log(
            `🖥️ Desktop device detected for ${isTeaserRequest ? "teaser" : "full tour"}, skipping device orientation permission`
          );
          const desktopResult: DeviceOrientationPermissionState =
            {
              granted: true, // Desktop doesn't need this permission
              requested: true,
              supported: false, // Not needed on desktop
            };
          setDeviceOrientationPermission(desktopResult);
          sessionStorage.setItem(
            "deviceOrientationPermission",
            JSON.stringify(desktopResult)
          );
        }

        // Small delay to show any permission UI
        await new Promise((resolve) =>
          setTimeout(resolve, 500),
        );
      } catch (error) {
        console.error(
          `❌ Error during ${isTeaserRequest ? "teaser" : "full tour"} initialization:`,
          error
        );
        const errorResult: DeviceOrientationPermissionState = {
          granted: false,
          requested: true,
          supported: false,
          error: `Initialization error: ${error}`,
        };
        setDeviceOrientationPermission(errorResult);
      } finally {
        setIsRequestingPermission(false);
        setShowLandingPage(false);
      }
    },
    [requestDeviceOrientationPermission],
  );

  // Force orientation permission request if supported but not yet requested
  const requestOrientationPermissionIfNeeded = useCallback(async () => {
    try {
      // Check if DeviceOrientationEvent.requestPermission is available (iOS 13+)
      const isIOS13Plus = typeof (DeviceOrientationEvent as any).requestPermission === 'function';
      
      // Check if we already tried requesting permission
      const permissionState = deviceOrientationPermission;
      
      // Request permission if:
      // 1. We're on iOS 13+ (needs explicit permission)
      // 2. We haven't already requested permission
      if (isIOS13Plus && (!permissionState.requested || !permissionState.granted)) {
        console.log("🧭 Force-requesting device orientation permission for iOS");
        const newPermissionState = await requestDeviceOrientationPermission();
        setDeviceOrientationPermission(newPermissionState);
        
        // Store the new state
        sessionStorage.setItem(
          "deviceOrientationPermission",
          JSON.stringify(newPermissionState)
        );
        
        return newPermissionState;
      }
      
      return permissionState;
    } catch (error) {
      console.error("Error checking orientation permission:", error);
      return deviceOrientationPermission;
    }
  }, [deviceOrientationPermission, requestDeviceOrientationPermission]);
  
  // Check for browser compatibility on component mount
  // and request permission on iOS specifically
  useEffect(() => {
    // Detect if we're on iOS (where permission is needed)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // Try to request permission on initial load for iOS
      requestOrientationPermissionIfNeeded();
    }
    
    // Check for existing permission in storage
    const storedPermission = sessionStorage.getItem(
      "deviceOrientationPermission",
    );
    if (storedPermission) {
      try {
        const parsedPermission = JSON.parse(storedPermission);
        setDeviceOrientationPermission(parsedPermission);
        console.log(
          "🔄 Restored device orientation permission from session:",
          parsedPermission,
        );
      } catch (error) {
        console.error(
          "❌ Error parsing stored permission:",
          error,
        );
      }
    }
  }, [requestOrientationPermissionIfNeeded]);

  return (
    <div className={`dark min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 to-slate-800 ${APP_Z_LAYERS.BACKGROUND} overflow-hidden fixed inset-0`}>
      {/* Mobile-First App Container - Using fixed viewport height to prevent scrolling */}
      <div className="fixed inset-0 w-full h-full max-w-none mx-auto flex flex-col safe-top safe-bottom safe-left safe-right">
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
                    disabled={isRequestingPermission}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
                  >
                    {isRequestingPermission ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Setting up preview...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Try Free Preview
                      </div>
                    )}
                  </Button>

                  {/* Full Tour Button */}
                  <Button
                    onClick={() => handleGetStarted(false)}
                    disabled={isRequestingPermission}
                    className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isRequestingPermission ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                        Setting up full tour...
                      </div>
                    ) : (
                      "Start Full Tour"
                    )}
                  </Button>

                  {/* Enhanced disclaimer */}
                  <p className="text-slate-500 text-xs text-center leading-relaxed">
                    {isRequestingPermission
                      ? "Requesting device permissions for the best XR experience..."
                      : "Best experienced with headphones. XR features require device orientation access."}
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