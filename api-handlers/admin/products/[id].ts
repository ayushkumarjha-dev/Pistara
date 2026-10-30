import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import {
  products,
  product_images,
  product_variants,
  order_items,
} from "../../../db/schema";
import { updateProductSchema } from "../../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  json,
} from "../../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../../server-lib/auth";
import { eq, isNull, and } from "drizzle-orm";

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const productId = req.query.id as string;

  // Fetch product
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
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
    .where(eq(product_images.product_id, productId))
    .orderBy(product_images.sort_order);

  // Fetch variants
  const variants = await db
    .select()
    .from(product_variants)
    .where(eq(product_variants.product_id, productId));

  json(res, {
    product: {
      ...product,
      rating: product.rating / 10,
      images,
      variants,
    },
  });
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const productId = req.query.id as string;
  const input = await parseBody(req, updateProductSchema.omit({ id: true }));

  // Check if product exists
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existing) {
    throw {
      code: "NOT_FOUND",
      message: "Product not found",
    };
  }

  // Update in transaction
  await db.transaction(async (tx) => {
    // Update product
    const updateData: any = {};
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.name_hi !== undefined) updateData.name_hi = input.name_hi;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.description_hi !== undefined)
      updateData.description_hi = input.description_hi || null;
    if (input.benefits !== undefined) updateData.benefits = input.benefits || null;
    if (input.is_featured !== undefined) updateData.is_featured = input.is_featured;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length > 0) {
      await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId));
    }

    // Update images (delete all and recreate)
    if (input.images) {
      await tx
        .delete(product_images)
        .where(eq(product_images.product_id, productId));

      for (const img of input.images) {
        await tx.insert(product_images).values({
          id: crypto.randomUUID(),
          product_id: productId,
          url: img.url,
          sort_order: img.sort_order,
          is_primary: img.is_primary,
        });
      }
    }

    // Update variants (delete all and recreate)
    if (input.variants) {
      await tx
        .delete(product_variants)
        .where(eq(product_variants.product_id, productId));

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
    }
  });

  json(res, { success: true });
}

async function handleDelete(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const productId = req.query.id as string;

  // Check if product exists
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw {
      code: "NOT_FOUND",
      message: "Product not found",
    };
  }

  // Check if product is in any orders
  const [orderItem] = await db
    .select()
    .from(order_items)
    .where(eq(order_items.product_id, productId))
    .limit(1);

  if (orderItem) {
    // Soft delete
    await db
      .update(products)
      .set({ deleted_at: new Date() })
      .where(eq(products.id, productId));

    json(res, { success: true, deletedType: "soft" });
  } else {
    // Hard delete
    await db.transaction(async (tx) => {
      await tx
        .delete(product_images)
        .where(eq(product_images.product_id, productId));
      await tx
        .delete(product_variants)
        .where(eq(product_variants.product_id, productId));
      await tx.delete(products).where(eq(products.id, productId));
    });

    json(res, { success: true, deletedType: "hard" });
  }
}

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    return handleGet(req as AuthenticatedRequest, res);
  } else if (req.method === "PUT") {
    return handlePut(req as AuthenticatedRequest, res);
  } else if (req.method === "DELETE") {
    return handleDelete(req as AuthenticatedRequest, res);
  } else {
    methodGuard(req, res, ["GET", "PUT", "DELETE"]);
  }
});
