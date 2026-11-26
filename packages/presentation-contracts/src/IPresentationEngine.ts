import {
  PresentationCommand,
  PresentationEngineStatus,
  PresentationStateSnapshot,
  CommandDispatchResult
} from '@pulpit-ai/shared-types';

export type PresentationStateListener = (snapshot: PresentationStateSnapshot) => void;

/**
 * Universal Presentation Engine Interface.
 *
 * Implemented by both the built-in NativePresentationEngine and the external FreeShowAdapter.
 */
export interface IPresentationEngine {
  connect(): Promise<boolean>;
  disconnect(): void;
  getStatus(): PresentationEngineStatus;
  getSnapshot(): Readonly<PresentationStateSnapshot>;
  subscribe(listener: PresentationStateListener): () => void;
  dispatchCommand(command: PresentationCommand): Promise<CommandDispatchResult>;
}
