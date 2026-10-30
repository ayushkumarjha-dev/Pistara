// All data access goes through these async functions
import {
  categories as fallbackCategories,
  products as fallbackProducts,
  testimonials,
  type Category,
  type CategorySlug,
  type Product,
} from "@/data/catalog";

const API_BASE = "/api";

// Helper for API calls with credentials
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  // On server (SSR), avoid relative fetch which throws in Node.js
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const result = await fetchAPI<{ categories: any[] }>("/categories");
    if (result && Array.isArray(result.categories) && result.categories.length > 0) {
      return result.categories.map((c) => {
        const fb = fallbackCategories.find((cat) => cat.slug === c.slug);
        return {
          slug: c.slug as CategorySlug,
          name: c.name,
          nameHi: c.name_hi,
          tagline: fb?.tagline || "",
          image: c.image_url || fb?.image || "",
        };
      });
    }
  } catch {
    // fallback below
  }
  return fallbackCategories;
}

export async function getProducts(
  opts: { category?: CategorySlug; featured?: boolean; q?: string } = {}
): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (opts.category) params.set("category", opts.category);
    if (opts.featured !== undefined) params.set("featured", opts.featured.toString());
    if (opts.q) params.set("q", opts.q);

    const result = await fetchAPI<{ products: any[] }>(`/products?${params.toString()}`);
    
    if (result && Array.isArray(result.products) && result.products.length > 0) {
      return result.products.map((p) => {
        const fb = fallbackProducts.find((prod) => prod.slug === p.slug);
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          nameHi: p.name_hi,
          category: (p.category_id || fb?.category || "makhana") as CategorySlug,
          description: p.description,
          images:
            Array.isArray(p.images) && p.images.length > 0
              ? p.images.map((img: any) => (typeof img === "string" ? img : img.url))
              : fb?.images || [],
          variants:
            Array.isArray(p.variants) && p.variants.length > 0
              ? p.variants.map((v: any) => ({
                  id: v.id,
                  label: v.label as "250g" | "500g" | "1kg",
                  price: v.price,
                  mrp: v.mrp,
                  stock: v.stock,
                }))
              : fb?.variants || [],
          rating: p.rating ?? fb?.rating ?? 45,
          reviews: p.review_count ?? fb?.reviews ?? 0,
          badge: p.is_featured ? ("Bestseller" as const) : fb?.badge,
          featured: p.is_featured ?? fb?.featured ?? false,
          active: p.is_active ?? fb?.active ?? true,
        };
      }) as Product[];
    }
  } catch {
    // fallback below
  }

  // Fallback to local catalog
  let list = fallbackProducts;
  if (opts.category) list = list.filter((p) => p.category === opts.category);
  if (opts.featured !== undefined) list = list.filter((p) => p.featured === opts.featured);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameHi.includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const fb = fallbackProducts.find((p) => p.slug === slug);
  try {
    const result = await fetchAPI<{ product: any }>(`/products/${slug}`);
    if (result && result.product) {
      const p = result.product;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameHi: p.name_hi,
        category: (p.category_id || fb?.category || "makhana") as CategorySlug,
        description: p.description,
        images:
          Array.isArray(p.images) && p.images.length > 0
            ? p.images.map((img: any) => (typeof img === "string" ? img : img.url))
            : fb?.images || [],
        variants:
          Array.isArray(p.variants) && p.variants.length > 0
            ? p.variants.map((v: any) => ({
                id: v.id,
                label: v.label as "250g" | "500g" | "1kg",
                price: v.price,
                mrp: v.mrp,
                stock: v.stock,
              }))
            : fb?.variants || [],
        rating: p.rating ?? fb?.rating ?? 45,
        reviews: p.review_count ?? fb?.reviews ?? 0,
        badge: p.is_featured ? ("Bestseller" as const) : fb?.badge,
        featured: p.is_featured ?? fb?.featured ?? false,
        active: p.is_active ?? fb?.active ?? true,
      } as Product;
    }
  } catch {
    // fallback below
  }
  return fb;
}

export async function getTestimonials() {
  return testimonials;
}

export function searchProductsSync(q: string): Product[] {
  if (!q.trim()) return [];
  const query = q.toLowerCase();
  return fallbackProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.nameHi.includes(query) ||
      p.description.toLowerCase().includes(query)
  );
}

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const discountPct = (price: number, mrp: number) => Math.round(((mrp - price) / mrp) * 100);

// Store settings will be fetched from API
export const STORE = {
  whatsapp: "919876543210",
  deliveryCharge: 50,
};
