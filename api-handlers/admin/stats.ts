import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import { orders, product_variants, users, products } from "../../db/schema";
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
  const range = query.range || "7";
  const daysAgo = parseInt(range, 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  // Total orders count
  const totalOrdersRes = await db
    .select({ totalOrders: sql<number>`count(*)` })
    .from(orders);
  const totalOrders = totalOrdersRes[0]?.totalOrders ?? 0;

  // Pending orders count
  const pendingOrdersRes = await db
    .select({ pendingOrders: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "PENDING"));
  const pendingOrders = pendingOrdersRes[0]?.pendingOrders ?? 0;

  // Total revenue (only completed/paid orders)
  const revenueRes = await db
    .select({ revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
    .from(orders)
    .where(
      sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED')`
    );
  const revenue = revenueRes[0]?.revenue ?? 0;

  // Total customers
  const totalCustomersRes = await db
    .select({ totalCustomers: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "customer"));
  const totalCustomers = totalCustomersRes[0]?.totalCustomers ?? 0;

  // Low stock variants (stock <= 5)
  const lowStockVariants = await db
    .select({
      id: product_variants.id,
      product_id: product_variants.product_id,
      label: product_variants.label,
      stock: product_variants.stock,
      product_name: sql<string>`(SELECT name FROM ${products} WHERE id = ${product_variants.product_id})`,
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
      orderCount: sql<number>`count(*)`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN ${orders.total} ELSE 0 END), 0)`,
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
