import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../db/client";
import { categories } from "../db/schema";
import { handler, methodGuard, json } from "../server-lib/http";
import { asc } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sort_order), asc(categories.name));

  json(res, { categories: allCategories });
});
