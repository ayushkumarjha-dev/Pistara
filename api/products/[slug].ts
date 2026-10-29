import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import {
  products,
  product_images,
  product_variants,
  categories,
} from "../../db/schema";
import { handler, methodGuard, json } from "../../server-lib/http";
import { eq, and, isNull, ne, asc } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const slug = req.query.slug as string;

  if (!slug) {
    throw {
      code: "INVALID_REQUEST",
      message: "Product slug is required",
    };
  }

  // Fetch product
  const [product] = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      name_hi: products.name_hi,
      description: products.description,
      description_hi: products.description_hi,
      benefits: products.benefits,
      category_id: products.category_id,
      rating: products.rating,
      review_count: products.review_count,
      is_featured: products.is_featured,
      created_at: products.created_at,
    })
    .from(products)
    .where(
      and(
        eq(products.slug, slug),
        eq(products.is_active, true),
        isNull(products.deleted_at)
      )
    )
    .limit(1);

  if (!product) {
    throw {
      code: "NOT_FOUND",
      message: "Product not found",
    };
  }

  // Fetch images
  const images = await db
    .select()
    .from(product_images)
    .where(eq(product_images.product_id, product.id))
    .orderBy(asc(product_images.sort_order));

  // Fetch active variants
  const variants = await db
    .select()
    .from(product_variants)
    .where(
      and(
        eq(product_variants.product_id, product.id),
        eq(product_variants.is_active, true)
      )
    );

  // Fetch related products (same category, excluding this one)
  const relatedProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      name_hi: products.name_hi,
      rating: products.rating,
      review_count: products.review_count,
    })
    .from(products)
    .where(
      and(
        eq(products.category_id, product.category_id),
        ne(products.id, product.id),
        eq(products.is_active, true),
        isNull(products.deleted_at)
      )
    )
    .limit(4);

  // Fetch images and variants for related products
  const relatedIds = relatedProducts.map((p) => p.id);
  const relatedImages: any[] = [];
  const relatedVariants: any[] = [];

  if (relatedIds.length > 0) {
    for (const id of relatedIds) {
      const imgs = await db
        .select()
        .from(product_images)
        .where(
          and(
            eq(product_images.product_id, id),
            eq(product_images.is_primary, true)
          )
        )
        .limit(1);
      relatedImages.push(...imgs);

      const vars = await db
        .select()
        .from(product_variants)
        .where(
          and(
            eq(product_variants.product_id, id),
            eq(product_variants.is_active, true)
          )
        );
      relatedVariants.push(...vars);
    }
  }

  // Map related products with their data
  const relatedWithData = relatedProducts.map((p) => {
    const pImages = relatedImages.filter((img) => img.product_id === p.id);
    const pVariants = relatedVariants.filter((v) => v.product_id === p.id);
    const fromPrice = pVariants.length
      ? Math.min(...pVariants.map((v) => v.price))
      : 0;

    return {
      ...p,
      rating: p.rating / 10,
      images: pImages,
      fromPrice,
    };
  });

  json(res, {
    product: {
      ...product,
      rating: product.rating / 10,
      images,
      variants,
    },
    relatedProducts: relatedWithData,
  });
});
