#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { RateLimiter } from "./rate-limiter.js";
import { Cache } from "./cache.js";
import { AmazonClient } from "./amazon-client.js";
import { registerSearchTool } from "./tools/search.js";
import { registerDetailsTool } from "./tools/details.js";
import { registerVariationsTool } from "./tools/variations.js";
import { registerHealthTool } from "./tools/health.js";

async function main() {
  const config = loadConfig();

  const limiter = new RateLimiter({
    tps: config.rateLimitTps,
    tpd: config.rateLimitTpd,
  });

  const cache = new Cache();
  const client = new AmazonClient(config, limiter, cache);

  const server = new McpServer({
    name: "amazon-product-search",
    version: "1.0.0",
  });

  registerSearchTool(server, client);
  registerDetailsTool(server, client);
  registerVariationsTool(server, client);
  registerHealthTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Amazon Product Search MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
