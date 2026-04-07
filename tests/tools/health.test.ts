import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerHealthTool } from "../../src/tools/health.js";

const mockCheckHealth = vi.fn();
const mockRateLimiter = { remainingBudget: vi.fn().mockReturnValue(8000), totalBudget: vi.fn().mockReturnValue(8640), requestsPerSecond: 1 };
const mockTool = vi.fn();
const mockServer = { tool: mockTool };

describe("health_check tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerHealthTool(mockServer as any, { checkHealth: mockCheckHealth, rateLimiter: mockRateLimiter } as any);
  });

  it("registers with correct name", () => {
    expect(mockTool.mock.calls[0][0]).toBe("health_check");
  });

  it("returns healthy when credentials are valid", async () => {
    mockCheckHealth.mockResolvedValueOnce(true);
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("healthy");
    expect(parsed.credentials_valid).toBe(true);
    expect(parsed.daily_budget_remaining).toBe(8000);
  });

  it("returns unhealthy when credentials fail", async () => {
    mockCheckHealth.mockResolvedValueOnce(false);
    const handler = mockTool.mock.calls[0][2];
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.credentials_valid).toBe(false);
    expect(parsed.error).toBeTruthy();
  });
});
