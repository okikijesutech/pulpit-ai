import { create } from 'zustand';

interface UIState {
  currentView: 'live' | 'songs';
  isBibleExplorerOpen: boolean;
  isSlideMatrixOpen: boolean;
  isStanzaMatrixOpen: boolean;
  isAnnouncementModalOpen: boolean;
  isServiceOrderOpen: boolean;
  isAudioPopoverOpen: boolean;
  isAuditLogVisible: boolean;

  // Actions
  setCurrentView: (view: 'live' | 'songs') => void;
  openBibleExplorer: () => void;
  closeBibleExplorer: () => void;
  toggleBibleExplorer: () => void;

  openSlideMatrix: () => void;
  closeSlideMatrix: () => void;
  toggleSlideMatrix: () => void;

  openStanzaMatrix: () => void;
  closeStanzaMatrix: () => void;
  toggleStanzaMatrix: () => void;

  openAnnouncementModal: () => void;
  closeAnnouncementModal: () => void;
  toggleAnnouncementModal: () => void;

  openServiceOrder: () => void;
  closeServiceOrder: () => void;
  toggleServiceOrder: () => void;

  setAudioPopoverOpen: (open: boolean) => void;
  toggleAudioPopover: () => void;

  toggleAuditLog: () => void;
  setAuditLogVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'live',
  isBibleExplorerOpen: false,
  isSlideMatrixOpen: false,
  isStanzaMatrixOpen: false,
  isAnnouncementModalOpen: false,
  isServiceOrderOpen: false,
  isAudioPopoverOpen: false,
  isAuditLogVisible: typeof window !== 'undefined' && window.localStorage?.getItem('pulpit_audit_log_visible') === 'true',

  setCurrentView: (view) => set({ currentView: view }),
  openBibleExplorer: () => set({ isBibleExplorerOpen: true }),
  closeBibleExplorer: () => set({ isBibleExplorerOpen: false }),
  toggleBibleExplorer: () => set((s) => ({ isBibleExplorerOpen: !s.isBibleExplorerOpen })),

  openSlideMatrix: () => set({ isSlideMatrixOpen: true }),
  closeSlideMatrix: () => set({ isSlideMatrixOpen: false }),
  toggleSlideMatrix: () => set((s) => ({ isSlideMatrixOpen: !s.isSlideMatrixOpen })),

  openStanzaMatrix: () => set({ isStanzaMatrixOpen: true }),
  closeStanzaMatrix: () => set({ isStanzaMatrixOpen: false }),
  toggleStanzaMatrix: () => set((s) => ({ isStanzaMatrixOpen: !s.isStanzaMatrixOpen })),

  openAnnouncementModal: () => set({ isAnnouncementModalOpen: true }),
  closeAnnouncementModal: () => set({ isAnnouncementModalOpen: false }),
  toggleAnnouncementModal: () => set((s) => ({ isAnnouncementModalOpen: !s.isAnnouncementModalOpen })),

  openServiceOrder: () => set({ isServiceOrderOpen: true }),
  closeServiceOrder: () => set({ isServiceOrderOpen: false }),
  toggleServiceOrder: () => set((s) => ({ isServiceOrderOpen: !s.isServiceOrderOpen })),

  setAudioPopoverOpen: (open) => set({ isAudioPopoverOpen: open }),
  toggleAudioPopover: () => set((s) => ({ isAudioPopoverOpen: !s.isAudioPopoverOpen })),

  toggleAuditLog: () =>
    set((s) => {
      const next = !s.isAuditLogVisible;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('pulpit_audit_log_visible', String(next));
      }
      return { isAuditLogVisible: next };
    }),

  setAuditLogVisible: (visible) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('pulpit_audit_log_visible', String(visible));
    }
    set({ isAuditLogVisible: visible });
  }
}));
