import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerDetailsTool } from "../../src/tools/details.js";

const mockGetDetails = vi.fn();
const mockTool = vi.fn();
const mockServer = { tool: mockTool };

describe("get_product_details tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerDetailsTool(mockServer as any, { getDetails: mockGetDetails } as any);
  });

  it("registers with correct name", () => {
    expect(mockTool.mock.calls[0][0]).toBe("get_product_details");
  });

  it("accepts a single ASIN string", async () => {
    mockGetDetails.mockResolvedValueOnce([{ asin: "B0ONE", status: "success", title: "Product" }]);
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ asins: "B0ONE" });
    const parsed = JSON.parse(result.content[0].text);
    expect(mockGetDetails).toHaveBeenCalledWith(["B0ONE"], false);
    expect(parsed).toHaveLength(1);
  });

  it("accepts an array of ASINs with partial failure", async () => {
    mockGetDetails.mockResolvedValueOnce([
      { asin: "B01", status: "success" },
      { asin: "B02", status: "error", error_code: "NotFound", error_message: "Not found" },
    ]);
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ asins: ["B01", "B02"] });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].status).toBe("success");
    expect(parsed[1].status).toBe("error");
  });

  it("rejects more than 10 ASINs", async () => {
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({ asins: Array.from({ length: 11 }, (_, i) => `B0${i}`) });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("10");
  });
});
