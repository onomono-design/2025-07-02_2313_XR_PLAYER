// Global type definitions for the project

interface TourImageData {
  url: string;
  title?: string;
  description?: string;
}

// Declare DeviceOrientationEvent to avoid TypeScript errors
interface DeviceOrientationEvent extends Event {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

interface DeviceOrientationEventStatic extends EventTarget {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

declare var DeviceOrientationEvent: {
  prototype: DeviceOrientationEvent;
  new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
  requestPermission?: () => Promise<'granted' | 'denied'>;
}; 