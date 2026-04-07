import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { Cache } from "../src/cache.js";
import fs from "node:fs";

const TEST_DB = "/tmp/test-cache.sqlite";

describe("Cache", () => {
  let cache: Cache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
    cache = new Cache(TEST_DB);
  });

  afterEach(() => {
    cache.close();
    vi.useRealTimers();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it("returns null on cache miss", () => {
    expect(cache.get("missing-key")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", { foo: "bar" }, 3600);
    expect(cache.get("key1")).toEqual({ foo: "bar" });
  });

  it("returns null for expired entries", () => {
    cache.set("key1", { foo: "bar" }, 60);
    vi.setSystemTime(new Date("2026-04-06T12:01:01Z"));
    expect(cache.get("key1")).toBeNull();
  });

  it("overwrites existing entries", () => {
    cache.set("key1", { v: 1 }, 3600);
    cache.set("key1", { v: 2 }, 3600);
    expect(cache.get("key1")).toEqual({ v: 2 });
  });

  it("generates deterministic cache keys from operation + params", () => {
    const key = Cache.makeKey("searchItems", { keywords: "blazer", sortBy: "Relevance" });
    expect(key).toMatch(/^searchItems:/);
    const key2 = Cache.makeKey("searchItems", { sortBy: "Relevance", keywords: "blazer" });
    expect(key).toBe(key2);
  });
});
