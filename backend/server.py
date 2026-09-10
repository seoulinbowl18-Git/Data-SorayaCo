from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
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
class Product(BaseModel):
    id: str
    name: str
    category: str  # sneakers | boots | loafers | apparel
    image: str
    price: int  # cents (IDR uses whole numbers, but keep cents for stripe -> using USD)
    original_price: Optional[int] = None
    description: str
    currency: str = "usd"


class CartItem(BaseModel):
    product_id: str = Field(min_length=1)
    quantity: int = Field(gt=0, le=99)


class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(min_length=1)
    email: Optional[str] = None


# -------- Seed data --------
SEED_PRODUCTS: List[dict] = [
    {
        "id": "ace-nova-dark-brown",
        "name": "Ace Nova Dark Brown",
        "category": "sneakers",
        "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 4900,
        "original_price": 6500,
        "description": "A refined take on the classic runner. Full-grain leather upper with a cushioned insole for all-day comfort.",
        "currency": "usd",
    },
    {
        "id": "ranger-boot-black",
        "name": "Ranger Boot Black",
        "category": "boots",
        "image": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 8900,
        "original_price": None,
        "description": "Rugged silhouette meets clean lines. Water-resistant leather and lugged rubber outsole.",
        "currency": "usd",
    },
    {
        "id": "milan-penny-loafer",
        "name": "Milan Penny Loafer",
        "category": "loafers",
        "image": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 7200,
        "original_price": 9000,
        "description": "Hand-stitched premium leather loafer with a moc-toe finish. Timeless.",
        "currency": "usd",
    },
    {
        "id": "core-heavy-tee",
        "name": "Core Heavy Tee",
        "category": "apparel",
        "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 3500,
        "original_price": 4500,
        "description": "Heavyweight 240gsm cotton tee. Boxy relaxed fit for everyday wear.",
        "currency": "usd",
    },
    {
        "id": "runner-onyx",
        "name": "Runner Onyx",
        "category": "sneakers",
        "image": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 5600,
        "original_price": None,
        "description": "All-black low-top sneaker made for the daily grind.",
        "currency": "usd",
    },
    {
        "id": "chelsea-tan",
        "name": "Chelsea Tan",
        "category": "boots",
        "image": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 7900,
        "original_price": 9500,
        "description": "Elastic-sided Chelsea boot in soft tan leather. A wardrobe staple.",
        "currency": "usd",
    },
    {
        "id": "harbor-loafer-navy",
        "name": "Harbor Loafer Navy",
        "category": "loafers",
        "image": "https://images.unsplash.com/photo-1613987245117-50933bcb3240?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 6800,
        "original_price": None,
        "description": "Suede horsebit loafer in deep navy. Business meets casual.",
        "currency": "usd",
    },
    {
        "id": "overshirt-charcoal",
        "name": "Overshirt Charcoal",
        "category": "apparel",
        "image": "https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "price": 6200,
        "original_price": 7900,
        "description": "Structured cotton twill overshirt. Layer over tees and knits.",
        "currency": "usd",
    },
]


async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        await db.products.insert_many([dict(p) for p in SEED_PRODUCTS])
        logger_init.info(f"Seeded {len(SEED_PRODUCTS)} products")
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
    return {"message": "BroDo Style API"}


@api_router.get("/products", response_model=List[Product])
async def list_products(category: Optional[str] = None):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category.lower()
    cursor = db.products.find(query, {"_id": 0})
    return [Product(**doc) async for doc in cursor]


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")
    return Product(**doc)


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
    for it in payload.items:
        p = products_map[it.product_id]
        unit_amount = int(p["price"])
        currency = p["currency"].lower()
        total += unit_amount * it.quantity
        order_items.append({
            "product_id": p["id"],
            "name": p["name"],
            "unit_amount": unit_amount,
            "currency": currency,
            "quantity": it.quantity,
        })

    # Base URL from request (public preview URL). Falls back to env if configured.
    base_url = os.environ.get("PUBLIC_API_URL") or os.environ.get("APP_URL") or str(request.base_url).rstrip("/")

    await db.orders.insert_one({
        "order_id": order_id,
        "status": "pending",
        "items": order_items,
        "total": total,
        "email": payload.email,
        "created_at": datetime.now(timezone.utc),
    })

    try:
        checkout = StripeCheckout(api_key=STRIPE_API_KEY)
        session_req = CheckoutSessionRequest(
            amount=total / 100.0,  # emergentintegrations expects float dollars
            currency="usd",
            metadata={"order_id": order_id, "source": "brodo-app"},
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
        <p style='color:#555;margin:0 0 32px'>Thanks for shopping with BroDo. You can now return to the app.</p>
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
