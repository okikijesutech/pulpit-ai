import { useEffect } from 'react';
import { usePresentationStore } from '../stores/presentationStore.js';

/**
 * Manages auto-dismiss countdown timer for sanctuary lower-third alert overlays.
 */
export function useAnnouncementTimer() {
  const activeAnnouncement = usePresentationStore((s) => s.activeAnnouncement);
  const setActiveAnnouncement = usePresentationStore((s) => s.setActiveAnnouncement);
  const clearOverlay = usePresentationStore((s) => s.clearOverlay);

  useEffect(() => {
    if (!activeAnnouncement) return;
    if (activeAnnouncement.durationSeconds <= 0) return;

    const interval = setInterval(() => {
      const current = usePresentationStore.getState().activeAnnouncement;
      if (!current) return;
      if (current.remainingSeconds <= 1) {
        clearOverlay();
      } else {
        setActiveAnnouncement({ ...current, remainingSeconds: current.remainingSeconds - 1 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAnnouncement?.id, clearOverlay, setActiveAnnouncement]);
}
