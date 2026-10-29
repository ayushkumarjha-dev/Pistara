import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, type ZodSchema } from "zod";

// ============ TYPES ============

export type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ============ RESPONSE HELPERS ============

export function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json({ data });
}

export function error(res: VercelResponse, err: ApiError, status = 400) {
  return res.status(status).json({ error: err });
}

// ============ ERROR FORMATTING ============

export function formatZodError(zodError: ZodError): ApiError {
  const firstError = zodError.errors[0];
  return {
    code: "VALIDATION_ERROR",
    message: firstError?.message || "Validation failed",
    details: zodError.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  };
}

export function formatError(err: unknown): { error: ApiError; status: number } {
  // Zod validation errors
  if (err instanceof ZodError) {
    return { error: formatZodError(err), status: 400 };
  }

  // Custom API errors
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err
  ) {
    const apiErr = err as ApiError;
    const status =
      apiErr.code === "UNAUTHORIZED"
        ? 401
        : apiErr.code === "FORBIDDEN"
          ? 403
          : apiErr.code === "NOT_FOUND"
            ? 404
            : apiErr.code === "CONFLICT"
              ? 409
              : apiErr.code === "PROFILE_INCOMPLETE"
                ? 422
                : apiErr.code === "RATE_LIMIT_EXCEEDED"
                  ? 429
                  : 400;
    return { error: apiErr, status };
  }

  // Generic errors
  console.error("Unhandled error:", err);
  return {
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : String(err),
    },
    status: 500,
  };
}

// ============ METHOD GUARD ============

export function methodGuard(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[]
): boolean {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader("Allow", allowedMethods.join(", "));
    error(
      res,
      {
        code: "METHOD_NOT_ALLOWED",
        message: `Method ${req.method} not allowed`,
      },
      405
    );
    return false;
  }
  return true;
}

// ============ REQUEST HANDLER WRAPPER ============

export function handler(fn: Handler): Handler {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Set CORS headers (same-origin only in production, but allow for local dev)
      const origin = req.headers.origin;
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      
      if (origin === appUrl || process.env.NODE_ENV === "development") {
        res.setHeader("Access-Control-Allow-Origin", origin || appUrl);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        );
      }

      // Handle preflight
      if (req.method === "OPTIONS") {
        return res.status(200).end();
      }

      await fn(req, res);
    } catch (err) {
      const { error: apiError, status } = formatError(err);
      return error(res, apiError, status);
    }
  };
}

// ============ BODY PARSER ============

export async function parseBody<T>(
  req: VercelRequest,
  schema?: ZodSchema<T>
): Promise<T> {
  // Vercel already parses JSON body into req.body
  const body = req.body;

  if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
    throw {
      code: "INVALID_REQUEST",
      message: "Request body is required",
    };
  }

  if (schema) {
    return schema.parse(body);
  }

  return body as T;
}

// ============ QUERY PARSER ============

export function parseQuery<T>(req: VercelRequest, schema: ZodSchema<T>): T {
  return schema.parse(req.query);
}

// ============ RATE LIMITING ============

// Simple in-memory rate limiter (use Turso for distributed systems)
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Start new window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const result = await checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
    };
  }
}
