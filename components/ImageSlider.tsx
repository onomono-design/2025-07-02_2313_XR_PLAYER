"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "./ui/utils"
import { ChevronLeft, ChevronRight, X, Maximize } from "lucide-react"

// Tour config image interface to match existing structure
interface TourImage {
  url: string;
  title?: string;
  description?: string;
}

export interface ImageSliderProps {
  /**
   * Array of image sources to display - can be strings or objects with metadata
   */
  images: (string | TourImage)[]
  /**
   * Optional array of timecodes (in seconds) for when to transition to the next slide
   * If provided, will trigger transitions at specific times
   * If not provided, will cycle through images every 20 seconds (matching current app)
   */
  timecodes?: number[]
  /**
   * Alt text for images
   */
  alt?: string
  /**
   * Additional class names for the main container
   */
  className?: string
  /**
   * Whether to enable autoplay
   * @default true
   */
  autoplay?: boolean
  /**
   * Default interval for autoplay in seconds (when no timecodes provided)
   * @default 20
   */
  defaultInterval?: number
  /**
   * Callback when slide changes
   */
  onSlideChange?: (index: number) => void
  /**
   * Enable development mode with additional controls and info
   * @default false
   */
  devMode?: boolean
  /**
   * Allow vertical cropping when container height is constrained
   * @default false
   */
  allowVerticalCrop?: boolean
  /**
   * Fixed aspect ratio to maintain (width/height)
   * @default 1 (square)
   */
  aspectRatio?: number
  /**
   * Enable fullscreen mode toggle
   * @default true
   */
  enableFullscreen?: boolean
  /**
   * Callback when entering/exiting fullscreen
   */
  onFullscreenChange?: (isFullscreen: boolean) => void
  /**
   * Show image descriptions and titles
   * @default true
   */
  showDescriptions?: boolean
  /**
   * Disable autoplay in teaser mode
   * @default false
   */
  isTeaserMode?: boolean
}

