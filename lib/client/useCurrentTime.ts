import { useEffect, useState } from "react";

/**
 * Returns the current timestamp while enabled and refreshes it on an interval.
 * @param enabled Whether the timer is active.
 * @param intervalMs Refresh interval in milliseconds.
 * @returns The current Unix timestamp in ms, or null when disabled.
 * @author Minn
 */
export function useCurrentTime(enabled: boolean, intervalMs = 60_000) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const updateCurrentTime = () => setCurrentTime(Date.now());
    const animationFrame = requestAnimationFrame(updateCurrentTime);
    const interval = window.setInterval(updateCurrentTime, intervalMs);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs]);

  return currentTime;
}
