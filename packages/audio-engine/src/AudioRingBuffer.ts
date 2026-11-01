/**
 * Bounded Volatile Audio Ring Buffer.
 * Ensures memory cannot grow unboundedly while audio is captured.
 * All audio is stored strictly in volatile memory (RAM) and never written to disk.
 */

export class AudioRingBuffer {
  private buffer: Int16Array;
  private readonly capacity: number;
  private writeIndex = 0;
  private readIndex = 0;
  private available = 0;

  /**
   * @param capacitySamples Maximum number of 16-bit PCM samples to retain.
   * Default 160,000 samples = 10 seconds at 16kHz (~320 KB RAM).
   */
  constructor(capacitySamples = 160000) {
    this.capacity = capacitySamples;
    this.buffer = new Int16Array(this.capacity);
  }

  /**
   * Writes new 16-bit PCM samples into the circular buffer.
   * If capacity is exceeded, oldest unread samples are overwritten.
   */
  public write(samples: Int16Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;

      if (this.available < this.capacity) {
        this.available++;
      } else {
        // Buffer is full; drop the oldest unread sample
        this.readIndex = (this.readIndex + 1) % this.capacity;
      }
    }
  }

  /**
   * Reads and consumes up to `count` samples from the buffer.
   */
  public read(count: number): Int16Array {
    const toRead = Math.min(count, this.available);
    const result = new Int16Array(toRead);

    for (let i = 0; i < toRead; i++) {
      result[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
    }

    this.available -= toRead;
    return result;
  }

  /**
   * Peeks at up to `count` samples without advancing the read index.
   */
  public peek(count: number): Int16Array {
    const toPeek = Math.min(count, this.available);
    const result = new Int16Array(toPeek);
    let idx = this.readIndex;

    for (let i = 0; i < toPeek; i++) {
      result[i] = this.buffer[idx];
      idx = (idx + 1) % this.capacity;
    }

    return result;
  }

  /**
   * Reads all currently available samples.
   */
  public readAll(): Int16Array {
    return this.read(this.available);
  }

  /**
   * Flushes the buffer completely and resets pointers.
   * Mandatory when switching audio devices to prevent cross-contamination.
   */
  public flush(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
    this.available = 0;
    this.buffer.fill(0);
  }

  /**
   * Returns current number of available samples.
   */
  public size(): number {
    return this.available;
  }

  /**
   * Returns maximum capacity in samples.
   */
  public getCapacity(): number {
    return this.capacity;
  }
}
