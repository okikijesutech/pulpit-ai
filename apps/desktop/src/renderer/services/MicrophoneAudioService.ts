/**
 * Real-time Physical Microphone Audio Ingestion Service.
 * Captures live physical microphone audio (e.g. Conexant ISST Audio),
 * streams 16kHz PCM frames for level metering/VAD, and feeds live speech
 * recognition continuously for church presentation.
 */

export interface MicrophoneStatus {
  isStreaming: boolean;
  deviceName: string;
  isListeningSpeech: boolean;
  isMuted?: boolean;
  lastTranscript?: string;
  error?: string;
}

export type MicrophoneStatusListener = (status: MicrophoneStatus) => void;

export class MicrophoneAudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private speechRecognizer: any = null;
  private isRunning = false;
  private isMuted = false;
  private statusListeners: Set<MicrophoneStatusListener> = new Set();
  private status: MicrophoneStatus = {
    isStreaming: false,
    deviceName: 'Internal Microphone',
    isListeningSpeech: false,
    isMuted: false
  };

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.notify({ isMuted: this.isMuted });
  }

  public toggleMuted(): boolean {
    this.isMuted = !this.isMuted;
    this.notify({ isMuted: this.isMuted });
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public subscribeStatus(listener: MicrophoneStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private notify(update: Partial<MicrophoneStatus>): void {
    this.status = { ...this.status, ...update };
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch (err) {
        console.error('Error in mic status listener:', err);
      }
    }
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      // Request real microphone audio stream from Windows audio subsystem
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaStream = stream;
      const track = stream.getAudioTracks()[0];
      const deviceName = track ? track.label : 'Internal Microphone';

      // 16kHz audio context for optimal Whisper / VAD processing
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // ScriptProcessor buffer of 1024 samples @ 16kHz = ~64ms chunks
      const bufferSize = 1024;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      this.processorNode = processor;

      processor.onaudioprocess = (e) => {
        if (!this.isRunning) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const sourceRate = e.inputBuffer.sampleRate || ctx.sampleRate || 16000;

        let samples16k: Float32Array;
        if (sourceRate === 16000) {
          samples16k = inputData;
        } else {
          // Precise linear interpolation to exactly 16kHz
          const ratio = sourceRate / 16000;
          const targetLength = Math.round(inputData.length / ratio);
          samples16k = new Float32Array(targetLength);
          for (let i = 0; i < targetLength; i++) {
            const srcPos = i * ratio;
            const idx0 = Math.floor(srcPos);
            const idx1 = Math.min(idx0 + 1, inputData.length - 1);
            const frac = srcPos - idx0;
            samples16k[i] = inputData[idx0] * (1 - frac) + inputData[idx1] * frac;
          }
        }

        // Convert Float32Array [-1.0, 1.0] to 16-bit PCM Int16Array [-32768, 32767]
        const pcm16 = new Int16Array(samples16k.length);
        if (!this.isMuted) {
          for (let i = 0; i < samples16k.length; i++) {
            const s = Math.max(-1, Math.min(1, samples16k[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }
        // If muted, pcm16 remains all zeroes (silence)

        if (window.pulpitAPI?.streamAudioChunk) {
          window.pulpitAPI.streamAudioChunk(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      this.isRunning = true;
      this.notify({
        isStreaming: true,
        deviceName,
        isListeningSpeech: true,
        error: undefined
      });

      return true;
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      this.notify({
        isStreaming: false,
        isListeningSpeech: false,
        error: err.message || 'Microphone access denied'
      });
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.notify({
      isStreaming: false,
      isListeningSpeech: false
    });
  }
}

export const physicalMicService = new MicrophoneAudioService();
