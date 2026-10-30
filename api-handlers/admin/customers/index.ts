import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import { users, addresses, orders } from "../../../db/schema";
import { customerQuerySchema } from "../../../shared/schemas";
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
import { eq, like, or, desc, sql, and, type SQL } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  await requireAdmin(req as AuthenticatedRequest);

  const query = parseQuery(req, customerQuerySchema);

  // Build where conditions
  const conditions: SQL<unknown>[] = [eq(users.role, "customer")];

  if (query.q) {
    conditions.push(
      or(
        like(users.name, `%${query.q}%`),
        like(users.email, `%${query.q}%`),
        like(users.mobile, `%${query.q}%`)
      )!
    );
  }

  // Fetch customers
  const customers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      mobile: users.mobile,
      created_at: users.created_at,
    })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.created_at))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  // Fetch addresses and order stats for each customer
  const customerIds = customers.map((c) => c.id);
  const addressMap = new Map();
  const orderStatsMap = new Map();

  for (const id of customerIds) {
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.user_id, id))
      .limit(1);

    addressMap.set(id, address || null);

    const [stats] = await db
      .select({
        orderCount: sql<number>`count(*)`,
        totalSpent: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(eq(orders.user_id, id));

    orderStatsMap.set(id, stats || { orderCount: 0, totalSpent: 0 });
  }

  // Count total
  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = countResult[0]?.total ?? 0;

  json(res, {
    customers: customers.map((c) => {
      const address = addressMap.get(c.id);
      const stats = orderStatsMap.get(c.id);

      return {
        ...c,
        city: address?.city || null,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});
