import React from 'react';
import { BibleExplorerModal } from './BibleExplorerModal.js';
import { QuickAnnouncementModal } from './QuickAnnouncementModal.js';
import { SlideMatrixModal } from './SlideMatrixModal.js';
import { SongStanzaMatrixModal } from './SongStanzaMatrixModal.js';
import { ServiceOrderModal } from './ServiceOrderModal.js';
import { StageDisplayModal } from './StageDisplayModal.js';
import { MediaLibraryModal } from './MediaLibraryModal.js';
import { CountdownTimerModal } from './CountdownTimerModal.js';
import { useUIStore } from '../stores/uiStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';

export const AppModals: React.FC = () => {
  // UI Store: Modal visibility & closers
  const isBibleExplorerOpen = useUIStore((s) => s.isBibleExplorerOpen);
  const closeBibleExplorer = useUIStore((s) => s.closeBibleExplorer);

  const isAnnouncementModalOpen = useUIStore((s) => s.isAnnouncementModalOpen);
  const closeAnnouncementModal = useUIStore((s) => s.closeAnnouncementModal);

  const isSlideMatrixOpen = useUIStore((s) => s.isSlideMatrixOpen);
  const closeSlideMatrix = useUIStore((s) => s.closeSlideMatrix);

  const isStanzaMatrixOpen = useUIStore((s) => s.isStanzaMatrixOpen);
  const closeStanzaMatrix = useUIStore((s) => s.closeStanzaMatrix);

  const isServiceOrderOpen = useUIStore((s) => s.isServiceOrderOpen);
  const closeServiceOrder = useUIStore((s) => s.closeServiceOrder);

  // Authority Store: Live FreeShow state & security lock
  const freeShowConnected = useAuthorityStore((s) => s.freeShowSnapshot.connected);
  const isLocked = useAuthorityStore((s) => s.authorityState.manualLockActive);
  const currentSlideIndex = useAuthorityStore((s) => s.freeShowSnapshot.currentSlideIndex ?? 0);
  const showTitle = useAuthorityStore((s) => s.freeShowSnapshot.currentShowId || 'Sanctuary Presentation');
  const dispatchCommand = useAuthorityStore((s) => s.dispatchCommand);

  // Presentation Store: Liturgy, announcements, Bible & scripture actions
  const activeTranslation = usePresentationStore((s) => s.activeTranslation);
  const setActiveTranslation = usePresentationStore((s) => s.setActiveTranslation);
  const directProjectScripture = usePresentationStore((s) => s.directProjectScripture);
  const activeAnnouncement = usePresentationStore((s) => s.activeAnnouncement);
  const broadcastAnnouncement = usePresentationStore((s) => s.broadcastAnnouncement);
  const clearOverlay = usePresentationStore((s) => s.clearOverlay);
  const serviceCues = usePresentationStore((s) => s.serviceCues);
  const activeCueIndex = usePresentationStore((s) => s.activeCueIndex);
  const selectServiceCue = usePresentationStore((s) => s.selectServiceCue);
  const advanceServiceCue = usePresentationStore((s) => s.advanceServiceCue);
  const resetServiceOrder = usePresentationStore((s) => s.resetServiceOrder);
  const updateServiceCue = usePresentationStore((s) => s.updateServiceCue);
  const addServiceCue = usePresentationStore((s) => s.addServiceCue);
  const removeServiceCue = usePresentationStore((s) => s.removeServiceCue);
  const moveServiceCue = usePresentationStore((s) => s.moveServiceCue);
  const addCandidate = usePresentationStore((s) => s.addCandidate);

  const handleQueueManualScripture = (reference: string, previewText: string, attribution: string) => {
    addCandidate({
      id: `cand_manual_${Date.now()}`,
      type: 'scripture',
      title: reference,
      contentPreview: previewText,
      confidence: 1.0,
      evidence: `Manual Explorer Selection (${attribution})`,
      detectedAt: Date.now(),
      status: 'pending',
      actionPayload: {
        action: 'start_scripture',
        data: { reference, attribution },
        source: 'operator',
        correlationId: `manual_${Date.now()}`,
        createdAt: Date.now()
      }
    });
  };

  const handleProjectStanza = async (
    songTitle: string,
    sectionLabel: string,
    sectionIndex: number,
    textSnippet?: string
  ) => {
    await dispatchCommand('name_select_show', { name: songTitle });
    await dispatchCommand('index_select_slide', {
      index: sectionIndex,
      name: sectionLabel,
      text: textSnippet
    });
  };

  return (
    <>
      {/* Manual Bible Explorer & Direct Verse Launcher Modal */}
      <BibleExplorerModal
        isOpen={isBibleExplorerOpen}
        onClose={closeBibleExplorer}
        activeTranslation={activeTranslation}
        onSelectTranslation={setActiveTranslation}
        onDirectProject={directProjectScripture}
        onQueueSuggestion={handleQueueManualScripture}
        freeShowConnected={freeShowConnected}
        isLocked={isLocked}
      />

      {/* Quick Church Announcements & Lower-Third Alerts Modal */}
      <QuickAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={closeAnnouncementModal}
        onBroadcast={broadcastAnnouncement}
        onClearOverlay={clearOverlay}
        activeAnnouncement={activeAnnouncement}
        freeShowConnected={freeShowConnected}
        isLocked={isLocked}
      />

      {/* Interactive 64-Slide Direct Jump Matrix Modal */}
      <SlideMatrixModal
        isOpen={isSlideMatrixOpen}
        onClose={closeSlideMatrix}
        currentSlideIndex={currentSlideIndex}
        showTitle={showTitle}
        onSelectSlide={(index) => dispatchCommand('index_select_slide', { index })}
        onBlackout={() => dispatchCommand('clear_slide')}
        onFreezeOutput={() => dispatchCommand('freeze_output')}
        onShowLogo={() => dispatchCommand('show_logo')}
        freeShowConnected={freeShowConnected}
        isLocked={isLocked}
      />

      {/* Worship Stanza Matrix Modal */}
      <SongStanzaMatrixModal
        isOpen={isStanzaMatrixOpen}
        onClose={closeStanzaMatrix}
        onProjectStanza={handleProjectStanza}
        freeShowConnected={freeShowConnected}
        isLocked={isLocked}
      />

      {/* Sunday Service Order Run-Sheet & Liturgy Sequencer Modal */}
      <ServiceOrderModal
        isOpen={isServiceOrderOpen}
        onClose={closeServiceOrder}
        cues={serviceCues}
        activeCueIndex={activeCueIndex}
        onSelectCue={selectServiceCue}
        onAdvanceCue={advanceServiceCue}
        onResetService={resetServiceOrder}
        onUpdateCue={updateServiceCue}
        onAddCue={addServiceCue}
        onRemoveCue={removeServiceCue}
        onMoveCue={moveServiceCue}
        freeShowConnected={freeShowConnected}
        isLocked={isLocked}
      />

      {/* Multi-Screen Stage Confidence & Foldback Output Matrix Modal */}
      <StageDisplayModal />

      {/* Church Logo, Event Flyers & Media Graphics Modal */}
      <MediaLibraryModal />

      {/* Service Countdown Timer Modal */}
      <CountdownTimerModal />
    </>
  );
};
