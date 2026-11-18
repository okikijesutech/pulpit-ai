export type VerificationOutcome = 'skipped' | 'confirmed' | 'upgraded' | 'contested' | 'failed';

export interface PrimaryCitationCandidate {
  transcript: string;
  canonicalReference?: string;
  confidence: number | null;
  needsReview?: boolean;
  isFuzzyMatch?: boolean;
}

export interface SecondaryVerifierBackend {
  name: string;
  transcribeSlice(samples: Int16Array, sampleRate: number, timeoutMs: number): Promise<{
    text: string;
    confidence: number | null;
  }>;
}

export interface VerificationResult {
  outcome: VerificationOutcome;
  finalTranscript: string;
  secondaryTranscript?: string;
  adjustedConfidence: number | null;
  needsReview: boolean;
  verifierName?: string;
  latencyMs: number;
}

export interface DualEngineVerifierOptions {
  sampleRate?: number;
  /** Rolling PCM ring duration kept in RAM for selective re-verification (default 6 seconds = 192 KB) */
  rollingSeconds?: number;
  /** Confidence threshold below which a citation triggers secondary verification (default 0.78) */
  confidenceThreshold?: number;
  /** Hard timeout cap so verification never stalls live projection (default 2500ms) */
  timeoutMs?: number;
  /** Optional custom reference extractor to compare primary vs secondary canonical citations */
  extractReferenceKey?: (text: string) => string | null;
}

/**
 * Phase 3 Dual-Engine Semantic Verifier.
 *
 * Maintains a lightweight 6-second rolling PCM ring (~192 KB RAM) and selectively invokes
 * a secondary verifier (Moonshine INT8 or persistent whisper-server) ONLY when a fast Tier 1
 * streaming citation is ambiguous, low-confidence, or fuzzy-matched.
 *
 * Guarantees fail-closed arbitration:
 * - Agreement ('confirmed'): boosts confidence and clears needsReview.
 * - Rescue ('upgraded'): secondary supplies a clear citation when primary was garbled.
 * - Disagreement ('contested'): keeps needsReview = true so operators confirm manually.
 */
export class DualEngineVerifier {
  private readonly sampleRate: number;
  private readonly capacitySamples: number;
  private readonly confidenceThreshold: number;
  private readonly timeoutMs: number;
  private readonly extractReferenceKey?: (text: string) => string | null;

  private ring: Int16Array;
  private writePos = 0;
  private filledSamples = 0;
  private isVerifying = false;
  private verifierBackend?: SecondaryVerifierBackend;

  constructor(
    verifierBackend?: SecondaryVerifierBackend,
    options: DualEngineVerifierOptions = {}
  ) {
    this.verifierBackend = verifierBackend;
    this.sampleRate = options.sampleRate ?? 16000;
    const rollingSeconds = Math.max(2, Math.min(10, options.rollingSeconds ?? 6));
    this.capacitySamples = this.sampleRate * rollingSeconds;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.78;
    this.timeoutMs = options.timeoutMs ?? 2500;
    this.extractReferenceKey = options.extractReferenceKey;
    this.ring = new Int16Array(this.capacitySamples);
  }

  public setVerifierBackend(backend: SecondaryVerifierBackend | undefined): void {
    this.verifierBackend = backend;
  }

  public hasVerifier(): boolean {
    return Boolean(this.verifierBackend);
  }

  /**
   * Appends live 16 kHz PCM samples into the fixed-size rolling ring buffer (zero GC allocations).
   */
  public pushPcmFrame(samples: Int16Array): void {
    if (samples.length === 0) return;

    if (samples.length >= this.capacitySamples) {
      const tail = samples.subarray(samples.length - this.capacitySamples);
      this.ring.set(tail, 0);
      this.writePos = 0;
      this.filledSamples = this.capacitySamples;
      return;
    }

    const firstPart = Math.min(samples.length, this.capacitySamples - this.writePos);
    this.ring.set(samples.subarray(0, firstPart), this.writePos);
    const remaining = samples.length - firstPart;
    if (remaining > 0) {
      this.ring.set(samples.subarray(firstPart), 0);
    }

    this.writePos = (this.writePos + samples.length) % this.capacitySamples;
    this.filledSamples = Math.min(this.capacitySamples, this.filledSamples + samples.length);
  }

