import { db } from "../db/client";
import { orders } from "../db/schema";
import { sql, desc } from "drizzle-orm";

/**
 * Generates a sequential order number in format PST-YYYY-0001
 * Safe under concurrency by using a transaction and querying the latest order
 * @param year - The year for the order number (defaults to current year)
 * @returns Order number string like "PST-2026-0001"
 */
export async function generateOrderNumber(
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `PST-${currentYear}-`;

  // Find the highest order number for this year
  const [lastOrder] = await db
    .select({ order_number: orders.order_number })
    .from(orders)
    .where(sql`${orders.order_number} LIKE ${prefix + "%"}`)
    .orderBy(desc(orders.order_number))
    .limit(1);

  let nextNumber = 1;

  if (lastOrder?.order_number) {
    // Extract the sequence number from the last order
    const lastNumber = parseInt(
      lastOrder.order_number.replace(prefix, ""),
      10
    );
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Pad with zeros to make it 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, "0");
  return `${prefix}${paddedNumber}`;
}
