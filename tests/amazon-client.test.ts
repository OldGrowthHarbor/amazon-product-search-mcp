import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AmazonClient } from "../src/amazon-client.js";
import { RateLimiter } from "../src/rate-limiter.js";
import { Cache } from "../src/cache.js";
import type { Config } from "../src/config.js";
import fs from "node:fs";

const TEST_DB = "/tmp/test-amazon-client-cache.sqlite";

const mockSearchItems = vi.fn();
const mockGetItems = vi.fn();
const mockGetVariations = vi.fn();

vi.mock("@amzn/creatorsapi-nodejs-sdk", () => ({
  ApiClient: vi.fn().mockImplementation(function () {
    this.credentialId = null;
    this.credentialSecret = null;
    this.version = null;
  }),
  DefaultApi: vi.fn().mockImplementation(function () {
    this.searchItems = mockSearchItems;
    this.getItems = mockGetItems;
    this.getVariations = mockGetVariations;
  }),
  SearchItemsRequestContent: vi.fn().mockImplementation(function () {}),
  GetItemsRequestContent: vi.fn().mockImplementation(function () {}),
  GetVariationsRequestContent: vi.fn().mockImplementation(function () {}),
}));

function makeConfig(): Config {
  return {
    credentialId: "test-id",
    credentialSecret: "test-secret",
    credentialVersion: "2.1",
    associateTag: "test-tag",
    marketplace: "www.amazon.com",
    cacheTtlSearch: 3600,
    cacheTtlDetails: 86400,
    cacheTtlVariations: 86400,
    rateLimitTps: 100,
    rateLimitTpd: 10000,
  };
}

describe("AmazonClient", () => {
  let client: AmazonClient;
  let cache: Cache;

  beforeEach(() => {
    vi.clearAllMocks();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    cache = new Cache(TEST_DB);
    const limiter = new RateLimiter({ tps: 100, tpd: 10000 });
    client = new AmazonClient(makeConfig(), limiter, cache);
  });

  afterEach(() => {
    cache.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it("search returns mapped product summaries", async () => {
    mockSearchItems.mockResolvedValueOnce({
      searchResult: {
        items: [{
          asin: "B0TEST1",
          detailPageURL: "https://www.amazon.com/dp/B0TEST1?tag=test-tag",
          itemInfo: { title: { displayValue: "Test Product" } },
          offersV2: { listings: [{ price: { money: { amount: 29.99, currency: "USD", displayAmount: "$29.99" } }, isBuyBoxWinner: true, availability: { message: "In Stock" } }] },
          images: { primary: { medium: { uRL: "https://img.test/1.jpg" } } },
          customerReviews: { starRating: { value: 4.5 }, count: { value: 100 } },
        }],
        totalResultCount: 1,
      },
    });

    const result = await client.search({ keywords: "test" });

    expect(result).toHaveLength(1);
    expect(result[0].asin).toBe("B0TEST1");
    expect(result[0].title).toBe("Test Product");
    expect(result[0].price?.amount).toBe(29.99);
  });

  it("search uses cache on second call", async () => {
    mockSearchItems.mockResolvedValueOnce({
      searchResult: { items: [{ asin: "B0CACHED", detailPageURL: "", itemInfo: { title: { displayValue: "Cached" } } }], totalResultCount: 1 },
    });

    await client.search({ keywords: "cached" });
    await client.search({ keywords: "cached" });

    expect(mockSearchItems).toHaveBeenCalledTimes(1);
  });

  it("getDetails returns mapped details with partial failure", async () => {
    mockGetItems.mockResolvedValueOnce({
      itemsResult: {
        items: [{
          asin: "B0GOOD",
          detailPageURL: "https://www.amazon.com/dp/B0GOOD",
          itemInfo: { title: { displayValue: "Good Item" }, features: { displayValues: ["Feature 1"] }, byLineInfo: { brand: { displayValue: "Brand" } } },
          offersV2: { listings: [{ price: { money: { amount: 19.99, currency: "USD", displayAmount: "$19.99" } }, isBuyBoxWinner: true, availability: { message: "In Stock" } }] },
          images: { primary: { medium: { uRL: "https://img/1.jpg" } } },
        }],
      },
      errors: [
        { code: "ItemNotAccessible", message: "ASIN B0BAD not found", asin: "B0BAD" },
      ],
    });

    const result = await client.getDetails(["B0GOOD", "B0BAD"]);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("success");
    expect(result[0].asin).toBe("B0GOOD");
    expect(result[1].status).toBe("error");
    expect(result[1].asin).toBe("B0BAD");
  });
});
