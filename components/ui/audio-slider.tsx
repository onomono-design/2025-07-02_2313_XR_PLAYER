"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "./utils";

interface AudioSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  /**
   * Current time in seconds
   */
  currentTime?: number;
  /**
   * Total duration in seconds
   */
  duration?: number;
  /**
   * Buffer progress (0-1)
   */
  buffered?: number;
  /**
   * Show time tooltips
   */
  showTimeTooltip?: boolean;
  /**
   * Large touch targets for mobile
   */
  largeTouchTargets?: boolean;
  /**
   * Color theme
   */
  variant?: "default" | "glass" | "gradient";
}

export function AudioSlider({
  className,
  currentTime = 0,
  duration = 0,
  buffered = 0,
  showTimeTooltip = true,
  largeTouchTargets = true,
  variant = "gradient",
  ...props
}: AudioSliderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = React.useState<number | null>(null);
  const [isMobileDevice, setIsMobileDevice] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isTimecodeVisible, setIsTimecodeVisible] = React.useState(false);
  const [fadeOutTimecode, setFadeOutTimecode] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLElement>(null);
  const fadeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile device for optimized touch interactions
  React.useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = (clientX: number) => {
    if (!trackRef.current || duration === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return position * duration;
  };

  const getPositionFromTime = (time: number) => {
    if (duration === 0) return 0;
    return Math.max(0, Math.min(100, (time / duration) * 100));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!showTimeTooltip || isMobileDevice) return;
    const time = getTimeFromPosition(e.clientX);
    setHoverPosition(time);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (!isMobileDevice) {
      setHoverPosition(null);
    }
  };

  // Enhanced touch and drag handling
  const handleDragStart = () => {
    if (isMobileDevice && 'vibrate' in navigator) {
      navigator.vibrate(5); // Light haptic feedback
    }
    setIsDragging(true);
    setIsTimecodeVisible(true);
    setFadeOutTimecode(false);
    
    // Clear any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragValue(null);
    
    // Start fade out animation
    setFadeOutTimecode(true);
    
    // Hide timecode after fade animation completes
    fadeTimeoutRef.current = setTimeout(() => {
      setIsTimecodeVisible(false);
      setFadeOutTimecode(false);
    }, 300); // Match fade animation duration
    
    // Keep hover position visible briefly on mobile for feedback
    if (isMobileDevice) {
      setTimeout(() => setHoverPosition(null), 800);
    }
  };

  const handleValueChange = (value: number[]) => {
    if (isDragging) {
      setDragValue(value[0]);
    }
    if (props.onValueChange) {
      props.onValueChange(value);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = isDragging && dragValue !== null ? dragValue : progress;
  const bufferProgress = buffered * 100;
  const displayTime = isDragging && dragValue !== null ? (dragValue / 100) * duration : currentTime;

  const baseSliderClasses = cn(
    "relative flex w-full touch-none select-none items-center group",
    "data-[disabled]:opacity-50 transition-all duration-200",
    largeTouchTargets ? "h-14 py-5" : "h-8 py-3", // Increased touch area
    className
  );

  const trackClasses = cn(
    "relative grow overflow-hidden rounded-full transition-all duration-200",
    largeTouchTargets ? "h-4" : "h-3", // Slightly larger track
    variant === "default" && "bg-slate-600/50 group-hover:bg-slate-600/70",
    variant === "glass" && "bg-white/20 backdrop-blur-sm group-hover:bg-white/30",
    variant === "gradient" && "bg-slate-600/50 group-hover:bg-slate-600/70",
  );

  const thumbClasses = cn(
    "block rounded-full border-2 shadow-lg transition-all duration-200 ease-out",
    "hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
    "group-hover:scale-105",
    largeTouchTargets ? "h-6 w-6" : "h-5 w-5",
    isDragging && "scale-125 shadow-xl ring-2 ring-blue-500/50",
    variant === "default" && "border-blue-500 bg-white",
    variant === "glass" && "bg-white/90 border-white/60",
    variant === "gradient" && "border-white bg-white",
  );

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        className={baseSliderClasses}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onValueChange={handleValueChange}
        onValueCommit={(value) => {
          handleDragEnd();
          if (props.onValueCommit) {
            props.onValueCommit(value);
          }
        }}
        {...props}
      >
        <SliderPrimitive.Track
          ref={trackRef}
          className={trackClasses}
        >
          {/* Buffer progress - shows loaded content */}
          <div
            className={cn(
              "absolute h-full rounded-full transition-all duration-300",
              variant === "default" && "bg-slate-400/40",
              variant === "glass" && "bg-white/30",
              variant === "gradient" && "bg-slate-400/40",
            )}
            style={{ width: `${bufferProgress}%` }}
          />
          
          {/* Played progress - shows current position with flat end cap */}
          <SliderPrimitive.Range
            className={cn(
              "absolute h-full transition-all duration-150",
              variant === "default" && "bg-blue-500",
              variant === "glass" && "bg-white/70",
              variant === "gradient" && "bg-gradient-to-r from-blue-500 to-purple-600",
              isDragging && "transition-none", // Remove transition during drag for smoothness
            )}
            style={{
              borderRadius: '9999px 0 0 9999px', // Flat end cap (right side)
            }}
          />
        </SliderPrimitive.Track>
        
        <SliderPrimitive.Thumb 
          ref={thumbRef}
          className={thumbClasses}
          style={{
            transition: isDragging ? 'none' : 'all 0.2s ease-out',
          }}
          onPointerDown={handleDragStart}
        />
      </SliderPrimitive.Root>

      {/* Enhanced hover time tooltip */}
      {showTimeTooltip && hoverPosition !== null && !isDragging && isHovering && (
        <div
          className="absolute -top-10 transform -translate-x-1/2 bg-black/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none z-20 border border-white/20 shadow-lg"
          style={{
            left: `${duration > 0 ? (hoverPosition / duration) * 100 : 0}%`,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="text-center">
            {formatTime(hoverPosition)}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-black/90"></div>
        </div>
      )}

      {/* Enhanced dragging tooltip with scaling animation anchored to thumb */}
      {isDragging && (
        <div
          className="absolute transform -translate-x-1/2 bg-blue-600/95 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg pointer-events-none z-30 shadow-xl border border-blue-400/30"
          style={{
            left: `${displayProgress}%`,
            top: largeTouchTargets ? '-3.5rem' : '-3rem',
            transition: 'none',
            animation: 'scaleIn 0.15s ease-out',
          }}
        >
          <div className="text-center font-medium">
            {formatTime(displayTime)}
          </div>
          {/* Enhanced tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600/95"></div>
        </div>
      )}

      {/* Accessibility enhancements */}
      <div className="sr-only" aria-live="polite">
        {isDragging ? `Seeking to ${formatTime(displayTime)}` : `Current time ${formatTime(currentTime)} of ${formatTime(duration)}`}
      </div>
    </div>
  );
}

export default AudioSlider; 