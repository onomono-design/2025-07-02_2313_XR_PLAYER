import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { XRScene } from './XRScene';
import { ImageSlider } from './ImageSlider';
import { AudioSlider } from './ui/audio-slider';
import { DeveloperConfigSelection } from './DeveloperConfig';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  List,
  ExternalLink,
  X,
  Glasses,
  RotateCcw,
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
  Info,
  ChevronUp,
  ChevronDown,
  Loader2,
  Smartphone,
  AlertTriangle,
  MapPin,
  ImageIcon
} from 'lucide-react';

// Z-Index Layer System - Organized hierarchy to prevent conflicts
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
} as const;

interface TourImageData {
  url: string;
  description?: string;
  title?: string;
}

interface TourChapter {
  chapterName: string;
  chapterOrder: number;
  tourName: string;
  chapterScript: string;
  audio_src: string;
  isXR: boolean;
  xr_src: string;
  thumbnail: string[] | TourImageData[];
  isTeaser: boolean;
  outroCTA_timeIn: string;
  outroCTA_backlink: string;
}

interface TourConfig {
  tour: {
    tourName: string;
    description: string;
    totalChapters: number;
    chapters: TourChapter[];
  };
}

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  src: string;
  script?: string;
  thumbnails?: string[] | TourImageData[];
  isXR?: boolean;
  xrSrc?: string;
  isTeaser?: boolean;
  teaserTimeIn?: number;
  teaserBacklink?: string;
}

// Device orientation permission types
interface DeviceOrientationPermissionState {
  granted: boolean;
  requested: boolean;
  supported: boolean;
  error?: string;
}

// XR Scene Integration Messages

// Audio sync message types for iframe communication - Updated for 360° viewer protocol
export interface AudioSyncMessage {
  type: 'playback-state' | 'time-update' | 'seek' | 'track-change' | 'volume-change' | 'init' | 'recenter' | 'xr-mode-change' | 'device-orientation-permission' | 'xr-scene-fully-ready';
  timestamp: number;
  data?: any;
}

export interface PlaybackStateMessage extends AudioSyncMessage {
  type: 'playback-state';
  data: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  };
}

export interface TimeUpdateMessage extends AudioSyncMessage {
  type: 'time-update';
  data: {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
  };
}

export interface SeekMessage extends AudioSyncMessage {
  type: 'seek';
  data: {
    currentTime: number;
    previousTime: number;
  };
}

export interface TrackChangeMessage extends AudioSyncMessage {
  type: 'track-change';
  data: {
    trackIndex: number;
    trackData: {
      id: number;
      title: string;
      xrSrc?: string;
      duration: number;
      script?: string;
      isXR: boolean;
    };
    currentTime: number;
  };
}

export interface VolumeChangeMessage extends AudioSyncMessage {
  type: 'volume-change';
  data: {
    isMuted: boolean;
    volume: number;
  };
}

export interface InitMessage extends AudioSyncMessage {
  type: 'init';
  data: {
    trackData: Track;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    deviceOrientationPermission: DeviceOrientationPermissionState;
  };
}

export interface RecenterMessage extends AudioSyncMessage {
  type: 'recenter';
  data: {};
}

export interface XRModeChangeMessage extends AudioSyncMessage {
  type: 'xr-mode-change';
  data: {
    isXRMode: boolean;
    trackData?: Track;
    deviceOrientationPermission: DeviceOrientationPermissionState;
  };
}

export interface DeviceOrientationPermissionMessage extends AudioSyncMessage {
  type: 'device-orientation-permission';
  data: DeviceOrientationPermissionState;
}

export interface XRSceneFullyReadyMessage extends AudioSyncMessage {
  type: 'xr-scene-fully-ready';
  data: {
    xrSceneReady: boolean;
    videosphereMaterialReady: boolean;
    timestamp: number;
  };
}

export type AudioMessage = PlaybackStateMessage | TimeUpdateMessage | SeekMessage | TrackChangeMessage | VolumeChangeMessage | InitMessage | RecenterMessage | XRModeChangeMessage | DeviceOrientationPermissionMessage | XRSceneFullyReadyMessage;

interface AudioPlayerProps {
  onAudioMessage?: (message: AudioMessage) => void;
  deviceOrientationPermission?: DeviceOrientationPermissionState;
  isTeaserMode?: boolean;
  teaserPreloading?: boolean;
  developerConfig?: DeveloperConfigSelection;
}

// Enhanced configuration with teaser-specific content
const defaultTourConfig: TourConfig = {
  tour: {
    tourName: "Historic Downtown Walking Tour",
    description: "Explore the rich history of our downtown district",
    totalChapters: 5,
    chapters: [
      {
        chapterName: "Welcome to Chinatown",
        chapterOrder: 1,
        tourName: "Historic Downtown Walking Tour",
        chapterScript: "Welcome to our historic Chinatown district, where centuries of history come alive through stunning architecture and vibrant community spaces. This area has been the heart of our city since 1847, when the first settlers established their trading post right here on this very street.",
        audio_src: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/WALKING+TOURS/2025-03-15-CHINATOWN/2025-03-15-CHINATOWN-MP3S/2025-03-14-CHINATOWN-003-COMPRESSED.mp3",
        isXR: true,
        xr_src: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/2025-06-06_HLS-CHUNKING-TEST/master.m3u8",
        thumbnail: [
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1519302959554-a75be0afc82a?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1555274175-6cbf6f3b137b?w=400&h=400&fit=crop&crop=center"
        ],
        isTeaser: false,
        outroCTA_timeIn: "",
        outroCTA_backlink: ""
      },
      {
        chapterName: "The Old Town Square",
        chapterOrder: 2,
        tourName: "Historic Downtown Walking Tour",
        chapterScript: "The town square before you has been the heart of our community for over 150 years. Originally designed as a marketplace, it has witnessed countless celebrations, gatherings, and historic events that shaped our city's identity. The beautiful fountain at the center was added in 1923 to commemorate our veterans.",
        audio_src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        isXR: true, // Make this XR for teaser mode
        xr_src: "https://example.com/ar-town-square", // Add XR source for teaser
        thumbnail: [
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1605106715994-18d3fecffb98?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop&crop=center"
        ],
        isTeaser: true,
        outroCTA_timeIn: "01:00", // 1 minute duration for teaser
        outroCTA_backlink: "https://example.com/full-tour-purchase"
      },
      {
        chapterName: "The Historic Bank Building", 
        chapterOrder: 3,
        tourName: "Historic Downtown Walking Tour",
        chapterScript: "This imposing brick structure served as our town's first bank from 1889 to 1965. Built in the Romanesque Revival style, it features stunning arched windows and intricate stonework that exemplifies the craftsmanship of the era. The building now houses our local history museum, preserving the stories of generations who built this community.",
        audio_src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        isXR: false,
        xr_src: "",
        thumbnail: [
          "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1519338381761-c7523edc1f46?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1576662712957-9c79ae1280f8?w=400&h=400&fit=crop&crop=center"
        ],
        isTeaser: false,
        outroCTA_timeIn: "",
        outroCTA_backlink: ""
      }
    ]
  }
};

// Teaser-specific configuration (single chapter) - Updated with Chinatown content
const teaserTourConfig: TourConfig = {
  tour: {
    tourName: "Historic Chinatown Preview",
    description: "Experience a taste of our immersive Chinatown tour",
    totalChapters: 1,
    chapters: [
      {
        chapterName: "Welcome to Chinatown - Preview",
        chapterOrder: 1,
        tourName: "Historic Chinatown Preview",
        chapterScript: "Welcome to a preview of our historic Chinatown district. In this immersive 360° experience, you'll discover the rich cultural heritage and fascinating stories that have shaped this vibrant community for over a century.",
        audio_src: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/WALKING+TOURS/2025-03-15-CHINATOWN/2025-03-15-CHINATOWN-MP3S/2025-03-14-CHINATOWN-003-COMPRESSED.mp3",
        isXR: true,
        xr_src: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/2025-06-06_HLS-CHUNKING-TEST/master.m3u8",
        thumbnail: [
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1605106715994-18d3fecffb98?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop&crop=center"
        ],
        isTeaser: true,
        outroCTA_timeIn: "00:59", // Show CTA at 59 seconds
        outroCTA_backlink: "https://example.com/full-tour-purchase"
      }
    ]
  }
};