  /**
   * Extracts a chronological copy of the most recent `seconds` of 16 kHz audio.
   */
  public snapshotRecentAudio(seconds = 4): Int16Array {
    const requested = Math.min(this.filledSamples, Math.floor(seconds * this.sampleRate));
    if (requested <= 0) return new Int16Array(0);

    const out = new Int16Array(requested);
    const startPos = (this.writePos - requested + this.capacitySamples) % this.capacitySamples;
    const firstChunk = Math.min(requested, this.capacitySamples - startPos);
    out.set(this.ring.subarray(startPos, startPos + firstChunk), 0);
    if (firstChunk < requested) {
      out.set(this.ring.subarray(0, requested - firstChunk), firstChunk);
    }
    return out;
  }

  public resetBuffer(): void {
    this.writePos = 0;
    this.filledSamples = 0;
  }

  /**
   * Determines whether a primary streaming candidate warrants a secondary verification pass.
   */
  public shouldVerify(candidate: PrimaryCitationCandidate, verifyAmbiguousOnly = true): boolean {
    if (!this.verifierBackend || this.isVerifying || this.filledSamples === 0) {
      return false;
    }
    if (!verifyAmbiguousOnly) return true;
    if (candidate.needsReview || candidate.isFuzzyMatch) return true;
    if (candidate.confidence !== null && candidate.confidence < this.confidenceThreshold) return true;
    return false;
  }

  /**
   * Executes bounded, non-overlapping secondary verification and arbitrates consensus.
   */
  public async verifyCandidate(
    candidate: PrimaryCitationCandidate,
    verifyAmbiguousOnly = true,
    windowSeconds = 4
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    if (!this.shouldVerify(candidate, verifyAmbiguousOnly) || !this.verifierBackend) {
      return {
        outcome: 'skipped',
        finalTranscript: candidate.transcript,
        adjustedConfidence: candidate.confidence,
        needsReview: Boolean(candidate.needsReview),
        latencyMs: Date.now() - startTime
      };
    }

    const audioSlice = this.snapshotRecentAudio(windowSeconds);
    if (audioSlice.length === 0) {
      return {
        outcome: 'skipped',
        finalTranscript: candidate.transcript,
        adjustedConfidence: candidate.confidence,
        needsReview: Boolean(candidate.needsReview),
        latencyMs: Date.now() - startTime
      };
    }

    this.isVerifying = true;
    try {
      const verifier = this.verifierBackend;
      const secondary = await Promise.race([
        verifier.transcribeSlice(audioSlice, this.sampleRate, this.timeoutMs),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Verifier timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);

      const secText = (secondary.text || '').trim();
      if (!secText) {
        return {
          outcome: 'contested',
          finalTranscript: candidate.transcript,
          secondaryTranscript: '',
          adjustedConfidence: candidate.confidence,
          needsReview: true,
          verifierName: verifier.name,
          latencyMs: Date.now() - startTime
        };
      }

      const primaryKey =
        candidate.canonicalReference?.toLowerCase() ??
        this.extractReferenceKey?.(candidate.transcript)?.toLowerCase() ??
        null;
      const secondaryKey = this.extractReferenceKey?.(secText)?.toLowerCase() ?? null;

      // Case 1: Both engines agree on the canonical scripture reference
      if (primaryKey && secondaryKey && primaryKey === secondaryKey) {
        const baseConf = Math.max(candidate.confidence ?? 0.7, secondary.confidence ?? 0.7);
        return {
          outcome: 'confirmed',
          finalTranscript: candidate.transcript,
          secondaryTranscript: secText,
          adjustedConfidence: Math.min(0.99, Math.round((baseConf + 0.12) * 100) / 100),
          needsReview: false,
          verifierName: verifier.name,
          latencyMs: Date.now() - startTime
        };
      }

      // Case 2: Primary had no clean reference or was fuzzy, secondary rescued a clear reference
      if ((!primaryKey || candidate.isFuzzyMatch) && secondaryKey) {
        return {
          outcome: 'upgraded',
          finalTranscript: secText,
          secondaryTranscript: secText,
          adjustedConfidence: secondary.confidence ?? 0.85,
          needsReview: false,
          verifierName: verifier.name,
          latencyMs: Date.now() - startTime
        };
      }

      // Case 3: Disagreement -> Fail closed (keep needsReview = true so operator decides)
      return {
        outcome: 'contested',
        finalTranscript: candidate.transcript,
        secondaryTranscript: secText,
        adjustedConfidence:
          candidate.confidence !== null ? Math.min(candidate.confidence, 0.65) : 0.65,
        needsReview: true,
        verifierName: verifier.name,
        latencyMs: Date.now() - startTime
      };
    } catch {
      return {
        outcome: 'failed',
        finalTranscript: candidate.transcript,
        adjustedConfidence: candidate.confidence,
        needsReview: true,
        latencyMs: Date.now() - startTime
      };
    } finally {
      this.isVerifying = false;
    }
  }
}
