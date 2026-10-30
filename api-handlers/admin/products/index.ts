import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import {
  products,
  product_images,
  product_variants,
  categories,
} from "../../../db/schema";
import { createProductSchema, productQuerySchema } from "../../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  parseQuery,
  json,
} from "../../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../../server-lib/auth";
import { eq, and, isNull, like, desc, asc, sql, type SQL } from "drizzle-orm";

// Generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const query = parseQuery(req, productQuerySchema);

  // Build where conditions (include deleted for admin)
  const conditions: SQL<unknown>[] = [];

  if (query.category) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, query.category))
      .limit(1);

    if (cat) {
      conditions.push(eq(products.category_id, cat.id));
    }
  }

  if (query.q) {
    conditions.push(
      sql`(${products.name} LIKE ${`%${query.q}%`} OR ${products.name_hi} LIKE ${`%${query.q}%`})`
    );
  }

  if (query.featured === "true") {
    conditions.push(eq(products.is_featured, true));
  }

  // Fetch products
  const productsData = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      name_hi: products.name_hi,
      category_id: products.category_id,
      is_featured: products.is_featured,
      is_active: products.is_active,
      deleted_at: products.deleted_at,
      created_at: products.created_at,
    })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.created_at))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  // Fetch variant counts for each product
  const productIds = productsData.map((p) => p.id);
  const variantCounts: Record<string, number> = {};

  for (const id of productIds) {
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(product_variants)
      .where(eq(product_variants.product_id, id));
    variantCounts[id] = countRes[0]?.count ?? 0;
  }

  // Count total
  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = countResult[0]?.total ?? 0;

  json(res, {
    products: productsData.map((p) => ({
      ...p,
      variantCount: variantCounts[p.id] || 0,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}

async function handlePost(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const input = await parseBody(req, createProductSchema);

  // Generate unique slug
  let slug = slugify(input.name);
  let slugSuffix = 0;
  while (true) {
    const testSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.slug, testSlug))
      .limit(1);

    if (!existing) {
      slug = testSlug;
      break;
    }
    slugSuffix++;
  }

  // Create product in transaction
  const result = await db.transaction(async (tx) => {
    const productId = crypto.randomUUID();

    // Insert product
    await tx.insert(products).values({
      id: productId,
      category_id: input.category_id,
      name: input.name,
      name_hi: input.name_hi,
      slug,
      description: input.description,
      description_hi: input.description_hi || null,
      benefits: input.benefits || null,
      is_featured: input.is_featured,
      is_active: input.is_active,
      rating: 45, // Default 4.5
      review_count: 0,
    });

    // Insert images
    for (const img of input.images) {
      await tx.insert(product_images).values({
        id: crypto.randomUUID(),
        product_id: productId,
        url: img.url,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      });
    }

    // Insert variants
    for (const variant of input.variants) {
      await tx.insert(product_variants).values({
        id: crypto.randomUUID(),
        product_id: productId,
        label: variant.label,
        weight_grams: variant.weight_grams,
        price: variant.price,
        mrp: variant.mrp,
        stock: variant.stock,
        is_active: variant.is_active,
      });
    }

    return productId;
  });

  json(res, { productId: result }, 201);
}

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    return handleGet(req as AuthenticatedRequest, res);
  } else if (req.method === "POST") {
    return handlePost(req as AuthenticatedRequest, res);
  } else {
    methodGuard(req, res, ["GET", "POST"]);
  }
});
