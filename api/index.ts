import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleRequest } from "../server-lib/http";

// Import all route handlers
import * as authLogin from "./auth/login";
import * as authRegister from "./auth/register";
import * as authLogout from "./auth/logout";
import * as authMe from "./auth/me";
import * as authForgot from "./auth/forgot";
import * as authReset from "./auth/reset";

import * as productsIndex from "./products/index";
import * as productsSlug from "./products/[slug]";

import * as ordersIndex from "./orders/index";
import * as ordersId from "./orders/[id]";

import * as categories from "./categories";
import * as profile from "./profile";
import * as settings from "./settings";

// Admin routes
import * as adminCustomersIndex from "./admin/customers/index";
import * as adminCustomersId from "./admin/customers/[id]";
import * as adminOrdersIndex from "./admin/orders/index";
import * as adminOrdersId from "./admin/orders/[id]";
import * as adminProductsIndex from "./admin/products/index";
import * as adminProductsId from "./admin/products/[id]";
import * as adminSettings from "./admin/settings";
import * as adminStats from "./admin/stats";

// Route mapping
const routes: Record<string, any> = {
  // Auth routes
  "POST /api/auth/login": authLogin,
  "POST /api/auth/register": authRegister,
  "POST /api/auth/logout": authLogout,
  "GET /api/auth/me": authMe,
  "POST /api/auth/forgot": authForgot,
  "POST /api/auth/reset": authReset,

  // Public routes
  "GET /api/products": productsIndex,
  "GET /api/categories": categories,
  "GET /api/settings": settings,

  // Authenticated user routes
  "GET /api/profile": profile,
  "PUT /api/profile": profile,
  "POST /api/orders": ordersIndex,
  "GET /api/orders": ordersIndex,

  // Admin routes
  "GET /api/admin/customers": adminCustomersIndex,
  "GET /api/admin/orders": adminOrdersIndex,
  "GET /api/admin/products": adminProductsIndex,
  "POST /api/admin/products": adminProductsIndex,
  "GET /api/admin/settings": adminSettings,
  "PUT /api/admin/settings": adminSettings,
  "GET /api/admin/stats": adminStats,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const method = req.method || "GET";
    let path = req.url || "/";

    // Extract dynamic parameters from path
    const slugMatch = path.match(/\/api\/products\/([^\/]+)/);
    const orderIdMatch = path.match(/\/api\/orders\/([^\/]+)/);
    const adminCustomerIdMatch = path.match(/\/api\/admin\/customers\/([^\/]+)/);
    const adminOrderIdMatch = path.match(/\/api\/admin\/orders\/([^\/]+)/);
    const adminProductIdMatch = path.match(/\/api\/admin\/products\/([^\/]+)/);

    // Normalize path for routing
    if (slugMatch && slugMatch[1]) {
      path = "/api/products/[slug]";
      req.query = { ...req.query, slug: slugMatch[1] };
    } else if (orderIdMatch && orderIdMatch[1] && !path.includes("/admin/")) {
      path = "/api/orders/[id]";
      req.query = { ...req.query, id: orderIdMatch[1] };
    } else if (adminCustomerIdMatch && adminCustomerIdMatch[1]) {
      path = "/api/admin/customers/[id]";
      req.query = { ...req.query, id: adminCustomerIdMatch[1] };
    } else if (adminOrderIdMatch && adminOrderIdMatch[1]) {
      path = "/api/admin/orders/[id]";
      req.query = { ...req.query, id: adminOrderIdMatch[1] };
    } else if (adminProductIdMatch && adminProductIdMatch[1]) {
      path = "/api/admin/products/[id]";
      req.query = { ...req.query, id: adminProductIdMatch[1] };
    }

    // Remove query string from path
    path = path.split("?")[0];

    const routeKey = `${method} ${path}`;
    const handler = routes[routeKey];

    if (!handler) {
      // Try to match dynamic routes
      if (slugMatch) {
        return await productsSlug.default(req, res);
      } else if (orderIdMatch && !path.includes("/admin/")) {
        return await ordersId.default(req, res);
      } else if (adminCustomerIdMatch) {
        return await adminCustomersId.default(req, res);
      } else if (adminOrderIdMatch) {
        return await adminOrdersId.default(req, res);
      } else if (adminProductIdMatch) {
        return await adminProductsId.default(req, res);
      }

      return res.status(404).json({
        error: "NOT_FOUND",
        message: `Route ${routeKey} not found`,
      });
    }

    return await handler.default(req, res);
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error.message || "Internal server error",
    });
  }
}
