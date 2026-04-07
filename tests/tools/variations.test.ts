import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerVariationsTool } from "../../src/tools/variations.js";

const mockGetVariations = vi.fn();
const mockTool = vi.fn();
const mockServer = { tool: mockTool };

describe("get_product_variations tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerVariationsTool(mockServer as any, { getVariations: mockGetVariations } as any);
  });

  it("registers with correct name", () => {
    expect(mockTool.mock.calls[0][0]).toBe("get_product_variations");
  });

  it("returns variations for a valid ASIN", async () => {
    mockGetVariations.mockResolvedValueOnce({
      variation_dimensions: ["Color", "Size"],
      variations: [
        { asin: "B0VAR1", title: "Blue - Small", price: null, image_url: null, availability: "In Stock" },
        { asin: "B0VAR2", title: "Red - Medium", price: null, image_url: null, availability: "In Stock" },
      ],
      total_variations: 2,
    });
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ asin: "B0PARENT" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.variation_dimensions).toEqual(["Color", "Size"]);
    expect(parsed.variations).toHaveLength(2);
    expect(parsed.total_variations).toBe(2);
  });
});
