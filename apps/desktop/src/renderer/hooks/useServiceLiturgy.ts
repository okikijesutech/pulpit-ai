import { useState } from 'react';
import { LiturgyCueItem, DEFAULT_SUNDAY_LITURGY } from '../components/ServiceOrderModal.js';
import { AllowlistedAction } from '@pulpit-ai/shared-types';

/**
 * Sunday service liturgy run-sheet state and cue pacing.
 */
export function useServiceLiturgy(
  dispatchCommand: (action: AllowlistedAction, data?: any) => Promise<any>
) {
  const [serviceCues, setServiceCues] = useState<LiturgyCueItem[]>(DEFAULT_SUNDAY_LITURGY);
  const [activeCueIndex, setActiveCueIndex] = useState<number>(0);
  const [isServiceOrderOpen, setIsServiceOrderOpen] = useState<boolean>(false);

  const handleSelectServiceCue = async (index: number) => {
    setActiveCueIndex(index);
    setServiceCues((prev) =>
      prev.map((c, i) => ({
        ...c,
        status: i === index ? 'active' : i < index ? 'completed' : 'pending'
      }))
    );

    const targetCue = serviceCues[index];
    if (!targetCue) return;

    if (targetCue.showName) {
      await dispatchCommand('name_select_show', { name: targetCue.showName });
    } else if (targetCue.scriptureReference) {
      await dispatchCommand('start_scripture', { reference: targetCue.scriptureReference });
    }
  };

  const handleAdvanceServiceCue = async () => {
    if (activeCueIndex < serviceCues.length - 1) {
      await handleSelectServiceCue(activeCueIndex + 1);
    }
  };

  const handleResetServiceOrder = () => {
    setActiveCueIndex(0);
    setServiceCues(DEFAULT_SUNDAY_LITURGY);
  };

  return {
    serviceCues,
    activeCueIndex,
    isServiceOrderOpen,
    setIsServiceOrderOpen,
    handleSelectServiceCue,
    handleAdvanceServiceCue,
    handleResetServiceOrder
  };
}
