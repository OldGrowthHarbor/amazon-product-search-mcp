export interface Price {
  amount: number;
  currency: string;
  display: string;
}

export interface ProductSummary {
  asin: string;
  title: string;
  price: Price | null;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  product_url: string;
  availability: string | null;
  parent_asin: string | null;
}

export interface ProductDetails extends ProductSummary {
  status: "success";
  features: string[];
  brand: string | null;
  images: string[];
}

export interface ProductError {
  asin: string;
  status: "error";
  error_code: string;
  error_message: string;
}

export type ProductDetailResult = ProductDetails | ProductError;

export interface ProductVariation {
  asin: string;
  title: string;
  price: Price | null;
  image_url: string | null;
  availability: string | null;
}

export interface VariationsOutput {
  variation_dimensions: string[];
  variations: ProductVariation[];
  total_variations: number;
}

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  credentials_valid: boolean;
  daily_budget_remaining: number;
  daily_budget_total: number;
  requests_per_second: number;
  error?: string;
}
