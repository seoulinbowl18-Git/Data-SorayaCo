from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import secrets
import uuid
import httpx
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutError,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe (Emergent-managed)
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# -------- Models --------
class Variant(BaseModel):
    name: str
    sku: str
    stock: int
    image: Optional[str] = None


class Product(BaseModel):
    id: str
    name: str
    categories: List[str]  # e.g. ["atasan"] or ["blouse", "best-seller"]
    image: str
    price: int  # whole rupiah (IDR is zero-decimal)
    original_price: Optional[int] = None
    description: str
    currency: str = "idr"
    sizes: List[str] = []
    sku: Optional[str] = None
    stock: Optional[int] = None
    variants: List[Variant] = []


class ProductPatch(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    original_price: Optional[int] = None
    stock: Optional[int] = None
    categories: Optional[List[str]] = None
    description: Optional[str] = None
    image: Optional[str] = None
    sizes: Optional[List[str]] = None
    variants: Optional[List[Variant]] = None


class Category(BaseModel):
    key: str
    label: str
    image: Optional[str] = None


class CartItem(BaseModel):
    product_id: str = Field(min_length=1)
    quantity: int = Field(gt=0, le=99)
    variant: Optional[str] = None
    size: Optional[str] = None


class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(min_length=1)
    email: Optional[str] = None


# -------- Seed data (Soraya.Co) --------
# Media served from /api/media (see StaticFiles mount).
# Base is derived from APP_URL / PUBLIC_API_URL at request time so it works in
# both preview and production without redeploy — but for baked-in URLs we use
# the RELATIVE path prefixed with the media route. Frontend concatenates with
# EXPO_PUBLIC_BACKEND_URL, so we store absolute-from-host paths starting with
# "/api/media/..." and let the app prepend the API host.
PLACEHOLDER_IMG = "https://placehold.co/800x1000/EAEAEA/1A1A1A?text=Soraya.Co"


def media(path: str) -> str:
    """Relative URL under /api/media/... — the app prepends its API host."""
    return f"/api/media/{path}"


OVERSIZE_BLOUSE_VARIANT_NAMES = [
    "Mika Grey", "Mika Dusty", "Nona Magenta", "Wilona", "Polka Hitam",
    "Aisha", "Freesia", "Shofia", "Lyodra", "Mawar",
    "Leona", "Tamara", "Alana", "Lila", "Selina",
    "Kamila", "Yura", "Sarah", "Marbel", "Naomi",
    "Ferosa", "Sora Cream", "Iris", "Marlen", "Mesya",
    "Clara", "Agnes", "Cunda", "Ameena", "Sania",
    "Marigold", "Sunflower", "Tulip", "Riyuki", "Aluna",
]

# Category cover images (from Category App Android.xlsx).
CATEGORY_COVERS: Dict[str, str] = {
    "atasan": "category/atasan.jpg",
    "blouse": "category/blouse.jpg",
    "tunik-rayon": "category/tunik-rayon.jpg",
    "gamis-maxy": "category/gamis-maxy.jpg",
    "midi-dress": "category/midi-dress.jpg",
    "setelan": "category/setelan.jpg",
    "best-seller": "category/best-seller.jpg",
    "pyajamas": "category/pyajamas.jpg",
    "promo": "category/promo.png",
    "reseller": "category/reseller.png",
}

CATEGORY_LABELS: List[tuple] = [
    ("atasan", "Atasan (Top)"),
    ("blouse", "Blouse"),
    ("tunik-rayon", "Tunik Rayon"),
    ("gamis-maxy", "Gamis Maxy"),
    ("midi-dress", "Midi Dress"),
    ("setelan", "Setelan"),
    ("best-seller", "Best Seller"),
    ("pyajamas", "Pyajamas"),
    ("promo", "Promo"),
    ("reseller", "Reseller"),
]


def build_seed_products() -> List[dict]:
    # Each of the 35 variants has its own image at product/<sku>.jpg
    variants = [
        {
            "name": name,
            "sku": f"TRM-004-{i + 1}",
            "stock": 50,
            "image": media(f"product/TRM-004-{i + 1}.jpg"),
        }
        for i, name in enumerate(OVERSIZE_BLOUSE_VARIANT_NAMES)
    ]
    return [
        {
            "id": "oversize-blouse-motif",
            "name": "Oversize Blouse Motif - Atasan Rayon Full Kancing Jumbo / Kemeja",
            "categories": ["atasan"],
            # Cover uses the first variant's image so the grid card looks like a real product.
            "image": media("product/TRM-004-1.jpg"),
            "price": 79000,
            "original_price": None,
            "description": (
                "Kemeja oversize bahan rayon Uniqlo. Lingkar dada baju 130cm, "
                "panjang baju depan \u00b170cm, panjang baju belakang \u00b180cm, "
                "lingkar ketiak \u00b155cm."
            ),
            "currency": "idr",
            "sizes": ["One Size"],
            "sku": None,
            "stock": None,
            "variants": variants,
        },
        {
            "id": "blouse-kancing-depan",
            "name": "Alysa Blouse - Atasan Wanita Rayon Motif Kerah Shanghai",
            "categories": ["blouse"],
            "image": media("product/BKD-001.jpg"),
            "price": 89000,
            "original_price": None,
            "description": (
                "Bahan: Rayon Premium\n"
                "Tersedia 3 ukuran:\n"
                "\u2022 Standar (L) — LD 110 cm\n"
                "\u2022 Jumbo (XL) — LD 120 cm\n"
                "\u2022 Super Jumbo (XXL) — LD 130 cm\n"
                "Model: Kerah Shanghai\n"
                "Pergelangan tangan model terompet.\n"
                "\n"
                "Berat produk 200 gram. Dimensi paket 3\u202fcm x 3\u202fcm x 3\u202fcm."
            ),
            "currency": "idr",
            "sizes": ["L", "XL", "XXL"],
            "sku": None,
            "stock": None,
            "variants": [
                {"name": "LB. Alysa",       "sku": "BKD-001", "stock": 60, "image": media("product/BKD-001.jpg")},
                {"name": "LB. Erica",       "sku": "BKD-002", "stock": 60, "image": media("product/BKD-002.jpg")},
                {"name": "LB. Lavender",    "sku": "BKD-003", "stock": 60, "image": media("product/BKD-003.jpg")},
                {"name": "LB. Tiara",       "sku": "BKD-004", "stock": 60, "image": media("product/BKD-004.jpg")},
                {"name": "LB. Luna Black",  "sku": "BKD-005", "stock": 60, "image": media("product/BKD-005.jpg")},
                {"name": "LB. Saskia",      "sku": "BKD-006", "stock": 60, "image": media("product/BKD-006.jpg")},
            ],
        },
        {
            "id": "tunik-rayon-maroon-polos",
            "name": "Tunik Rayon Maroon Polos",
            "categories": ["tunik-rayon"],
            "image": PLACEHOLDER_IMG,
            "price": 129000,
            "original_price": None,
            "description": "Bahan rayon adem, cocok dipakai harian, tersedia 5 warna.",
            "currency": "idr",
            "sizes": ["All Size (Fit L)"],
            "sku": "TRM-001",
            "stock": 45,
            "variants": [],
        },
        {
            "id": "gamis-maxy-motif-bunga",
            "name": "Gamis Maxy Motif Bunga",
            "categories": ["gamis-maxy"],
            "image": PLACEHOLDER_IMG,
            "price": 189000,
            "original_price": None,
            "description": "Motif bunga eksklusif, lengan panjang, resleting depan.",
            "currency": "idr",
            "sizes": ["L", "XL", "XXL"],
            "sku": "GMB-014",
            "stock": 20,
            "variants": [],
        },
        {
            "id": "midi-dress-rayon-polos",
            "name": "Midi Dress Rayon Polos",
            "categories": ["midi-dress"],
            "image": PLACEHOLDER_IMG,
            "price": 145000,
            "original_price": None,
            "description": "Model midi, cocok acara formal maupun santai.",
            "currency": "idr",
            "sizes": ["All Size"],
            "sku": "MDR-022",
            "stock": 15,
            "variants": [],
        },
        {
            "id": "setelan-kulot-rayon",
            "name": "Setelan Kulot Rayon",
            "categories": ["setelan"],
            "image": PLACEHOLDER_IMG,
            "price": 175000,
            "original_price": None,
            "description": "Set atasan + kulot, bahan rayon premium.",
            "currency": "idr",
            "sizes": ["M", "L", "XL"],
            "sku": "SKR-003",
            "stock": 30,
            "variants": [],
        },
        {
            "id": "piyama-set-katun-motif",
            "name": "Piyama Set Katun Motif",
            "categories": ["pyajamas"],
            "image": PLACEHOLDER_IMG,
            "price": 99000,
            "original_price": None,
            "description": "Piyama set atasan + celana, bahan katun lembut.",
            "currency": "idr",
            "sizes": ["All Size"],
            "sku": "PSK-005",
            "stock": 25,
            "variants": [],
        },
    ]


async def seed_products():
    # Migration: drop old-schema products (single `category` field) once.
    await db.products.delete_many({"categories": {"$exists": False}})
    # Force reseed if products don't have real image URLs yet (e.g. still on placeholder).
    stale = await db.products.count_documents({"id": "oversize-blouse-motif", "image": PLACEHOLDER_IMG})
    if stale:
        await db.products.delete_many({"id": {"$in": [p["id"] for p in build_seed_products()]}})
    count = await db.products.count_documents({})
    if count == 0:
        await db.products.insert_many([dict(p) for p in build_seed_products()])
        logger_init.info("Seeded Soraya.Co products with real images")
    # Ensure indexes
    await db.orders.create_index("order_id", unique=True)
    await db.stripe_events.create_index("event_id", unique=True)
    # Auth indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)


# -------- Auth --------
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class SessionExchangeRequest(BaseModel):
    session_id: str = Field(min_length=1)


class UserOut(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(None, 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Invalid session")
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# -------- Routes --------
@api_router.get("/")
async def root():
    return {"message": "Soraya.Co API"}


@api_router.get("/products", response_model=List[Product])
async def list_products(category: Optional[str] = None):
    query = {}
    if category and category.lower() != "all":
        # `categories` is an array — match any product where the tag is present.
        query["categories"] = category.lower()
    cursor = db.products.find(query, {"_id": 0})
    return [Product(**doc) async for doc in cursor]


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")
    return Product(**doc)


@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    return [
        Category(key=key, label=label, image=media(CATEGORY_COVERS[key]))
        for key, label in CATEGORY_LABELS
    ]


# -------- Admin --------
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "sorayaco-admin")


def require_admin(x_admin_secret: Optional[str] = Header(None)):
    if not x_admin_secret or x_admin_secret != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized admin")


@api_router.post("/admin/verify")
async def admin_verify(x_admin_secret: Optional[str] = Header(None)):
    require_admin(x_admin_secret)
    return {"ok": True}


@api_router.patch("/admin/products/{product_id}", response_model=Product)
async def admin_update_product(
    product_id: str,
    patch: ProductPatch,
    x_admin_secret: Optional[str] = Header(None),
):
    require_admin(x_admin_secret)
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.products.find_one_and_update(
        {"id": product_id},
        {"$set": updates},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(404, "Product not found")
    return Product(**result)


@api_router.post("/checkout/session")
async def create_checkout_session(payload: CheckoutRequest, request: Request):
    ids = [x.product_id for x in payload.items]
    products_cursor = db.products.find({"id": {"$in": ids}}, {"_id": 0})
    products_map = {p["id"]: p async for p in products_cursor}

    if len(products_map) != len(set(ids)):
        raise HTTPException(400, "One or more products are unavailable")

    order_id = f"ord_{secrets.token_urlsafe(10)}"
    total = 0
    order_items = []
    currency = "idr"
    for it in payload.items:
        p = products_map[it.product_id]
        unit_amount = int(p["price"])
        currency = p.get("currency", "idr").lower()
        total += unit_amount * it.quantity
        order_items.append({
            "product_id": p["id"],
            "name": p["name"],
            "unit_amount": unit_amount,
            "currency": currency,
            "quantity": it.quantity,
            "variant": it.variant,
            "size": it.size,
        })

    # Base URL from request (public preview URL). Falls back to env if configured.
    base_url = os.environ.get("PUBLIC_API_URL") or os.environ.get("APP_URL") or str(request.base_url).rstrip("/")

    await db.orders.insert_one({
        "order_id": order_id,
        "status": "pending",
        "items": order_items,
        "total": total,
        "currency": currency,
        "email": payload.email,
        "created_at": datetime.now(timezone.utc),
    })

    try:
        checkout = StripeCheckout(api_key=STRIPE_API_KEY)
        # IDR is zero-decimal on Stripe (min unit = 1 IDR).
        # emergentintegrations takes the human-readable amount and applies
        # currency-appropriate handling internally.
        stripe_amount = float(total)
        session_req = CheckoutSessionRequest(
            amount=stripe_amount,
            currency=currency,
            metadata={"order_id": order_id, "source": "soraya-co-app"},
            success_url=f"{base_url}/api/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}",
            cancel_url=f"{base_url}/api/checkout/cancel?order_id={order_id}",
        )
        session = await checkout.create_checkout_session(session_req)
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"stripe_session_id": session.session_id}}
        )
        return {"order_id": order_id, "checkout_url": session.url, "session_id": session.session_id}
    except CheckoutError as e:
        await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "checkout_error"}})
        logger_init.error(f"Stripe error: {e}")
        raise HTTPException(502, f"Unable to start checkout: {e}")


