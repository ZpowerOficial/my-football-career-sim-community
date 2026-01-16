import React, { useState, useEffect, useRef } from 'react';

interface LazyTabProps {
  children: React.ReactNode;
  isActive: boolean;
  name: string;
}

const LazyTab: React.FC<LazyTabProps> = ({ children, isActive, name }) => {
  const [hasBeenRendered, setHasBeenRendered] = useState(isActive);
  const [isVisible, setIsVisible] = useState(isActive);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      // Activate immediately when tab becomes active
      setHasBeenRendered(true);
      setIsVisible(true);
    } else {
      // Keep visible for a short time to allow for smooth transitions
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100); // Shorter timeout for faster cleanup
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive]);

  if (!hasBeenRendered) {
    // Only render when first activated
    return null;
  }

  return (
    <div
      className={`transition-opacity duration-100 ${isActive ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
      style={{
        display: (isActive || isVisible) ? 'block' : 'none',
        height: isActive ? 'auto' : '0',
        overflow: isActive ? 'visible' : 'hidden'
      }}
      aria-hidden={!isActive}
      role="tabpanel"
      id={`tab-panel-${name}`}
      aria-labelledby={`tab-${name}`}
    >
      {isActive ? children : null}
    </div>
  );
};

export default LazyTab;