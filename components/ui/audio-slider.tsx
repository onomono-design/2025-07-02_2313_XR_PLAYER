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
  const [hoverPosition, setHoverPosition] = React.useState<number | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!showTimeTooltip) return;
    const time = getTimeFromPosition(e.clientX);
    setHoverPosition(time);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferProgress = buffered * 100;

  const baseSliderClasses = cn(
    "relative flex w-full touch-none select-none items-center",
    "data-[disabled]:opacity-50",
    largeTouchTargets ? "h-12 py-4" : "h-6 py-2",
    className
  );

  const trackClasses = cn(
    "relative grow overflow-hidden rounded-full bg-slate-600/50",
    largeTouchTargets ? "h-4" : "h-2",
    variant === "glass" && "bg-white/20 backdrop-blur-sm",
  );

  const thumbClasses = cn(
    "block rounded-full border-2 border-white bg-white shadow-lg",
    "hover:scale-110 focus-visible:scale-110 focus-visible:outline-none",
    "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
    largeTouchTargets ? "h-6 w-6" : "h-4 w-4",
    isDragging && "scale-125 shadow-xl",
    variant === "glass" && "bg-white/90 border-white/60",
  );

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        className={baseSliderClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onValueChange={() => setIsDragging(true)}
        onValueCommit={() => setIsDragging(false)}
        {...props}
      >
        <SliderPrimitive.Track
          ref={trackRef}
          className={trackClasses}
        >
          {/* Buffer progress - shows loaded content */}
          <div
            className={cn(
              "absolute h-full rounded-full bg-slate-400/40",
              variant === "glass" && "bg-white/30",
            )}
            style={{ width: `${bufferProgress}%` }}
          />
          
          {/* Played progress - shows current position - REMOVED ANIMATION */}
          <SliderPrimitive.Range
            className={cn(
              "absolute h-full rounded-full",
              variant === "default" && "bg-blue-500",
              variant === "glass" && "bg-white/70",
              variant === "gradient" && "bg-gradient-to-r from-blue-500 to-purple-600",
            )}
          />
          
          {/* Unplayed region indicator - REMOVED ANIMATION */}
          <div
            className={cn(
              "absolute right-0 h-full rounded-full",
              variant === "default" && "bg-slate-500/30",
              variant === "glass" && "bg-white/10",
              variant === "gradient" && "bg-slate-500/30",
            )}
            style={{ 
              width: `${100 - progress}%`,
              right: 0
            }}
          />
        </SliderPrimitive.Track>
        
        <SliderPrimitive.Thumb 
          className={thumbClasses}
          style={{
            transition: isDragging ? 'none' : undefined
          }}
        />
      </SliderPrimitive.Root>

      {/* Progress percentage indicator */}
      <div className="absolute -top-6 left-0 text-xs text-slate-400">
        {duration > 0 ? `${Math.round(progress)}%` : '0%'}
      </div>

      {/* Hover time tooltip */}
      {showTimeTooltip && hoverPosition !== null && !isDragging && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
          style={{
            left: `${duration > 0 ? (hoverPosition / duration) * 100 : 0}%`,
          }}
        >
          {formatTime(hoverPosition)}
        </div>
      )}

      {/* Current time tooltip when dragging */}
      {isDragging && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 shadow-lg"
          style={{
            left: `${progress}%`,
            transition: 'none'
          }}
        >
          {formatTime(currentTime)}
        </div>
      )}
    </div>
  );
}

export default AudioSlider; 