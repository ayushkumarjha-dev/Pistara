// All data access goes through these async functions
import { type CategorySlug, type Product } from "@/data/catalog";
import { testimonials } from "@/data/catalog";

const API_BASE = "/api";

// Helper for API calls with credentials
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "An error occurred");
  }

  return data.data;
}

export async function getCategories() {
  const result = await fetchAPI<{ categories: any[] }>("/categories");
  return result.categories.map((c) => ({
    slug: c.slug as CategorySlug,
    name: c.name,
    nameHi: c.name_hi,
    tagline: "", // Not stored in DB
    image: c.image_url,
  }));
}

export async function getProducts(opts: { category?: CategorySlug; featured?: boolean; q?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.featured !== undefined) params.set("featured", opts.featured.toString());
  if (opts.q) params.set("q", opts.q);

  const result = await fetchAPI<{ products: any[] }>(`/products?${params.toString()}`);
  
  return result.products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameHi: p.name_hi,
    category: p.category_id, // Will need category slug mapping
    description: p.description,
    images: p.images.map((img: any) => img.url),
    variants: p.variants.map((v: any) => ({
      id: v.id,
      label: v.label as "250g" | "500g" | "1kg",
      price: v.price,
      mrp: v.mrp,
      stock: v.stock,
    })),
    rating: p.rating,
    reviews: p.review_count,
    badge: p.is_featured ? ("Bestseller" as const) : undefined,
    featured: p.is_featured,
    active: p.is_active,
  })) as Product[];
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const result = await fetchAPI<{ product: any }>(`/products/${slug}`);
    const p = result.product;
    
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameHi: p.name_hi,
      category: p.category_id as CategorySlug,
      description: p.description,
      images: p.images.map((img: any) => img.url),
      variants: p.variants.map((v: any) => ({
        id: v.id,
        label: v.label as "250g" | "500g" | "1kg",
        price: v.price,
        mrp: v.mrp,
        stock: v.stock,
      })),
      rating: p.rating,
      reviews: p.review_count,
      badge: p.is_featured ? ("Bestseller" as const) : undefined,
      featured: p.is_featured,
      active: p.is_active,
    } as Product;
  } catch {
    return undefined;
  }
}

export async function getTestimonials() {
  // Testimonials remain static for now
  return testimonials;
}

export function searchProductsSync(q: string): Product[] {
  // This will be replaced with async search in the UI
  // For now, return empty array to trigger proper async search
  return [];
}

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const discountPct = (price: number, mrp: number) => Math.round(((mrp - price) / mrp) * 100);

// Store settings will be fetched from API
export const STORE = {
  whatsapp: "919876543210",
  deliveryCharge: 50,
};
