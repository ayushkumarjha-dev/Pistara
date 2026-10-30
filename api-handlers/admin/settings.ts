import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { settingsSchema } from "../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  json,
} from "../../server-lib/http";
import {
  requireAdmin,
  type AuthenticatedRequest,
} from "../../server-lib/auth";
import { eq } from "drizzle-orm";

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const allSettings = await db.select().from(settings);

  // Convert to key-value object
  const settingsObj: Record<string, any> = {};
  for (const setting of allSettings) {
    try {
      settingsObj[setting.key] = JSON.parse(setting.value);
    } catch {
      settingsObj[setting.key] = setting.value;
    }
  }

  // Ensure delivery_charge is a number
  if (settingsObj.delivery_charge) {
    settingsObj.delivery_charge = parseInt(settingsObj.delivery_charge, 10);
  }

  json(res, { settings: settingsObj });
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse) {
  await requireAdmin(req);

  const input = await parseBody(req, settingsSchema);

  // Upsert each setting
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;

    const stringValue = typeof value === "string" ? value : JSON.stringify(value);

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(settings)
        .set({ value: stringValue, updated_at: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value: stringValue,
      });
    }
  }

  json(res, { success: true });
}

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "GET") {
    return handleGet(req as AuthenticatedRequest, res);
  } else if (req.method === "PUT") {
    return handlePut(req as AuthenticatedRequest, res);
  } else {
    methodGuard(req, res, ["GET", "PUT"]);
  }
});
