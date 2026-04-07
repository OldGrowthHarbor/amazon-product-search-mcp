import { z } from "zod";
import type { AmazonClient } from "../amazon-client.js";

type McpServer = any;

const detailsSchema = {
  asins: z.union([z.string(), z.array(z.string())]).describe("One ASIN or array of 1-10 ASINs to look up"),
  skipCache: z.boolean().optional().describe("Bypass cache for fresh results"),
};

export function registerDetailsTool(server: McpServer, client: AmazonClient): void {
  server.tool("get_product_details", detailsSchema, async (params: { asins: string | string[]; skipCache?: boolean }) => {
    try {
      const asinArray = Array.isArray(params.asins) ? params.asins : [params.asins];

      if (asinArray.length > 10) {
        return { content: [{ type: "text" as const, text: "Error: Maximum 10 ASINs per request" }], isError: true };
      }

      const results = await client.getDetails(asinArray, params.skipCache ?? false);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
    }
  });
}
