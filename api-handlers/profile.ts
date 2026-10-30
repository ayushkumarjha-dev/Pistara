import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../db/client";
import { users, addresses } from "../db/schema";
import { updateProfileWithAddressSchema } from "../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  json,
} from "../server-lib/http";
import {
  requireUser,
  type AuthenticatedRequest,
} from "../server-lib/auth";
import { eq } from "drizzle-orm";

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  const session = await requireUser(req);

  // Fetch user with address
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      mobile: users.mobile,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);

  if (!user) {
    throw {
      code: "NOT_FOUND",
      message: "User not found",
    };
  }

  // Fetch address
  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, session.sub))
    .limit(1);

  // Check if profile is complete
  const isComplete = !!(user.mobile && address);

  json(res, {
    profile: {
      ...user,
      address: address || null,
      isComplete,
    },
  });
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse) {
  const session = await requireUser(req);
  const input = await parseBody(req, updateProfileWithAddressSchema);

  // Update user
  await db
    .update(users)
    .set({
      name: input.name,
      mobile: input.mobile || null,
    })
    .where(eq(users.id, session.sub));

  // Upsert address
  const [existingAddress] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, session.sub))
    .limit(1);

  if (existingAddress) {
    await db
      .update(addresses)
      .set({
        ...input.address,
        updated_at: new Date(),
      })
      .where(eq(addresses.user_id, session.sub));
  } else {
    await db.insert(addresses).values({
      id: crypto.randomUUID(),
      user_id: session.sub,
      ...input.address,
    });
  }

  // Fetch updated profile
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      mobile: users.mobile,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);

  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, session.sub))
    .limit(1);

  json(res, {
    profile: {
      ...user,
      address,
      isComplete: true,
    },
  });
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
