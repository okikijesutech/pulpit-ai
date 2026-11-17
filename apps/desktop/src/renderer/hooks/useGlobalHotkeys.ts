import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';

/**
 * Centralized global keyboard shortcuts for the pulpit presentation desk.
 * Queries latest store state dynamically via Zustand getState(), eliminating stale closures.
 * Keystrokes are ignored when typing inside text inputs.
 */
export function useGlobalHotkeys(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept hotkeys if operator is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const { dispatchCommand } = useAuthorityStore.getState();
      const ui = useUIStore.getState();

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        dispatchCommand('next_slide');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatchCommand('previous_slide');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        dispatchCommand('clear_slide');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatchCommand('clear_all');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        dispatchCommand('restore_output');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        ui.toggleBibleExplorer();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        ui.toggleAnnouncementModal();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        ui.toggleAuditLog();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        ui.toggleSlideMatrix();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        ui.toggleStanzaMatrix();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        ui.toggleServiceOrder();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        ui.toggleStageDisplayModal();
      } else if (e.key === 'Enter') {
        const { candidates, approveCandidate } = usePresentationStore.getState();
        const { manualLockActive } = useAuthorityStore.getState().authorityState;
        if (candidates.length > 0 && !manualLockActive) {
          e.preventDefault();
          approveCandidate(candidates[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
