import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users, password_reset_tokens } from "../../db/schema";
import { forgotPasswordSchema } from "../../shared/schemas";
import {
  handler,
  methodGuard,
  parseBody,
  json,
  enforceRateLimit,
} from "../../server-lib/http";
import { eq } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["POST"])) return;

  const input = await parseBody(req, forgotPasswordSchema);

  // Rate limit: 3 requests per 15 minutes per email
  await enforceRateLimit(`forgot:${input.email}`, 3, 15 * 60 * 1000);

  // Find user (don't reveal if email exists)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (user && user.password_hash) {
    // Only for users with password (not OAuth-only users)
    const token = crypto.randomUUID();
    const token_hash = await bcrypt.hash(token, 10);
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await db.insert(password_reset_tokens).values({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash,
      expires_at,
      used_at: null,
    });

    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Log to console (no email service)
    console.log("\n=== PASSWORD RESET ===");
    console.log(`User: ${user.email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("======================\n");
  }

  // Always return success to prevent email enumeration
  json(res, {
    message:
      "If an account with that email exists, we've sent password reset instructions.",
  });
});
