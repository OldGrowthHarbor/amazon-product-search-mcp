import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerSearchTool } from "../../src/tools/search.js";

const mockSearch = vi.fn();
const mockTool = vi.fn();
const mockServer = { tool: mockTool };

describe("search_products tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerSearchTool(mockServer as any, { search: mockSearch } as any);
  });

  it("registers the tool with correct name", () => {
    expect(mockTool).toHaveBeenCalledTimes(1);
    expect(mockTool.mock.calls[0][0]).toBe("search_products");
  });

  it("calls client and returns JSON", async () => {
    mockSearch.mockResolvedValueOnce([
      { asin: "B0TEST", title: "Test", price: { amount: 10, currency: "USD", display: "$10" }, image_url: null, rating: 4.0, review_count: 50, product_url: "https://test", availability: "In Stock", parent_asin: null },
    ]);

    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ keywords: "test blazer", sortBy: "Relevance" });

    expect(mockSearch).toHaveBeenCalledWith({ keywords: "test blazer", sortBy: "Relevance" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].asin).toBe("B0TEST");
  });

  it("returns isError on failure", async () => {
    mockSearch.mockRejectedValueOnce(new Error("API failed"));

    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ keywords: "fail" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("API failed");
  });
});
