import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { XRScene } from './XRScene';
import { ImageSlider } from './ImageSlider';
import { AudioSlider } from './ui/audio-slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  List,
  ExternalLink,
  Eye,
  X,
  Glasses,
  RotateCcw,
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Info,
  ChevronUp,
  ChevronDown,
  Loader2,
  Smartphone,
  AlertTriangle,
  MapPin
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
  type: 'playback-state' | 'time-update' | 'seek' | 'track-change' | 'volume-change' | 'init' | 'recenter' | 'xr-mode-change' | 'device-orientation-permission';
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

export type AudioMessage = PlaybackStateMessage | TimeUpdateMessage | SeekMessage | TrackChangeMessage | VolumeChangeMessage | InitMessage | RecenterMessage | XRModeChangeMessage | DeviceOrientationPermissionMessage;

interface AudioPlayerProps {
  onAudioMessage?: (message: AudioMessage) => void;
  deviceOrientationPermission?: DeviceOrientationPermissionState;
  isTeaserMode?: boolean;
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

export function AudioPlayer({ onAudioMessage, deviceOrientationPermission, isTeaserMode = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [tourConfig, setTourConfig] = useState<TourConfig | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [isXRMode, setIsXRMode] = useState(isTeaserMode); // Start in XR mode for teaser
  const [isXRLoading, setIsXRLoading] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [showFullscreenInfo, setShowFullscreenInfo] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<{[key: string]: boolean}>({});
  const [trackImagesPreloaded, setTrackImagesPreloaded] = useState<{[key: number]: boolean}>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // XR Scene state - Always maintain scene for seamless toggling
  const [xrSceneReady, setXRSceneReady] = useState(false);
  const [xrScenesPreloaded, setXRScenesPreloaded] = useState<{[key: string]: boolean}>({});
  const [xrSceneInitialized, setXRSceneInitialized] = useState(false);
  
  // Track if we've already auto-played in teaser mode to prevent repeated auto-play
  const hasAutoPlayedTeaser = useRef(false);

  // Constrained drag slider state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // New state for automatic transition animation
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

  // XR Scene ready callback - Fix loading state issue
  const handleXRSceneReady = useCallback(() => {
    console.log('🎯 XR Scene ready callback triggered - clearing loading state');
    setXRSceneReady(true);
    setIsXRLoading(false); // Clear loading state when scene is actually ready
    console.log('✅ XR Loading state cleared - scene is ready');
  }, []);

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
  }, [currentTime, sendAudioMessage]);

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
  }, [deviceOrientationPermission, sendAudioMessage, onAudioMessage]);



  // Auto-start XR mode when in teaser mode
  useEffect(() => {
    if (isTeaserMode && tracks.length > 0 && !isXRLoading && !isXRMode) {
      console.log('🎬 Auto-starting XR mode for teaser');
      setIsXRLoading(true);
      setXRSceneReady(false); // Reset scene ready state
      hasAutoPlayedTeaser.current = false; // Reset auto-play flag for new session
      
      // Activate XR mode immediately (removed artificial delay)
      setIsXRMode(true);
      
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
      
      // Fallback timeout to clear loading state if scene doesn't respond
      setTimeout(() => {
        if (isXRLoading) {
          console.warn('🎬 Teaser XR scene loading timeout - clearing loading state');
          setIsXRLoading(false);
          
          // Auto-play audio after timeout ONLY if we haven't already auto-played
          if (audioRef.current && !hasAutoPlayedTeaser.current) {
            hasAutoPlayedTeaser.current = true;
            audioRef.current.play();
            setIsPlaying(true);
          }
          
          // Force XR scene ready state on timeout
          setXRSceneReady(true);
        }
      }, 10000); // 10 second fallback
    }
  }, [isTeaserMode, tracks.length, isXRLoading, isXRMode, sendAudioMessage, deviceOrientationPermission, currentTrack]);

  // Send XR scene initialization when XR mode loads
  useEffect(() => {
    if (isXRMode && xrSceneReady) {
      console.log('🎯 XR Scene initialized for track:', tracks[currentTrack]?.title);
      
      // Auto-play audio in teaser mode when scene is ready - but ONLY on first load
      if (isTeaserMode && audioRef.current && !isPlaying && !hasAutoPlayedTeaser.current) {
        hasAutoPlayedTeaser.current = true; // Prevent future auto-plays
        setTimeout(() => {
          if (audioRef.current && !isPlaying) { // Double-check user hasn't manually started playing
            audioRef.current.play();
            setIsPlaying(true);
            console.log('🎬 Auto-playing teaser audio after XR scene ready (first time only)');
          }
        }, 500);
      }
    }
  }, [isXRMode, xrSceneReady, tracks, currentTrack, isTeaserMode, isPlaying]);

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

  // Load tour configuration (teaser or full) - removed artificial delay
  useEffect(() => {
    const loadTourConfig = () => {
      // Use teaser config if in teaser mode
      const configToUse = isTeaserMode ? teaserTourConfig : defaultTourConfig;
      setTourConfig(configToUse);
      
      console.log(`🎵 Loaded ${isTeaserMode ? 'teaser' : 'full tour'} configuration`);
    };

    loadTourConfig();
  }, [isTeaserMode]);

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
    
    // Pre-load XR scenes for tracks with XR content
    convertedTracks.forEach(track => {
      if (track.isXR && track.xrSrc) {
        preloadXRScene(track.xrSrc);
      }
    });
  }, [tourConfig, isTeaserMode]);

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
  }, [tracks, sendAudioMessage, currentTrack, currentTime, duration, isPlaying, isMuted, onAudioMessage, deviceOrientationPermission]);

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
  }, [isPlaying, currentTime, duration, sendAudioMessage, onAudioMessage]);

  // Preload images when tracks change or current track changes
  useEffect(() => {
    if (tracks.length === 0 || !tracks[currentTrack]) return;
    
    const currentTrackData = tracks[currentTrack];
    if (!trackImagesPreloaded[currentTrackData.id]) {
      preloadTrackImages(currentTrackData);
    }
    
    // Don't preload next track in teaser mode (only one track)
    if (!isTeaserMode) {
      const nextTrackIndex = (currentTrack + 1) % tracks.length;
      const nextTrackData = tracks[nextTrackIndex];
      if (nextTrackData && !trackImagesPreloaded[nextTrackData.id]) {
        setTimeout(() => {
          preloadTrackImages(nextTrackData);
        }, 500); // Small delay to prioritize current track
      }
    }
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
            <div className="text-center mb-4">
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto mb-1" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
            <Skeleton className="h-2 w-full mb-2" />
            <div className="flex justify-between mb-4">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-12 w-12 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
              <Skeleton className="h-10 w-10 rounded-md" />
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
    if (!audioRef.current) return;
    
    const wasPlaying = isPlaying;
    
    if (isPlaying) {
      audioRef.current.pause();
              console.log('🎵 Audio paused');
    } else {
      audioRef.current.play();
              console.log('🎵 Audio playing');
    }
    setIsPlaying(!isPlaying);

    // Send playback state change message
    sendAudioMessage({
      type: 'playback-state',
      timestamp: performance.now(),
      data: {
        isPlaying: !wasPlaying,
        currentTime,
        duration
      }
    });
  };

  const selectTrack = (trackIndex: number) => {
    // Disabled in teaser mode
    if (isTeaserMode) return;
    
    const newTrack = tracks[trackIndex];
    
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
        audioRef.current?.play();
        setIsPlaying(true);
        
        // Send playback state after auto-play
        sendAudioMessage({
          type: 'playback-state',
          timestamp: performance.now(),
          data: {
            isPlaying: true,
            currentTime: 0,
            duration: newTrack.duration
          }
        });
      }, 100);
    }
  };

  const nextTrack = () => {
    // Disabled in teaser mode
    if (isTeaserMode) return;
    
    const newTrackIndex = (currentTrack + 1) % tracks.length;
    const newTrack = tracks[newTrackIndex];
    
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
  };

  const previousTrack = () => {
    // Disabled in teaser mode
    if (isTeaserMode) return;
    
    if (currentTime > 3) {
      const previousTime = currentTime;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      console.log('🎵 Track changed');
      
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

  // Fullscreen functions (disabled in teaser mode)
  const launchFullscreenMode = () => {
    if (isTeaserMode) return;
    
    setIsFullscreenMode(true);
    setFullscreenImageIndex(currentThumbnailIndex);
    setFullscreenZoom(1);
    setShowFullscreenInfo(false);
    setShowPlaylist(false);
  };

  const exitFullscreenMode = () => {
    console.log('🖼️ EXIT BUTTON CLICKED - Exiting fullscreen mode');
    setIsFullscreenMode(false);
    setFullscreenZoom(1);
    setShowFullscreenInfo(false);
    console.log('🖼️ Fullscreen mode state updated to false');
  };

  const nextFullscreenImage = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1) return;
    setFullscreenImageIndex((prev) => (prev + 1) % track.thumbnails!.length);
    setFullscreenZoom(1);
    setShowFullscreenInfo(false);
  };

  const previousFullscreenImage = () => {
    if (!track.thumbnails || track.thumbnails.length <= 1) return;
    setFullscreenImageIndex((prev) => (prev - 1 + track.thumbnails!.length) % track.thumbnails!.length);
    setFullscreenZoom(1);
    setShowFullscreenInfo(false);
  };

  const toggleFullscreenZoom = () => {
    setFullscreenZoom(prev => prev === 1 ? 2.5 : 1);
  };

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
    if (track.isXR) {
      console.log('🎯 Launching XR mode - seamless toggle (scene pre-loaded)');
      setShowPlaylist(false);
      
      // Activate XR mode immediately - no loading since scene is persistent
      setIsXRMode(true);
      
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
    }
  };

  const exitXRMode = () => {
    // Disabled in teaser mode - users must stay in XR
    if (isTeaserMode) return;
    
    setIsXRMode(false);
    
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
    // Only show warning on mobile devices where orientation is actually supported
    return track.isXR && deviceOrientationPermission && !deviceOrientationPermission.granted && deviceOrientationPermission.supported && /Mobi|Android/i.test(navigator.userAgent);
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
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 md:p-6 lg:p-8 max-w-lg mx-auto border border-white/20 touch-target">
        {/* XR Scene Status Indicator */}
        {!xrSceneReady && (
          <div className="mb-3 flex items-center justify-center gap-2 text-yellow-300 text-xs">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Initializing XR scene...</span>
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
        <div className="flex justify-between text-xs mb-4">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{formatTime(currentTime)}</span>
            {isPlaying && (
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" title="XR scene active"></div>
            )}
          </div>
          <span className="text-slate-400">{formatTime(duration)}</span>
        </div>

        {/* XR Main Controls - Simplified for teaser or full for regular */}
        <div className="flex items-center justify-between">
          {/* Left - Audio Only button (hidden in teaser) */}
          {!isTeaserMode ? (
            <Button
              onClick={exitXRMode}
              className="bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm text-white border border-white/20 text-xs px-2 py-1 h-auto transition-all duration-200 ease-out active:scale-95"
            >
              <AudioWaveform className="h-3 w-3 mr-1" />
              Audio
            </Button>
          ) : (
            <div className="w-10"></div>
          )}

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
                  : 'text-slate-300 hover:text-white hover:bg-white/20'
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
                  : 'text-slate-300 hover:text-white hover:bg-white/20'
              }`}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Right - Volume or Recenter */}
          {!isTeaserMode ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={`h-10 w-10 transition-all duration-200 ease-out active:scale-95 ${
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
          ) : (
            <div className="w-10"></div>
          )}
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

          {/* Image Display Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {track.thumbnails && track.thumbnails.length > 0 && (
              <div 
                className="relative w-full h-full flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  // Don't zoom if clicking on controls
                  if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  toggleFullscreenZoom();
                }}
                onMouseDown={(e) => {
                  // Prevent drag on controls
                  if ((e.target as HTMLElement).closest('button')) {
                    e.stopPropagation();
                  }
                }}
              >
                {shouldShowImageSkeleton(track.thumbnails[fullscreenImageIndex]) && (
                  <Skeleton className="absolute inset-0 w-full max-w-sm h-96 mx-auto" />
                )}
                
                <img
                  src={track.thumbnails[fullscreenImageIndex]}
                  alt={`${track.title} - Image ${fullscreenImageIndex + 1}`}
                  className={`max-w-full max-h-full object-contain transition-all duration-200 ease-out ${
                    fullscreenZoom > 1 ? `scale-[${fullscreenZoom}]` : 'scale-100'
                  } ${shouldShowImageSkeleton(track.thumbnails[fullscreenImageIndex]) ? 'opacity-0' : 'opacity-100'}`}
                  style={{
                    transform: `scale(${fullscreenZoom})`
                  }}
                />
                
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
      
            {/* XR Scene - Always present for seamless toggling */}
      {xrSceneInitialized && track.isXR && (
        <div className={`fixed inset-0 ${Z_LAYERS.XR_BACKGROUND} transition-opacity duration-300 ${
          isXRMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
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
          
          {/* XR Content Area - Simplified description (only if no teaser CTA) */}
          {!(isTeaserMode && showTeaser && track.teaserBacklink) && (
            <div className={`fixed bottom-32 md:bottom-36 lg:bottom-40 left-1/2 transform -translate-x-1/2 ${Z_LAYERS.XR_CONTROLS} safe-bottom`}>
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20 text-center max-w-sm mx-auto">
                <p className="text-white/90 text-sm">
                  {isTeaserMode ? track.title : 'Welcome to our historic district'}
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
          {/* Top Section - Image Gallery/Slideshow (Pinned to Top) */}
          <div className="flex-1 pt-12 md:pt-16 lg:pt-20 pb-4 md:pb-6 px-4 md:px-6 lg:px-8 flex items-center justify-center">
            {!showPlaylist ? (
              // Album Cover/Image Slideshow
              <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg">
                <div 
                  ref={sliderRef}
                  className="aspect-square rounded-lg overflow-hidden shadow-lg relative cursor-grab active:cursor-grabbing select-none"
                  onMouseEnter={() => setIsImageHovered(true)}
                  onMouseLeave={() => setIsImageHovered(false)}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ touchAction: 'none' }}
                >
                  {track.thumbnails && track.thumbnails.length > 1 ? (
                    <div className="relative w-full h-full">
                      {/* Show skeleton only if images are loading */}
                      {shouldShowImageSkeleton(track.thumbnails[currentThumbnailIndex]) && (
                        <Skeleton className={`absolute inset-0 w-full h-full ${Z_LAYERS.IMAGE_OVERLAY}`} />
                      )}
                      
                      {/* Current image with enhanced transition animation */}
                      <div 
                        className={`absolute inset-0 transition-transform duration-300 ease-out ${
                          isTransitioning && autoTransitionDirection 
                            ? autoTransitionDirection === 'next' 
                              ? '-translate-x-full' 
                              : 'translate-x-full'
                            : 'translate-x-0'
                        }`}
                        style={{
                          transform: isDragging 
                            ? `translateX(${dragOffset}px)` 
                            : isTransitioning && autoTransitionDirection
                              ? autoTransitionDirection === 'next' 
                                ? 'translateX(-100%)' 
                                : 'translateX(100%)'
                              : 'translateX(0px)'
                        }}
                      >
                        <img
                          src={track.thumbnails[currentThumbnailIndex]}
                          alt={`${track.album} cover ${currentThumbnailIndex + 1}`}
                          className="w-full h-full object-cover select-none"
                          style={{ 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                        />
                      </div>

                      {/* Next image for automatic transitions */}
                      {isTransitioning && autoTransitionDirection === 'next' && (
                        <div 
                          className="absolute inset-0 transition-transform duration-300 ease-out"
                          style={{
                            transform: 'translateX(0px)'
                          }}
                        >
                          <img
                            src={track.thumbnails[currentThumbnailIndex]}
                            alt={`${track.album} cover ${currentThumbnailIndex + 1}`}
                            className="w-full h-full object-cover select-none"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none'
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        </div>
                      )}

                      {/* Previous image for automatic transitions */}
                      {isTransitioning && autoTransitionDirection === 'prev' && (
                        <div 
                          className="absolute inset-0 transition-transform duration-300 ease-out"
                          style={{
                            transform: 'translateX(0px)'
                          }}
                        >
                          <img
                            src={track.thumbnails[currentThumbnailIndex]}
                            alt={`${track.album} cover ${currentThumbnailIndex + 1}`}
                            className="w-full h-full object-cover select-none"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none'
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        </div>
                      )}
                      
                      {/* Previous image (shown when dragging right) */}
                      {isDragging && dragOffset > 0 && (
                        <div 
                          className="absolute inset-0"
                          style={{
                            transform: `translateX(${dragOffset - sliderRef.current!.clientWidth}px)`
                          }}
                        >
                          <img
                            src={track.thumbnails[(currentThumbnailIndex - 1 + track.thumbnails.length) % track.thumbnails.length]}
                            alt={`${track.album} cover ${((currentThumbnailIndex - 1 + track.thumbnails.length) % track.thumbnails.length) + 1}`}
                            className="w-full h-full object-cover select-none"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none'
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        </div>
                      )}
                      
                      {/* Next image (shown when dragging left) */}
                      {isDragging && dragOffset < 0 && (
                        <div 
                          className="absolute inset-0"
                          style={{
                            transform: `translateX(${dragOffset + sliderRef.current!.clientWidth}px)`
                          }}
                        >
                          <img
                            src={track.thumbnails[(currentThumbnailIndex + 1) % track.thumbnails.length]}
                            alt={`${track.album} cover ${((currentThumbnailIndex + 1) % track.thumbnails.length) + 1}`}
                            className="w-full h-full object-cover select-none"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none'
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        </div>
                      )}
                      
                      {/* Hover Navigation Chevrons - Responsive with touch targets */}
                      {isImageHovered && track.thumbnails.length > 1 && !isTransitioning && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={previousThumbnail}
                            className={`absolute left-2 md:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white hover:text-white backdrop-blur-sm h-8 w-8 md:h-10 md:w-10 opacity-90 hover:opacity-100 transition-all duration-200 ease-out active:scale-95 ${Z_LAYERS.UI_ELEMENTS} touch-target`}
                          >
                            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={nextThumbnail}
                            className={`absolute right-2 md:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white hover:text-white backdrop-blur-sm h-8 w-8 md:h-10 md:w-10 opacity-90 hover:opacity-100 transition-all duration-200 ease-out active:scale-95 ${Z_LAYERS.UI_ELEMENTS} touch-target`}
                          >
                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full">
                      {shouldShowImageSkeleton(currentCover) && (
                        <Skeleton className="absolute inset-0 w-full h-full" />
                      )}
                      <img
                        src={currentCover}
                        alt={`${track.album} cover`}
                        className={`w-full h-full object-cover select-none transition-opacity duration-200 ease-out ${
                          shouldShowImageSkeleton(currentCover) ? 'opacity-0' : 'opacity-100'
                        }`}
                        style={{ 
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </div>
                  )}
                </div>
                
                {/* Conditional Button - XR or Fullscreen with permission warning */}
                <div className={`absolute bottom-2 md:bottom-3 lg:bottom-4 right-2 md:right-3 lg:right-4 flex gap-1 ${Z_LAYERS.HOVER_ELEMENTS}`}>
                  {track.isXR ? (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`bg-black/60 hover:bg-black/80 active:bg-black/90 dark:bg-white/80 dark:hover:bg-white/90 dark:active:bg-white text-white dark:text-black h-8 w-8 transition-all duration-200 ease-out active:scale-95 ${
                          shouldShowXRPermissionWarning() ? 'border border-yellow-400/50' : ''
                        }`}
                        onClick={launchXRmode}
                      >
                        <Glasses className="h-4 w-4" />
                      </Button>
                      {shouldShowXRPermissionWarning() && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-slate-900">
                          <AlertTriangle className="h-2 w-2 text-slate-900 m-0.5" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/60 hover:bg-black/80 active:bg-black/90 dark:bg-white/80 dark:hover:bg-white/90 dark:active:bg-white text-white dark:text-black h-8 w-8 transition-all duration-200 ease-out active:scale-95"
                      onClick={launchFullscreenMode}
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Thumbnail indicators - Responsive positioning */}
                {track.thumbnails && track.thumbnails.length > 1 && (
                  <div className={`absolute bottom-2 md:bottom-3 lg:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 md:gap-1.5 ${Z_LAYERS.HOVER_ELEMENTS}`}>
                    {track.thumbnails.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (!isTransitioning && !isDragging) {
                            // Determine direction for smooth transition
                            const direction = index > currentThumbnailIndex ? 'next' : 'prev';
                            setAutoTransitionDirection(direction);
                            setIsTransitioning(true);
                            setCurrentThumbnailIndex(index);
                            setTimeout(() => {
                              setIsTransitioning(false);
                              setAutoTransitionDirection(null);
                            }, 300);
                          }
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ease-out hover:scale-125 active:scale-110 ${
                          index === currentThumbnailIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Playlist - Match audio controller width and add proper padding
              <div className="flex flex-col h-full max-w-sm md:max-w-md lg:max-w-lg mx-auto w-full">
                <div className="bg-slate-800 dark:bg-slate-100 rounded-lg p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <div>
                      <h3 className="text-white dark:text-slate-900 font-semibold text-sm">{tourConfig.tour.tourName}</h3>
                      <p className="text-slate-300 dark:text-slate-600 text-xs">{tourConfig.tour.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlaylist}
                      className="text-slate-300 hover:text-white hover:bg-slate-700/60 dark:text-slate-600 dark:hover:text-slate-900 dark:hover:bg-slate-200/60 h-8 w-8 transition-all duration-200 ease-out active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-2 pr-2">
                      {tracks.map((trackItem, index) => (
                        <div
                          key={trackItem.id}
                          onClick={() => selectTrack(index)}
                          className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] ${
                            index === currentTrack 
                              ? 'bg-slate-700/80 dark:bg-slate-200/80' 
                              : 'hover:bg-slate-700/60 dark:hover:bg-slate-200/60'
                          }`}
                        >
                                                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 relative">
                              {shouldShowImageSkeleton(trackItem.cover) && (
                                <Skeleton className={`absolute inset-0 w-full h-full ${Z_LAYERS.IMAGE_OVERLAY}`} />
                              )}
                            <img
                              src={trackItem.cover}
                              alt={`${trackItem.album} cover`}
                              className={`w-full h-full object-cover transition-opacity duration-200 ease-out ${
                                shouldShowImageSkeleton(trackItem.cover) ? 'opacity-0' : 'opacity-100'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-white dark:text-slate-900 truncate text-xs">
                                {trackItem.title}
                              </p>
                              {trackItem.isXR ? (
                                <div className="relative">
                                  <Eye className="h-2 w-2 text-blue-400 flex-shrink-0" />
                                  {deviceOrientationPermission && !deviceOrientationPermission.granted && deviceOrientationPermission.supported && (
                                    <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full ${Z_LAYERS.UI_ELEMENTS}`}></div>
                                  )}
                                </div>
                              ) : (
                                <Maximize className="h-2 w-2 text-green-400 flex-shrink-0" />
                              )}
                              {trackItem.isTeaser && <Badge variant="outline" className="text-xs h-3 flex-shrink-0">Preview</Badge>}
                            </div>
                            <p className="text-xs text-slate-300 dark:text-slate-600 truncate">
                              Chapter {trackItem.id}
                            </p>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {formatTime(trackItem.duration)}
                          </div>
                          {index === currentTrack && isPlaying && (
                            <div className="w-3 h-3 flex items-center justify-center">
                              <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section - Audio Controller Main Player Mode (Pinned to Bottom) */}
          <div className="flex-shrink-0">
            {audioControllerMainPlayerMode}
          </div>
        </>
      )}
    </div>
  );
}