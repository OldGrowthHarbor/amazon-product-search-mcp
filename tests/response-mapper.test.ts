import { describe, it, expect } from "vitest";
import {
  mapItemToSummary,
  mapItemToDetails,
  mapItemToVariation,
  extractPrice,
} from "../src/response-mapper.js";

function makeMockItem(overrides: Record<string, unknown> = {}) {
  return {
    asin: "B0TESTITEM",
    detailPageURL: "https://www.amazon.com/dp/B0TESTITEM?tag=testtag-20",
    parentASIN: "B0PARENTASIN",
    itemInfo: {
      title: { displayValue: "Navy Slim-Fit Blazer" },
      features: { displayValues: ["Machine washable", "Stretch fabric"] },
      byLineInfo: { brand: { displayValue: "TestBrand" } },
    },
    images: {
      primary: { medium: { uRL: "https://images.amazon.com/test-medium.jpg" } },
      variants: [
        { medium: { uRL: "https://images.amazon.com/variant1.jpg" } },
      ],
    },
    customerReviews: {
      starRating: { value: 4.3 },
      count: { value: 1250 },
    },
    offersV2: {
      listings: [
        {
          price: {
            money: { amount: 49.99, currency: "USD", displayAmount: "$49.99" },
          },
          availability: { message: "In Stock" },
          isBuyBoxWinner: true,
        },
      ],
    },
    ...overrides,
  };
}

describe("extractPrice", () => {
  it("extracts price from a buy-box offer listing", () => {
    const item = makeMockItem();
    const price = extractPrice(item);
    expect(price).toEqual({ amount: 49.99, currency: "USD", display: "$49.99" });
  });

  it("returns null when no offers exist", () => {
    const item = makeMockItem({ offersV2: undefined });
    expect(extractPrice(item)).toBeNull();
  });
});

describe("mapItemToSummary", () => {
  it("maps a full SDK item to ProductSummary", () => {
    const summary = mapItemToSummary(makeMockItem());
    expect(summary).toEqual({
      asin: "B0TESTITEM",
      title: "Navy Slim-Fit Blazer",
      price: { amount: 49.99, currency: "USD", display: "$49.99" },
      image_url: "https://images.amazon.com/test-medium.jpg",
      rating: 4.3,
      review_count: 1250,
      product_url: "https://www.amazon.com/dp/B0TESTITEM?tag=testtag-20",
      availability: "In Stock",
      parent_asin: "B0PARENTASIN",
    });
  });

  it("handles missing optional fields gracefully", () => {
    const item = makeMockItem({
      parentASIN: undefined,
      customerReviews: undefined,
      images: undefined,
    });
    const summary = mapItemToSummary(item);
    expect(summary.parent_asin).toBeNull();
    expect(summary.rating).toBeNull();
    expect(summary.review_count).toBeNull();
    expect(summary.image_url).toBeNull();
  });
});

describe("mapItemToDetails", () => {
  it("maps a full SDK item to ProductDetails", () => {
    const details = mapItemToDetails(makeMockItem());
    expect(details.status).toBe("success");
    expect(details.features).toEqual(["Machine washable", "Stretch fabric"]);
    expect(details.brand).toBe("TestBrand");
    expect(details.images).toContain("https://images.amazon.com/test-medium.jpg");
    expect(details.images).toContain("https://images.amazon.com/variant1.jpg");
  });
});

describe("mapItemToVariation", () => {
  it("maps an SDK item to ProductVariation", () => {
    const variation = mapItemToVariation(makeMockItem());
    expect(variation.asin).toBe("B0TESTITEM");
    expect(variation.title).toBe("Navy Slim-Fit Blazer");
    expect(variation.price).toEqual({ amount: 49.99, currency: "USD", display: "$49.99" });
  });
});
