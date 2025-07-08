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
  const pinchDistanceRef = useRef(0)
  const panStartRef = useRef({ x: 0, y: 0 })
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
    // Prevent swipe if zoomed in
    if (scale > 1 && isFullscreen) {
      setIsDragging(false)
      return
    }
    const dragDistance = currentX - startX
    const containerWidth = getContainerWidth()
    if (Math.abs(dragDistance) > containerWidth * 0.2) {
      if (dragDistance > 0) goToPrevious()
      else goToNext()
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1 && !isFullscreen) return

    // Double tap detection
    const now = Date.now()
    if (now - lastTap < 300 && e.touches.length === 1) {
      e.preventDefault()
      handleDoubleTap(e.touches[0])
    }
    setLastTap(now)

    if (e.touches.length === 2 && isFullscreen) {
      e.preventDefault()
      setIsPinching(true)
      pinchDistanceRef.current = getPinchDistance(e.touches)
    } else if (e.touches.length === 1) {
      setIsDragging(true)
      setStartX(e.touches[0].clientX)
      setCurrentX(e.touches[0].clientX)
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging && !isPinching) return

    if (isPinching && e.touches.length === 2 && isFullscreen) {
      e.preventDefault()
      const newDist = getPinchDistance(e.touches)
      const newScale = scale * (newDist / pinchDistanceRef.current)
      setScale(Math.max(1, newScale))
      pinchDistanceRef.current = newDist
    } else if (isDragging && e.touches.length === 1) {
      if (scale > 1 && isFullscreen) {
        e.preventDefault()
        const dx = e.touches[0].clientX - panStartRef.current.x
        const dy = e.touches[0].clientY - panStartRef.current.y
        setPosition({ x: position.x + dx, y: position.y + dy })
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
    }
    const handleTouchEndGlobal = () => {
      if (isDragging) handleDragEnd()
      setIsPinching(false)
    }
    window.addEventListener("mouseup", handleMouseUpGlobal)
    window.addEventListener("touchend", handleTouchEndGlobal)
    return () => {
      window.removeEventListener("mouseup", handleMouseUpGlobal)
      window.removeEventListener("touchend", handleTouchEndGlobal)
    }
  }, [isDragging, handleDragEnd])

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
                ? { transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)` }
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

      {images.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 flex items-center justify-center text-white z-10",
              "transition-opacity duration-300 ease-in-out",
              isHovering || isDragging || isFullscreen ? "opacity-100" : "opacity-0",
            )}
            onClick={goToPrevious}
          >
            <ChevronLeft size={isFullscreen ? 24 : 20} />
          </button>
          <button
            aria-label="Next slide"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 flex items-center justify-center text-white z-10",
              "transition-opacity duration-300 ease-in-out",
              isHovering || isDragging || isFullscreen ? "opacity-100" : "opacity-0",
            )}
            onClick={goToNext}
          >
            <ChevronRight size={isFullscreen ? 24 : 20} />
          </button>
          <div className="absolute bottom-2 md:bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                aria-label={`Go to slide ${index + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  activeIndex === index ? "bg-white w-4" : "bg-white/50",
                  isFullscreen ? "w-3 h-3" : "",
                )}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
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
      style={containerStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {sliderContent}
    </div>
  )
} 