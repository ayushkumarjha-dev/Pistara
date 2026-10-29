import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/client";
import { users, addresses } from "../../db/schema";
import { handler, methodGuard, json } from "../../server-lib/http";
import {
  getUserFromRequest,
  type AuthenticatedRequest,
} from "../../server-lib/auth";
import { eq } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["GET"])) return;

  const session = await getUserFromRequest(req as AuthenticatedRequest);

  if (!session) {
    json(res, { user: null });
    return;
  }

  // Fetch user with address
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar_url: users.avatar_url,
      mobile: users.mobile,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);

  if (!user) {
    json(res, { user: null });
    return;
  }

  // Check if address exists
  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, user.id))
    .limit(1);

  // Profile is complete if mobile and address exist
  const isComplete = !!(user.mobile && address);

  json(res, {
    user: {
      ...user,
      isComplete,
    },
  });
});
