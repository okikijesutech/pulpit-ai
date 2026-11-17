/**
 * Multi-Screen Stage Confidence Display and Output Routing Contracts.
 */

export type DisplayTarget = 'main' | 'foldback' | 'stream';

export interface StageDisplayPreset {
  id: string;
  name: string;
  target: DisplayTarget;
  resolution: string;
  enabled: boolean;
  showClock: boolean;
  showNextSlide: boolean;
  showLiturgyCue: boolean;
  privateMessage?: string;
}

export interface MultiScreenState {
  activeTarget: DisplayTarget;
  presets: StageDisplayPreset[];
  privateStageMessage: string | null;
}

export const DEFAULT_STAGE_PRESETS: StageDisplayPreset[] = [
  {
    id: 'preset_main',
    name: 'Auditorium Main (Sanctuary Projector)',
    target: 'main',
    resolution: '1920x1080',
    enabled: true,
    showClock: false,
    showNextSlide: false,
    showLiturgyCue: false
  },
  {
    id: 'preset_foldback',
    name: 'Stage Confidence Foldback (Pastor & Choir)',
    target: 'foldback',
    resolution: '1920x1080',
    enabled: true,
    showClock: true,
    showNextSlide: true,
    showLiturgyCue: true
  },
  {
    id: 'preset_stream',
    name: 'Live-Stream Lower-Third Broadcast',
    target: 'stream',
    resolution: '1920x1080',
    enabled: true,
    showClock: false,
    showNextSlide: false,
    showLiturgyCue: false
  }
];
