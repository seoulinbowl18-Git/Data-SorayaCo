"""Backend API tests for iteration 3 features:
- /api/media static file serving (products + categories)
- /api/categories ordering + image paths
- /api/admin/verify auth
- /api/admin/products/{id} PATCH auth + updates + best-seller round-trip
- oversize-blouse-motif variants have per-variant image URLs
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
ADMIN_SECRET = "sorayaco-admin"

EXPECTED_CATEGORY_ORDER = [
    "atasan", "blouse", "tunik-rayon", "gamis-maxy", "midi-dress",
    "setelan", "best-seller", "pyajamas", "promo", "reseller",
]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    return s


# ---- /api/media static files ----
class TestMediaStatic:
    def test_all_35_product_images_served(self, api):
        failures = []
        for i in range(1, 36):
            url = f"{BASE_URL}/api/media/product/TRM-004-{i}.jpg"
            r = api.get(url, timeout=10)
            if r.status_code != 200:
                failures.append((url, r.status_code))
                continue
            ct = r.headers.get("content-type", "")
            if "image" not in ct:
                failures.append((url, f"bad content-type: {ct}"))
        assert not failures, f"broken product images: {failures[:5]}..."

    def test_10_category_images_served(self, api):
        exts = {
            "atasan": "jpg", "blouse": "jpg", "tunik-rayon": "jpg",
            "gamis-maxy": "jpg", "midi-dress": "jpg", "setelan": "jpg",
            "best-seller": "jpg", "pyajamas": "jpg",
            "promo": "png", "reseller": "png",
        }
        for key, ext in exts.items():
            url = f"{BASE_URL}/api/media/category/{key}.{ext}"
            r = api.get(url, timeout=10)
            assert r.status_code == 200, f"{url} => {r.status_code}"
            assert "image" in r.headers.get("content-type", ""), url


# ---- /api/categories ----
class TestCategoriesEndpoint:
    def test_returns_10_in_order(self, api):
        r = api.get(f"{BASE_URL}/api/categories", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 10, f"expected 10, got {len(data)}"
        assert [c["key"] for c in data] == EXPECTED_CATEGORY_ORDER
        for c in data:
            img = c.get("image") or ""
            assert img.startswith("/api/media/category/"), f"{c['key']} image path bad: {img}"


# ---- product detail: variant images ----
class TestVariantImages:
    def test_each_variant_has_own_image(self, api):
        r = api.get(f"{BASE_URL}/api/products/oversize-blouse-motif", timeout=10)
        assert r.status_code == 200
        p = r.json()
        assert p["image"].startswith("/api/media/product/")
        variants = p["variants"]
        assert len(variants) == 35
        for i, v in enumerate(variants, start=1):
            expected = f"/api/media/product/TRM-004-{i}.jpg"
            assert v.get("image") == expected, f"variant {v['sku']} image={v.get('image')}"


# ---- /api/admin/verify ----
class TestAdminVerify:
    def test_correct_secret_ok(self, api):
        r = api.post(f"{BASE_URL}/api/admin/verify", headers={"X-Admin-Secret": ADMIN_SECRET}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_wrong_secret_401(self, api):
        r = api.post(f"{BASE_URL}/api/admin/verify", headers={"X-Admin-Secret": "nope"}, timeout=10)
        assert r.status_code == 401

    def test_missing_secret_401(self, api):
        r = api.post(f"{BASE_URL}/api/admin/verify", timeout=10)
        assert r.status_code == 401


# ---- /api/admin/products/{id} PATCH ----
class TestAdminPatch:
    def test_wrong_secret_401(self, api):
        r = api.patch(
            f"{BASE_URL}/api/admin/products/blouse-kancing-depan",
            headers={"X-Admin-Secret": "wrong", "Content-Type": "application/json"},
            json={"price": 99999}, timeout=10,
        )
        assert r.status_code == 401

    def test_missing_secret_401(self, api):
        r = api.patch(
            f"{BASE_URL}/api/admin/products/blouse-kancing-depan",
            headers={"Content-Type": "application/json"}, json={"price": 99999}, timeout=10,
        )
        assert r.status_code == 401

    def test_unknown_product_404(self, api):
        r = api.patch(
            f"{BASE_URL}/api/admin/products/does-not-exist",
            headers={"X-Admin-Secret": ADMIN_SECRET, "Content-Type": "application/json"},
            json={"price": 100}, timeout=10,
        )
        assert r.status_code == 404

    def test_empty_body_400(self, api):
        r = api.patch(
            f"{BASE_URL}/api/admin/products/blouse-kancing-depan",
            headers={"X-Admin-Secret": ADMIN_SECRET, "Content-Type": "application/json"},
            json={}, timeout=10,
        )
        assert r.status_code == 400

    def test_best_seller_round_trip(self, api):
        """Add best-seller tag to blouse-kancing-depan, verify filter picks it up, revert."""
        pid = "blouse-kancing-depan"
        headers = {"X-Admin-Secret": ADMIN_SECRET, "Content-Type": "application/json"}

        # Baseline: not in best-seller
        r = api.get(f"{BASE_URL}/api/products", params={"category": "best-seller"}, timeout=10)
        assert r.status_code == 200
        assert not any(p["id"] == pid for p in r.json())

        try:
            # Add tag + change price
            r = api.patch(
                f"{BASE_URL}/api/admin/products/{pid}", headers=headers,
                json={"price": 95000, "categories": ["blouse", "best-seller"]}, timeout=10,
            )
            assert r.status_code == 200
            body = r.json()
            assert body["price"] == 95000
            assert "best-seller" in body["categories"]

            # Verify it appears
            r = api.get(f"{BASE_URL}/api/products", params={"category": "best-seller"}, timeout=10)
            assert r.status_code == 200
            ids = [p["id"] for p in r.json()]
            assert pid in ids, f"best-seller list should include {pid}, got {ids}"
        finally:
            # ALWAYS revert to keep test idempotent
            api.patch(
                f"{BASE_URL}/api/admin/products/{pid}", headers=headers,
                json={"price": 89000, "categories": ["blouse"]}, timeout=10,
            )

        # Confirm reverted
        r = api.get(f"{BASE_URL}/api/products", params={"category": "best-seller"}, timeout=10)
        assert r.status_code == 200
        assert not any(p["id"] == pid for p in r.json()), "revert failed — best-seller still contains product"

        r = api.get(f"{BASE_URL}/api/products/{pid}", timeout=10)
        assert r.json()["price"] == 89000
        assert r.json()["categories"] == ["blouse"]
