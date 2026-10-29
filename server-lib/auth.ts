import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// ============ TYPES ============

export interface SessionPayload {
  sub: string; // user id
  role: "customer" | "admin";
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends VercelRequest {
  user?: SessionPayload;
}

// ============ JWT HELPERS ============

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const secret = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "pistara_session";
const JWT_EXPIRY = "7d"; // 7 days

export async function signToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch (err) {
    throw {
      code: "UNAUTHORIZED",
      message: "Invalid or expired session",
    };
  }
}

// ============ COOKIE HELPERS ============

export function setSessionCookie(res: VercelResponse, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${isProduction ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(res: VercelResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`
  );
}

export function getSessionToken(req: VercelRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// ============ USER HELPERS ============

export async function getUserFromRequest(
  req: AuthenticatedRequest
): Promise<SessionPayload | null> {
  // Check if already attached
  if (req.user) return req.user;

  const token = getSessionToken(req);
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    req.user = payload;
    return payload;
  } catch {
    return null;
  }
}

export async function requireUser(
  req: AuthenticatedRequest
): Promise<SessionPayload> {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    };
  }
  return user;
}

export async function requireAdmin(
  req: AuthenticatedRequest
): Promise<SessionPayload> {
  const user = await requireUser(req);
  if (user.role !== "admin") {
    throw {
      code: "FORBIDDEN",
      message: "Admin access required",
    };
  }
  return user;
}

// ============ PROFILE COMPLETENESS ============

export async function checkProfileComplete(userId: string): Promise<boolean> {
  const [user] = await db
    .select({
      mobile: users.mobile,
      hasAddress: db
        .select({ count: db.$count() })
        .from(db.schema.addresses)
        .where(eq(db.schema.addresses.user_id, userId))
        .limit(1),
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;

  return !!(user.mobile && user.hasAddress);
}

export async function requireCompleteProfile(userId: string) {
  const isComplete = await checkProfileComplete(userId);
  if (!isComplete) {
    throw {
      code: "PROFILE_INCOMPLETE",
      message:
        "Please complete your profile with mobile number and delivery address",
    };
  }
}

// ============ ROLE MANAGEMENT ============

export async function ensureAdminRole(email: string): Promise<"admin" | "customer"> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEmail && email.toLowerCase().trim() === adminEmail) {
    return "admin";
  }
  return "customer";
}
