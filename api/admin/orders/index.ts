import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import { orders } from "../../../db/schema";
import { adminOrderQuerySchema } from "../../../shared/schemas";
import {
  handler,
  methodGuard,
  parseQuery,
  json,
} from "../../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../../server-lib/auth";
import { eq, and, gte, lte, like, or, desc, sql } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  await requireAdmin(req as AuthenticatedRequest);

  const query = parseQuery(req, adminOrderQuerySchema);

  // Build where conditions
  const conditions = [];

  if (query.status) {
    conditions.push(eq(orders.status, query.status));
  }

  if (query.q) {
    conditions.push(
      or(
        like(orders.order_number, `%${query.q}%`),
        like(orders.customer_name, `%${query.q}%`),
        like(orders.customer_mobile, `%${query.q}%`)
      )
    );
  }

  if (query.from) {
    conditions.push(gte(orders.created_at, new Date(query.from)));
  }

  if (query.to) {
    conditions.push(lte(orders.created_at, new Date(query.to)));
  }

  // Fetch orders
  const allOrders = await db
    .select()
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.created_at))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  // Count total
  const [{ total }] = await db
    .select({ total: db.$count() })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  json(res, {
    orders: allOrders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});
