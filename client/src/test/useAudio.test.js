import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis, useSpeechRecognition } from '../hooks/useAudio';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('useSpeechSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if speech synthesis is supported', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.isSupported).toBe(true);
  });

  it('should speak and call window.speechSynthesis.speak', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak('Hello World');
    });
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should stop speaking when stop is called', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.stop();
    });
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });
});

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if speech recognition is supported', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it('should start listening', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.error).toBeNull();
  });
});