@api_router.get("/checkout/success", response_class=HTMLResponse)
async def checkout_success(session_id: Optional[str] = None, order_id: Optional[str] = None):
    if order_id:
        await db.orders.find_one_and_update(
            {"order_id": order_id, "status": {"$ne": "paid"}},
            {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc)}},
        )
    return HTMLResponse(
        """
        <html><head><meta name='viewport' content='width=device-width,initial-scale=1'>
        <title>Payment Complete</title></head>
        <body style='font-family:-apple-system,system-ui,sans-serif;background:#fff;color:#111;padding:48px 24px;text-align:center'>
        <div style='max-width:420px;margin:0 auto'>
        <div style='font-size:64px'>✓</div>
        <h1 style='font-weight:800;font-size:28px;margin:16px 0 8px'>Payment received</h1>
        <p style='color:#555;margin:0 0 32px'>Terima kasih sudah berbelanja di Soraya.Co. Silakan kembali ke aplikasi.</p>
        <a href='#' onclick='window.close();return false' style='display:inline-block;background:#000;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700'>Close</a>
        </div></body></html>
        """
    )


@api_router.get("/checkout/cancel", response_class=HTMLResponse)
async def checkout_cancel(order_id: Optional[str] = None):
    return HTMLResponse(
        """
        <html><body style='font-family:-apple-system,system-ui,sans-serif;background:#fff;color:#111;padding:48px 24px;text-align:center'>
        <h1 style='font-weight:800'>Checkout cancelled</h1>
        <p>You can return to the app to continue shopping.</p>
        </body></html>
        """
    )


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    doc = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Order not found")
    # Serialize datetime
    for k in ("created_at", "paid_at"):
        if k in doc and isinstance(doc[k], datetime):
            doc[k] = doc[k].isoformat()
    return doc


# -------- Auth endpoints --------
@api_router.post("/auth/session")
async def exchange_session(payload: SessionExchangeRequest):
    """Exchange a one-time Emergent session_id for a 7-day session_token."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": payload.session_id},
            )
    except httpx.HTTPError as e:
        logger_init.error(f"Emergent auth network error: {e}")
        raise HTTPException(401, "Auth service unreachable")

    if resp.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")

    data = resp.json()
    email = (data.get("email") or "").lower()
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(401, "Malformed auth response")

    # Upsert user by email, reuse user_id if exists
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": datetime.now(timezone.utc)}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc),
            "last_login": datetime.now(timezone.utc),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    })

    return {
        "session_token": session_token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
        },
    }


@api_router.get("/auth/me", response_model=UserOut)
async def auth_me(user: dict = None, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return UserOut(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture"),
    )


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(None, 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# Include the router in the main app
app.include_router(api_router)

# Static media (product & category images) served under /api/media.
# Path is relative to this file's parent so it works regardless of CWD.
_MEDIA_DIR = ROOT_DIR / "static" / "media"
_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/media", StaticFiles(directory=str(_MEDIA_DIR)), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger_init = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_products()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
