# Amazon Product Search MCP Server

## Project Overview

MCP server wrapping the Amazon Creators API for product search, detail retrieval, and variation discovery. TypeScript, stdio transport, SQLite caching, token bucket rate limiting.

## Commands

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run with tsx (hot reload)
npm start            # Run compiled version
npm test             # Run vitest (34 tests)
npm run test:watch   # Watch mode
```

## Project Structure

```
src/
  index.ts             # Entry point: MCP server setup, tool registration, stdio transport
  config.ts            # Zod-validated env var loading
  types.ts             # Output types (ProductSummary, ProductDetails, etc.)
  rate-limiter.ts      # Token bucket (1 TPS) + daily budget counter (8,640 TPD)
  cache.ts             # SQLite cache with configurable TTLs
  amazon-client.ts     # Wraps Creators API SDK with rate limiting + caching
  response-mapper.ts   # Maps SDK nested objects to clean output types
  amazon-sdk.d.ts      # TypeScript declarations for the JS Amazon SDK
  tools/
    search.ts          # search_products: keyword search with filters
    details.ts         # get_product_details: batch ASIN lookup (1-10)
    variations.ts      # get_product_variations: color/size variants
    health.ts          # health_check: credential + budget status
tests/                 # 9 test files, 34 tests (vitest)
```

## Testing

Run: `npm test`
Framework: vitest 4.x
Test directory: `tests/`

Tests mock the Amazon SDK at the module level (`vi.mock("@amzn/creatorsapi-nodejs-sdk")`).
Rate limiter tests use `vi.useFakeTimers()` for deterministic pacing.
Cache tests use `/tmp/test-*.sqlite` to avoid polluting the project directory.

When writing new tests:
- Mock the SDK, never call the real Amazon API in tests
- Use vitest `function()` syntax (not arrow functions) for mock constructors invoked with `new`
- Clean up SQLite test databases in `afterEach`

## Key Architecture Decisions

- **Amazon Creators API** (not PA-API 5.0, which is deprecated April 30, 2026)
- **OAuth 2.0** with credential version determining auth endpoint (2.1 = US Cognito, 3.1 = US LWA)
- **Resources are opt-in** in the Creators API. The server requests specific resource strings (e.g., `images.primary.medium`, `offersV2.listings.price`) per operation.
- **Dual rate limiting**: token bucket for TPS pacing + daily budget counter for TPD cap
- **Partial failure handling**: `get_product_details` returns results matching input array length with per-item `status: "success" | "error"`
- **No `is_prime` field**: Prime is a delivery flag filter (`deliveryFlags: ["Prime"]`), not a product attribute
- **SDK image field casing**: The Amazon SDK uses `uRL` (not `url`) for image URLs

## Environment Variables

Required: `AMAZON_CREDENTIAL_ID`, `AMAZON_CREDENTIAL_SECRET`, `AMAZON_CREDENTIAL_VERSION`, `AMAZON_ASSOCIATE_TAG`

Optional: `AMAZON_MARKETPLACE`, `CACHE_TTL_SEARCH`, `CACHE_TTL_DETAILS`, `CACHE_TTL_VARIATIONS`, `RATE_LIMIT_TPS`, `RATE_LIMIT_TPD`
