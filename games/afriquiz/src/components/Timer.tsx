import { useEffect, useRef, useState } from 'react';

interface TimerProps {
  /** total seconds */
  duration: number;
  /** increments to restart the countdown */
  resetKey: number;
  /** pause the bar (after an answer) */
  paused: boolean;
  onExpire: () => void;
}

/**
 * CSS-animated countdown bar + numeric seconds.
 * cyan → gold → red as time runs out, pulses under 5 s.
 */
export default function Timer({ duration, resetKey, paused, onExpire }: TimerProps) {
  const [remainingMs, setRemainingMs] = useState(duration * 1000);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemainingMs(duration * 1000);
    expiredRef.current = false;
    const startedAt = Date.now();
    let pausedAccum = 0;
    let pauseStart: number | null = null;

    const id = window.setInterval(() => {
      const now = Date.now();
      if (paused) {
        if (pauseStart === null) pauseStart = now;
        return;
      }
      if (pauseStart !== null) {
        pausedAccum += now - pauseStart;
        pauseStart = null;
      }
      const left = duration * 1000 - (now - startedAt - pausedAccum);
      setRemainingMs(Math.max(0, left));
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(id);
        onExpire();
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [duration, resetKey, paused, onExpire]);

  const pct = (remainingMs / (duration * 1000)) * 100;
  const seconds = Math.ceil(remainingMs / 1000);
  const color =
    pct > 50 ? 'bg-[#00f0ff]' : pct > 25 ? 'bg-[#FFD700]' : 'bg-[#ff4757]';
  const urgent = seconds <= 5 && remainingMs > 0;

  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`${seconds}s`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color} ${urgent ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%`, transition: 'width 100ms linear, background-color 300ms ease' }}
        />
      </div>
      <span
        className={`min-w-[3.5rem] text-right font-mono text-sm font-bold tabular-nums ${
          urgent ? 'text-[#ff4757]' : 'text-white/80'
        }`}
      >
        {seconds}s
      </span>
    </div>
  );
}
