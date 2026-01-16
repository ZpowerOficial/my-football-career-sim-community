import { useRef, useCallback, useState } from "react";

interface SwipeToCloseOptions {
  /** Threshold in pixels before triggering close (default: 100) */
  threshold?: number;
  /** Callback when close is triggered */
  onClose: () => void;
  /** Enable/disable swipe (default: true) */
  enabled?: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  /** Current drag offset in pixels (for visual feedback) */
  dragOffset: number;
  /** Whether user is currently dragging */
  isDragging: boolean;
}

// Minimum distance to consider it a drag vs a tap
const MIN_DRAG_DISTANCE = 10;

/**
 * Check if the touch target or any of its parents is a scrollable element
 * that is not at the top of its scroll
 */
const isScrollingInsideContainer = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  
  let element: HTMLElement | null = target;
  while (element) {
    // Check if this element is scrollable and has scrolled down
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isScrollable = scrollHeight > clientHeight;
    const hasScrolledDown = scrollTop > 0;
    
    // If we're inside a scrollable container that has been scrolled down,
    // the user might be trying to scroll up, not swipe to close
    if (isScrollable && hasScrolledDown) {
      return true;
    }
    
    element = element.parentElement;
  }
  return false;
};

/**
 * Hook to add swipe-to-close functionality to modals
 * Detects vertical swipe down and triggers close when threshold is exceeded
 * Provides dragOffset for visual feedback during drag
 * Intelligently detects scrolling inside containers to avoid conflicts
 */
export function useSwipeToClose({
  threshold = 100,
  onClose,
  enabled = true,
}: SwipeToCloseOptions): SwipeHandlers {
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasMovedEnough = useRef(false);
  const isInsideScrollable = useRef(false);
  const touchTarget = useRef<EventTarget | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      hasMovedEnough.current = false;
      touchTarget.current = e.target;
      // Check if touch started inside a scrolled container
      isInsideScrollable.current = isScrollingInsideContainer(e.target);
      // Don't set isDragging here - wait for movement
      setDragOffset(0);
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || startY.current === null || startX.current === null) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = Math.abs(currentX - startX.current);

      // Re-check scrollable state on each move (scroll position may have changed)
      const currentlyInScrollable = isScrollingInsideContainer(touchTarget.current);
      
      // If user is swiping down but inside a scrollable container that's been scrolled,
      // they're probably trying to scroll up - don't trigger swipe to close
      if (currentlyInScrollable && deltaY > 0) {
        startY.current = null;
        startX.current = null;
        hasMovedEnough.current = false;
        setIsDragging(false);
        setDragOffset(0);
        return;
      }

      // Only start dragging if moved enough AND vertical movement is dominant
      if (!hasMovedEnough.current) {
        if (deltaY > MIN_DRAG_DISTANCE && deltaY > deltaX * 1.5) {
          // Additional check: don't start swipe if inside scrolled container
          if (!currentlyInScrollable) {
            hasMovedEnough.current = true;
            setIsDragging(true);
          }
        } else if (deltaX > MIN_DRAG_DISTANCE || deltaY < -MIN_DRAG_DISTANCE) {
          // Horizontal swipe or upward movement - cancel swipe detection
          startY.current = null;
          startX.current = null;
          return;
        }
      }

      if (hasMovedEnough.current && deltaY > 0) {
        // Apply resistance for visual feedback
        const resistedOffset = deltaY * 0.8;
        setDragOffset(resistedOffset);
      }
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled || startY.current === null) {
      startY.current = null;
      startX.current = null;
      hasMovedEnough.current = false;
      isInsideScrollable.current = false;
      touchTarget.current = null;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    // If swiped down more than threshold, trigger close
    if (hasMovedEnough.current && dragOffset > threshold) {
      onClose();
    }

    startY.current = null;
    startX.current = null;
    hasMovedEnough.current = false;
    isInsideScrollable.current = false;
    touchTarget.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }, [enabled, threshold, onClose, dragOffset]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    dragOffset,
    isDragging,
  };
}

export default useSwipeToClose;

