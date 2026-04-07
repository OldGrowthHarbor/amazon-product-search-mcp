import { z } from "zod";
import type { AmazonClient } from "../amazon-client.js";

type McpServer = any;

const variationsSchema = {
  asin: z.string().describe("ASIN of the product (parent or child). Returns sibling variations for child ASINs"),
  variationPage: z.number().int().min(1).optional().describe("Page number, default 1"),
  variationCount: z.number().int().min(1).max(10).optional().describe("Variations per page, default 10"),
  skipCache: z.boolean().optional().describe("Bypass cache for fresh results"),
};

export function registerVariationsTool(server: McpServer, client: AmazonClient): void {
  server.tool("get_product_variations", variationsSchema, async (params: { asin: string; variationPage?: number; variationCount?: number; skipCache?: boolean }) => {
    try {
      const result = await client.getVariations(params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
    }
  });
}
