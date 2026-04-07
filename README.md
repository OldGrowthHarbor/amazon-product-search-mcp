# Amazon Product Search MCP Server

An MCP server that lets AI agents search Amazon products, retrieve details, and discover color/size variations using the official Amazon Creators API.

Built for capsule wardrobe curation but works for any product discovery workflow.

## Tools

| Tool | What it does |
|------|-------------|
| `search_products` | Search Amazon by keywords with filters for price, brand, rating, Prime, sort order. Returns up to 10 results per page with pagination. |
| `get_product_details` | Look up 1-10 products by ASIN. Returns title, price, images, features, brand, availability. Handles partial failures (3 of 10 ASINs invalid? You get 7 successes + 3 error objects). |
| `get_product_variations` | Given an ASIN, returns all color/size/style variants with prices and availability. |
| `health_check` | Verifies API credentials are valid and reports remaining daily API budget. |

## Prerequisites

1. **Amazon Associates account** with Creators API access (replaces the deprecated PA-API 5.0)
2. **Creators API credentials**: credential ID, credential secret, and credential version from the Associates portal
3. **Node.js 18+**
4. **Amazon Creators API SDK**: download from the Associates portal and build it locally

### Building the SDK

```bash
cd /path/to/creatorsapi-nodejs-sdk
npm install
npm run build
```

## Installation

```bash
git clone https://github.com/OldGrowthHarbor/amazon-product-search-mcp
cd amazon-product-search-mcp
npm install
```

Then install the Amazon Creators API SDK. Download it from the [Amazon Associates Creators API portal](https://affiliate-program.amazon.com/creatorsapi/docs/), build it, and install it locally:

```bash
# Build the SDK (one-time, from wherever you downloaded it)
cd /path/to/creatorsapi-nodejs-sdk
npm install && npm run build

# Install it into this project
cd /path/to/amazon-product-search-mcp
npm install /path/to/creatorsapi-nodejs-sdk --ignore-scripts
```

Finally, compile:

```bash
npm run build
```

## Configuration

All configuration is via environment variables.

### Required

| Variable | Description |
|----------|-------------|
| `AMAZON_CREDENTIAL_ID` | OAuth 2.0 credential ID from the Creators API portal |
| `AMAZON_CREDENTIAL_SECRET` | OAuth 2.0 credential secret |
| `AMAZON_CREDENTIAL_VERSION` | Auth endpoint version. `2.1` = US (Cognito), `3.1` = US (LWA). See [Creators API docs](https://affiliate-program.amazon.com/creatorsapi/docs/) for other regions. |
| `AMAZON_ASSOCIATE_TAG` | Your Associates partner/tracking tag |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `AMAZON_MARKETPLACE` | `www.amazon.com` | Target marketplace |
| `CACHE_TTL_SEARCH` | `3600` | Search result cache TTL in seconds (1 hour) |
| `CACHE_TTL_DETAILS` | `86400` | Product detail cache TTL in seconds (24 hours) |
| `CACHE_TTL_VARIATIONS` | `86400` | Variation cache TTL in seconds (24 hours) |
| `RATE_LIMIT_TPS` | `1` | Max requests per second |
| `RATE_LIMIT_TPD` | `8640` | Max requests per day |

## Using with Claude Code (CLI)

Add the server to your Claude Code settings. Run:

```bash
claude mcp add amazon-product-search \
  -e AMAZON_CREDENTIAL_ID=your-credential-id \
  -e AMAZON_CREDENTIAL_SECRET=your-credential-secret \
  -e AMAZON_CREDENTIAL_VERSION=2.1 \
  -e AMAZON_ASSOCIATE_TAG=your-tag \
  -- node /absolute/path/to/amazon-product-search-mcp/dist/index.js
```

Or manually edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "amazon-product-search": {
      "command": "node",
      "args": ["/absolute/path/to/amazon-product-search-mcp/dist/index.js"],
      "env": {
        "AMAZON_CREDENTIAL_ID": "your-credential-id",
        "AMAZON_CREDENTIAL_SECRET": "your-credential-secret",
        "AMAZON_CREDENTIAL_VERSION": "2.1",
        "AMAZON_ASSOCIATE_TAG": "your-tag"
      }
    }
  }
}
```

Restart Claude Code. The 4 tools will appear in your tool list.

## Using with Claude Desktop

Add to `claude_desktop_config.json` (on Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "amazon-product-search": {
      "command": "node",
      "args": ["/absolute/path/to/amazon-product-search-mcp/dist/index.js"],
      "env": {
        "AMAZON_CREDENTIAL_ID": "your-credential-id",
        "AMAZON_CREDENTIAL_SECRET": "your-credential-secret",
        "AMAZON_CREDENTIAL_VERSION": "2.1",
        "AMAZON_ASSOCIATE_TAG": "your-tag"
      }
    }
  }
}
```

Restart Claude Desktop.

## Example Usage

Once connected, you can ask Claude things like:

- "Search Amazon for navy slim-fit blazers under $80"
- "Get details for ASIN B0DLFMFBJW"
- "What color options does this jacket come in?" (with an ASIN)
- "Find me 31 items for a minimalist spring capsule wardrobe, earth tones, mid-range brands"
- "Check if the Amazon API credentials are working"

## Architecture

```
AI Agent (Claude)
     |
     | MCP (stdio)
     v
MCP Server
  |-- Rate Limiter (1 TPS + 8,640/day budget)
  |-- SQLite Cache (search: 1hr, details: 24hr, variations: 24hr)
  |-- Amazon Client (OAuth 2.0 token management)
       |
       | HTTPS
       v
  Amazon Creators API
  (https://creatorsapi.amazon)
```

Requests are paced at 1 per second, cached in SQLite, and authenticated via OAuth 2.0 with automatic token refresh.

## Rate Limits

The Creators API starts at 1 request/second and 8,640 requests/day. These scale with your affiliate revenue. The server enforces both limits internally, queuing requests that exceed TPS and rejecting with a clear error when the daily budget runs out.

Use `health_check` to see your remaining budget at any time.

## Affiliate Disclosure

All product URLs returned by this server are affiliate links containing your Associate tag. If your application surfaces these links to end users, you must include FTC-compliant affiliate disclosure. This is your application's responsibility.

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Run tests (34 tests)
npm run test:watch   # Watch mode
npm run build        # Compile TypeScript
```

## Project Structure

```
src/
  index.ts             # Server entry point, tool registration, stdio transport
  config.ts            # Environment variable loading with Zod validation
  types.ts             # Output type definitions (ProductSummary, etc.)
  rate-limiter.ts      # Token bucket (TPS) + daily budget counter (TPD)
  cache.ts             # SQLite cache with configurable TTLs
  amazon-client.ts     # Creators API wrapper with rate limiting and caching
  response-mapper.ts   # Maps SDK response objects to clean output types
  amazon-sdk.d.ts      # TypeScript declarations for the JS-only Amazon SDK
  tools/
    search.ts          # search_products tool
    details.ts         # get_product_details tool
    variations.ts      # get_product_variations tool
    health.ts          # health_check tool
tests/                 # 34 tests across 9 files (vitest)
```

## License

MIT
