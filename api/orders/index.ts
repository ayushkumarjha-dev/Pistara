import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import {
  orders,
  order_items,
  order_status_history,
  users,
  addresses,
  product_variants,
  products,
  product_images,
  settings,
} from "../../db/schema";
import { createOrderSchema, orderQuerySchema } from "../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  parseQuery,
  json,
} from "../../server-lib/http";
import {
  requireUser,
  requireCompleteProfile,
  type AuthenticatedRequest,
} from "../../server-lib/auth";
import { generateOrderNumber } from "../../server-lib/order-number";
import { buildWhatsAppOrderUrl } from "../../server-lib/whatsapp";
import { eq, and, desc, isNull } from "drizzle-orm";

async function handlePost(req: AuthenticatedRequest, res: VercelResponse) {
  const session = await requireUser(req);
  const input = await parseBody(req, createOrderSchema);

  // Check profile completeness
  await requireCompleteProfile(session.sub);

  // Start a transaction
  const result = await db.transaction(async (tx) => {
    // Fetch user profile and address
    const [user] = await tx
      .select({
        name: users.name,
        mobile: users.mobile,
      })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);

    const [address] = await tx
      .select()
      .from(addresses)
      .where(eq(addresses.user_id, session.sub))
      .limit(1);

    if (!user || !address || !user.mobile) {
      throw {
        code: "PROFILE_INCOMPLETE",
        message: "Profile is not complete",
      };
    }

    // Fetch delivery charge
    const [deliveryChargeSetting] = await tx
      .select()
      .from(settings)
      .where(eq(settings.key, "delivery_charge"))
      .limit(1);

    const deliveryCharge = deliveryChargeSetting
      ? parseInt(deliveryChargeSetting.value, 10)
      : 50;

    // Validate and compute order items
    const orderItemsData: Array<{
      variantId: string;
      product: any;
      variant: any;
      quantity: number;
      primaryImage: string | null;
    }> = [];

    for (const item of input.items) {
      // Fetch variant with product
      const [variant] = await tx
        .select()
        .from(product_variants)
        .where(eq(product_variants.id, item.variantId))
        .limit(1);

      if (!variant || !variant.is_active) {
        throw {
          code: "INVALID_REQUEST",
          message: `Variant ${item.variantId} is not available`,
        };
      }

      // Fetch product
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, variant.product_id),
            eq(products.is_active, true),
            isNull(products.deleted_at)
          )
        )
        .limit(1);

      if (!product) {
        throw {
          code: "INVALID_REQUEST",
          message: `Product for variant ${item.variantId} is not available`,
        };
      }

      // Check stock
      if (variant.stock < item.quantity) {
        throw {
          code: "CONFLICT",
          message: `Insufficient stock for ${product.name} (${variant.label}). Available: ${variant.stock}`,
        };
      }

      // Fetch primary image
      const [primaryImg] = await tx
        .select()
        .from(product_images)
        .where(
          and(
            eq(product_images.product_id, product.id),
            eq(product_images.is_primary, true)
          )
        )
        .limit(1);

      orderItemsData.push({
        variantId: item.variantId,
        product,
        variant,
        quantity: item.quantity,
        primaryImage: primaryImg?.url || null,
      });
    }

    // Calculate totals
    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );
    const total = subtotal + deliveryCharge;

    // Generate order number
    const order_number = await generateOrderNumber();

    // Create order
    const orderId = crypto.randomUUID();
    const customerAddress = `${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.area ? address.area + ", " : ""}${address.city}, ${address.state} - ${address.pincode}`;

    await tx.insert(orders).values({
      id: orderId,
      order_number,
      user_id: session.sub,
      status: "PENDING",
      subtotal,
      delivery_charge: deliveryCharge,
      total,
      customer_name: user.name,
      customer_mobile: user.mobile,
      customer_address: customerAddress,
    });

    // Create order items and decrement stock
    for (const item of orderItemsData) {
      await tx.insert(order_items).values({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: item.product.id,
        variant_id: item.variantId,
        product_name: item.product.name,
        variant_label: item.variant.label,
        unit_price: item.variant.price,
        quantity: item.quantity,
        line_total: item.variant.price * item.quantity,
        image_url: item.primaryImage,
      });

      // Decrement stock
      await tx
        .update(product_variants)
        .set({
          stock: item.variant.stock - item.quantity,
        })
        .where(eq(product_variants.id, item.variantId));
    }

    // Create status history
    await tx.insert(order_status_history).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      status: "PENDING",
      note: "Order placed",
    });

    return {
      orderId,
      order_number,
      customer_name: user.name,
      customer_mobile: user.mobile,
      customer_address: customerAddress,
      items: orderItemsData.map((item) => ({
        product_name: item.product.name,
        variant_label: item.variant.label,
        quantity: item.quantity,
        line_total: item.variant.price * item.quantity,
      })),
      subtotal,
      delivery_charge: deliveryCharge,
      total,
    };
  });

  // Fetch WhatsApp number
  const [whatsappSetting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "whatsapp_number"))
    .limit(1);

  const whatsappNumber = whatsappSetting?.value || process.env.WHATSAPP_NUMBER || "";

  // Build WhatsApp URL
  const whatsappUrl = buildWhatsAppOrderUrl(whatsappNumber, result);

  json(
    res,
    {
      order: {
        id: result.orderId,
        order_number: result.order_number,
      },
      whatsappUrl,
    },
    201
  );
}

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  const session = await requireUser(req);
  const query = parseQuery(req, orderQuerySchema);

  // Build where conditions
  const conditions = [eq(orders.user_id, session.sub)];

  if (query.status) {
    conditions.push(eq(orders.status, query.status));
  }

  // Fetch orders
  const userOrders = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.created_at))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  // Count total
  const [{ count }] = await db
    .select({ count: db.$count() })
    .from(orders)
    .where(and(...conditions));

  json(res, {
    orders: userOrders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit),
    },
  });
}

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "POST") {
    return handlePost(req as AuthenticatedRequest, res);
  } else if (req.method === "GET") {
    return handleGet(req as AuthenticatedRequest, res);
  } else {
    methodGuard(req, res, ["GET", "POST"]);
  }
});
