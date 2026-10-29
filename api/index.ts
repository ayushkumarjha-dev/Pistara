import type { VercelRequest, VercelResponse } from "@vercel/node";

// Import all route handlers
import authLogin from "./auth/login";
import authRegister from "./auth/register";
import authLogout from "./auth/logout";
import authMe from "./auth/me";
import authForgot from "./auth/forgot";
import authReset from "./auth/reset";

import productsIndex from "./products/index";
import productsSlug from "./products/[slug]";

import ordersIndex from "./orders/index";
import ordersId from "./orders/[id]";

import categories from "./categories";
import profile from "./profile";
import settings from "./settings";

// Admin routes
import adminCustomersIndex from "./admin/customers/index";
import adminCustomersId from "./admin/customers/[id]";
import adminOrdersIndex from "./admin/orders/index";
import adminOrdersId from "./admin/orders/[id]";
import adminProductsIndex from "./admin/products/index";
import adminProductsId from "./admin/products/[id]";
import adminSettings from "./admin/settings";
import adminStats from "./admin/stats";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const method = req.method || "GET";
    let path = req.url || "/";

    // Remove query string from path
    const pathWithoutQuery = path.split("?")[0];

    // Route matching with dynamic parameters
    
    // Auth routes
    if (method === "POST" && pathWithoutQuery === "/api/auth/login") {
      return await authLogin(req, res);
    }
    if (method === "POST" && pathWithoutQuery === "/api/auth/register") {
      return await authRegister(req, res);
    }
    if (method === "POST" && pathWithoutQuery === "/api/auth/logout") {
      return await authLogout(req, res);
    }
    if (method === "GET" && pathWithoutQuery === "/api/auth/me") {
      return await authMe(req, res);
    }
    if (method === "POST" && pathWithoutQuery === "/api/auth/forgot") {
      return await authForgot(req, res);
    }
    if (method === "POST" && pathWithoutQuery === "/api/auth/reset") {
      return await authReset(req, res);
    }

    // Public routes
    if (method === "GET" && pathWithoutQuery === "/api/categories") {
      return await categories(req, res);
    }
    if (method === "GET" && pathWithoutQuery === "/api/settings") {
      return await settings(req, res);
    }

    // Products
    if (method === "GET" && pathWithoutQuery === "/api/products") {
      return await productsIndex(req, res);
    }
    const productSlugMatch = pathWithoutQuery.match(/^\/api\/products\/([^\/]+)$/);
    if (method === "GET" && productSlugMatch) {
      req.query = { ...req.query, slug: productSlugMatch[1] };
      return await productsSlug(req, res);
    }

    // Profile
    if ((method === "GET" || method === "PUT") && pathWithoutQuery === "/api/profile") {
      return await profile(req, res);
    }

    // Orders
    if ((method === "GET" || method === "POST") && pathWithoutQuery === "/api/orders") {
      return await ordersIndex(req, res);
    }
    const orderIdMatch = pathWithoutQuery.match(/^\/api\/orders\/([^\/]+)$/);
    if (method === "GET" && orderIdMatch) {
      req.query = { ...req.query, id: orderIdMatch[1] };
      return await ordersId(req, res);
    }

    // Admin - Customers
    if (method === "GET" && pathWithoutQuery === "/api/admin/customers") {
      return await adminCustomersIndex(req, res);
    }
    const adminCustomerIdMatch = pathWithoutQuery.match(/^\/api\/admin\/customers\/([^\/]+)$/);
    if (adminCustomerIdMatch && (method === "GET" || method === "PUT" || method === "DELETE")) {
      req.query = { ...req.query, id: adminCustomerIdMatch[1] };
      return await adminCustomersId(req, res);
    }

    // Admin - Orders
    if (method === "GET" && pathWithoutQuery === "/api/admin/orders") {
      return await adminOrdersIndex(req, res);
    }
    const adminOrderIdMatch = pathWithoutQuery.match(/^\/api\/admin\/orders\/([^\/]+)$/);
    if (adminOrderIdMatch && (method === "GET" || method === "PUT")) {
      req.query = { ...req.query, id: adminOrderIdMatch[1] };
      return await adminOrdersId(req, res);
    }

    // Admin - Products
    if ((method === "GET" || method === "POST") && pathWithoutQuery === "/api/admin/products") {
      return await adminProductsIndex(req, res);
    }
    const adminProductIdMatch = pathWithoutQuery.match(/^\/api\/admin\/products\/([^\/]+)$/);
    if (adminProductIdMatch && (method === "GET" || method === "PUT" || method === "DELETE")) {
      req.query = { ...req.query, id: adminProductIdMatch[1] };
      return await adminProductsId(req, res);
    }

    // Admin - Settings
    if ((method === "GET" || method === "PUT") && pathWithoutQuery === "/api/admin/settings") {
      return await adminSettings(req, res);
    }

    // Admin - Stats
    if (method === "GET" && pathWithoutQuery === "/api/admin/stats") {
      return await adminStats(req, res);
    }

    // Route not found
    return res.status(404).json({
      error: "NOT_FOUND",
      message: `Route ${method} ${pathWithoutQuery} not found`,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error.message || "Internal server error",
    });
  }
}
