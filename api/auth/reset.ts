import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users, password_reset_tokens } from "../../db/schema";
import { resetPasswordSchema } from "../../shared/schemas";
import { handler, methodGuard, parseBody, json } from "../../server-lib/http";
import { eq, and, isNull, gt } from "drizzle-orm";

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (!methodGuard(req, res, ["POST"])) return;

  const input = await parseBody(req, resetPasswordSchema);

  // Hash the token to find it in database
  const token_hash = await bcrypt.hash(input.token, 10);

  // Find unused, non-expired tokens for all users
  const tokens = await db
    .select({
      id: password_reset_tokens.id,
      user_id: password_reset_tokens.user_id,
      token_hash: password_reset_tokens.token_hash,
    })
    .from(password_reset_tokens)
    .where(
      and(
        isNull(password_reset_tokens.used_at),
        gt(password_reset_tokens.expires_at, new Date())
      )
    );

  // Find matching token by comparing hashes
  let matchedToken = null;
  for (const t of tokens) {
    const valid = await bcrypt.compare(input.token, t.token_hash);
    if (valid) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    throw {
      code: "INVALID_TOKEN",
      message: "Invalid or expired reset token",
    };
  }

  // Update user password
  const new_password_hash = await bcrypt.hash(input.password, 12);
  await db
    .update(users)
    .set({ password_hash: new_password_hash })
    .where(eq(users.id, matchedToken.user_id));

  // Mark token as used
  await db
    .update(password_reset_tokens)
    .set({ used_at: new Date() })
    .where(eq(password_reset_tokens.id, matchedToken.id));

  json(res, { message: "Password reset successful" });
});
