import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import { orders, order_items, order_status_history } from "../../db/schema";
import { handler, methodGuard, json } from "../../server-lib/http";
import {
  requireUser,
  type AuthenticatedRequest,
} from "../../server-lib/auth";
import { eq, and, desc } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const session = await requireUser(req as AuthenticatedRequest);
  const orderId = req.query.id as string;

  if (!orderId) {
    throw {
      code: "INVALID_REQUEST",
      message: "Order ID is required",
    };
  }

  // Fetch order (only if it belongs to the user)
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.user_id, session.sub)))
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
});