export function ImageSlider({
  images,
  timecodes,
  alt = "Slider image",
  className,
  autoplay = true,
  defaultInterval = 20,
  onSlideChange,
  devMode = false, // Currently unused but kept for future development features
  allowVerticalCrop = false,
  aspectRatio = 1,
  enableFullscreen = true,
  onFullscreenChange,
  showDescriptions = true,
  isTeaserMode = false,
}: ImageSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPinching, setIsPinching] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [tapScale, setTapScale] = useState(1)
  const [isTapping, setIsTapping] = useState(false)
  const pinchDistanceRef = useRef(0)
  const panStartRef = useRef({ x: 0, y: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressStartPos = useRef({ x: 0, y: 0 })
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Helper functions to work with mixed image format
  const getImageUrl = useCallback((img: string | TourImage): string => {
    return typeof img === 'string' ? img : img.url
  }, [])

  const getImageTitle = useCallback((img: string | TourImage): string | undefined => {
    return typeof img === 'string' ? undefined : img.title
  }, [])

  const getImageDescription = useCallback((img: string | TourImage): string | undefined => {
    return typeof img === 'string' ? undefined : img.description
  }, [])

  const getContainerWidth = useCallback(() => {
    if (isFullscreen) return window.innerWidth
    return containerRef.current?.offsetWidth || 0
  }, [isFullscreen])

  const getTransformValue = useCallback(() => {
    if (isDragging) {
      return `translateX(calc(${-activeIndex * 100}% + ${currentX - startX}px))`
    }
    return `translateX(${-activeIndex * 100}%)`
  }, [activeIndex, currentX, startX, isDragging])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timerRef.current = null
    intervalRef.current = null

    // Don't autoplay in teaser mode or fullscreen or if disabled
    if (!autoplay || images.length <= 1 || isFullscreen || isTeaserMode) {
      setTimeRemaining(null)
      return
    }

    let interval = defaultInterval
    if (timecodes && timecodes.length > activeIndex) {
      interval = timecodes[activeIndex]
    }
    setTimeRemaining(interval)

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => (prev === null || prev <= 0 ? null : prev - 1))
    }, 1000)

    timerRef.current = setTimeout(() => {
      goToNext()
    }, interval * 1000)
  }, [autoplay, images.length, defaultInterval, timecodes, activeIndex, isFullscreen, isTeaserMode])

  const goToSlide = useCallback(
    (index: number) => {
      const newIndex = Math.max(0, Math.min(index, images.length - 1))
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex)
        if (onSlideChange) onSlideChange(newIndex)
        resetTimer()
        // Reset zoom/pan on slide change
        setScale(1)
        setPosition({ x: 0, y: 0 })
      }
    },
    [activeIndex, images.length, onSlideChange, resetTimer],
  )

  const goToNext = useCallback(() => {
    if (images.length <= 1) return
    goToSlide((activeIndex + 1) % images.length)
  }, [activeIndex, images.length, goToSlide])

  const goToPrevious = useCallback(() => {
    if (images.length <= 1) return
    goToSlide((activeIndex - 1 + images.length) % images.length)
  }, [activeIndex, images.length, goToSlide])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (images.length <= 1) return
    e.preventDefault()
    
    // Start tap scale for mouse
    if (!isFullscreen) {
      startTapScale()
    }
    
    setIsDragging(true)
    setStartX(e.clientX)
    setCurrentX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    setCurrentX(e.clientX)
  }

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    
    // Allow swipe navigation in fullscreen mode only if not zoomed in
    if (isFullscreen && scale <= 1) {
      const dragDistance = currentX - startX
      const containerWidth = getContainerWidth()
      if (Math.abs(dragDistance) > containerWidth * 0.15) { // Lower threshold for fullscreen
        if (dragDistance > 0) goToPrevious()
        else goToNext()
      }
    } else if (!isFullscreen) {
      // Normal swipe behavior for non-fullscreen
      const dragDistance = currentX - startX
      const containerWidth = getContainerWidth()
      if (Math.abs(dragDistance) > containerWidth * 0.2) {
        if (dragDistance > 0) goToPrevious()
        else goToNext()
      }
    }
    setIsDragging(false)
  }, [isDragging, currentX, startX, getContainerWidth, goToPrevious, goToNext, scale, isFullscreen])

  const getPinchDistance = (touches: React.TouchList) => {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
  }

  const handleDoubleTap = (touch: React.Touch) => {
    if (!isFullscreen) return
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2)
      setPosition({ x: 0, y: 0 })
    }
  }

  const startTapScale = () => {
    if (isFullscreen || isTeaserMode) return // Don't trigger in fullscreen or teaser mode
    
    setIsTapping(true)
    setTapScale(0.99) // 1% scale down
    
    // Set up long press timer for fullscreen
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      // Trigger fullscreen mode
      if (enableFullscreen) {
        toggleFullscreen()
      }
    }, 1000) // 1 second hold
  }

  const endTapScale = () => {
    setIsTapping(false)
    setTapScale(1)
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  const startLongPress = (touch: React.Touch) => {
    if (isFullscreen || isTeaserMode) return // Don't trigger in fullscreen or teaser mode
    
    longPressStartPos.current = { x: touch.clientX, y: touch.clientY }
    setIsLongPressing(false)
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      // Trigger fullscreen mode
      if (enableFullscreen) {
        toggleFullscreen()
      }
    }, 1000) // 1 second hold
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  const checkLongPressMoved = (touch: React.Touch) => {
    const moveThreshold = 10 // pixels
    const dx = Math.abs(touch.clientX - longPressStartPos.current.x)
    const dy = Math.abs(touch.clientY - longPressStartPos.current.y)
    return (dx > moveThreshold || dy > moveThreshold)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1 && !isFullscreen) return

    // Double tap detection
    const now = Date.now()
    if (now - lastTap < 300 && e.touches.length === 1) {
      e.preventDefault()
      endTapScale() // End tap scale on double tap
      handleDoubleTap(e.touches[0])
      return
    }
    setLastTap(now)

    if (e.touches.length === 2 && isFullscreen) {
      e.preventDefault()
      endTapScale()
      setIsPinching(true)
      pinchDistanceRef.current = getPinchDistance(e.touches)
    } else if (e.touches.length === 1) {
      // Start tap scale for single touch
      if (!isFullscreen) {
        startTapScale()
      }
      
      setIsDragging(true)
      setStartX(e.touches[0].clientX)
      setCurrentX(e.touches[0].clientX)
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel tap scale if finger moves too much
    if (e.touches.length === 1 && !isFullscreen && isTapping) {
      const moveThreshold = 10 // pixels
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - panStartRef.current.y)
      if (dx > moveThreshold || dy > moveThreshold) {
        endTapScale()
      }
    }

    if (!isDragging && !isPinching) return

    if (isPinching && e.touches.length === 2 && isFullscreen) {
      e.preventDefault()
      const newDist = getPinchDistance(e.touches)
      const newScale = scale * (newDist / pinchDistanceRef.current)
      setScale(Math.max(1, Math.min(4, newScale))) // Limit zoom to 4x
      pinchDistanceRef.current = newDist
    } else if (isDragging && e.touches.length === 1) {
      if (scale > 1 && isFullscreen) {
        e.preventDefault()
        const dx = e.touches[0].clientX - panStartRef.current.x
        const dy = e.touches[0].clientY - panStartRef.current.y
        
        // Constrain panning to image bounds
        const maxX = (window.innerWidth * (scale - 1)) / 2
        const maxY = (window.innerHeight * (scale - 1)) / 2
        
        setPosition({ 
          x: Math.max(-maxX, Math.min(maxX, position.x + dx)), 
          y: Math.max(-maxY, Math.min(maxY, position.y + dy))
        })
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else {
        setCurrentX(e.touches[0].clientX)
        if (Math.abs(currentX - startX) > 10) e.preventDefault()
      }
    }
  }

  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !isFullscreen
    setIsFullscreen(newFullscreenState)
    if (onFullscreenChange) onFullscreenChange(newFullscreenState)
  }, [isFullscreen, onFullscreenChange])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      // Clean up long press timer
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      // Clean up tap timer
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    }
  }, [activeIndex, autoplay, images.length, timecodes, resetTimer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        images.length <= 1 ||
        (!isFullscreen &&
          document.activeElement &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))
      )
        return
      if (e.key === "ArrowLeft") goToPrevious()
      else if (e.key === "ArrowRight") goToNext()
      else if (e.key === "Escape" && isFullscreen) toggleFullscreen()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeIndex, images.length, goToPrevious, goToNext, isFullscreen, toggleFullscreen])

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) handleDragEnd()
      endTapScale() // End tap scale on mouse up
    }
    const handleTouchEndGlobal = () => {
      if (isDragging) handleDragEnd()
      setIsPinching(false)
      endTapScale() // End tap scale on touch end
    }

    window.addEventListener("mouseup", handleMouseUpGlobal)
    window.addEventListener("touchend", handleTouchEndGlobal)

    return () => {
      window.removeEventListener("mouseup", handleMouseUpGlobal)
      window.removeEventListener("touchend", handleTouchEndGlobal)
    }
  }, [handleDragEnd])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
      resetTimer() // Pause autoplay when entering fullscreen
    } else {
      document.body.style.overflow = ""
      resetTimer() // Restart autoplay logic when exiting fullscreen
      // Reset zoom/pan on exit
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setShowInfo(false)
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFullscreen, resetTimer])

  if (!images || !images.length) return null

  const currentImage = images[activeIndex]
  const currentImageUrl = getImageUrl(currentImage)
  const currentImageTitle = getImageTitle(currentImage)
  const currentImageDescription = getImageDescription(currentImage)

  const sliderContent = (
    <>
      {/* Long press visual feedback */}
      {isLongPressing && !isFullscreen && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Entering fullscreen...
          </div>
        </div>
      )}

      {autoplay && timeRemaining !== null && !isFullscreen && !isTeaserMode && (
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {timeRemaining}s
        </div>
      )}
      
      <div
        className={cn(
          "flex w-full h-full transition-transform duration-300",
          isDragging ? "transition-none" : "ease-out",
        )}
        style={{ transform: getTransformValue() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseLeave={() => isDragging && handleDragEnd()}
      >
        {images.map((img, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full h-full relative transition-transform duration-300"
            style={
              isFullscreen && activeIndex === index
                ? { 
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center center',
                    maxWidth: '100vw',
                    maxHeight: '100vh'
                  }
                : {}
            }
          >
            {/* Enhanced loading state for images */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg">
              <div className="text-white/70 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
                Loading image...
              </div>
            </div>
            
            <img
              src={getImageUrl(img) || "/placeholder.svg"}
              alt={`${alt} ${index + 1}`}
              className={cn(
                "w-full h-full object-cover pointer-events-none transition-opacity duration-200 network-optimized mobile-optimized",
                isFullscreen ? "object-contain" : "object-cover"
              )}
              draggable="false"
              loading={index === activeIndex ? "eager" : "lazy"}
              decoding="async"
              onLoad={(e) => {
                // Hide loading state
                const loadingDiv = e.currentTarget.previousElementSibling as HTMLElement;
                if (loadingDiv) {
                  loadingDiv.style.display = 'none';
                }
                
                // Improve mobile loading performance by preloading next image
                if (index === activeIndex && images.length > 1) {
                  const nextIndex = (index + 1) % images.length;
                  const nextImg = new Image();
                  nextImg.src = getImageUrl(images[nextIndex]) || "/placeholder.svg";
                }
              }}
              onError={(e) => {
                // Handle image loading errors gracefully
                const loadingDiv = e.currentTarget.previousElementSibling as HTMLElement;
                if (loadingDiv) {
                  loadingDiv.innerHTML = `
                    <div class="text-red-400 text-sm flex items-center gap-2">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      Failed to load
                    </div>
                  `;
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows - Enhanced for fullscreen protection */}
      {images.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white z-30",
              "transition-all duration-300 ease-in-out border border-white/20",
              isHovering || isDragging || isFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-90",
              isFullscreen ? "left-4 md:left-6" : "left-3"
            )}
            onClick={goToPrevious}
          >
            <ChevronLeft size={isFullscreen ? 28 : 20} />
          </button>
          <button
            aria-label="Next slide"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white z-30",
              "transition-all duration-300 ease-in-out border border-white/20",
              isHovering || isDragging || isFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-90",
              isFullscreen ? "right-4 md:right-6" : "right-3"
            )}
            onClick={goToNext}
          >
            <ChevronRight size={isFullscreen ? 28 : 20} />
          </button>
          
          {/* Enhanced pagination dots with protection */}
          <div className={cn(
            "absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30",
            isFullscreen ? "bottom-6 md:bottom-8" : "bottom-2 md:bottom-4"
          )}>
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20">
              {images.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Go to slide ${index + 1}`}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200 mx-1",
                    activeIndex === index ? "bg-white w-4" : "bg-white/50",
                    isFullscreen ? "w-3 h-3" : "",
                    activeIndex === index && isFullscreen ? "w-6" : ""
                  )}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Fullscreen controls and zoom indicator */}
      {isFullscreen && (
        <>
          {/* Zoom indicator */}
          {scale > 1 && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full z-30 border border-white/20">
              {Math.round(scale * 100)}%
            </div>
          )}
          
          {/* Instructions for mobile users */}
          {!showInfo && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full z-30 border border-white/20 opacity-75">
              Double tap to zoom • Pinch to zoom • Swipe to navigate
            </div>
          )}
        </>
      )}

      {enableFullscreen && !isFullscreen && (
        <button
          aria-label="Enter fullscreen"
          className={cn(
            "absolute bottom-2 right-2 md:bottom-4 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 flex items-center justify-center text-white z-10",
            "transition-opacity duration-300 ease-in-out",
            "opacity-100",
          )}
          onClick={toggleFullscreen}
        >
          <Maximize size={18} />
        </button>
      )}

      {isFullscreen && (
        <>
          <button
            aria-label="Exit fullscreen"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white z-20"
            onClick={toggleFullscreen}
          >
            <X size={24} />
          </button>
          
          {showDescriptions && (currentImageTitle || currentImageDescription) && (
            <button
              aria-label="Toggle image info"
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white z-20"
              onClick={() => setShowInfo(!showInfo)}
            >
              <div className="text-sm font-bold">i</div>
            </button>
          )}
          
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-16 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm z-20">
              {activeIndex + 1} / {images.length}
            </div>
          )}
          
          {/* Image info overlay */}
          {showInfo && showDescriptions && (currentImageTitle || currentImageDescription) && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white z-20 max-w-lg mx-auto">
              {currentImageTitle && (
                <h3 className="font-semibold mb-2 text-lg">{currentImageTitle}</h3>
              )}
              {currentImageDescription && (
                <p className="text-sm text-white/90 leading-relaxed">{currentImageDescription}</p>
              )}
            </div>
          )}
        </>
      )}
    </>
  )

  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative w-full h-full">{sliderContent}</div>
      </div>
    )
  }

  const containerClass = cn(
    "relative w-full overflow-hidden rounded-xl shadow-lg",
    "mx-2 my-3 md:mx-3 md:my-4", // Added responsive margin and padding
    allowVerticalCrop ? "h-full" : "aspect-square",
    className,
  )
  const containerStyle = allowVerticalCrop
    ? {} 
    : { aspectRatio: aspectRatio.toString() }

  if (images.length === 1 && !enableFullscreen) {
    // Simplified view for single image without fullscreen
    return (
      <div className={containerClass} style={containerStyle}>
        <img
          src={currentImageUrl || "/placeholder.svg"}
          alt={alt}
          className="w-full h-full object-cover"
          draggable="false"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={containerClass}
      style={{
        ...containerStyle,
        transform: `scale(${tapScale})`,
        transition: isTapping ? 'transform 0.1s ease-out' : 'transform 0.2s ease-out'
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {sliderContent}
    </div>
  )
} 