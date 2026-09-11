# Soraya.Co — Indonesian Rayon Fashion E-commerce (Mobile MVP)

## Product Goal
Premium yet approachable Indonesian women's fashion app (rayon collections, blouses, gamis, midi dress, setelan, piyama, dsb.) built in React Native (Expo SDK 57) with FastAPI + MongoDB backend and Stripe checkout in IDR.

## Screens
- **Home** — sticky header, hero + CTA, 11-pill category filter, dynamic Featured Categories grid (from `/api/categories`), product grid, IDR pricing, empty state per category
- **Product Detail** — image swaps per selected variant, up to 35 variant chips, size picker, SKU/stock per selection, sticky Add to Cart
- **Cart** — composite key (product + variant + size), each variant is a separate line, subtotal, checkout with Stripe (IDR)
- **Menu** — About / Contact / Track Order / Shipping / FAQ / **Admin Panel**
- **Admin** — password-gated screen (`/admin`), lists all products with expand-to-edit for name, price, stock, categories/tags. Uses `X-Admin-Secret` header. Default secret: `sorayaco-admin` (change via env `ADMIN_SECRET`).

## Data model (`products` collection)
```
id, name, categories: string[], image, price (int rupiah), original_price?,
description, currency: "idr", sizes: string[], sku?, stock?,
variants: [{name, sku, stock, image?}]
```

## Categories / Tags
Order: All, Atasan (Top), Blouse, Tunik Rayon, Gamis Maxy, Midi Dress, Setelan, Best Seller, Pyajamas, Promo, Reseller.
`Best Seller`, `Promo`, `Reseller` are tag-based collections; the merchant flags products via Admin Panel (add the tag to a product's `categories` array).

## Media
- 10 category cover photos + 35 Oversize Blouse Motif variant photos extracted from user spreadsheets, served from `/app/backend/static/media/` under `/api/media/`
- Frontend uses `resolveImage()` helper — relative `/api/media/...` paths are auto-prefixed with the API host

## Payments (badges only)
QRIS · BCA · BRI · BNI · Mandiri · DANA · GoPay · OVO · ShopeePay
Actual charge flow: Stripe hosted checkout in IDR (test key via `emergentintegrations`).

## Admin API
- `POST /api/admin/verify` — validates the secret (used by the gate)
- `PATCH /api/admin/products/{id}` — partial update: `name`, `price`, `original_price`, `stock`, `categories`, `description`, `image`, `sizes`
- Header: `X-Admin-Secret: sorayaco-admin`

## Not in scope (v1)
- Per-variant stock/name edit in admin (only top-level product fields)
- Image upload from admin (image URL editable, but no file picker yet)
- Auth for shoppers (guest checkout; Google Auth scaffolding exists)
- Real Stripe webhooks (success page marks paid; fine for demo)
- Shipping address & ongkir
