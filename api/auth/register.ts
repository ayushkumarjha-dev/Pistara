import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { registerSchema } from "../../shared/schemas";
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

  // Rate limit: 5 registrations per 15 minutes per IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  await enforceRateLimit(`register:ip:${ip}`, 5, 15 * 60 * 1000);

  const input = await parseBody(req, registerSchema);

  // Check if email already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw {
      code: "CONFLICT",
      message: "An account with this email already exists",
    };
  }

  // Hash password
  const password_hash = await bcrypt.hash(input.password, 12);

  // Determine role (admin if email matches ADMIN_EMAIL)
  const role = await ensureAdminRole(input.email);

  // Create user
  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    password_hash,
    role,
  });

  // Sign JWT and set cookie
  const token = await signToken({ sub: id, role });
  setSessionCookie(res, token);

  // Return user data (no password hash)
  json(res, {
    user: {
      id,
      name: input.name,
      email: input.email,
      role,
      avatar_url: null,
      mobile: null,
    },
  }, 201);
});
