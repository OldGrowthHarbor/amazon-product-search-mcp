import type { Price, ProductSummary, ProductDetails, ProductVariation } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SdkItem = any;

export function extractPrice(item: SdkItem): Price | null {
  const listings = item?.offersV2?.listings;
  if (!Array.isArray(listings) || listings.length === 0) return null;

  const listing = listings.find((l: SdkItem) => l.isBuyBoxWinner) ?? listings[0];
  const money = listing?.price?.money;
  if (!money) return null;

  return {
    amount: money.amount,
    currency: money.currency ?? "USD",
    display: money.displayAmount ?? `$${money.amount}`,
  };
}

function extractAvailability(item: SdkItem): string | null {
  const listings = item?.offersV2?.listings;
  if (!Array.isArray(listings) || listings.length === 0) return null;
  const listing = listings.find((l: SdkItem) => l.isBuyBoxWinner) ?? listings[0];
  return listing?.availability?.message ?? null;
}

function extractImageUrl(item: SdkItem): string | null {
  return item?.images?.primary?.medium?.uRL ?? null;
}

function extractAllImageUrls(item: SdkItem): string[] {
  const urls: string[] = [];
  const primary = item?.images?.primary?.medium?.uRL;
  if (primary) urls.push(primary);

  const variants = item?.images?.variants;
  if (Array.isArray(variants)) {
    for (const v of variants) {
      const url = v?.medium?.uRL;
      if (url) urls.push(url);
    }
  }
  return urls;
}

export function mapItemToSummary(item: SdkItem): ProductSummary {
  return {
    asin: item.asin ?? "",
    title: item?.itemInfo?.title?.displayValue ?? "",
    price: extractPrice(item),
    image_url: extractImageUrl(item),
    rating: item?.customerReviews?.starRating?.value ?? null,
    review_count: item?.customerReviews?.count?.value ?? null,
    product_url: item.detailPageURL ?? "",
    availability: extractAvailability(item),
    parent_asin: item.parentASIN ?? null,
  };
}

export function mapItemToDetails(item: SdkItem): ProductDetails {
  const summary = mapItemToSummary(item);
  return {
    ...summary,
    status: "success" as const,
    features: item?.itemInfo?.features?.displayValues ?? [],
    brand: item?.itemInfo?.byLineInfo?.brand?.displayValue ?? null,
    images: extractAllImageUrls(item),
  };
}

export function mapItemToVariation(item: SdkItem): ProductVariation {
  return {
    asin: item.asin ?? "",
    title: item?.itemInfo?.title?.displayValue ?? "",
    price: extractPrice(item),
    image_url: extractImageUrl(item),
    availability: extractAvailability(item),
  };
}
