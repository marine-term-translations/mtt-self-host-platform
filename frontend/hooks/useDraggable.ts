import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableResult {
  position: Position;
  isDragging: boolean;
  wasDragging: boolean;
  handleDragStart: (e: React.MouseEvent) => void;
  resetPosition: () => void;
}

/**
 * Custom hook that provides drag-to-move functionality for modals/panels.
 * Position is expressed as an offset in pixels from the element's initial centered position.
 * `wasDragging` stays true briefly after drag ends to prevent accidental backdrop-close clicks.
 */
export function useDraggable(): UseDraggableResult {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);
  const wasDraggingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setWasDragging(false);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPosition({
        x: dragStart.current.posX + (e.clientX - dragStart.current.mouseX),
        y: dragStart.current.posY + (e.clientY - dragStart.current.mouseY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;
      // Mark that a drag just finished so backdrop click handlers can ignore this event
      setWasDragging(true);
      if (wasDraggingTimer.current) clearTimeout(wasDraggingTimer.current);
      wasDraggingTimer.current = setTimeout(() => setWasDragging(false), 200);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      if (wasDraggingTimer.current) clearTimeout(wasDraggingTimer.current);
    };
  }, []);

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setWasDragging(false);
  }, []);

  return { position, isDragging, wasDragging, handleDragStart, resetPosition };
}