export function AudioPlayer({ onAudioMessage, deviceOrientationPermission, isTeaserMode = false, teaserPreloading = false, developerConfig }: AudioPlayerProps) {
  // Audio state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [tourConfig, setTourConfig] = useState<TourConfig | null>(null);
  
  // UI state
  const [isXRMode, setIsXRMode] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isXRLoading, setIsXRLoading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [xrScenesPreloaded, setXRScenesPreloaded] = useState<{[key: string]: boolean}>({});
  
  // Mobile-specific state
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'fast' | 'slow' | 'unknown'>('unknown');
  
  // Image gallery state
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [showFullscreenInfo, setShowFullscreenInfo] = useState(false);
  
  // Enhanced fullscreen pan/zoom state
  const [fullscreenPanX, setFullscreenPanX] = useState(0);
  const [fullscreenPanY, setFullscreenPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartY, setPanStartY] = useState(0);
  const [lastPanX, setLastPanX] = useState(0);
  const [lastPanY, setLastPanY] = useState(0);
  const fullscreenImageRef = useRef<HTMLImageElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  
  // Measurements
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Preloading state
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [preloadedXRScenes, setPreloadedXRScenes] = useState<Set<string>>(new Set());
  const [trackImagesPreloaded, setTrackImagesPreloaded] = useState<{[key: number]: boolean}>({});
  const [audioPreloaded, setAudioPreloaded] = useState<{[key: string]: boolean}>({});
  const [imagesLoaded, setImagesLoaded] = useState<{[key: string]: boolean}>({});
  
  // Gesture handling state
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  // XR Scene state - Always maintain scene for seamless toggling
  const [xrSceneReady, setXRSceneReady] = useState(false);
  const [xrSceneInitialized, setXRSceneInitialized] = useState(false);
  const [xrSceneVisible, setXRSceneVisible] = useState(false);
  
  // Track videosphere material loading state (separate from scene ready)
  const [videosphereMaterialReady, setVideosphereMaterialReady] = useState(false);
  
  // Track if we've already auto-played in teaser mode to prevent repeated auto-play
  const hasAutoPlayedTeaser = useRef(false);

  // Constrained drag slider state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoTransitionDirection, setAutoTransitionDirection] = useState<'next' | 'prev' | null>(null);

  // Audio sync message dispatch with enhanced protocol support
  const sendAudioMessage = useCallback((message: AudioMessage) => {
    if (onAudioMessage) {
      onAudioMessage({
        ...message,
        timestamp: performance.now() // Use high-precision timing
      });
    }
  }, [onAudioMessage]);

  // XR Scene Integration - Send commands to XR scene  
  // Note: XR Scene commands are handled through props and React state
  // No direct messaging needed with Three.js component

  // XR Scene ready callback - Auto-play audio immediately when ready in teaser mode
  const handleXRSceneReady = useCallback(() => {
    console.log('🎯 XR Scene ready callback triggered - clearing loading state');
    setXRSceneReady(true);
    setIsXRLoading(false); // Clear loading state when scene is actually ready
    console.log('✅ XR Loading state cleared - scene is ready');
    
    // Check if both scene and material are ready to send fully ready message and auto-play
    if (videosphereMaterialReady) {
      console.log('🎯 Both XR scene and videosphere material ready - sending fully ready message');
      sendAudioMessage({
        type: 'xr-scene-fully-ready',
        timestamp: performance.now(),
        data: {
          xrSceneReady: true,
          videosphereMaterialReady: true,
          timestamp: performance.now()
        }
      });
      
      // Auto-play immediately in teaser mode (user clicked "Try Free Preview" = consent)
      if (isTeaserMode && audioRef.current && !hasAutoPlayedTeaser.current) {
        hasAutoPlayedTeaser.current = true;
        console.log('🎬 Auto-playing teaser immediately - user clicked preview button (consent given)');
        
        // Force play the audio since user already interacted with the page
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              console.log('🎬 ✅ Auto-play successful for teaser mode');
              
              // Send playback state message
              sendAudioMessage({
                type: 'playback-state',
                timestamp: performance.now(),
                data: {
                  isPlaying: true,
                  currentTime: audioRef.current?.currentTime || 0,
                  duration: audioRef.current?.duration || 0
                }
              });
            })
            .catch((error) => {
              console.warn('🎬 ⚠️ Auto-play failed - will require manual play:', error);
              setIsPlaying(false);
              hasAutoPlayedTeaser.current = false; // Reset flag so user can manually play
            });
        }
      }
    }
  }, [isTeaserMode, videosphereMaterialReady]);

  // Videosphere material ready callback - Auto-play audio immediately when ready in teaser mode
  const handleVideosphereMaterialReady = useCallback(() => {
    console.log('🎯 Videosphere material ready callback triggered');
    setVideosphereMaterialReady(true);
    
    // Check if both scene and material are ready to send fully ready message and auto-play
    if (xrSceneReady) {
      console.log('🎯 Both XR scene and videosphere material ready - sending fully ready message');
      sendAudioMessage({
        type: 'xr-scene-fully-ready',
        timestamp: performance.now(),
        data: {
          xrSceneReady: true,
          videosphereMaterialReady: true,
          timestamp: performance.now()
        }
      });
      
      // Auto-play immediately in teaser mode (user clicked "Try Free Preview" = consent)
      if (isTeaserMode && audioRef.current && !hasAutoPlayedTeaser.current) {
        hasAutoPlayedTeaser.current = true;
        console.log('🎬 Auto-playing teaser immediately - user clicked preview button (consent given)');
        
        // Force play the audio since user already interacted with the page
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              console.log('🎬 ✅ Auto-play successful for teaser mode');
              
              // Send playback state message
              sendAudioMessage({
                type: 'playback-state',
                timestamp: performance.now(),
                data: {
                  isPlaying: true,
                  currentTime: audioRef.current?.currentTime || 0,
                  duration: audioRef.current?.duration || 0
                }
              });
            })
            .catch((error) => {
              console.warn('🎬 ⚠️ Auto-play failed - will require manual play:', error);
              setIsPlaying(false);
              hasAutoPlayedTeaser.current = false; // Reset flag so user can manually play
            });
        }
      }
    }
  }, [isTeaserMode, xrSceneReady]);

  // Handle seek requests from XR viewer
  const handleXRViewerSeek = useCallback((time: number) => {
    console.log('🎯 XR Viewer seek requested:', time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
    
    // Send seek message to parent
    sendAudioMessage({
      type: 'seek',
      timestamp: performance.now(),
      data: {
        currentTime: time,
        previousTime: currentTime
      }
    });
  }, [currentTime]);

  // XR Scene initialization - REMOVED: this was bypassing the iframe ready callback
  // The XR scene ready state should ONLY be set when the iframe sends the 'ready' message
  // useEffect(() => {
  //   if (isXRMode && tracks.length > 0) {
  //     handleXRSceneReady(); // ❌ This was bypassing the iframe loading!
  //   }
  // }, [isXRMode, tracks.length, handleXRSceneReady]);

  // Send device orientation permission status when it changes
  useEffect(() => {
    if (deviceOrientationPermission && onAudioMessage) {
      sendAudioMessage({
        type: 'device-orientation-permission',
        timestamp: performance.now(),
        data: deviceOrientationPermission
      });
    }
  }, [deviceOrientationPermission, onAudioMessage]);



  // Initialize XR scene early but keep hidden until needed
  useEffect(() => {
    if (tracks.length > 0 && tracks[currentTrack]?.isXR && !xrSceneInitialized) {
      console.log('🎯 Initializing XR scene in background for seamless transition', {
        trackTitle: tracks[currentTrack]?.title,
        xrSrc: tracks[currentTrack]?.xrSrc
      });
      setXRSceneInitialized(true);
    }
  }, [tracks, currentTrack, xrSceneInitialized]);

  // Auto-start XR mode when in teaser mode
  useEffect(() => {
    if (isTeaserMode && tracks.length > 0 && !isXRLoading && !isXRMode) {
      console.log('🎬 Auto-starting XR mode for teaser');
      
      setIsXRLoading(true);
      setXRSceneReady(false);
      setVideosphereMaterialReady(false);
      hasAutoPlayedTeaser.current = false;
      
      // Activate XR mode immediately
      setIsXRMode(true);
      setXRSceneVisible(true);
      
      // Send XR mode change message
      sendAudioMessage({
        type: 'xr-mode-change',
        timestamp: performance.now(),
        data: {
          isXRMode: true,
          trackData: tracks[currentTrack],
          deviceOrientationPermission: deviceOrientationPermission || {
            granted: false,
            requested: false,
            supported: false
          }
        }
      });
      
      // Fallback timeout to clear loading state
      setTimeout(() => {
        if (isXRLoading && isTeaserMode) {
          console.warn('🎬 Teaser XR scene loading timeout - forcing ready states');
          setIsXRLoading(false);
          setXRSceneReady(true);
          setVideosphereMaterialReady(true);
          
          sendAudioMessage({
            type: 'xr-scene-fully-ready',
            timestamp: performance.now(),
            data: {
              xrSceneReady: true,
              videosphereMaterialReady: true,
              timestamp: performance.now()
            }
          });
          
          // Auto-play on timeout in teaser mode
          if (audioRef.current && !hasAutoPlayedTeaser.current) {
            hasAutoPlayedTeaser.current = true;
            
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                sendAudioMessage({
                  type: 'playback-state',
                  timestamp: performance.now(),
                  data: {
                    isPlaying: true,
                    currentTime: audioRef.current?.currentTime || 0,
                    duration: audioRef.current?.duration || 0
                  }
                });
              })
              .catch(() => {
                setIsPlaying(false);
                hasAutoPlayedTeaser.current = false;
              });
          }
        }
      }, 6000);
    }
  }, [isTeaserMode, tracks.length, isXRLoading, isXRMode, deviceOrientationPermission, currentTrack, sendAudioMessage]);

  // Send XR scene initialization when XR mode loads
  useEffect(() => {
    if (isXRMode && xrSceneReady) {
      console.log('🎯 XR Scene initialized for track:', tracks[currentTrack]?.title);
      
      // Note: Auto-play is now handled by videosphere material ready callback
      // This ensures audio doesn't start until videosphere material is fully loaded
    }
  }, [isXRMode, xrSceneReady, tracks, currentTrack]);

  // Enhanced mobile device and capability detection
  useEffect(() => {
    const detectDeviceCapabilities = () => {
      const userAgent = navigator.userAgent;
      
      // Mobile device detection
      const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(userAgent);
      const isIOSSafari = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isAndroidChrome = /Android/.test(userAgent) && /Chrome/.test(userAgent);
      
      setIsMobileDevice(isMobile);
      
      // Low-end device detection
      const isLowEnd = (
        navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
      ) || (
        'deviceMemory' in navigator && (navigator as any).deviceMemory <= 4
      ) || (
        /Android [1-4]\./.test(userAgent) ||
        /iPhone OS [1-9]_/.test(userAgent)
      );
      setIsLowEndDevice(!!isLowEnd);
      
      // Network quality detection
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          const downlink = connection.downlink;
          
          if (effectiveType === '4g' && downlink > 5) {
            setNetworkQuality('fast');
          } else if (effectiveType === '4g' || effectiveType === '3g') {
            setNetworkQuality(downlink < 2 ? 'slow' : 'fast');
          } else {
            setNetworkQuality('slow');
          }
          
          connection.addEventListener('change', () => {
            const newType = connection.effectiveType;
            const newDownlink = connection.downlink;
            
            if (newType === '4g' && newDownlink > 5) {
              setNetworkQuality('fast');
            } else if (newType === '4g' || newType === '3g') {
              setNetworkQuality(newDownlink < 2 ? 'slow' : 'fast');
            } else {
              setNetworkQuality('slow');
            }
          });
        }
      }
      
      // Apply optimizations for mobile
      if (isMobile) {
        // iOS Safari optimizations
        if (isIOSSafari) {
          const metaViewport = document.querySelector('meta[name="viewport"]');
          if (metaViewport) {
            metaViewport.setAttribute('content', 
              'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
          }
          document.documentElement.style.setProperty('overscroll-behavior', 'none');
        }
        
        // Android Chrome optimizations
        if (isAndroidChrome) {
          document.documentElement.style.setProperty('touch-action', 'manipulation');
        }
        
        // General mobile optimizations
        document.documentElement.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        document.documentElement.style.setProperty('user-select', 'none');
      }
    };

    detectDeviceCapabilities();
  }, []);

  // Measure container dimensions
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = {
          width: rect.width,
          height: rect.height
        };
        console.log('📏 Container dimensions measured:', newDimensions);
        setContainerDimensions(newDimensions);
      }
    };

    // Initial measurement
    measureContainer();
    
    // Add resize listener
    const resizeObserver = new ResizeObserver(measureContainer);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Helper functions for image handling
  const getImageUrl = (image: string | TourImageData): string => {
    return typeof image === 'string' ? image : image.url;
  };

  const getImageDescription = (image: string | TourImageData): string | undefined => {
    return typeof image === 'string' ? undefined : image.description;
  };

  const getImageTitle = (image: string | TourImageData): string | undefined => {
    return typeof image === 'string' ? undefined : image.title;
  };

  // Convert tour chapters to tracks format
  const convertChaptersToTracks = (config: TourConfig): Track[] => {
    return config.tour.chapters.map((chapter) => {
      const firstThumbnail = chapter.thumbnail[0];
      const defaultCover = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center";
      
      return {
        id: chapter.chapterOrder,
        title: chapter.chapterName,
        artist: config.tour.tourName,
        album: config.tour.description,
        duration: 240, // Default duration, will be updated when audio loads
        cover: firstThumbnail ? getImageUrl(firstThumbnail) : defaultCover,
        src: chapter.audio_src,
        script: chapter.chapterScript,
        thumbnails: chapter.thumbnail,
        isXR: chapter.isXR,
        xrSrc: chapter.xr_src,
        isTeaser: chapter.isTeaser,
        teaserTimeIn: chapter.outroCTA_timeIn ? convertTimeToSeconds(chapter.outroCTA_timeIn) : undefined,
        teaserBacklink: chapter.outroCTA_backlink
      };
    });
  };

  // Helper function to convert MM:SS to seconds
  const convertTimeToSeconds = (timeString: string): number => {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
  };

  // Preload images for a track
  const preloadTrackImages = async (track: Track): Promise<void> => {
    if (trackImagesPreloaded[track.id]) return;
    
    setIsLoadingImages(true);
    const imagesToLoad = track.thumbnails 
      ? track.thumbnails.map(getImageUrl)
      : [track.cover];
    
    const preloadPromises = imagesToLoad.map((src) => {
      return new Promise<void>((resolve) => {
        if (imagesLoaded[src]) {
          resolve();
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          setImagesLoaded(prev => ({ ...prev, [src]: true }));
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}`);
          // Mark as loaded to prevent infinite loading
          setImagesLoaded(prev => ({ ...prev, [src]: true }));
          resolve();
        };
        img.src = src;
      });
    });

    try {
      await Promise.all(preloadPromises);
      setTrackImagesPreloaded(prev => ({ ...prev, [track.id]: true }));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Preload audio for a track
  const preloadTrackAudio = async (track: Track): Promise<void> => {
    if (!track.src || audioPreloaded[track.src]) return;
    
    console.log('🎵 Pre-loading audio for track:', track.title);
    
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = track.src;
      
      // Listen for when enough data is loaded
      const handleCanPlay = () => {
        console.log('🎵 Audio pre-loaded successfully:', track.title);
        setAudioPreloaded(prev => ({ ...prev, [track.src]: true }));
        cleanup();
      };
      
      const handleError = () => {
        console.warn('🎵 Failed to preload audio:', track.title);
        setAudioPreloaded(prev => ({ ...prev, [track.src]: true })); // Mark as loaded to prevent retries
        cleanup();
      };
      
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
      
      audio.addEventListener('canplaythrough', handleCanPlay);
      audio.addEventListener('error', handleError);
      
      // Timeout cleanup after 15 seconds
      setTimeout(() => {
        if (!audioPreloaded[track.src]) {
          console.warn('🎵 Audio pre-load timeout:', track.title);
          setAudioPreloaded(prev => ({ ...prev, [track.src]: true }));
          cleanup();
        }
      }, 15000);
      
    } catch (error) {
      console.error('🎵 Failed to preload audio:', error);
      setAudioPreloaded(prev => ({ ...prev, [track.src]: true }));
    }
  };

  // Preload A-frame scene for XR tracks
  const preloadXRScene = async (xrSrc: string): Promise<void> => {
    if (!xrSrc || xrScenesPreloaded[xrSrc]) return;
    
    console.log('🎯 Pre-loading A-frame scene:', xrSrc);
    
    try {
      // Create a hidden iframe to pre-load the A-frame scene
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.top = '-1000px';
      iframe.style.left = '-1000px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      
      const baseUrl = './360viewer-headless.html';
      const params = new URLSearchParams({
        video: xrSrc,
        autoPreload: 'true',
        embedded: 'true',
        preloadOnly: 'true', // Special flag for pre-loading only
        origin: window.location.origin
      });
      
      iframe.src = `${baseUrl}?${params.toString()}`;
      
      // Add to DOM to start loading
      document.body.appendChild(iframe);
      
      // Listen for ready message
      const handlePreloadMessage = (event: MessageEvent) => {
        if (event.data.channel === 'viewer-360' && event.data.type === 'ready') {
          console.log('🎯 A-frame scene pre-loaded successfully:', xrSrc);
          setXRScenesPreloaded(prev => ({ ...prev, [xrSrc]: true }));
          
          // Clean up
          document.body.removeChild(iframe);
          window.removeEventListener('message', handlePreloadMessage);
        }
      };
      
      window.addEventListener('message', handlePreloadMessage);
      
      // Timeout cleanup after 10 seconds
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          console.warn('🎯 A-frame scene pre-load timeout:', xrSrc);
          document.body.removeChild(iframe);
          window.removeEventListener('message', handlePreloadMessage);
          // Mark as preloaded to prevent retries
          setXRScenesPreloaded(prev => ({ ...prev, [xrSrc]: true }));
        }
      }, 10000);
      
    } catch (error) {
      console.error('🎯 Failed to preload A-frame scene:', error);
      // Mark as preloaded to prevent retries
      setXRScenesPreloaded(prev => ({ ...prev, [xrSrc]: true }));
    }
  };

  // Convert developer config to tour config format
  const convertDeveloperConfigToTourConfig = (devConfig: DeveloperConfigSelection): TourConfig => {
    if (!devConfig.mediaData) {
      // Fallback to default configuration if no media data
      return isTeaserMode ? teaserTourConfig : defaultTourConfig;
    }

    if (devConfig.mode === 'teaser') {
      // Convert teaser data to tour config
      const teaserData = devConfig.mediaData;
      return {
        tour: {
          tourName: teaserData.title || 'Tour Preview',
          description: teaserData.description || 'Experience a preview of this tour',
          totalChapters: 1,
          chapters: [
            {
              chapterName: teaserData.title || 'Preview',
              chapterOrder: 1,
              tourName: teaserData.title || 'Tour Preview',
              chapterScript: teaserData.description || 'Experience a preview of this tour',
              audio_src: teaserData.audio_src || '',
              isXR: !!teaserData.video_src,
              xr_src: teaserData.video_src || '',
              thumbnail: teaserData.thumbnails || [],
              isTeaser: true,
              outroCTA_timeIn: Math.floor(teaserData.duration - 1).toString().padStart(2, '0') + ':00',
              outroCTA_backlink: 'https://example.com/full-tour-purchase'
            }
          ]
        }
      };
    } else {
      // Convert full tour data to tour config
      const fullTourData = devConfig.mediaData;
      const chapters = fullTourData.chapters?.map((chapter: any, index: number) => ({
        chapterName: chapter.title || `Chapter ${index + 1}`,
        chapterOrder: index + 1,
        tourName: chapter.title || `Chapter ${index + 1}`,
        chapterScript: chapter.description || '',
        audio_src: chapter.audio_src || '',
        isXR: !!chapter.video_src,
        xr_src: chapter.video_src || '',
        thumbnail: chapter.thumbnails || [],
        isTeaser: false,
        outroCTA_timeIn: '',
        outroCTA_backlink: ''
      })) || [];

      return {
        tour: {
          tourName: `Full Tour Experience`,
          description: `Complete tour experience`,
          totalChapters: chapters.length,
          chapters
        }
      };
    }
  };

  // Load tour configuration (teaser or full) - removed artificial delay
  useEffect(() => {
    const loadTourConfig = () => {
      let configToUse: TourConfig;
      
      if (developerConfig && developerConfig.isValid && developerConfig.mediaData) {
        // Use developer configuration
        configToUse = convertDeveloperConfigToTourConfig(developerConfig);
        console.log(`🎵 Loaded ${isTeaserMode ? 'teaser' : 'full tour'} configuration from developer config:`, configToUse);
      } else {
        // Fallback to default configuration
        configToUse = isTeaserMode ? teaserTourConfig : defaultTourConfig;
        console.log(`🎵 Loaded ${isTeaserMode ? 'teaser' : 'full tour'} configuration (fallback)`);
      }
      
      setTourConfig(configToUse);
    };

    loadTourConfig();
  }, [isTeaserMode, developerConfig]);

  // Convert tracks when config loads and ensure slider starts at index 0
  useEffect(() => {
    if (!tourConfig) return;
    
    const convertedTracks = convertChaptersToTracks(tourConfig);
    setTracks(convertedTracks);
    
    // Always start at the first image when tracks are loaded
    setCurrentThumbnailIndex(0);
    
    console.log(`🎵 Converted ${convertedTracks.length} tracks for ${isTeaserMode ? 'teaser' : 'full tour'} mode`);
    
    // Initialize XR scene immediately for seamless toggling
    setXRSceneInitialized(true);
    
    // Reset videosphere material ready state for new tracks
    setVideosphereMaterialReady(false);
    
    // Pre-load XR scenes for tracks with XR content
    convertedTracks.forEach(track => {
      if (track.isXR && track.xrSrc) {
        preloadXRScene(track.xrSrc);
      }
    });
  }, [tourConfig, isTeaserMode]);

  // Teaser preloading in background when requested
  useEffect(() => {
    if (!teaserPreloading || isTeaserMode) return; // Don't preload if already in teaser mode
    
    console.log('🎬 [PRELOAD] Starting teaser background preloading...');
    
    const preloadTeaser = async () => {
      try {
        // Get teaser tracks
        const teaserTracks = convertChaptersToTracks(teaserTourConfig);
        
        if (teaserTracks.length > 0) {
          const teaserTrack = teaserTracks[0]; // First teaser track
          
          console.log('🎬 [PRELOAD] Preloading teaser track:', teaserTrack.title);
          
          // Preload teaser images
          await preloadTrackImages(teaserTrack);
          
          // Preload teaser audio
          await preloadTrackAudio(teaserTrack);
          
          // Preload teaser XR scene if it has one
          if (teaserTrack.isXR && teaserTrack.xrSrc) {
            console.log('🎬 [PRELOAD] Preloading teaser XR scene...');
            await preloadXRScene(teaserTrack.xrSrc);
          }
          
          console.log('🎬 [PRELOAD] Teaser preloading completed');
          
          // Signal completion
          if (onAudioMessage) {
            sendAudioMessage({
              type: 'xr-scene-fully-ready',
              timestamp: performance.now(),
              data: {
                xrSceneReady: true,
                videosphereMaterialReady: true,
                timestamp: performance.now()
              }
            });
          }
        }
      } catch (error) {
        console.error('🎬 [PRELOAD] Failed to preload teaser:', error);
        
        // Signal completion anyway to prevent UI from being stuck
        if (onAudioMessage) {
          sendAudioMessage({
            type: 'xr-scene-fully-ready',
            timestamp: performance.now(),
            data: {
              xrSceneReady: false,
              videosphereMaterialReady: false,
              timestamp: performance.now()
            }
          });
        }
      }
    };
    
         // Start preloading with a small delay to avoid blocking initial render
     const preloadTimer = setTimeout(preloadTeaser, 200);
     
     return () => clearTimeout(preloadTimer);
   }, [teaserPreloading, isTeaserMode, onAudioMessage]);

  // Send init message when tracks are loaded and first track is ready
  useEffect(() => {
    if (tracks.length > 0 && tracks[currentTrack] && onAudioMessage) {
      const track = tracks[currentTrack];
      sendAudioMessage({
        type: 'init',
        timestamp: performance.now(),
        data: {
          trackData: track,
          currentTime,
          duration,
          isPlaying,
          isMuted,
          volume: audioRef.current?.volume || 0.75,
          deviceOrientationPermission: deviceOrientationPermission || {
            granted: false,
            requested: false,
            supported: false
          }
        }
      });
    }
  }, [tracks, currentTrack, currentTime, duration, isPlaying, isMuted, onAudioMessage, deviceOrientationPermission]);

  // Send regular time updates when playing
  useEffect(() => {
    if (!onAudioMessage || !isPlaying) return;
    
    const interval = setInterval(() => {
      sendAudioMessage({
        type: 'time-update',
        timestamp: performance.now(),
        data: {
          currentTime,
          duration,
          isPlaying
        }
      });
    }, 100); // 10fps updates for smooth sync
    
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, onAudioMessage]);

  // Enhanced preloading for current, previous, and next tracks
  useEffect(() => {
    if (tracks.length === 0 || !tracks[currentTrack]) return;
    
    const currentTrackData = tracks[currentTrack];
    
    // Always preload current track immediately
    if (!trackImagesPreloaded[currentTrackData.id]) {
      preloadTrackImages(currentTrackData);
    }
    
    // Also preload current track audio
    if (!audioPreloaded[currentTrackData.src]) {
      preloadTrackAudio(currentTrackData);
    }
    
    // In teaser mode, only preload current track
    if (isTeaserMode) return;
    
    // Preload adjacent tracks for smoother transitions
    const preloadAdjacentTracks = () => {
      const adjacentTracks = [];
      
      // Previous track
      if (tracks.length > 1) {
        const prevTrackIndex = (currentTrack - 1 + tracks.length) % tracks.length;
        const prevTrackData = tracks[prevTrackIndex];
        if (prevTrackData && !trackImagesPreloaded[prevTrackData.id]) {
          adjacentTracks.push({ track: prevTrackData, delay: 1000 });
        }
      }
      
      // Next track
      if (tracks.length > 1) {
        const nextTrackIndex = (currentTrack + 1) % tracks.length;
        const nextTrackData = tracks[nextTrackIndex];
        if (nextTrackData && !trackImagesPreloaded[nextTrackData.id]) {
          adjacentTracks.push({ track: nextTrackData, delay: 500 });
        }
      }
      
             // Load adjacent tracks with staggered delays
       adjacentTracks.forEach(({ track, delay }) => {
         setTimeout(() => {
           preloadTrackImages(track);
           // Also preload audio for adjacent tracks
           if (!audioPreloaded[track.src]) {
             preloadTrackAudio(track);
           }
         }, delay);
       });
    };
    
    preloadAdjacentTracks();
  }, [tracks, currentTrack, trackImagesPreloaded, imagesLoaded, isTeaserMode]);

  // Enhanced automatic thumbnail cycling with proper horizontal animation (disabled in teaser mode)
  useEffect(() => {
    if (isTeaserMode || tracks.length === 0 || showPlaylist || isXRMode || isFullscreenMode || isTransitioning || isDragging) return;
    
    const track = tracks[currentTrack];
    if (!track.thumbnails || track.thumbnails.length <= 1) return;

    const interval = setInterval(() => {
      if (!isDragging && !isTransitioning) {
        // Set transition direction for animation
        setAutoTransitionDirection('next');
        setIsTransitioning(true);
        
        // Move to next image
        setCurrentThumbnailIndex(prev => (prev + 1) % track.thumbnails!.length);
        
        // Clear transition state after animation completes
        setTimeout(() => {
          setIsTransitioning(false);
          setAutoTransitionDirection(null);
        }, 300);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isTeaserMode, currentTrack, tracks, showPlaylist, isXRMode, isFullscreenMode, isTransitioning, isDragging]);

  // Handle audio events with viewer sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 240);
    const handleEnded = () => {
      if (isTeaserMode) {
        // In teaser mode, just stop playing (no auto-advance)
        setIsPlaying(false);
        console.log('🎬 Teaser preview completed');
      } else if (currentTrack < tracks.length - 1) {
        // Auto-play next track and ensure Audio Only mode (full tour only)
        setCurrentTrack(prev => prev + 1);
        setCurrentTime(0);
        setShowTeaser(false);
        setCurrentThumbnailIndex(0); // Always reset to first image
        setIsXRMode(false); // Always start new track in Audio Only mode
        setIsFullscreenMode(false); // Exit fullscreen mode
        setVideosphereMaterialReady(false); // Reset videosphere material ready state
        
        // Auto-play the next track after a brief delay
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      } else {
        // End of playlist - stop playing but stay on last track
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, tracks.length, isTeaserMode]);

  // Check for teaser overlay - Enhanced for better timecode control
  useEffect(() => {
    if (tracks.length === 0) return;
    
    const track = tracks[currentTrack];
    if (track.isTeaser && track.teaserTimeIn !== undefined) {
      if (currentTime >= track.teaserTimeIn) {
        setShowTeaser(true);
      } else {
        setShowTeaser(false);
      }
    }
  }, [currentTime, currentTrack, tracks]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.75;
    }
  }, [isMuted]);

  // Constrained drag handlers - only allow peek at adjacent images
  const handleDragStart = useCallback((clientX: number) => {
    if (isTransitioning) return;
    
    setIsDragging(true);
    setDragStartX(clientX);
    setDragCurrentX(clientX);
    setDragOffset(0);
  }, [isTransitioning]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !sliderRef.current) return;
    
    setDragCurrentX(clientX);
    const rawOffset = clientX - dragStartX;
    const containerWidth = sliderRef.current.clientWidth;
    
    // Constrain drag to maximum 80% of container width in either direction
    const maxOffset = containerWidth * 0.8;
    const constrainedOffset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));
    
    setDragOffset(constrainedOffset);
  }, [isDragging, dragStartX, sliderRef]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !tracks[currentTrack]?.thumbnails) return;
    
    const track = tracks[currentTrack];
    const thumbnails = track.thumbnails || [];
    if (thumbnails.length <= 1) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const dragDistance = dragCurrentX - dragStartX;
    const threshold = 80; // Minimum drag distance to trigger change
    
    let newIndex = currentThumbnailIndex;
    
    // Only allow moving to adjacent images
    if (Math.abs(dragDistance) > threshold) {
      if (dragDistance < 0) {
        // Dragged left - next image
        newIndex = (currentThumbnailIndex + 1) % thumbnails.length;
      } else {
        // Dragged right - previous image
        newIndex = (currentThumbnailIndex - 1 + thumbnails.length) % thumbnails.length;
      }
    }
    
    // Update state
    setIsDragging(false);
    setDragOffset(0);
    setDragStartX(0);
    setDragCurrentX(0);
    
    if (newIndex !== currentThumbnailIndex) {
      setIsTransitioning(true);
      setCurrentThumbnailIndex(newIndex);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [isDragging, dragStartX, dragCurrentX, currentThumbnailIndex, tracks, currentTrack]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleDragMove(touch.clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse events for drag continuation
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };
    
    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);



  // Loading state
  if (!tourConfig || tracks.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-purple-50 dark:to-blue-50 relative overflow-hidden flex flex-col">
        {/* Loading Skeleton */}
        <div className="flex-1 pt-12 md:pt-16 lg:pt-20 pb-4 md:pb-6 px-4 md:px-6 lg:px-8 flex items-center justify-center">
          <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-1.5 h-1.5 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Audio Controller Skeleton */}
        <div className="flex-shrink-0 mx-4 md:mx-6 lg:mx-8 mb-6 md:mb-8">
          <div className="bg-slate-900/95 dark:bg-slate-50/95 backdrop-blur-sm rounded-lg p-4 md:p-6 lg:p-8 max-w-lg mx-auto touch-target">
            {/* Enhanced loading skeleton with mobile optimizations */}
            <div className="text-center mb-4">
              <div className="relative">
                <Skeleton className="h-6 w-48 mx-auto mb-2 mobile-optimized" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
              <Skeleton className="h-4 w-32 mx-auto mb-1 mobile-optimized" />
              <Skeleton className="h-3 w-24 mx-auto mobile-optimized" />
              
              {/* Loading progress indicator */}
              <div className="mt-3 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <span>Loading audio tour...</span>
              </div>
            </div>
            
            {/* Enhanced progress bar skeleton */}
            <div className="relative mb-2">
              <Skeleton className="h-2 w-full mobile-optimized" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse"></div>
            </div>
            
            <div className="flex justify-between mb-4">
              <Skeleton className="h-3 w-8 mobile-optimized" />
              <Skeleton className="h-3 w-8 mobile-optimized" />
            </div>
            
            {/* Enhanced control buttons skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-md mobile-optimized" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-md mobile-optimized" />
                <div className="relative">
                  <Skeleton className="h-12 w-12 rounded-md mobile-optimized" />
                  <div className="absolute inset-0 border-2 border-blue-400/30 rounded-md animate-pulse"></div>
                </div>
                <Skeleton className="h-10 w-10 rounded-md mobile-optimized" />
              </div>
              <Skeleton className="h-10 w-10 rounded-md mobile-optimized" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const track = tracks[currentTrack];
  const currentCover = track.thumbnails && track.thumbnails.length > 0 
    ? track.thumbnails[currentThumbnailIndex] 
    : track.cover;

  const togglePlay = () => {
    if (!audioRef.current) {
      console.warn('🎵 Audio element not available');
      return;
    }
    
    const wasPlaying = isPlaying;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('🎵 Audio paused');
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('🎵 Audio playing');
        })
        .catch((error) => {
          console.warn('🎵 Audio play failed:', error);
          setIsPlaying(false);
          return; // Exit early if play failed
        });
    }

    // Send playback state change message (only for pause, play message sent after successful play)
    if (wasPlaying) {
      sendAudioMessage({
        type: 'playback-state',
        timestamp: performance.now(),
        data: {
          isPlaying: false,
          currentTime,
          duration
        }
      });
    } else {
      // Send play message only after successful play in the promise above
      setTimeout(() => {
        if (isPlaying) {
          sendAudioMessage({
            type: 'playback-state',
            timestamp: performance.now(),
            data: {
              isPlaying: true,
              currentTime,
              duration
            }
          });
        }
      }, 100);
    }
  };

  const selectTrack = (trackIndex: number) => {
    // Disabled in teaser mode or invalid track index
    if (isTeaserMode || trackIndex < 0 || trackIndex >= tracks.length) return;
    
    const newTrack = tracks[trackIndex];
    
    // Safety check for valid track
    if (!newTrack) {
      console.warn('🎵 Selected track not found:', trackIndex);
      return;
    }
    
    setCurrentTrack(trackIndex);
    setCurrentTime(0);
    setShowPlaylist(false);
    setShowTeaser(false);
    setCurrentThumbnailIndex(0); // Always reset to first image
    setIsXRMode(false); // Always start selected track in Audio Only mode
    setIsFullscreenMode(false); // Exit fullscreen mode
    setIsTransitioning(false);
    setIsDragging(false);
    setDragOffset(0);
    setVideosphereMaterialReady(false); // Reset videosphere material ready state

    // Send track change message
    sendAudioMessage({
      type: 'track-change',
      timestamp: performance.now(),
      data: {
        trackIndex,
        trackData: {
          id: newTrack.id,
          title: newTrack.title,
          xrSrc: newTrack.xrSrc,
          duration: newTrack.duration,
          script: newTrack.script,
          isXR: newTrack.isXR || false
        },
        currentTime: 0
      }
    });
    
    if (audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play()
          .then(() => {
            setIsPlaying(true);
            
            // Send playback state after successful auto-play
            sendAudioMessage({
              type: 'playback-state',
              timestamp: performance.now(),
              data: {
                isPlaying: true,
                currentTime: 0,
                duration: newTrack.duration
              }
            });
          })
          .catch((error) => {
            console.warn('🎵 Auto-play failed after track selection:', error);
            setIsPlaying(false);
          });
      }, 100);
    }
  };

  const nextTrack = () => {
    // Disabled in teaser mode or if no tracks available
    if (isTeaserMode || tracks.length === 0) return;
    
    const newTrackIndex = (currentTrack + 1) % tracks.length;
    const newTrack = tracks[newTrackIndex];
    
    // Safety check for valid track
    if (!newTrack) {
      console.warn('🎵 Next track not found, staying on current track');
      return;
    }
    
    setCurrentTrack(newTrackIndex);
    setCurrentTime(0);
    setShowTeaser(false);
    setCurrentThumbnailIndex(0); // Always reset to first image
    setIsXRMode(false); // Always start new track in Audio Only mode
    setIsFullscreenMode(false); // Exit fullscreen mode
    setIsTransitioning(false);
    setIsDragging(false);
    setDragOffset(0);
    setVideosphereMaterialReady(false); // Reset videosphere material ready state

    // Send track change message
    sendAudioMessage({
      type: 'track-change',
      timestamp: performance.now(),
      data: {
        trackIndex: newTrackIndex,
        trackData: {
          id: newTrack.id,
          title: newTrack.title,
          xrSrc: newTrack.xrSrc,
          duration: newTrack.duration,
          script: newTrack.script,
          isXR: newTrack.isXR || false
        },
        currentTime: 0
      }
    });
  };

  const previousTrack = () => {
    // Disabled in teaser mode or if no tracks available
    if (isTeaserMode || tracks.length === 0) return;
    
    if (currentTime > 3) {
      const previousTime = currentTime;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      console.log('🎵 Track rewound to start');
      
      // Send seek message for rewind to start
      sendAudioMessage({
        type: 'seek',
        timestamp: performance.now(),
        data: {
          currentTime: 0,
          previousTime
        }
      });
    } else {
      const newTrackIndex = (currentTrack - 1 + tracks.length) % tracks.length;
      const newTrack = tracks[newTrackIndex];
      
      // Safety check for valid track
      if (!newTrack) {
        console.warn('🎵 Previous track not found, staying on current track');
        return;
      }
      
      setCurrentTrack(newTrackIndex);
      setCurrentTime(0);
      setShowTeaser(false);
      setCurrentThumbnailIndex(0); // Always reset to first image
      setIsXRMode(false); // Always start new track in Audio Only mode
      setIsFullscreenMode(false); // Exit fullscreen mode
      setIsTransitioning(false);
      setIsDragging(false);
      setDragOffset(0);

      // Send track change message
      sendAudioMessage({
        type: 'track-change',
        timestamp: performance.now(),
        data: {
          trackIndex: newTrackIndex,
          trackData: {
            id: newTrack.id,
            title: newTrack.title,
            xrSrc: newTrack.xrSrc,
            duration: newTrack.duration,
            script: newTrack.script,
            isXR: newTrack.isXR || false
          },
          currentTime: 0
        }
      });
    }
  };

  // Enhanced manual thumbnail navigation functions with animated transitions
  const nextThumbnail = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1 || isTransitioning) return;
    
    setAutoTransitionDirection('next');
    setIsTransitioning(true);
    setCurrentThumbnailIndex((prev) => (prev + 1) % track.thumbnails!.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
      setAutoTransitionDirection(null);
    }, 300);
  };

  const previousThumbnail = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1 || isTransitioning) return;
    
    setAutoTransitionDirection('prev');
    setIsTransitioning(true);
    setCurrentThumbnailIndex((prev) => (prev - 1 + track.thumbnails!.length) % track.thumbnails!.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
      setAutoTransitionDirection(null);
    }, 300);
  };

  // Enhanced fullscreen functions with pan/zoom support (disabled in teaser mode)
  const launchFullscreenMode = () => {
    if (isTeaserMode) return;
    
    setIsFullscreenMode(true);
    setFullscreenImageIndex(currentThumbnailIndex);
    setFullscreenZoom(1);
    setFullscreenPanX(0);
    setFullscreenPanY(0);
    setShowFullscreenInfo(false);
    setShowPlaylist(false);
  };

  const exitFullscreenMode = () => {
    console.log('🖼️ EXIT BUTTON CLICKED - Exiting fullscreen mode');
    setIsFullscreenMode(false);
    setFullscreenZoom(1);
    setFullscreenPanX(0);
    setFullscreenPanY(0);
    setShowFullscreenInfo(false);
    console.log('🖼️ Fullscreen mode state updated to false');
  };

  const nextFullscreenImage = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1) return;
    setFullscreenImageIndex((prev) => (prev + 1) % track.thumbnails!.length);
    setFullscreenZoom(1);
    setFullscreenPanX(0);
    setFullscreenPanY(0);
    setShowFullscreenInfo(false);
  };

  const previousFullscreenImage = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1) return;
    setFullscreenImageIndex((prev) => (prev - 1 + track.thumbnails!.length) % track.thumbnails!.length);
    setFullscreenZoom(1);
    setFullscreenPanX(0);
    setFullscreenPanY(0);
    setShowFullscreenInfo(false);
  };

  // Enhanced zoom with multiple levels and centering
  const toggleFullscreenZoom = () => {
    const zoomLevels = [1, 1.5, 2, 2.5, 3];
    const currentIndex = zoomLevels.indexOf(fullscreenZoom);
    const nextIndex = (currentIndex + 1) % zoomLevels.length;
    const newZoom = zoomLevels[nextIndex];
    
    setFullscreenZoom(newZoom);
    
    // Reset pan when zooming out to 1x
    if (newZoom === 1) {
      setFullscreenPanX(0);
      setFullscreenPanY(0);
    }
  };

  // Pan handling functions
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    if (fullscreenZoom <= 1) return;
    
    setIsPanning(true);
    setPanStartX(clientX);
    setPanStartY(clientY);
    setLastPanX(fullscreenPanX);
    setLastPanY(fullscreenPanY);
  }, [fullscreenZoom, fullscreenPanX, fullscreenPanY]);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning || fullscreenZoom <= 1) return;
    
    const deltaX = clientX - panStartX;
    const deltaY = clientY - panStartY;
    
    // Calculate the bounds based on image size and zoom
    const container = fullscreenContainerRef.current;
    const image = fullscreenImageRef.current;
    
    if (!container || !image) return;
    
    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    
    // Calculate maximum pan distance
    const maxPanX = Math.max(0, (imageRect.width * fullscreenZoom - containerRect.width) / 2);
    const maxPanY = Math.max(0, (imageRect.height * fullscreenZoom - containerRect.height) / 2);
    
    // Apply constraints
    const newPanX = Math.max(-maxPanX, Math.min(maxPanX, lastPanX + deltaX));
    const newPanY = Math.max(-maxPanY, Math.min(maxPanY, lastPanY + deltaY));
    
    setFullscreenPanX(newPanX);
    setFullscreenPanY(newPanY);
  }, [isPanning, fullscreenZoom, panStartX, panStartY, lastPanX, lastPanY]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Mouse event handlers for fullscreen pan
  const handleFullscreenMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    handlePanStart(e.clientX, e.clientY);
  }, [handlePanStart]);

  const handleFullscreenMouseMove = useCallback((e: React.MouseEvent) => {
    handlePanMove(e.clientX, e.clientY);
  }, [handlePanMove]);

  const handleFullscreenMouseUp = useCallback(() => {
    handlePanEnd();
  }, [handlePanEnd]);

  // Touch event handlers for fullscreen pan
  const handleFullscreenTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    handlePanStart(touch.clientX, touch.clientY);
  }, [handlePanStart]);

  const handleFullscreenTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handlePanMove(touch.clientX, touch.clientY);
  }, [handlePanMove]);

  const handleFullscreenTouchEnd = useCallback(() => {
    handlePanEnd();
  }, [handlePanEnd]);

  // Zoom in/out functions
  const zoomIn = () => {
    const zoomLevels = [1, 1.5, 2, 2.5, 3];
    const currentIndex = zoomLevels.indexOf(fullscreenZoom);
    if (currentIndex < zoomLevels.length - 1) {
      setFullscreenZoom(zoomLevels[currentIndex + 1]);
    }
  };

  const zoomOut = () => {
    const zoomLevels = [1, 1.5, 2, 2.5, 3];
    const currentIndex = zoomLevels.indexOf(fullscreenZoom);
    if (currentIndex > 0) {
      const newZoom = zoomLevels[currentIndex - 1];
      setFullscreenZoom(newZoom);
      
      // Reset pan when zooming out to 1x
      if (newZoom === 1) {
        setFullscreenPanX(0);
        setFullscreenPanY(0);
      }
    }
  };

  // Global mouse events for fullscreen pan continuation
  useEffect(() => {
    if (!isPanning) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handlePanMove(e.clientX, e.clientY);
    };
    
    const handleGlobalMouseUp = () => {
      handlePanEnd();
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  const handleSeek = (value: number[]) => {
    const previousTime = currentTime;
    const newTime = value[0];
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
    
    // Send seek command to viewer
    console.log('🎵 Audio seeked to:', newTime);

    // Send seek message
    sendAudioMessage({
      type: 'seek',
      timestamp: performance.now(),
      data: {
        currentTime: newTime,
        previousTime
      }
    });
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Send volume change message
    sendAudioMessage({
      type: 'volume-change',
      timestamp: performance.now(),
      data: {
        isMuted: newMutedState,
        volume: audioRef.current?.volume || 0.75
      }
    });
  };

  const togglePlaylist = () => {
    // Disabled in teaser mode
    if (isTeaserMode) return;
    
    setShowPlaylist(!showPlaylist);
  };

  const launchXRmode = () => {
    if (track.isXR && track.xrSrc) {
      // Check if both XR scene AND videosphere material are ready before allowing entry
      if (!xrSceneReady || !videosphereMaterialReady) {
        console.log('🎯 XR not fully ready yet - starting loading sequence', {
          xrSceneReady,
          videosphereMaterialReady
        });
        setIsXRLoading(true);
        setXRSceneReady(false);
        setVideosphereMaterialReady(false);
        
        // Start XR mode but stay in loading state
        setIsXRMode(true);
        setXRSceneVisible(true); // Make XR scene visible
        
        // Send XR mode change message
        sendAudioMessage({
          type: 'xr-mode-change',
          timestamp: performance.now(),
          data: {
            isXRMode: true,
            trackData: track,
            deviceOrientationPermission: deviceOrientationPermission || {
              granted: false,
              requested: false,
              supported: false
            }
          }
        });
        
        // Fallback timeout to clear loading state if scene doesn't respond
        setTimeout(() => {
          if (isXRLoading) {
            console.warn('🎯 XR loading timeout - forcing ready state');
            setIsXRLoading(false);
            setXRSceneReady(true);
            setVideosphereMaterialReady(true);
          }
        }, 15000); // 15 second timeout for initial scene load
        
      } else if (xrSceneReady && videosphereMaterialReady && !isXRLoading) {
        console.log('🎯 Launching XR mode - scene and material fully ready');
        setShowPlaylist(false);
        
        // Activate XR mode immediately since everything is ready
        setIsXRMode(true);
        setXRSceneVisible(true); // Make XR scene visible
        
        // Send XR mode change message with device orientation permission
        sendAudioMessage({
          type: 'xr-mode-change',
          timestamp: performance.now(),
          data: {
            isXRMode: true,
            trackData: track,
            deviceOrientationPermission: deviceOrientationPermission || {
              granted: false,
              requested: false,
              supported: false
            }
          }
        });
      } else {
        console.log('🎯 XR mode already loading or transitioning - ignoring request');
      }
    } else {
      console.warn('🎯 Cannot launch XR mode - track not XR-enabled or missing video source');
    }
  };

  const exitXRMode = () => {
    // Disabled in teaser mode - users must stay in XR
    if (isTeaserMode) return;
    
    setIsXRMode(false);
    setXRSceneVisible(false); // Hide XR scene but keep it initialized
    
    // Send XR mode change message
    sendAudioMessage({
      type: 'xr-mode-change',
      timestamp: performance.now(),
      data: {
        isXRMode: false,
        trackData: track,
        deviceOrientationPermission: deviceOrientationPermission || {
          granted: false,
          requested: false,
          supported: false
        }
      }
    });
  };

  const recenterXR = () => {
    // Handle XR recenter functionality for 360° viewer
    console.log('🎯 XR recenter requested - sending to iframe');
    
    // Call the exposed recenter method from XRScene
    if (typeof window !== 'undefined' && (window as any).recenterXRViewer) {
      console.log('📞 Calling recenterXRViewer() method');
      (window as any).recenterXRViewer();
    } else {
      console.warn('⚠️ recenterXRViewer method not found on window');
    }
    
    // Send recenter message to parent
    sendAudioMessage({
      type: 'recenter',
      timestamp: performance.now(),
      data: {}
    });
  };

  const openTeaserLink = () => {
    if (track.teaserBacklink) {
      window.open(track.teaserBacklink, '_blank');
    }
    setShowTeaser(false);
  };

  // Handle click outside teaser CTA to close it
  const handleTeaserOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay background, not the content
    if (e.target === e.currentTarget) {
      setShowTeaser(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check if we should show loading skeleton for current image
  const shouldShowImageSkeleton = (src: string) => {
    return isLoadingImages && !imagesLoaded[src];
  };

  // Check if XR should show permission warning (only on mobile devices)
  const shouldShowXRPermissionWarning = () => {
    // Only show warning if:
    // 1. Current track supports XR
    // 2. We have permission data
    // 3. Permission was requested but not granted
    // 4. Device supports orientation
    // 5. User is on a mobile device
    return (
      track.isXR && 
      deviceOrientationPermission && 
      deviceOrientationPermission.requested && 
      !deviceOrientationPermission.granted && 
      deviceOrientationPermission.supported && 
      /Mobi|Android/i.test(navigator.userAgent)
    );
  };



  // Audio Controller Main Player Mode Component - Audio Only Mode (disabled in teaser) - Dark Mode Enhanced
  const audioControllerMainPlayerMode = (
    <div className="mx-4 md:mx-6 lg:mx-8 mb-6 md:mb-8">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-4 md:p-6 lg:p-8 max-w-lg mx-auto border border-slate-700/50 touch-target">
        {/* Track Info */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="font-semibold truncate text-white">{track.title}</h3>
            {track.isTeaser && (
              <Badge variant="secondary" className="text-xs bg-purple-600/20 text-purple-300 border-purple-400/30">Preview</Badge>
            )}
          </div>
          <p className="text-slate-300 text-sm truncate">{track.artist}</p>
          {!isTeaserMode && (
            <p className="text-slate-400 text-xs">Chapter {track.id} of {tracks.length}</p>
          )}
        </div>

        {/* Enhanced Progress Bar with played/unplayed regions */}
        <div className="mb-2">
          <AudioSlider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            currentTime={currentTime}
            duration={duration}
            variant="gradient"
            largeTouchTargets={true}
            showTimeTooltip={true}
            className="w-full"
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-xs text-slate-400 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between">
          {/* Left - Playlist (disabled in teaser) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlaylist}
            disabled={isTeaserMode}
            className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 ${
              isTeaserMode 
                ? 'text-slate-500 cursor-not-allowed opacity-50'
                : `text-slate-300 hover:text-white hover:bg-slate-700/60 ${
                    showPlaylist ? 'bg-slate-700/80 text-white' : ''
                  }`
            }`}
          >
            <List className="h-4 w-4" />
          </Button>

          {/* Center - Playback Controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              disabled={isTeaserMode}
              className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 ${
                isTeaserMode 
                  ? 'text-slate-500 cursor-not-allowed opacity-50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={togglePlay}
              size="icon"
              className="h-12 w-12 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 transition-all duration-200 ease-out active:scale-95 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              disabled={isTeaserMode}
              className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 ${
                isTeaserMode 
                  ? 'text-slate-500 cursor-not-allowed opacity-50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Right - Volume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 ${
              isMuted 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Audio Controller XR Mode - Streamlined variant (no audio-only option in teaser)
  const audioControllerXRmode = (
    <div className="mx-4 md:mx-6 lg:mx-8 mb-6 md:mb-8">
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 md:p-4 lg:p-5 max-w-lg mx-auto border border-white/20 touch-target">
        {/* XR Scene Status Indicator */}
        {!xrSceneReady && (
          <div className="mb-2 flex items-center justify-center gap-2 text-yellow-300 text-xs">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Initializing XR scene...</span>
          </div>
        )}
        
        {/* Videosphere Material Status Indicator */}
        {xrSceneReady && !videosphereMaterialReady && (
          <div className="mb-2 flex items-center justify-center gap-2 text-blue-300 text-xs">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Loading videosphere material...</span>
          </div>
        )}
        
        {/* XR Progress Bar - Enhanced with played/unplayed regions */}
        <div className="mb-2">
          <AudioSlider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            currentTime={currentTime}
            duration={duration}
            variant="glass"
            largeTouchTargets={true}
            showTimeTooltip={true}
            className="w-full"
          />
        </div>

        {/* XR Time Display with Sync Status */}
        <div className="flex justify-between text-xs mb-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{formatTime(currentTime)}</span>
            {isPlaying && (
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" title="XR scene active"></div>
            )}
          </div>
          <span className="text-slate-400">{formatTime(duration)}</span>
        </div>

        {/* XR Main Controls - Enhanced with seek controls */}
        <div className="flex items-center justify-between">
          {/* Left - Return to Audio+Slideshow mode button (hidden in teaser) */}
          {!isTeaserMode ? (
            <Button
              onClick={exitXRMode}
              size="icon"
              className="bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm text-white border border-white/20 h-10 w-10 transition-all duration-200 ease-out active:scale-95 hover:scale-105"
              title="Return to audio with slideshow"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-10"></div>
          )}

          {/* Center - Playback Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newTime = Math.max(0, currentTime - 10);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setCurrentTime(newTime);
                sendAudioMessage({
                  type: 'seek',
                  timestamp: performance.now(),
                  data: {
                    currentTime: newTime,
                    previousTime: currentTime
                  }
                });
              }}
              className="h-10 w-10 md:h-12 md:w-12 text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-200 ease-out active:scale-95 hover:scale-105"
              title="Rewind 10 seconds"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                <text x="12" y="20" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
              </svg>
            </Button>

            <Button
              onClick={togglePlay}
              size="icon"
              className="h-12 w-12 md:h-14 md:w-14 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 transition-all duration-200 ease-out active:scale-95 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 md:h-6 md:w-6" />
              ) : (
                <Play className="h-5 w-5 md:h-6 md:w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newTime = Math.min(duration, currentTime + 10);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setCurrentTime(newTime);
                sendAudioMessage({
                  type: 'seek',
                  timestamp: performance.now(),
                  data: {
                    currentTime: newTime,
                    previousTime: currentTime
                  }
                });
              }}
              className="h-10 w-10 md:h-12 md:w-12 text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-200 ease-out active:scale-95 hover:scale-105"
              title="Fast forward 10 seconds"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                <text x="12" y="20" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
              </svg>
            </Button>
          </div>

          {/* Right - Volume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 hover:scale-105 ${
              isMuted 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden flex flex-col">
      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
      />
      
      {/* XR Loading Overlay */}
      {isXRLoading && (
        <div className={`fixed inset-0 ${Z_LAYERS.LOADING_OVERLAY} bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-blue-900/90 backdrop-blur-sm flex flex-col items-center justify-center`}>
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4 mx-auto" />
            <h3 className="text-white font-semibold mb-2">
              {isTeaserMode ? 'Loading Preview Experience' : 'Loading XR Experience'}
            </h3>
            <p className="text-slate-300 text-sm">Preparing immersive 360° content...</p>
            
            {/* Show permission warning during loading if needed */}
            {shouldShowXRPermissionWarning() && (
              <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-300 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Limited motion tracking - device permission not granted</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Fullscreen Teaser CTA Overlay - Only for non-XR mode or non-teaser */}
      {showTeaser && track.teaserBacklink && (!isTeaserMode || !isXRMode) && (
        <div 
          className={`fixed inset-0 ${Z_LAYERS.TEASER_OVERLAY} bg-black flex flex-col items-center justify-center cursor-pointer`}
          onClick={handleTeaserOverlayClick}
        >
          <div 
            className="text-center p-8 max-w-sm mx-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo placeholder */}
            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            
            <h3 className="text-white text-xl font-semibold mb-3">
              {isTeaserMode ? 'Ready for the Full Experience?' : 'Want to continue?'}
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {isTeaserMode 
                ? 'You\'ve experienced a taste of our immersive historic tour. Unlock all 3 locations with rich XR content and detailed audio stories.'
                : 'Get access to the full tour experience with all chapters and XR content.'
              }
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={openTeaserLink} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white h-12 rounded-xl transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] border-0"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Full Tour Access
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setShowTeaser(false)} 
                className="w-full text-white hover:bg-white/10 active:bg-white/20 h-10 transition-all duration-200 ease-out active:scale-95"
              >
                Continue Preview
              </Button>
            </div>
            
            {isTeaserMode && (
              <p className="text-slate-500 text-xs mt-4">
                Preview mode - Limited to one experience
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Fullscreen Mode Overlay (disabled in teaser) */}
      {!isTeaserMode && isFullscreenMode && (
        <div 
          className={`fixed inset-0 ${Z_LAYERS.FULLSCREEN_MODE} bg-black flex flex-col`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              console.log('🖼️ Escape key pressed - exiting fullscreen');
              exitFullscreenMode();
            }
          }}
          tabIndex={0}
        >
          {/* TOP LEVEL EXIT BUTTON - HIGHEST PRIORITY */}
          <div 
            className="fixed top-4 left-4 z-[10000] pointer-events-auto"
            style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 10000 }}
          >
            <button
              onClick={(e) => {
                console.log('🖼️ DIRECT EXIT BUTTON CLICKED');
                e.preventDefault();
                e.stopPropagation();
                exitFullscreenMode();
              }}
              onTouchStart={(e) => {
                console.log('🖼️ Exit button touch detected');
                e.stopPropagation();
              }}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold px-4 py-2 rounded text-sm shadow-lg border-2 border-white"
              style={{ 
                position: 'relative',
                zIndex: 10001,
                pointerEvents: 'auto',
                touchAction: 'manipulation'
              }}
            >
              ✕ EXIT
            </button>
          </div>

          {/* Enhanced Image Display Area with Pan/Zoom */}
          <div 
            ref={fullscreenContainerRef}
            className="flex-1 relative flex items-center justify-center overflow-hidden"
            onMouseMove={handleFullscreenMouseMove}
            onMouseUp={handleFullscreenMouseUp}
            onMouseLeave={handleFullscreenMouseUp}
            onTouchMove={handleFullscreenTouchMove}
            onTouchEnd={handleFullscreenTouchEnd}
          >
            {track.thumbnails && track.thumbnails.length > 0 && (
              <div 
                className={`relative w-full h-full flex items-center justify-center ${
                  fullscreenZoom > 1 ? 'cursor-grab' : 'cursor-pointer'
                } ${isPanning ? 'cursor-grabbing' : ''}`}
                onClick={(e) => {
                  // Don't zoom if clicking on controls or if we're panning
                  if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  if (isPanning) return;
                  toggleFullscreenZoom();
                }}
                onMouseDown={handleFullscreenMouseDown}
                onTouchStart={handleFullscreenTouchStart}
              >
                {track.thumbnails && track.thumbnails[fullscreenImageIndex] && shouldShowImageSkeleton(getImageUrl(track.thumbnails[fullscreenImageIndex])) && (
                  <Skeleton className="absolute inset-0 w-full max-w-sm h-96 mx-auto" />
                )}
                
                {track.thumbnails && track.thumbnails[fullscreenImageIndex] && (
                  <img
                    ref={fullscreenImageRef}
                    src={getImageUrl(track.thumbnails[fullscreenImageIndex])}
                    alt={`${track.title} - Image ${fullscreenImageIndex + 1}`}
                    className={`max-w-full max-h-full object-contain transition-all duration-200 ease-out ${shouldShowImageSkeleton(getImageUrl(track.thumbnails[fullscreenImageIndex])) ? 'opacity-0' : 'opacity-100'} ${isPanning ? 'transition-none' : ''}`}
                    style={{
                      transform: `scale(${fullscreenZoom}) translate(${fullscreenPanX}px, ${fullscreenPanY}px)`,
                      transformOrigin: 'center center'
                    }}
                    draggable={false}
                  />
                )}
                
                {/* Navigation Arrows */}
                {track.thumbnails.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        previousFullscreenImage();
                      }}
                      className={`absolute left-4 md:left-6 lg:left-8 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white hover:text-white backdrop-blur-sm h-12 w-12 md:h-14 md:w-14 transition-all duration-200 ease-out active:scale-95 ${Z_LAYERS.FULLSCREEN_CONTROLS} safe-left`}
                    >
                      <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextFullscreenImage();
                      }}
                      className={`absolute right-4 md:right-6 lg:right-8 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white hover:text-white backdrop-blur-sm h-12 w-12 md:h-14 md:w-14 transition-all duration-200 ease-out active:scale-95 ${Z_LAYERS.FULLSCREEN_CONTROLS} safe-right`}
                    >
                      <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                  </>
                )}

                {/* Image Counter - Safe area responsive */}
                {track.thumbnails.length > 1 && (
                  <div className={`absolute top-12 md:top-16 lg:top-20 right-4 md:right-6 lg:right-8 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm md:text-base ${Z_LAYERS.FULLSCREEN_CONTROLS} safe-top safe-right`}>
                    {fullscreenImageIndex + 1} / {track.thumbnails.length}
                  </div>
                )}

                {/* Zoom Controls */}
                <div className={`absolute top-12 md:top-16 lg:top-20 left-4 md:left-6 lg:left-8 bg-black/60 backdrop-blur-sm rounded-lg ${Z_LAYERS.FULLSCREEN_CONTROLS} safe-top safe-left`}>
                  <div className="flex flex-col gap-2 p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={zoomIn}
                      disabled={fullscreenZoom >= 3}
                      className="h-8 w-8 text-white hover:bg-white/20 active:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom in"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </Button>
                    
                    <div className="text-white text-xs text-center px-1 py-0.5">
                      {fullscreenZoom}x
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={zoomOut}
                      disabled={fullscreenZoom <= 1}
                      className="h-8 w-8 text-white hover:bg-white/20 active:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom out"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Pan Instructions (shown when zoomed in) */}
                {fullscreenZoom > 1 && (
                  <div className={`absolute bottom-20 md:bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm ${Z_LAYERS.FULLSCREEN_CONTROLS} pointer-events-none`}>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Drag to pan • Tap to zoom</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Panel at Bottom */}
          <div className="relative">
            {/* Info Toggle Button */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
              <Button
                onClick={() => setShowFullscreenInfo(!showFullscreenInfo)}
                className="bg-black/60 hover:bg-black/80 active:bg-black/90 backdrop-blur-sm text-white border border-white/20 text-sm px-3 py-2 h-auto transition-all duration-200 ease-out active:scale-95"
              >
                <Info className="h-3 w-3 mr-2" />
                Info
                {showFullscreenInfo ? (
                  <ChevronDown className="h-3 w-3 ml-2" />
                ) : (
                  <ChevronUp className="h-3 w-3 ml-2" />
                )}
              </Button>
            </div>

            {/* Expandable Info Content */}
            <div className={`bg-black/80 backdrop-blur-sm text-white p-4 transition-all duration-200 ease-out ${
              showFullscreenInfo ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}>
              <div className="max-w-lg mx-auto">
                {/* Current Image Title */}
                {track.thumbnails && track.thumbnails[fullscreenImageIndex] && getImageTitle(track.thumbnails[fullscreenImageIndex]) && (
                  <h4 className="font-semibold mb-1 text-base">
                    {getImageTitle(track.thumbnails[fullscreenImageIndex])}
                  </h4>
                )}
                
                {/* Track Title */}
                <h3 className="font-medium mb-3 text-sm text-white/80">{track.title}</h3>
                
                {/* Scrollable Description Area */}
                <div className="h-32 overflow-y-auto">
                  <ScrollArea className="h-full pr-2">
                    <div className="text-sm text-white/90 leading-relaxed space-y-2">
                      {/* Per-image description if available */}
                      {track.thumbnails && track.thumbnails[fullscreenImageIndex] && getImageDescription(track.thumbnails[fullscreenImageIndex]) ? (
                        <p>{getImageDescription(track.thumbnails[fullscreenImageIndex])}</p>
                      ) : (
                        /* Fallback to general track description */
                        <p>{track.script || 'No additional information available for this location.'}</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Image Counter */}
                {track.thumbnails && track.thumbnails.length > 1 && (
                  <div className="mt-3 pt-2 border-t border-white/20 text-xs text-white/60 text-center">
                    Image {fullscreenImageIndex + 1} of {track.thumbnails.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
            {/* XR Scene - Always present when initialized for seamless toggling */}
      {xrSceneInitialized && track.isXR && (
        <div className={`fixed inset-0 ${Z_LAYERS.XR_BACKGROUND} transition-all duration-500 ease-in-out ${
          xrSceneVisible ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-105'
        }`}>
          <XRScene 
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            containerWidth={window.innerWidth}
            containerHeight={window.innerHeight}
            deviceOrientationPermission={deviceOrientationPermission}
            videoSrc={track.xrSrc}
            currentTime={currentTime}
            onReady={handleXRSceneReady}
            onSeek={handleXRViewerSeek}
            onVideosphereMaterialReady={handleVideosphereMaterialReady}
          />
        </div>
      )}

      {/* XR Mode UI Overlays */}
      {isXRMode && (
        <>
          
          {/* XR Top Navigation - Responsive safe area */}
          {!isTeaserMode ? (
            <div className={`fixed top-12 md:top-16 lg:top-20 left-4 md:left-6 lg:left-8 right-4 md:right-6 lg:right-8 ${Z_LAYERS.XR_CONTROLS} flex justify-between items-center safe-top safe-left safe-right`}>
              <Button
                onClick={exitXRMode}
                className="bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm text-white border border-white/20 text-sm px-3 py-2 h-auto transition-all duration-200 ease-out active:scale-95"
              >
                <AudioWaveform className="h-3 w-3 mr-2" />
                Audio Only
              </Button>
              <Button
                onClick={recenterXR}
                className="bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm text-white border border-white/20 text-sm px-3 py-2 h-auto transition-all duration-200 ease-out active:scale-95"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Recenter
              </Button>
            </div>
          ) : (
            /* Teaser mode - Reset camera button in top right corner */
            <div className={`fixed top-12 md:top-16 lg:top-20 right-4 md:right-6 lg:right-8 ${Z_LAYERS.XR_CONTROLS} safe-top safe-right`}>
              <Button
                onClick={recenterXR}
                className="bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm text-white border border-white/20 text-sm px-3 py-2 h-auto transition-all duration-200 ease-out active:scale-95"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset Camera
              </Button>
            </div>
          )}

          {/* XR Permission Warning - Show if permissions not granted */}
          {shouldShowXRPermissionWarning() && (
            <div className={`fixed left-1/2 transform -translate-x-1/2 ${Z_LAYERS.XR_CONTROLS} ${
              isTeaserMode ? 'top-16 md:top-20 lg:top-24' : 'top-24 md:top-28 lg:top-32'
            } safe-top`}>
              <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-3 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-yellow-300 text-sm text-center">
                  <Smartphone className="h-4 w-4 flex-shrink-0" />
                  <span>Motion tracking limited - device orientation access needed for full XR experience</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Teaser CTA Overlay for XR Mode - Positioned in middle */}
          {isTeaserMode && showTeaser && track.teaserBacklink && (
            <div 
              className={`fixed inset-0 ${Z_LAYERS.XR_CONTROLS} flex items-center justify-center px-4 md:px-6 lg:px-8 cursor-pointer`}
              onClick={handleTeaserOverlayClick}
            >
              <div 
                className="bg-black/80 backdrop-blur-sm rounded-lg p-6 max-w-sm mx-auto border border-white/20 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Logo placeholder */}
                <div className="w-12 h-12 mx-auto mb-4 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-white text-lg font-semibold mb-2 text-center">
                  Ready for the Full Experience?
                </h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed text-center">
                  You've experienced a taste of our immersive historic tour. Unlock all 3 locations with rich XR content and detailed audio stories.
                </p>
                
                <div className="space-y-2">
                  <Button 
                    onClick={openTeaserLink} 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white h-10 rounded-lg transition-all duration-200 ease-out active:scale-95 border-0 text-sm"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Get Full Tour Access
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowTeaser(false)} 
                    className="w-full text-white hover:bg-white/10 active:bg-white/20 h-8 transition-all duration-200 ease-out active:scale-95 text-sm"
                  >
                    Continue Preview
                  </Button>
                </div>
                
                <p className="text-slate-500 text-xs mt-3 text-center">
                  Preview mode - Limited to one experience
                </p>
              </div>
            </div>
          )}
          


          {/* XR Bottom Section - Audio Controller */}
          <div className={`fixed bottom-0 left-0 right-0 ${Z_LAYERS.XR_CONTROLS} safe-bottom`}>
            {audioControllerXRmode}
          </div>
        </>
      )}
      
      {/* Regular Mode Content - Audio Only Mode (disabled in teaser) */}
      {!isXRMode && !isFullscreenMode && !isXRLoading && !isTeaserMode && (
        <>
          {/* Top Section - Image Gallery/Slideshow (Fills available space) */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {!showPlaylist ? (
              // Album Cover/Image Slideshow
              <div className="w-full h-full flex items-center justify-center px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
                {/* Use ImageSlider component instead of custom implementation */}
                <ImageSlider
                  images={Array.isArray(track.thumbnails) 
                    ? track.thumbnails.map(img => typeof img === 'string' ? img : img.url) 
                    : [track.cover]}
                  enableFullscreen={true}
                  showDescriptions={true}
                  onSlideChange={(index) => setCurrentThumbnailIndex(index)}
                  onFullscreenChange={(isFullscreen) => setIsFullscreenMode(isFullscreen)}
                  className="w-full h-full max-h-[70vh]"
                  autoplay={true}
                  defaultInterval={20}
                  allowVerticalCrop={true}
                />
              </div>
            ) : (
              // Playlist Mode - Fill available space with ScrollArea
              <div className="w-full h-full flex flex-col p-4">
                                 {/* Playlist Header - Enhanced for Mobile */}
                 <div className="flex justify-between items-center mb-5 px-1">
                   <h2 className="text-white text-2xl font-semibold">Tour Chapters</h2>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={togglePlaylist}
                     className="h-10 w-10 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                   >
                     <X className="h-5 w-5" />
                   </Button>
                 </div>
                
                                 {/* Playlist Tracks - Enhanced for Touch */}
                 <ScrollArea className="flex-1 pr-4">
                   <div className="space-y-3">
                     {tracks.map((t, i) => (
                       <div 
                         key={t.id}
                         className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors duration-200 ${
                           i === currentTrack
                             ? 'bg-white/10 backdrop-blur-sm shadow-md'
                             : 'hover:bg-white/5 active:bg-white/10'
                         }`}
                         onClick={() => selectTrack(i)}
                       >
                                                 {/* Track Number or Playing Indicator - Enhanced */}
                         <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                           {i === currentTrack ? (
                             <div className={`${isPlaying ? 'block' : 'hidden'} w-4 h-4`}>
                               <span className="block w-1 h-4 bg-blue-500 mr-0.5 animate-bar1 float-left"></span>
                               <span className="block w-1 h-4 bg-blue-500 mr-0.5 animate-bar2 float-left"></span>
                               <span className="block w-1 h-4 bg-blue-500 animate-bar3 float-left"></span>
                             </div>
                           ) : (
                             <span className="text-base text-slate-400 group-hover:text-white font-medium">
                               {i + 1}
                             </span>
                           )}
                         </div>
                        
                                                 {/* Track Thumbnail - Larger */}
                         <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                           {shouldShowImageSkeleton(t.cover) ? (
                             <Skeleton className="w-full h-full" />
                           ) : (
                             <img 
                               src={t.thumbnails && t.thumbnails.length > 0 
                                 ? (typeof t.thumbnails[0] === 'string' 
                                   ? t.thumbnails[0] 
                                   : (t.thumbnails[0] as TourImageData).url)
                                 : t.cover} 
                               alt={t.title}
                               className="w-full h-full object-cover"
                             />
                           )}
                         </div>
                         
                         {/* Track Info - Enhanced Typography */}
                         <div className="flex-1 min-w-0">
                           <div className={`font-medium text-base truncate ${
                             i === currentTrack ? 'text-white' : 'text-slate-300 group-hover:text-white'
                           }`}>
                             {t.title}
                           </div>
                           <div className="text-sm text-slate-400 truncate mt-0.5">
                             {t.artist}
                           </div>
                         </div>
                        
                                                 {/* XR Badge - Enhanced */}
                         {t.isXR && (
                           <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs px-3 py-1 rounded-md shadow-sm">
                             <Glasses className="h-3.5 w-3.5 mr-1.5" />
                             XR
                           </Badge>
                         )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Bottom Section - Audio Controller (Fixed to bottom) - Always Dark Mode */}
          <div className="w-full bg-slate-900/95 backdrop-blur-sm p-4 z-50">
                          {/* Track Info - Enhanced for Mobile Visibility */}
              <div className="text-center mb-5">
                <h3 className="text-white text-xl font-semibold truncate mb-1">{track.title}</h3>
                <p className="text-slate-300 text-base">{track.artist}</p>
              </div>
            
            {/* Progress Bar */}
            <AudioSlider
              value={[currentTime / (duration || 1) * 100]}
              min={0}
              max={100}
              currentTime={currentTime}
              duration={duration}
              buffered={audioRef.current && audioRef.current.buffered && audioRef.current.buffered.length > 0 
                ? audioRef.current.buffered.end(audioRef.current.buffered.length - 1) / (duration || 1)
                : 0}
              largeTouchTargets={true}
              showTimeTooltip={true}
              variant="gradient"
              className="mb-2"
              onValueChange={(value) => handleSeek(value)}
              onValueCommit={(value) => handleSeek(value)}
              aria-label="Audio progress"
            />
            
                          {/* Time Display - Larger for better readability */}
              <div className="flex justify-between items-center text-sm text-slate-300 mb-5 px-1">
                <span className="font-medium">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              
              {/* Controls - Improved Touch Targets */}
              <div className="flex items-center justify-between">
                {/* Left - Toggle Playlist */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlaylist}
                  className="h-12 w-12 text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-200 ease-out active:scale-95"
                  aria-label={showPlaylist ? "Hide playlist" : "Show playlist"}
                  aria-expanded={showPlaylist}
                  aria-controls="playlist-menu"
                >
                  <List className="h-5 w-5" aria-hidden="true" />
                </Button>
              
                              {/* Center - Main Controls - Larger Touch Targets */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newTime = Math.max(0, currentTime - 10);
                      if (audioRef.current) {
                        audioRef.current.currentTime = newTime;
                      }
                      setCurrentTime(newTime);
                      sendAudioMessage({
                        type: 'seek',
                        timestamp: performance.now(),
                        data: {
                          currentTime: newTime,
                          previousTime: currentTime
                        }
                      });
                    }}
                    disabled={isTeaserMode}
                    className={`h-12 w-12 md:h-14 md:w-14 transition-all duration-200 ease-out active:scale-95 hover:scale-105 ${
                      isTeaserMode 
                        ? 'text-slate-500 cursor-not-allowed opacity-50'
                        : 'text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                    aria-label="Rewind 10 seconds"
                    aria-disabled={isTeaserMode}
                    tabIndex={isTeaserMode ? -1 : 0}
                    title="Rewind 10 seconds"
                  >
                    <svg className="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                      <text x="12" y="20" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
                    </svg>
                  </Button>

                  <Button
                    onClick={togglePlay}
                    size="icon"
                    className="h-14 w-14 md:h-16 md:w-16 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 rounded-full transition-all duration-200 ease-out active:scale-95 hover:scale-105 shadow-lg"
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                    aria-pressed={isPlaying}
                    role="button"
                    tabIndex={0}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />
                    ) : (
                      <Play className="h-6 w-6 md:h-7 md:w-7 ml-0.5" aria-hidden="true" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newTime = Math.min(duration, currentTime + 10);
                      if (audioRef.current) {
                        audioRef.current.currentTime = newTime;
                      }
                      setCurrentTime(newTime);
                      sendAudioMessage({
                        type: 'seek',
                        timestamp: performance.now(),
                        data: {
                          currentTime: newTime,
                          previousTime: currentTime
                        }
                      });
                    }}
                    disabled={isTeaserMode}
                    className={`h-12 w-12 md:h-14 md:w-14 transition-all duration-200 ease-out active:scale-95 hover:scale-105 ${
                      isTeaserMode 
                        ? 'text-slate-500 cursor-not-allowed opacity-50'
                        : 'text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                    aria-label="Fast forward 10 seconds"
                    aria-disabled={isTeaserMode}
                    tabIndex={isTeaserMode ? -1 : 0}
                    title="Fast forward 10 seconds"
                  >
                    <svg className="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                      <text x="12" y="20" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
                    </svg>
                  </Button>
                </div>

                              {/* Right - Volume or XR Mode Toggle - Enhanced Touch Target */}
                {track.isXR ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={launchXRmode}
                    className={`h-12 w-12 transition-all duration-200 ease-out active:scale-95 rounded-lg ${
                      !track.xrSrc || (!xrSceneReady || !videosphereMaterialReady) && !isXRLoading
                        ? 'text-slate-500 cursor-not-allowed opacity-50'
                        : isXRLoading
                          ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                    disabled={!track.xrSrc || ((!xrSceneReady || !videosphereMaterialReady) && !isXRLoading)}
                    title={
                      !track.xrSrc 
                        ? 'XR content not available' 
                        : !xrSceneReady && !isXRLoading
                          ? 'XR scene loading...'
                          : !videosphereMaterialReady && !isXRLoading
                            ? 'Videosphere material loading...'
                            : isXRLoading
                              ? 'Loading XR experience...'
                              : 'Enter XR mode'
                    }
                  >
                    {isXRLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Glasses className={`h-5 w-5 ${
                        track.xrSrc && xrSceneReady && videosphereMaterialReady && !isXRLoading
                          ? 'animate-pulse opacity-75'
                          : ''
                      }`} 
                      style={
                        track.xrSrc && xrSceneReady && videosphereMaterialReady && !isXRLoading
                          ? {
                              animation: 'subtle-pulse 3s ease-in-out infinite',
                              animationDelay: '0.5s'
                            }
                          : {}
                      } />
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className={`h-12 w-12 transition-all duration-200 ease-out active:scale-95 rounded-lg ${
                      isMuted 
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                )}
            </div>
          </div>
        </>
      )}

      {/* Playlist Overlay - Enhanced with scale-in animation */}
      {showPlaylist && (
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${Z_LAYERS.OVERLAY_LOW} flex items-center justify-center p-4 animate-in fade-in-0 duration-300`}
          onClick={() => setShowPlaylist(false)}
        >
          <div 
            className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-6 max-w-md w-full max-h-[70vh] border border-slate-600/50 shadow-2xl animate-in zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold">Playlist</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPlaylist(false)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 ease-out active:scale-95"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {tracks.map((t, i) => (
                  <div 
                    key={t.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ease-out ${
                      i === currentTrack
                        ? 'bg-white/10 backdrop-blur-sm shadow-md scale-[1.02]'
                        : 'hover:bg-white/5 active:bg-white/10 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                    onClick={() => selectTrack(i)}
                  >
                    {/* Track Number or Playing Indicator - Enhanced */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {i === currentTrack ? (
                        <div className={`${isPlaying ? 'block' : 'hidden'} w-4 h-4`}>
                          <span className="block w-1 h-4 bg-blue-500 mr-0.5 animate-bar1 float-left"></span>
                          <span className="block w-1 h-4 bg-blue-500 mr-0.5 animate-bar2 float-left"></span>
                          <span className="block w-1 h-4 bg-blue-500 animate-bar3 float-left"></span>
                        </div>
                      ) : (
                        <span className="text-base text-slate-400 group-hover:text-white font-medium transition-colors duration-200">
                          {i + 1}
                        </span>
                      )}
                    </div>
                   
                    {/* Track Thumbnail - Enhanced */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-700/60 group-hover:scale-105 transition-transform duration-200">
                      {t.thumbnails && t.thumbnails.length > 0 ? (
                        <img
                          src={getImageUrl(t.thumbnails[0])}
                          alt={t.title}
                          className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <AudioWaveform className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Track Details - Enhanced */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-blue-300 transition-colors duration-200">
                        {t.title}
                      </h3>
                      <p className="text-sm text-slate-400 truncate group-hover:text-slate-300 transition-colors duration-200">
                        {t.artist}
                      </p>
                    </div>
                    
                    {/* Track Duration - Enhanced */}
                    <div className="flex-shrink-0 text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
                      {formatTime(t.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Teaser Overlay - Enhanced with scale-in animation */}
      {showTeaser && (
        <div 
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm ${Z_LAYERS.TEASER_OVERLAY} flex items-center justify-center p-4 animate-in fade-in-0 duration-300`}
          onClick={handleTeaserOverlayClick}
        >
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full border border-slate-600/50 shadow-2xl animate-in zoom-in-95 duration-300 ease-out">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <ExternalLink className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Enjoying the Preview?</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                You're experiencing a free preview of this immersive audio tour. 
                Get full access to continue your journey with complete chapters and exclusive content.
              </p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={openTeaserLink} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white h-10 rounded-lg transition-all duration-200 ease-out active:scale-95 hover:scale-105 border-0 text-sm shadow-lg"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Get Full Tour Access
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setShowTeaser(false)} 
                className="w-full text-white hover:bg-white/10 active:bg-white/20 h-8 transition-all duration-200 ease-out active:scale-95 text-sm"
              >
                Continue Preview
              </Button>
            </div>
            
            <p className="text-slate-500 text-xs mt-3 text-center">
              Preview mode - Limited to one experience
            </p>
          </div>
        </div>
      )}
    </div>
  );
}