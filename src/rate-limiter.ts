export class RateLimiter {
  private tps: number;
  private tpd: number;
  private dailyCount: number = 0;
  private dailyResetDate: string;
  /**
   * Token bucket: tracks available tokens (fractional).
   * Starts full (burst = tps tokens). Refills at tps tokens/sec.
   */
  private tokens: number;
  private lastRefillTime: number;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private draining = false;

  constructor(opts: { tps: number; tpd: number }) {
    this.tps = opts.tps;
    this.tpd = opts.tpd;
    this.dailyResetDate = this.todayUTC();
    // Start with a full bucket (burst capacity = tps)
    this.tokens = opts.tps;
    this.lastRefillTime = Date.now();
  }

  async acquire(): Promise<void> {
    this.checkDayRollover();

    if (this.dailyCount >= this.tpd) {
      const tomorrow = new Date(this.dailyResetDate + "T00:00:00Z");
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      throw new Error(
        `daily_budget_exhausted: resets at ${tomorrow.toISOString()}`
      );
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.drain();
    });
  }

  remainingBudget(): number {
    this.checkDayRollover();
    return this.tpd - this.dailyCount;
  }

  totalBudget(): number {
    return this.tpd;
  }

  get requestsPerSecond(): number {
    return this.tps;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000; // seconds
    this.tokens = Math.min(this.tps, this.tokens + elapsed * this.tps);
    this.lastRefillTime = now;
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;
    this.processNext();
  }

  private processNext(): void {
    if (this.queue.length === 0) {
      this.draining = false;
      return;
    }

    this.refillTokens();

    if (this.tokens >= 1) {
      // Token available — dispatch immediately as microtask
      const dispatch = () => {
        const item = this.queue.shift();
        if (!item) {
          this.draining = false;
          return;
        }

        this.checkDayRollover();

        if (this.dailyCount >= this.tpd) {
          const tomorrow = new Date(this.dailyResetDate + "T00:00:00Z");
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          item.reject(
            new Error(
              `daily_budget_exhausted: resets at ${tomorrow.toISOString()}`
            )
          );
        } else {
          this.dailyCount++;
          this.tokens -= 1;
          item.resolve();
        }

        this.processNext();
      };

      queueMicrotask(dispatch);
    } else {
      // No token available — wait until next token refills
      const msUntilToken = ((1 - this.tokens) / this.tps) * 1000;
      const wait = Math.ceil(msUntilToken);

      setTimeout(() => {
        this.processNext();
      }, wait);
    }
  }

  private checkDayRollover(): void {
    const today = this.todayUTC();
    if (today !== this.dailyResetDate) {
      this.dailyCount = 0;
      this.dailyResetDate = today;
    }
  }

  private todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
