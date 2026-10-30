import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/client";
import { users, addresses, orders } from "../../../db/schema";
import {
  handler,
  methodGuard,
  json,
} from "../../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../../server-lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  await requireAdmin(req as AuthenticatedRequest);

  const customerId = req.query.id as string;

  // Fetch customer
  const [customer] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      mobile: users.mobile,
      avatar_url: users.avatar_url,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer || (await db.select().from(users).where(eq(users.id, customerId)).limit(1))[0]?.role !== "customer") {
    throw {
      code: "NOT_FOUND",
      message: "Customer not found",
    };
  }

  // Fetch address
  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, customerId))
    .limit(1);

  // Fetch order history
  const customerOrders = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      status: orders.status,
      total: orders.total,
      created_at: orders.created_at,
    })
    .from(orders)
    .where(eq(orders.user_id, customerId))
    .orderBy(desc(orders.created_at))
    .limit(10);

  // Fetch order stats
  const [stats] = await db
    .select({
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(eq(orders.user_id, customerId));

  json(res, {
    customer: {
      ...customer,
      address: address || null,
      orderCount: stats?.orderCount || 0,
      totalSpent: stats?.totalSpent || 0,
      recentOrders: customerOrders,
    },
  });
});
