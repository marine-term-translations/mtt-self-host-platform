import React from 'react';

interface TourBackdropProps {
  targetRect: DOMRect | null;
  isCenterModal?: boolean;
  onDismiss?: () => void;
}

export const TourBackdrop: React.FC<TourBackdropProps> = ({ targetRect, isCenterModal, onDismiss }) => {
  if (isCenterModal || !targetRect) {
    return (
      <div 
        className="fixed inset-0 z-[9990] bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={onDismiss}
      />
    );
  }

  // Draw dark SVG overlay with a rounded cutout for the highlighted target element
  const padding = 8;
  const top = Math.max(0, targetRect.top - padding);
  const left = Math.max(0, targetRect.left - padding);
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;
  const rx = 10;

  return (
    <svg 
      className="fixed inset-0 z-[9990] w-full h-full pointer-events-auto transition-all duration-300"
      style={{ width: '100vw', height: '100vh' }}
    >
      <defs>
        <mask id="spotlight-mask">
          {/* Entire screen in white */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {/* Cutout area in black */}
          <rect 
            x={left} 
            y={top} 
            width={width} 
            height={height} 
            rx={rx} 
            ry={rx} 
            fill="black" 
          />
        </mask>
      </defs>
      {/* Dark overlay using the cutout mask */}
      <rect 
        x="0" 
        y="0" 
        width="100%" 
        height="100%" 
        fill="rgba(15, 23, 42, 0.75)" 
        mask="url(#spotlight-mask)"
        onClick={onDismiss}
      />
      {/* Subtle spotlight glow ring */}
      <rect 
        x={left} 
        y={top} 
        width={width} 
        height={height} 
        rx={rx} 
        ry={rx} 
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  );
};
