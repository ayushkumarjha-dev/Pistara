import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper to create timestamp fields
const timestamps = {
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date()),
};

// ============ USERS & AUTH ============

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    avatar_url: text("avatar_url"),
    role: text("role", { enum: ["customer", "admin"] })
      .notNull()
      .default("customer"),
    mobile: text("mobile"),
    ...timestamps,
  },
  (table) => ({
    email_idx: index("users_email_idx").on(table.email),
  })
);

export const addresses = sqliteTable(
  "addresses",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    user_id_idx: index("addresses_user_id_idx").on(table.user_id),
  })
);

export const password_reset_tokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    used_at: integer("used_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    user_id_idx: index("password_reset_tokens_user_id_idx").on(table.user_id),
    token_hash_idx: index("password_reset_tokens_token_hash_idx").on(
      table.token_hash
    ),
  })
);

// ============ PRODUCTS & CATALOG ============

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    name_hi: text("name_hi").notNull(),
    slug: text("slug").notNull().unique(),
    image_url: text("image_url").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    slug_idx: index("categories_slug_idx").on(table.slug),
  })
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    category_id: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    name_hi: text("name_hi").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    description_hi: text("description_hi"),
    benefits: text("benefits"), // JSON string or plain text
    rating: integer("rating").notNull().default(45), // stored as rating * 10 (e.g., 4.5 = 45)
    review_count: integer("review_count").notNull().default(0),
    is_featured: integer("is_featured", { mode: "boolean" })
      .notNull()
      .default(false),
    is_active: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => ({
    category_id_idx: index("products_category_id_idx").on(table.category_id),
    slug_idx: index("products_slug_idx").on(table.slug),
    is_active_idx: index("products_is_active_idx").on(table.is_active),
    deleted_at_idx: index("products_deleted_at_idx").on(table.deleted_at),
  })
);

export const product_images = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    is_primary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => ({
    product_id_idx: index("product_images_product_id_idx").on(
      table.product_id
    ),
  })
);

export const product_variants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label", { enum: ["250g", "500g", "1kg"] }).notNull(),
    weight_grams: integer("weight_grams").notNull(),
    price: integer("price").notNull(), // stored in rupees (integer)
    mrp: integer("mrp").notNull(), // stored in rupees (integer)
    stock: integer("stock").notNull().default(0),
    is_active: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => ({
    product_id_idx: index("product_variants_product_id_idx").on(
      table.product_id
    ),
  })
);

// ============ ORDERS ============

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    order_number: text("order_number").notNull().unique(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status", {
      enum: [
        "PENDING",
        "PAYMENT_CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
    })
      .notNull()
      .default("PENDING"),
    subtotal: integer("subtotal").notNull(), // rupees
    delivery_charge: integer("delivery_charge").notNull(), // rupees
    total: integer("total").notNull(), // rupees
    customer_name: text("customer_name").notNull(),
    customer_mobile: text("customer_mobile").notNull(),
    customer_address: text("customer_address").notNull(), // snapshot as text
    courier_name: text("courier_name"),
    tracking_id: text("tracking_id"),
    tracking_url: text("tracking_url"),
    admin_note: text("admin_note"),
    ...timestamps,
  },
  (table) => ({
    order_number_idx: index("orders_order_number_idx").on(table.order_number),
    user_id_idx: index("orders_user_id_idx").on(table.user_id),
    status_idx: index("orders_status_idx").on(table.status),
    created_at_idx: index("orders_created_at_idx").on(table.created_at),
  })
);

export const order_items = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: text("product_id").notNull(), // snapshot, not FK
    variant_id: text("variant_id").notNull(), // snapshot, not FK
    product_name: text("product_name").notNull(),
    variant_label: text("variant_label").notNull(),
    unit_price: integer("unit_price").notNull(), // rupees
    quantity: integer("quantity").notNull(),
    line_total: integer("line_total").notNull(), // rupees
    image_url: text("image_url"),
  },
  (table) => ({
    order_id_idx: index("order_items_order_id_idx").on(table.order_id),
  })
);

export const order_status_history = sqliteTable(
  "order_status_history",
  {
    id: text("id").primaryKey(),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: [
        "PENDING",
        "PAYMENT_CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
    }).notNull(),
    note: text("note"),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    order_id_idx: index("order_status_history_order_id_idx").on(
      table.order_id
    ),
  })
);

// ============ SETTINGS ============

export const settings = sqliteTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(), // JSON or plain text
    updated_at: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    key_idx: index("settings_key_idx").on(table.key),
  })
);

// ============ RATE LIMITING ============

export const rate_limits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), // e.g., "login:ip:192.168.1.1" or "register:email:user@example.com"
  count: integer("count").notNull().default(0),
  window_start: integer("window_start", { mode: "timestamp_ms" }).notNull(),
});

// ============ TYPES ============

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductImage = typeof product_images.$inferSelect;
export type InsertProductImage = typeof product_images.$inferInsert;
export type ProductVariant = typeof product_variants.$inferSelect;
export type InsertProductVariant = typeof product_variants.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof order_items.$inferSelect;
export type InsertOrderItem = typeof order_items.$inferInsert;
export type OrderStatusHistory = typeof order_status_history.$inferSelect;
export type InsertOrderStatusHistory = typeof order_status_history.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
export type PasswordResetToken = typeof password_reset_tokens.$inferSelect;
export type InsertPasswordResetToken = typeof password_reset_tokens.$inferInsert;

// Order status type for validation
export const ORDER_STATUSES = [
  "PENDING",
  "PAYMENT_CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
