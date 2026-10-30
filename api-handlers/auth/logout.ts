import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handler, methodGuard, json } from "../../server-lib/http";
import { clearSessionCookie } from "../../server-lib/auth";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["POST"])) return;

  clearSessionCookie(res);
  json(res, { success: true });
});
