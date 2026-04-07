import { z } from "zod";
import type { AmazonClient } from "../amazon-client.js";

type McpServer = any;

const searchSchema = {
  keywords: z.string().describe("Search query keywords describing the product"),
  searchIndex: z.string().optional().describe("Amazon search category, e.g. 'Fashion', 'Clothing'. Defaults to 'All'"),
  minPrice: z.number().optional().describe("Minimum price in cents (e.g. 1000 = $10.00)"),
  maxPrice: z.number().optional().describe("Maximum price in cents"),
  brand: z.string().optional().describe("Filter by brand name"),
  minReviewsRating: z.number().optional().describe("Minimum average star rating (e.g. 4 for 4+ stars)"),
  sortBy: z.enum(["Relevance", "Price:LowToHigh", "Price:HighToLow", "AvgCustomerReviews", "Featured", "NewestArrivals"]).optional().describe("Sort order. Default: Relevance"),
  deliveryFlags: z.array(z.enum(["Prime", "FreeShipping", "FulfilledByAmazon", "AmazonGlobal"])).optional().describe("Filter by delivery options"),
  availability: z.enum(["Available", "IncludeOutOfStock"]).optional().describe("Stock filter. Default: Available"),
  itemPage: z.number().int().min(1).optional().describe("Page number for pagination. Default: 1"),
  itemCount: z.number().int().min(1).max(10).optional().describe("Results per page, max 10"),
  skipCache: z.boolean().optional().describe("Bypass cache for fresh results"),
};

export function registerSearchTool(server: McpServer, client: AmazonClient): void {
  server.tool("search_products", searchSchema, async (params: Record<string, unknown>) => {
    try {
      const results = await client.search(params as any);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
    }
  });
}
