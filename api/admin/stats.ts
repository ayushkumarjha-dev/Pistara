import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import { orders, product_variants, users } from "../../db/schema";
import { statsQuerySchema } from "../../shared/schemas";
import {
  handler,
  methodGuard,
  parseQuery,
  json,
} from "../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../server-lib/auth";
import { eq, and, gte, sql } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  await requireAdmin(req as AuthenticatedRequest);

  const query = parseQuery(req, statsQuerySchema);
  const daysAgo = parseInt(query.range, 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  // Total orders count
  const [{ totalOrders }] = await db
    .select({ totalOrders: db.$count() })
    .from(orders);

  // Pending orders count
  const [{ pendingOrders }] = await db
    .select({ pendingOrders: db.$count() })
    .from(orders)
    .where(eq(orders.status, "PENDING"));

  // Total revenue (only completed/paid orders)
  const [{ revenue }] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
    .from(orders)
    .where(
      sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED')`
    );

  // Total customers
  const [{ totalCustomers }] = await db
    .select({ totalCustomers: db.$count() })
    .from(users)
    .where(eq(users.role, "customer"));

  // Low stock variants (stock <= 5)
  const lowStockVariants = await db
    .select({
      id: product_variants.id,
      product_id: product_variants.product_id,
      label: product_variants.label,
      stock: product_variants.stock,
      product_name: sql<string>`(SELECT name FROM ${db.schema.products} WHERE id = ${product_variants.product_id})`,
    })
    .from(product_variants)
    .where(
      and(
        sql`${product_variants.stock} <= 5`,
        eq(product_variants.is_active, true)
      )
    )
    .limit(10);

  // Recent orders (last 5)
  const recentOrders = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      customer_name: orders.customer_name,
      status: orders.status,
      total: orders.total,
      created_at: orders.created_at,
    })
    .from(orders)
    .orderBy(sql`${orders.created_at} DESC`)
    .limit(5);

  // Daily stats for the range
  const dailyStats = await db
    .select({
      date: sql<string>`DATE(${orders.created_at} / 1000, 'unixepoch')`,
      orderCount: db.$count(),
      revenue: sql<number>`SUM(CASE WHEN ${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN ${orders.total} ELSE 0 END)`,
    })
    .from(orders)
    .where(gte(orders.created_at, startDate))
    .groupBy(sql`DATE(${orders.created_at} / 1000, 'unixepoch')`)
    .orderBy(sql`DATE(${orders.created_at} / 1000, 'unixepoch')`);

  json(res, {
    stats: {
      totalOrders,
      pendingOrders,
      revenue: revenue || 0,
      totalCustomers,
      lowStockVariants,
      recentOrders,
      dailyStats,
    },
  });
});
