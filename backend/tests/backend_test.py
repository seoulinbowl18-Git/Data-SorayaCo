"""Backend API tests for Soraya.Co (rebrand from BRODO).

Covers:
- GET /api/products (all 7 products, categories array, currency=idr)
- GET /api/products?category=<x> filtering (positive and empty tag-based)
- GET /api/products/{id} - 35 variant product
- POST /api/checkout/session with variant+size (IDR)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- /api/products (list) ----
class TestProducts:
    def test_list_all_products(self, api):
        r = api.get(f"{BASE_URL}/api/products", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7, f"Expected 7 products, got {len(data)}"
        for p in data:
            assert isinstance(p.get("categories"), list), f"product {p.get('id')} missing categories array"
            assert p.get("currency") == "idr", f"product {p.get('id')} currency != idr"

    def test_filter_atasan(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "atasan"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "oversize-blouse-motif"

    def test_filter_blouse(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "blouse"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "blouse-kancing-depan"

    def test_filter_tunik_rayon(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "tunik-rayon"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "tunik-rayon-maroon-polos"

    def test_filter_gamis_maxy(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "gamis-maxy"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "gamis-maxy-motif-bunga"

    def test_filter_midi_dress(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "midi-dress"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "midi-dress-rayon-polos"

    def test_filter_setelan(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "setelan"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "setelan-kulot-rayon"

    def test_filter_pyajamas(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "pyajamas"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["id"] == "piyama-set-katun-motif"

    def test_filter_best_seller_empty(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "best-seller"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_promo_empty(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "promo"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_reseller_empty(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "reseller"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_all_returns_all(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "all"}, timeout=15)
        assert r.status_code == 200
        assert len(r.json()) == 7


# ---- /api/products/{id} - variant product ----
class TestOversizeBlouseVariants:
    def test_35_variants(self, api):
        r = api.get(f"{BASE_URL}/api/products/oversize-blouse-motif", timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == "oversize-blouse-motif"
        assert p["price"] == 79000
        assert p["currency"] == "idr"
        assert p["sizes"] == ["One Size"]
        assert p["categories"] == ["atasan"]
        variants = p.get("variants", [])
        assert len(variants) == 35, f"expected 35 variants, got {len(variants)}"
        skus = {v["sku"] for v in variants}
        expected_skus = {f"TRM-004-{i}" for i in range(1, 36)}
        assert skus == expected_skus, f"Missing SKUs: {expected_skus - skus}"
        for v in variants:
            assert v["stock"] == 50, f"variant {v['sku']} stock != 50 (got {v['stock']})"

    def test_get_404_unknown(self, api):
        r = api.get(f"{BASE_URL}/api/products/nonexistent-xyz", timeout=15)
        assert r.status_code == 404


# ---- /api/checkout/session ----
class TestCheckoutSession:
    def test_checkout_with_variant_and_size(self, api):
        payload = {
            "items": [
                {
                    "product_id": "oversize-blouse-motif",
                    "quantity": 2,
                    "variant": "Mika Grey",
                    "size": "One Size",
                }
            ],
            "email": "TEST_buyer@example.com",
        }
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=30)
        assert r.status_code == 200, f"got {r.status_code}: {r.text}"
        data = r.json()
        assert "checkout_url" in data
        assert data["checkout_url"].startswith("https://"), f"bad checkout_url: {data['checkout_url']}"
        assert "order_id" in data
        assert "session_id" in data

        # Verify order persisted with IDR currency
        order_id = data["order_id"]
        r2 = api.get(f"{BASE_URL}/api/orders/{order_id}", timeout=15)
        assert r2.status_code == 200
        order = r2.json()
        assert order["currency"] == "idr"
        assert order["total"] == 79000 * 2
        assert order["items"][0]["variant"] == "Mika Grey"
        assert order["items"][0]["size"] == "One Size"

    def test_checkout_bad_product(self, api):
        payload = {"items": [{"product_id": "does-not-exist", "quantity": 1}]}
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=15)
        assert r.status_code == 400

    def test_checkout_empty_items(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/session", json={"items": []}, timeout=15)
        assert r.status_code == 422
