import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to trap focus within a container for accessibility
 * @param {boolean} isActive - Whether the trap is active
 * @returns {object} ref to attach to container
 */
export function useFocusTrap(isActive = true) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to manage keyboard navigation within a list
 * @param {number} itemCount - Total number of items
 * @param {function} onSelect - Callback when item is selected
 * @param {function} onEscape - Callback when Escape is pressed
 */
export function useListKeyboardNav(itemCount, onSelect, onEscape) {
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          currentIndexRef.current = Math.min(currentIndexRef.current + 1, itemCount - 1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          currentIndexRef.current = 0;
          break;
        case 'End':
          e.preventDefault();
          currentIndexRef.current = itemCount - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(currentIndexRef.current);
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
        default:
          break;
      }
    },
    [itemCount, onSelect, onEscape]
  );

  return { handleKeyDown, currentIndex: currentIndexRef.current };
}

export default useFocusTrap;
