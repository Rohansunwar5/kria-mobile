import { useCallback, useEffect, useRef, useState } from 'react';

/** Countdown that starts on mount; `restart` begins it again. Wall-clock based, so it survives backgrounding. */
export function useResend(seconds = 30) {
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(0);
  const end = useRef(0);
  useEffect(() => {
    end.current = Date.now() + seconds * 1000;
    setLeft(seconds);
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((end.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [seconds, run]);
  const restart = useCallback(() => setRun((n) => n + 1), []);
  return { left, canResend: left === 0, restart };
}
