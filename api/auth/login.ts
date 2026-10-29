import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { loginSchema } from "../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  json,
  enforceRateLimit,
} from "../../server-lib/http";
import {
  signToken,
  setSessionCookie,
  ensureAdminRole,
} from "../../server-lib/auth";
import { eq } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["POST"])) return;

  const input = await parseBody(req, loginSchema);

  // Rate limit by IP and email
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  await enforceRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  await enforceRateLimit(`login:email:${input.email}`, 5, 15 * 60 * 1000);

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  // Generic error message for security
  const invalidError = {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  };

  if (!user) {
    throw invalidError;
  }

  // Verify password
  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw invalidError;
  }

  // Ensure admin role is set correctly
  const role = await ensureAdminRole(user.email);
  if (role !== user.role) {
    // Update role if it changed
    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, user.id));
  }

  // Sign JWT and set cookie
  const token = await signToken({ sub: user.id, role });
  setSessionCookie(res, token);

  json(res, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      avatar_url: user.avatar_url,
      mobile: user.mobile,
    },
  });
});
