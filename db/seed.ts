import bcrypt from "bcryptjs";
import { db, client } from "./client";
import {
  users,
  categories,
  products,
  product_images,
  product_variants,
  settings,
} from "./schema";
import { eq } from "drizzle-orm";

// Mock data inline (can't import .jpg files)
const mockCategories = [
  { slug: "makhana", name: "Makhana", nameHi: "मखाना", image: "/makhana.jpg" },
  { slug: "cashew", name: "Cashew", nameHi: "काजू", image: "/cashew.jpg" },
  { slug: "dried-grapes", name: "Dried Grapes", nameHi: "किशमिश", image: "/raisins.jpg" },
];

const mockProducts = [
  {
    id: "p1",
    slug: "premium-makhana",
    name: "Premium Makhana",
    nameHi: "प्रीमियम मखाना",
    category: "makhana",
    description: "Hand-picked 6-suta jumbo fox nuts from the wetlands of Mithila, Bihar. Light, airy and naturally gluten-free.",
    images: ["/makhana.jpg", "/makhana-roasted.jpg"],
    variants: [
      { id: "p1-250", label: "250g", price: 280, mrp: 350, stock: 40 },
      { id: "p1-500", label: "500g", price: 540, mrp: 680, stock: 30 },
      { id: "p1-1kg", label: "1kg", price: 1040, mrp: 1300, stock: 18 },
    ],
    rating: 4.9,
    reviews: 412,
    featured: true,
    active: true,
  },
  {
    id: "p2",
    slug: "roasted-makhana",
    name: "Roasted Masala Makhana",
    nameHi: "भुना मसाला मखाना",
    category: "makhana",
    description: "Slow-roasted in cold-pressed oil with a house blend of peri-peri, curry leaf and rock salt.",
    images: ["/makhana-roasted.jpg", "/makhana.jpg"],
    variants: [
      { id: "p2-250", label: "250g", price: 240, mrp: 299, stock: 25 },
      { id: "p2-500", label: "500g", price: 460, mrp: 560, stock: 12 },
      { id: "p2-1kg", label: "1kg", price: 880, mrp: 1080, stock: 4 },
    ],
    rating: 4.7,
    reviews: 238,
    featured: true,
    active: true,
  },
  {
    id: "p3",
    slug: "cashew-w320",
    name: "Cashew W320",
    nameHi: "काजू W320",
    category: "cashew",
    description: "Whole, ivory-white W320 grade cashews from Goa and Konkan. Creamy, buttery and crunch-perfect.",
    images: ["/cashew.jpg", "/hero.jpg"],
    variants: [
      { id: "p3-250", label: "250g", price: 399, mrp: 499, stock: 40 },
      { id: "p3-500", label: "500g", price: 780, mrp: 960, stock: 30 },
      { id: "p3-1kg", label: "1kg", price: 1499, mrp: 1850, stock: 18 },
    ],
    rating: 4.9,
    reviews: 586,
    featured: true,
    active: true,
  },
  {
    id: "p4",
    slug: "cashew-roasted-salted",
    name: "Cashew Roasted & Salted",
    nameHi: "भुने नमकीन काजू",
    category: "cashew",
    description: "Whole cashews roasted to a golden finish and kissed with Himalayan pink salt.",
    images: ["/cashew-roasted.jpg", "/cashew.jpg"],
    variants: [
      { id: "p4-250", label: "250g", price: 429, mrp: 520, stock: 40 },
      { id: "p4-500", label: "500g", price: 830, mrp: 1000, stock: 30 },
      { id: "p4-1kg", label: "1kg", price: 1599, mrp: 1950, stock: 18 },
    ],
    rating: 4.8,
    reviews: 301,
    featured: true,
    active: true,
  },
  {
    id: "p5",
    slug: "kishmish-green-raisins",
    name: "Kishmish Green Raisins",
    nameHi: "हरी किशमिश",
    category: "dried-grapes",
    description: "Long, plump Afghani-style green raisins shade-dried in Nashik. Naturally sweet and tangy.",
    images: ["/raisins.jpg", "/raisins-mix.jpg"],
    variants: [
      { id: "p5-250", label: "250g", price: 199, mrp: 260, stock: 40 },
      { id: "p5-500", label: "500g", price: 380, mrp: 490, stock: 30 },
      { id: "p5-1kg", label: "1kg", price: 720, mrp: 930, stock: 18 },
    ],
    rating: 4.8,
    reviews: 274,
    featured: true,
    active: true,
  },
  {
    id: "p6",
    slug: "black-raisins",
    name: "Black Raisins",
    nameHi: "काली किशमिश",
    category: "dried-grapes",
    description: "Seeded black raisins rich in iron and antioxidants, ideal soaked overnight.",
    images: ["/raisins-mix.jpg", "/raisins.jpg"],
    variants: [
      { id: "p6-250", label: "250g", price: 220, mrp: 280, stock: 40 },
      { id: "p6-500", label: "500g", price: 420, mrp: 540, stock: 30 },
      { id: "p6-1kg", label: "1kg", price: 799, mrp: 1020, stock: 18 },
    ],
    rating: 4.7,
    reviews: 156,
    featured: true,
    active: true,
  },
  {
    id: "p7",
    slug: "seedless-golden-raisins",
    name: "Seedless Golden Raisins",
    nameHi: "सुनहरी किशमिश",
    category: "dried-grapes",
    description: "Golden, seedless and juicy. A bright addition to kheer, pulao and morning oats.",
    images: ["/raisins-mix.jpg", "/hero.jpg"],
    variants: [
      { id: "p7-250", label: "250g", price: 210, mrp: 270, stock: 40 },
      { id: "p7-500", label: "500g", price: 400, mrp: 510, stock: 30 },
      { id: "p7-1kg", label: "1kg", price: 760, mrp: 980, stock: 18 },
    ],
    rating: 4.6,
    reviews: 128,
    featured: false,
    active: true,
  },
  {
    id: "p8",
    slug: "classic-makhana-jumbo",
    name: "Classic Jumbo Makhana",
    nameHi: "जंबो मखाना",
    category: "makhana",
    description: "Extra-large 5-suta grade fox nuts, popped fresh in small batches.",
    images: ["/makhana.jpg", "/hero.jpg"],
    variants: [
      { id: "p8-250", label: "250g", price: 260, mrp: 320, stock: 40 },
      { id: "p8-500", label: "500g", price: 499, mrp: 620, stock: 30 },
      { id: "p8-1kg", label: "1kg", price: 960, mrp: 1200, stock: 18 },
    ],
    rating: 4.8,
    reviews: 190,
    featured: false,
    active: true,
  },
] as const;

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // 1. Create admin user
    console.log("\n📝 Creating admin user...");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@pistara.com";
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "Admin@123";

    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        name: "Admin User",
        email: adminEmail,
        password_hash: passwordHash,
        role: "admin",
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }

    // 2. Create categories
    console.log("\n📁 Creating categories...");
    const categoryMap = new Map<string, string>(); // slug -> id

    for (const cat of mockCategories) {
      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, cat.slug))
        .limit(1);

      if (existing) {
        categoryMap.set(cat.slug, existing.id);
        console.log(`ℹ️  Category already exists: ${cat.name}`);
      } else {
        const id = crypto.randomUUID();
        await db.insert(categories).values({
          id,
          slug: cat.slug,
          name: cat.name,
          name_hi: cat.nameHi,
          image_url: cat.image,
          sort_order: mockCategories.indexOf(cat),
        });
        categoryMap.set(cat.slug, id);
        console.log(`✅ Created category: ${cat.name}`);
      }
    }

    // 3. Create products with images and variants
    console.log("\n📦 Creating products...");
    let productCount = 0;

    for (const product of mockProducts) {
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.slug, product.slug))
        .limit(1);

      if (existing) {
        console.log(`ℹ️  Product already exists: ${product.name}`);
        continue;
      }

      const categoryId = categoryMap.get(product.category);
      if (!categoryId) {
        console.warn(`⚠️  Category not found for product: ${product.name}`);
        continue;
      }

      // Create product
      const productId = crypto.randomUUID();
      await db.insert(products).values({
        id: productId,
        category_id: categoryId,
        slug: product.slug,
        name: product.name,
        name_hi: product.nameHi,
        description: product.description,
        description_hi: "", // Add if available
        benefits: null,
        rating: Math.round(product.rating * 10), // 4.9 -> 49
        review_count: product.reviews,
        is_featured: product.featured,
        is_active: product.active,
      });

      // Create images
      for (let i = 0; i < product.images.length; i++) {
        await db.insert(product_images).values({
          id: crypto.randomUUID(),
          product_id: productId,
          url: product.images[i],
          sort_order: i,
          is_primary: i === 0,
        });
      }

      // Create variants
      for (const variant of product.variants) {
        await db.insert(product_variants).values({
          id: variant.id, // Keep original ID for consistency
          product_id: productId,
          label: variant.label,
          weight_grams:
            variant.label === "250g"
              ? 250
              : variant.label === "500g"
                ? 500
                : 1000,
          price: variant.price,
          mrp: variant.mrp,
          stock: variant.stock,
          is_active: true,
        });
      }

      productCount++;
      console.log(`✅ Created product: ${product.name} with ${product.variants.length} variants`);
    }

    console.log(`\n✅ Created ${productCount} products`);

    // 4. Create default settings
    console.log("\n⚙️  Creating default settings...");
    const defaultSettings = [
      {
        key: "whatsapp_number",
        value: process.env.WHATSAPP_NUMBER || "919876543210",
      },
      { key: "delivery_charge", value: "50" },
      { key: "store_name", value: "Pistara" },
      { key: "contact_email", value: "hello@pistara.com" },
      { key: "contact_phone", value: "+91 98765 43210" },
      {
        key: "store_address",
        value: "123 Dry Fruits Lane, Mumbai, Maharashtra 400001",
      },
      {
        key: "hero_headline",
        value: "Nature's finest • Hand-selected",
      },
      {
        key: "hero_subtitle",
        value: "Premium dry fruits and fox nuts, sourced directly from farms",
      },
      {
        key: "announcement_text",
        value: "Free delivery on orders above ₹999",
      },
    ];

    for (const setting of defaultSettings) {
      const [existing] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existing) {
        console.log(`ℹ️  Setting already exists: ${setting.key}`);
      } else {
        await db.insert(settings).values(setting);
        console.log(`✅ Created setting: ${setting.key}`);
      }
    }

    console.log("\n🎉 Database seed completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Admin email: ${adminEmail}`);
    console.log(`   - Admin password: ${adminPassword}`);
    console.log(`   - Categories: ${mockCategories.length}`);
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Settings: ${defaultSettings.length}`);
    console.log("\n⚠️  IMPORTANT: Change the admin password after first login!");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

seed();
