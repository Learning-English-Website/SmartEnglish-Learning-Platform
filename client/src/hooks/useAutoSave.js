import { useEffect, useRef, useCallback } from 'react';

/**
 * useAutoSave — debounce + localStorage auto-save hook.
 *
 * @param {string} key         — localStorage key
 * @param {any}    data        — data to save (will be JSON.stringify'd)
 * @param {number} delayMs     — debounce delay (default 1500ms)
 * @param {(d) => boolean} isEmpty — optional: if true, clears draft instead of saving
 *
 * Returns: { clearDraft, getDraft }
 */
export function useAutoSave(key, data, delayMs = 1500, isEmpty) {
  const timerRef = useRef(null);
  const prevDataRef = useRef(null);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  const getDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [key]);

  useEffect(() => {
    const serialized = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (serialized === prevDataRef.current) return;
    prevDataRef.current = serialized;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Check if data is empty — clear draft
    if (isEmpty && isEmpty(data)) {
      clearDraft();
      return;
    }

    // Debounce save
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, serialized);
        // Dispatch custom event so other hooks can react
        window.dispatchEvent(new CustomEvent('autosave', { detail: { key } }));
      } catch (e) {
        console.warn('[useAutoSave] Failed to save:', e);
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, data, delayMs, isEmpty, clearDraft]);

  return { clearDraft, getDraft };
}
