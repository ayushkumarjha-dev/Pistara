## Project rules
- All catalog/order data access goes through async functions in src/lib/api.ts backed by src/data; keeps the mock swappable for a real backend.
- Cart, language and (later) mock auth/orders persist in localStorage, read only inside useEffect to avoid hydration mismatches.
- Storefront chrome (header, footer, cart drawer, WhatsApp button) lives in src/components/shop/SiteLayout, mounted from __root.
