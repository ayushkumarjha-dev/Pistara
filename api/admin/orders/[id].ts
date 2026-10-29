import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import {
  orders,
  order_items,
  order_status_history,
  product_variants,
  ORDER_STATUSES,
  type OrderStatus,
} from "../../../db/schema";
import { updateOrderStatusSchema } from "../../../shared/schemas";
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
import { eq, and, desc, sql } from "drizzle-orm";

// Status transition rules
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAYMENT_CONFIRMED", "CANCELLED"],
  PAYMENT_CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // Final state
  CANCELLED: [], // Final state
};

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const orderId = req.query.id as string;

  // Fetch order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw {
      code: "NOT_FOUND",
      message: "Order not found",
    };
  }

  // Fetch order items
  const items = await db
    .select()
    .from(order_items)
    .where(eq(order_items.order_id, orderId));

  // Fetch status history
  const history = await db
    .select()
    .from(order_status_history)
    .where(eq(order_status_history.order_id, orderId))
    .orderBy(desc(order_status_history.created_at));

  json(res, {
    order: {
      ...order,
      items,
      statusHistory: history,
    },
  });
}

async function handlePatch(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const orderId = req.query.id as string;
  const input = await parseBody(req, updateOrderStatusSchema);

  // Fetch current order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw {
      code: "NOT_FOUND",
      message: "Order not found",
    };
  }

  // Validate status transition
  const currentStatus = order.status as OrderStatus;
  const newStatus = input.status as OrderStatus;

  if (currentStatus === newStatus) {
    throw {
      code: "INVALID_REQUEST",
      message: "Order is already in this status",
    };
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedNext.includes(newStatus)) {
    throw {
      code: "INVALID_REQUEST",
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Validate required fields for SHIPPED status
  if (newStatus === "SHIPPED") {
    if (!input.courierName || !input.trackingId) {
      throw {
        code: "INVALID_REQUEST",
        message: "Courier name and tracking ID are required for shipped status",
      };
    }
  }

  // Update in transaction
  await db.transaction(async (tx) => {
    // Update order
    const updateData: any = {
      status: newStatus,
    };

    if (input.courierName) updateData.courier_name = input.courierName;
    if (input.trackingId) updateData.tracking_id = input.trackingId;
    if (input.trackingUrl) updateData.tracking_url = input.trackingUrl;
    if (input.note) updateData.admin_note = input.note;

    await tx.update(orders).set(updateData).where(eq(orders.id, orderId));

    // Add status history entry
    await tx.insert(order_status_history).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      status: newStatus,
      note: input.note || null,
    });

    // If cancelling, restore stock
    if (newStatus === "CANCELLED") {
      const items = await tx
        .select()
        .from(order_items)
        .where(eq(order_items.order_id, orderId));

      for (const item of items) {
        // Try to restore stock (variant might not exist anymore)
        const [variant] = await tx
          .select()
          .from(product_variants)
          .where(eq(product_variants.id, item.variant_id))
          .limit(1);

        if (variant) {
          await tx
            .update(product_variants)
            .set({ stock: variant.stock + item.quantity })
            .where(eq(product_variants.id, item.variant_id));
        }
      }
    }
  });

  json(res, { success: true });
}

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    return handleGet(req as AuthenticatedRequest, res);
  } else if (req.method === "PATCH") {
    return handlePatch(req as AuthenticatedRequest, res);
  } else {
    methodGuard(req, res, ["GET", "PATCH"]);
  }
});
