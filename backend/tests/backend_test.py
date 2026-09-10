"""Backend tests for BroDo e-commerce API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://style-commerce-app-5.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Products ----
class TestProducts:
    def test_list_products_returns_8(self, client):
        r = client.get(f"{BASE_URL}/api/products", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"Expected 8 products, got {len(data)}"
        # validate schema
        required = {"id", "name", "price", "image", "description", "category"}
        for p in data:
            assert required.issubset(p.keys()), f"Missing fields: {required - p.keys()}"

    def test_filter_by_sneakers(self, client):
        r = client.get(f"{BASE_URL}/api/products", params={"category": "sneakers"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all(p["category"] == "sneakers" for p in data)

    def test_filter_by_boots(self, client):
        r = client.get(f"{BASE_URL}/api/products", params={"category": "boots"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert all(p["category"] == "boots" for p in data)
        assert len(data) >= 1

    def test_get_product_by_id(self, client):
        r = client.get(f"{BASE_URL}/api/products/ace-nova-dark-brown", timeout=30)
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == "ace-nova-dark-brown"
        assert p["category"] == "sneakers"
        assert p["price"] == 4900
        for f in ("id", "name", "price", "image", "description", "category"):
            assert f in p

    def test_get_product_not_found(self, client):
        r = client.get(f"{BASE_URL}/api/products/does-not-exist", timeout=30)
        assert r.status_code == 404


# ---- Checkout ----
class TestCheckout:
    def test_create_checkout_session_valid(self, client):
        payload = {"items": [{"product_id": "ace-nova-dark-brown", "quantity": 1},
                             {"product_id": "runner-onyx", "quantity": 2}]}
        r = client.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "checkout_url" in data
        assert data["checkout_url"].startswith("http")
        assert "order_id" in data
        assert "session_id" in data
        # Verify order was persisted
        oid = data["order_id"]
        og = client.get(f"{BASE_URL}/api/orders/{oid}", timeout=30)
        assert og.status_code == 200
        order = og.json()
        assert order["order_id"] == oid
        assert order["total"] == 4900 * 1 + 5600 * 2

    def test_create_checkout_session_invalid_product(self, client):
        payload = {"items": [{"product_id": "not-a-real-product", "quantity": 1}]}
        r = client.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=30)
        assert r.status_code == 400, r.text

    def test_create_checkout_session_empty_items(self, client):
        r = client.post(f"{BASE_URL}/api/checkout/session", json={"items": []}, timeout=30)
        assert r.status_code == 422
