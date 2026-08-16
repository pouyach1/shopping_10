import { useEffect, useRef, useState, useCallback } from 'react';

interface UseHumanTypingOptions {
  text: string;
  speed?: number;
  start?: boolean;
  onComplete?: () => void;
}

export function useHumanTyping({ text, speed = 45, start = true, onComplete }: UseHumanTypingOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const optionsRef = useRef({ speed, onComplete });

  useEffect(() => {
    optionsRef.current = { speed, onComplete };
  }, [speed, onComplete]);

  const startTyping = useCallback(() => {
    setIsTyping(true);
    setIsDone(false);
  }, []);

  useEffect(() => {
    if (!start) return;

    let charIndex = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    interval = setInterval(() => {
      charIndex += 1;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex >= text.length) {
        if (interval) clearInterval(interval);
        setIsTyping(false);
        setIsDone(true);
        optionsRef.current.onComplete?.();
      }
    }, optionsRef.current.speed);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [text, start]);

  return { displayedText, isTyping, isDone, startTyping };
}
