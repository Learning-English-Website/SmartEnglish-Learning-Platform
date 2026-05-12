import { useEffect } from 'react';

/**
 * useKeyboardShortcuts — register global keyboard shortcuts.
 *
 * @param {Record<string, (e: KeyboardEvent) => void>} shortcuts
 *   Keys are strings like:
 *     'ctrl+n', 'ctrl+enter', 'ctrl+s', 'escape', 'tab'
 *   Values are handler functions.
 *
 * @param {boolean} enabled — set false to temporarily disable all shortcuts
 *
 * @example
 *   useKeyboardShortcuts({
 *     'ctrl+n':     (e) => addCard(),
 *     'ctrl+enter': (e) => submit(),
 *     'escape':     (e) => cancel(),
 *   });
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      // Build a key string from the event
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey)               parts.push('alt');
      if (e.shiftKey)             parts.push('shift');

      const key = e.key.toLowerCase();
      if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
        parts.push(key);
      }

      const combo = parts.join('+');
      const handler = shortcuts[combo];

      if (handler) {
        handler(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}
