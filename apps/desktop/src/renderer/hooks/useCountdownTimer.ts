import { useEffect } from 'react';
import { usePresentationStore } from '../stores/presentationStore.js';

/**
 * Ticks the service countdown timer once per second while running.
 */
export function useCountdownTimer(): void {
  const isRunning = usePresentationStore((s) => s.countdownTimer.isRunning);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      usePresentationStore.getState().tickTimer();
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);
}
