import { ApiClient, DefaultApi, SearchItemsRequestContent, GetItemsRequestContent, GetVariationsRequestContent } from "@amzn/creatorsapi-nodejs-sdk";
import type { Config } from "./config.js";
import type { ProductSummary, ProductDetailResult, VariationsOutput } from "./types.js";
import { mapItemToSummary, mapItemToDetails, mapItemToVariation } from "./response-mapper.js";
import { RateLimiter } from "./rate-limiter.js";
import { Cache } from "./cache.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SdkAny = any;

export interface SearchParams {
  keywords: string;
  searchIndex?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  minReviewsRating?: number;
  sortBy?: string;
  deliveryFlags?: string[];
  availability?: string;
  itemPage?: number;
  itemCount?: number;
  skipCache?: boolean;
}

const SEARCH_RESOURCES = [
  "images.primary.medium", "itemInfo.title",
  "offersV2.listings.price", "offersV2.listings.availability", "offersV2.listings.isBuyBoxWinner",
  "customerReviews.count", "customerReviews.starRating", "parentASIN",
];

const DETAILS_RESOURCES = [
  ...SEARCH_RESOURCES,
  "itemInfo.features", "itemInfo.byLineInfo", "itemInfo.classifications",
  "itemInfo.productInfo", "images.variants.medium",
];

const VARIATIONS_RESOURCES = [
  "images.primary.medium", "itemInfo.title",
  "offersV2.listings.price", "offersV2.listings.availability", "offersV2.listings.isBuyBoxWinner",
  "variationSummary.variationDimension",
];

export class AmazonClient {
  private api: DefaultApi;
  private config: Config;
  private limiter: RateLimiter;
  private cache: Cache;

  constructor(config: Config, limiter: RateLimiter, cache: Cache) {
    this.config = config;
    this.limiter = limiter;
    this.cache = cache;

    const apiClient = new ApiClient();
    apiClient.credentialId = config.credentialId;
    apiClient.credentialSecret = config.credentialSecret;
    apiClient.version = config.credentialVersion;
    this.api = new DefaultApi(apiClient);
  }

  async search(params: SearchParams): Promise<ProductSummary[]> {
    const cacheKey = Cache.makeKey("searchItems", params as unknown as Record<string, unknown>);
    if (!params.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as ProductSummary[];
    }

    await this.limiter.acquire();

    const request = new SearchItemsRequestContent() as SdkAny;
    request.partnerTag = this.config.associateTag;
    request.keywords = params.keywords;
    request.resources = SEARCH_RESOURCES;

    if (params.searchIndex) request.searchIndex = params.searchIndex;
    if (params.minPrice != null) request.minPrice = params.minPrice;
    if (params.maxPrice != null) request.maxPrice = params.maxPrice;
    if (params.brand) request.brand = params.brand;
    if (params.minReviewsRating != null) request.minReviewsRating = params.minReviewsRating;
    if (params.sortBy) request.sortBy = params.sortBy;
    if (params.deliveryFlags) request.deliveryFlags = params.deliveryFlags;
    if (params.availability) request.availability = params.availability;
    if (params.itemPage != null) request.itemPage = params.itemPage;
    if (params.itemCount != null) request.itemCount = params.itemCount;

    const response: SdkAny = await this.api.searchItems(this.config.marketplace, {
      searchItemsRequestContent: request,
    });

    const items = response?.searchResult?.items ?? [];
    const results = items.map(mapItemToSummary);

    this.cache.set(cacheKey, results, this.config.cacheTtlSearch);
    return results;
  }

  async getDetails(asins: string[], skipCache = false): Promise<ProductDetailResult[]> {
    const cacheKey = Cache.makeKey("getItems", { asins: [...asins].sort() });
    if (!skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as ProductDetailResult[];
    }

    await this.limiter.acquire();

    const request = new GetItemsRequestContent(this.config.associateTag, asins) as SdkAny;
    request.resources = DETAILS_RESOURCES;

    const response: SdkAny = await this.api.getItems(this.config.marketplace, request);

    const successItems: SdkAny[] = response?.itemsResult?.items ?? [];
    const errors: SdkAny[] = response?.errors ?? [];

    const successMap = new Map<string, SdkAny>();
    for (const item of successItems) {
      if (item.asin) successMap.set(item.asin, item);
    }

    const errorMap = new Map<string, SdkAny>();
    for (const err of errors) {
      if (err.asin) errorMap.set(err.asin, err);
    }

    const results: ProductDetailResult[] = asins.map((asin) => {
      const successItem = successMap.get(asin);
      if (successItem) return mapItemToDetails(successItem);

      const errorItem = errorMap.get(asin);
      return {
        asin,
        status: "error" as const,
        error_code: errorItem?.code ?? "Unknown",
        error_message: errorItem?.message ?? `No data returned for ASIN ${asin}`,
      };
    });

    this.cache.set(cacheKey, results, this.config.cacheTtlDetails);
    return results;
  }

  async getVariations(params: { asin: string; variationPage?: number; variationCount?: number; skipCache?: boolean }): Promise<VariationsOutput> {
    const cacheKey = Cache.makeKey("getVariations", params as Record<string, unknown>);
    if (!params.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as VariationsOutput;
    }

    await this.limiter.acquire();

    const request = new GetVariationsRequestContent() as SdkAny;
    request.partnerTag = this.config.associateTag;
    request.asin = params.asin;
    request.resources = VARIATIONS_RESOURCES;
    if (params.variationPage != null) request.variationPage = params.variationPage;
    if (params.variationCount != null) request.variationCount = params.variationCount;

    const response: SdkAny = await this.api.getVariations(this.config.marketplace, request);

    const variationsResult = response?.variationsResult;
    const items: SdkAny[] = variationsResult?.items ?? [];
    const summary = variationsResult?.variationSummary;

    const result: VariationsOutput = {
      variation_dimensions:
        summary?.variationDimensions?.map((d: SdkAny) => d.displayName ?? d.name ?? "") ?? [],
      variations: items.map(mapItemToVariation),
      total_variations: summary?.variationCount ?? items.length,
    };

    this.cache.set(cacheKey, result, this.config.cacheTtlVariations);
    return result;
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.search({ keywords: "test", itemCount: 1, skipCache: true });
      return true;
    } catch {
      return false;
    }
  }

  get rateLimiter(): RateLimiter {
    return this.limiter;
  }
}
