import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads valid config from env vars", () => {
    process.env.AMAZON_CREDENTIAL_ID = "test-id";
    process.env.AMAZON_CREDENTIAL_SECRET = "test-secret";
    process.env.AMAZON_CREDENTIAL_VERSION = "2.1";
    process.env.AMAZON_ASSOCIATE_TAG = "test-tag";

    const config = loadConfig();

    expect(config.credentialId).toBe("test-id");
    expect(config.credentialSecret).toBe("test-secret");
    expect(config.credentialVersion).toBe("2.1");
    expect(config.associateTag).toBe("test-tag");
    expect(config.marketplace).toBe("www.amazon.com");
    expect(config.cacheTtlSearch).toBe(3600);
    expect(config.cacheTtlDetails).toBe(86400);
    expect(config.cacheTtlVariations).toBe(86400);
    expect(config.rateLimitTps).toBe(1);
    expect(config.rateLimitTpd).toBe(8640);
  });

  it("throws on missing required env var", () => {
    process.env.AMAZON_CREDENTIAL_ID = "test-id";
    expect(() => loadConfig()).toThrow();
  });

  it("uses custom values when provided", () => {
    process.env.AMAZON_CREDENTIAL_ID = "test-id";
    process.env.AMAZON_CREDENTIAL_SECRET = "test-secret";
    process.env.AMAZON_CREDENTIAL_VERSION = "3.1";
    process.env.AMAZON_ASSOCIATE_TAG = "test-tag";
    process.env.AMAZON_MARKETPLACE = "www.amazon.co.uk";
    process.env.CACHE_TTL_SEARCH = "1800";
    process.env.RATE_LIMIT_TPS = "2";
    process.env.RATE_LIMIT_TPD = "10000";

    const config = loadConfig();

    expect(config.marketplace).toBe("www.amazon.co.uk");
    expect(config.cacheTtlSearch).toBe(1800);
    expect(config.rateLimitTps).toBe(2);
    expect(config.rateLimitTpd).toBe(10000);
  });
});
