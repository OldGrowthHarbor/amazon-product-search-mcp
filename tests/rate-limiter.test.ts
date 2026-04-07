import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows a request when under TPS and TPD limits", async () => {
    const limiter = new RateLimiter({ tps: 1, tpd: 100 });
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });

  it("paces requests to TPS limit", async () => {
    const limiter = new RateLimiter({ tps: 1, tpd: 100 });
    await limiter.acquire();

    const second = limiter.acquire();
    let resolved = false;
    second.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(600);
    expect(resolved).toBe(true);
  });

  it("rejects when daily budget is exhausted", async () => {
    const limiter = new RateLimiter({ tps: 100, tpd: 2 });
    await limiter.acquire();
    await limiter.acquire();

    await expect(limiter.acquire()).rejects.toThrow("daily_budget_exhausted");
  });

  it("reports remaining budget", () => {
    const limiter = new RateLimiter({ tps: 1, tpd: 100 });
    expect(limiter.remainingBudget()).toBe(100);
  });

  it("resets daily budget at midnight UTC", async () => {
    const limiter = new RateLimiter({ tps: 100, tpd: 2 });
    await limiter.acquire();
    await limiter.acquire();

    vi.setSystemTime(new Date("2026-04-07T00:00:01Z"));

    await expect(limiter.acquire()).resolves.toBeUndefined();
    expect(limiter.remainingBudget()).toBe(1);
  });
});
