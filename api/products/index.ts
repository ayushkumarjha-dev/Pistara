import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import {
  products,
  product_images,
  product_variants,
  categories,
} from "../../db/schema";
import { productQuerySchema } from "../../shared/schemas";
import { handler, methodGuard, parseQuery, json } from "../../server-lib/http";
import { eq, and, isNull, like, gte, lte, sql, asc, desc } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const query = parseQuery(req, productQuerySchema);

  // Build where conditions
  const conditions = [
    eq(products.is_active, true),
    isNull(products.deleted_at),
  ];

  if (query.category) {
    // Find category ID by slug
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, query.category))
      .limit(1);

    if (cat) {
      conditions.push(eq(products.category_id, cat.id));
    }
  }

  if (query.featured === "true") {
    conditions.push(eq(products.is_featured, true));
  }

  if (query.q) {
    conditions.push(
      sql`(${products.name} LIKE ${`%${query.q}%`} OR ${products.name_hi} LIKE ${`%${query.q}%`} OR ${products.description} LIKE ${`%${query.q}%`})`
    );
  }

  // Fetch products with their images and variants
  const productsData = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      name_hi: products.name_hi,
      description: products.description,
      description_hi: products.description_hi,
      category_id: products.category_id,
      rating: products.rating,
      review_count: products.review_count,
      is_featured: products.is_featured,
      created_at: products.created_at,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(
      query.sort === "name"
        ? asc(products.name)
        : query.sort === "rating"
          ? desc(products.rating)
          : query.sort === "newest"
            ? desc(products.created_at)
            : asc(products.name)
    );

  // Fetch images and variants for these products
  const productIds = productsData.map((p) => p.id);
  const images: any[] = [];
  const variants: any[] = [];

  // Fetch images and variants for each product
  for (const id of productIds) {
    const productImages = await db
      .select()
      .from(product_images)
      .where(eq(product_images.product_id, id))
      .orderBy(asc(product_images.sort_order));
    images.push(...productImages);

    const productVariants = await db
      .select()
      .from(product_variants)
      .where(
        and(
          eq(product_variants.product_id, id),
          eq(product_variants.is_active, true)
        )
      );
    variants.push(...productVariants);
  }

  // Group by product
  const imagesMap = new Map<string, typeof images>();
  const variantsMap = new Map<string, typeof variants>();

  for (const img of images) {
    if (!imagesMap.has(img.product_id)) {
      imagesMap.set(img.product_id, []);
    }
    imagesMap.get(img.product_id)!.push(img);
  }

  for (const variant of variants) {
    if (!variantsMap.has(variant.product_id)) {
      variantsMap.set(variant.product_id, []);
    }
    variantsMap.get(variant.product_id)!.push(variant);
  }

  // Combine data
  let results = productsData.map((p) => {
    const productVariants = variantsMap.get(p.id) || [];
    const productImages = imagesMap.get(p.id) || [];
    
    // Calculate fromPrice (lowest variant price)
    const fromPrice = productVariants.length
      ? Math.min(...productVariants.map((v) => v.price))
      : 0;

    return {
      ...p,
      rating: p.rating / 10, // Convert back to decimal (45 -> 4.5)
      images: productImages,
      variants: productVariants,
      fromPrice,
    };
  });

  // Apply price filters
  if (query.minPrice !== undefined) {
    results = results.filter((p) => p.fromPrice >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    results = results.filter((p) => p.fromPrice <= query.maxPrice!);
  }

  // Apply stock filter
  if (query.inStock === "true") {
    results = results.filter((p) =>
      p.variants.some((v) => v.stock > 0)
    );
  }

  // Apply sorting (price sorts need to happen after fromPrice calculation)
  if (query.sort === "price_asc") {
    results.sort((a, b) => a.fromPrice - b.fromPrice);
  } else if (query.sort === "price_desc") {
    results.sort((a, b) => b.fromPrice - a.fromPrice);
  }

  // Pagination
  const total = results.length;
  const page = query.page;
  const limit = query.limit;
  const offset = (page - 1) * limit;
  const paginatedResults = results.slice(offset, offset + limit);

  json(res, {
    products: paginatedResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
