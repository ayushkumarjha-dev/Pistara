import { z } from "zod";

// ============ AUTH SCHEMAS ============

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// ============ USER & PROFILE SCHEMAS ============

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Mobile must be a valid 10-digit Indian number")
    .optional()
    .or(z.literal("")),
});

export const addressSchema = z.object({
  line1: z.string().min(5, "Address line 1 must be at least 5 characters").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  area: z.string().max(100).optional().or(z.literal("")),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be a 6-digit number"),
});

export const updateProfileWithAddressSchema = z.object({
  name: z.string().min(2).max(100),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  address: addressSchema,
});

// ============ PRODUCT SCHEMAS ============

export const productQuerySchema = z.object({
  category: z.enum(["makhana", "cashew", "dried-grapes"]).optional(),
  q: z.string().optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "rating", "newest"]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  sort_order: z.number().int().min(0).default(0),
  is_primary: z.boolean().default(false),
});

export const productVariantSchema = z.object({
  label: z.enum(["250g", "500g", "1kg"]),
  weight_grams: z.number().int().min(1),
  price: z.number().int().min(0),
  mrp: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const createProductSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(3, "Name must be at least 3 characters").max(200),
  name_hi: z.string().min(1).max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  description_hi: z.string().optional().or(z.literal("")),
  benefits: z.string().optional().or(z.literal("")),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  images: z.array(productImageSchema).min(1, "At least one image is required"),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required")
    .max(10, "Maximum 10 variants allowed"),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
});

// ============ ORDER SCHEMAS ============

export const createOrderItemSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100),
});

export const createOrderSchema = z.object({
  items: z
    .array(createOrderItemSchema)
    .min(1, "At least one item is required")
    .max(50, "Maximum 50 items per order"),
});

export const orderQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "PAYMENT_CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminOrderQuerySchema = orderQuerySchema.extend({
  q: z.string().optional(), // search by order number, customer name or mobile
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PAYMENT_CONFIRMED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().max(500).optional().or(z.literal("")),
  courierName: z.string().max(100).optional().or(z.literal("")),
  trackingId: z.string().max(100).optional().or(z.literal("")),
  trackingUrl: z.string().url().optional().or(z.literal("")),
});

// ============ ADMIN SCHEMAS ============

export const customerQuerySchema = z.object({
  q: z.string().optional(), // search by name, email, or mobile
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const statsQuerySchema = z.object({
  range: z.enum(["7", "30"]).default("7"),
});

export const settingsSchema = z.object({
  whatsapp_number: z
    .string()
    .regex(/^\d{10,15}$/, "WhatsApp number must be 10-15 digits with country code"),
  delivery_charge: z.number().int().min(0),
  store_name: z.string().min(1).max(200).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().max(20).optional().or(z.literal("")),
  store_address: z.string().max(500).optional().or(z.literal("")),
  hero_headline: z.string().max(200).optional().or(z.literal("")),
  hero_subtitle: z.string().max(300).optional().or(z.literal("")),
  announcement_text: z.string().max(200).optional().or(z.literal("")),
});

// ============ RESPONSE TYPES ============

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export const apiSuccessSchema = z.object({
  data: z.any(),
});

// ============ INFERRED TYPES ============

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateProfileWithAddressInput = z.infer<typeof updateProfileWithAddressSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type AdminOrderQueryInput = z.infer<typeof adminOrderQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiSuccess = z.infer<typeof apiSuccessSchema>;
