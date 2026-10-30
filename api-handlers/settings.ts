import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../db/client";
import { settings } from "../db/schema";
import { handler, methodGuard, json } from "../server-lib/http";
import { inArray } from "drizzle-orm";

// Public settings keys that can be exposed to the frontend
const PUBLIC_KEYS = [
  "whatsapp_number",
  "delivery_charge",
  "store_name",
  "contact_email",
  "contact_phone",
  "store_address",
  "hero_headline",
  "hero_subtitle",
  "announcement_text",
];

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const publicSettings = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, PUBLIC_KEYS));

  // Convert to key-value object
  const settingsObj: Record<string, any> = {};
  for (const setting of publicSettings) {
    try {
      // Try to parse as JSON first
      settingsObj[setting.key] = JSON.parse(setting.value);
    } catch {
      // If not JSON, use as plain string
      settingsObj[setting.key] = setting.value;
    }
  }

  // Ensure delivery_charge is a number
  if (settingsObj.delivery_charge) {
    settingsObj.delivery_charge = parseInt(settingsObj.delivery_charge, 10);
  }

  json(res, { settings: settingsObj });
});
