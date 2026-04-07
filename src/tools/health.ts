import type { AmazonClient } from "../amazon-client.js";
import type { HealthStatus } from "../types.js";

type McpServer = any;

export function registerHealthTool(server: McpServer, client: AmazonClient): void {
  server.tool("health_check", {}, async () => {
    const credentialsValid = await client.checkHealth();
    const limiter = client.rateLimiter;

    const status: HealthStatus = {
      status: credentialsValid ? "healthy" : "unhealthy",
      credentials_valid: credentialsValid,
      daily_budget_remaining: limiter.remainingBudget(),
      daily_budget_total: limiter.totalBudget(),
      requests_per_second: limiter.requestsPerSecond,
    };

    if (!credentialsValid) {
      status.error = "API credentials are invalid or account has lost API access (requires 10 qualified sales in past 30 days)";
    }

    return { content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }] };
  });
}
