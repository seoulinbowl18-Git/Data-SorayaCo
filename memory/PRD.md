# BRODO. — Minimalist Fashion E-commerce (Mobile MVP)

## Product Goal
A premium, minimalist masculine fashion e-commerce mobile app (inspired by bro.do) built in React Native (Expo) with a FastAPI + MongoDB backend and Stripe checkout.

## Design Language
- White surface, charcoal text, solid black accents (no gradients on flat UI, only on hero image scrim)
- Bottom tab navigation: Shop · Cart · Menu
- 4:5 product cards, 2-col grids, pill category filter, sticky "Add to Cart" on product detail

## Features Implemented (MVP v1)
- Home / landing screen with sticky header, hero banner + "Shop Now" CTA, category pills, featured categories grid, product grid, footer (About/Contact/Track Order, social, payments)
- Cart context persisted via AsyncStorage
- Cart tab with qty controls, subtotal, "Checkout with Stripe"
- Product detail screen with sticky Add to Cart
- Menu screen (About Us, Contact, Track Order, social, payments)
- Live cart counter badge on both header cart icon AND bottom-tab Cart icon
- Backend `/api/products`, `/api/products/{id}`, `/api/checkout/session`, `/api/checkout/success`, `/api/checkout/cancel`, `/api/orders/{id}`
- Stripe integration via `emergentintegrations` (Emergent-managed test key)
- Auto-seeded 8 products across sneakers/boots/loafers/apparel

## Integrations
- Stripe (Emergent-managed test key `sk_test_emergent`) — hosted checkout session, opens in system browser on native / redirects on web

## Not in scope (v1)
- User authentication (guest-only checkout)
- Order history / status polling from client
- Webhook-based fulfillment (current success route marks paid — fine for demo)
