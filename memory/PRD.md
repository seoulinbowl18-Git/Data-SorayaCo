# Soraya.Co — Indonesian Rayon Fashion E-commerce (Mobile MVP)

## Product Goal
Premium yet approachable Indonesian women's fashion app (rayon collections, blouses, gamis, midi dress, setelan, piyama, dsb.) built in React Native (Expo SDK 57) with FastAPI + MongoDB backend and Stripe checkout in IDR.

## Design Language
- White surface, charcoal text, solid black accents
- Bottom tab navigation: Shop · Cart · Menu
- 2-column product grid, horizontal pill category filter, sticky "Tambah ke Keranjang" on product detail

## Features
- Home: sticky header with brand logo (Soraya.Co), hero banner + "Belanja Sekarang" CTA, 11-pill category filter (with tag-based collections), 2-col featured categories, product grid, empty-state per category
- Product detail: variant picker (up to 35 chips scrollable), size picker, SKU + stock indicator per selection, sticky Add to Cart
- Cart: composite key (product + variant + size) — different variants of same product are separate lines
- Menu: About / Contact / Track Order / social / 9 payment badges
- Cart badge on both header + bottom tab (live)
- IDR pricing formatted `Rp79.000`
- Stripe hosted checkout in IDR currency (test mode via Emergent-managed key)

## Categories / Tags
Order: All, Atasan (Top), Blouse, Tunik Rayon, Gamis Maxy, Midi Dress, Setelan, Best Seller, Pyajamas, Promo, Reseller.
`Best Seller`, `Promo`, `Reseller` are tag-based collections; each product's `categories` array can hold multiple values, so a product can appear in "Atasan (Top)" AND "Best Seller" simultaneously once tagged.

## Payment methods (badges only, visual)
QRIS · BCA · BRI · BNI · Mandiri · DANA · GoPay · OVO · ShopeePay

## Data model (products collection)
```
id, name, categories: string[], image, price (int rupiah), original_price?,
description, currency: "idr", sizes: string[], sku?, stock?, variants: [{name, sku, stock}]
```

## Integrations
- Stripe hosted checkout via `emergentintegrations` (IDR currency)
- Cart persisted in AsyncStorage
- Icons via `@react-native-vector-icons/ionicons` (Expo SDK 57 compatible)

## Not in scope (v1)
- Auth (guest checkout only — Google Auth scaffolding present but not wired)
- Real Stripe webhooks
- Admin panel for merchant to tag products (Best Seller/Promo/Reseller) — flip `categories` array in Mongo for now
