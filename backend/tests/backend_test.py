"""
Backend tests for KeldersVisuals - iteration 2 (Auth added).
Covers: public health, booking public flow, legacy admin JWT, cookie/session auth
(admin + non-admin via direct mongo insertion), /api/me/bookings scoping, logout.
"""
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-shoots-3.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
ADMIN_EMAIL = "lorenzokelders222@gmail.com"
ADMIN_PASSWORD = "KeldersAdmin2026!"

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _seed_session(mongo, email, is_admin=False):
    user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    token = f"test_session_{uuid.uuid4().hex}"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": email.lower(),
        "name": "Test User",
        "picture": "",
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return user_id, token


# -------- Public routes --------
class TestPublic:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json() == {"service": "KeldersVisuals API", "status": "ok"}

    def test_create_booking_public(self, api_client):
        payload = {
            "service": "Portret shoot",
            "date": "2026-05-01",
            "time": "14:00",
            "name": "TEST Public User",
            "email": "test.public@example.com",
            "phone": "0612345678",
            "company": "",
            "location": "Amsterdam",
            "message": "test booking",
            "price": 250.0,
            "deposit": 62.5,
        }
        r = api_client.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] and data["payment_status"] == "pending"
        assert data.get("user_id") in (None, "")


# -------- Auth error paths --------
class TestAuthErrors:
    def test_session_exchange_invalid(self, api_client):
        r = api_client.post(f"{API}/auth/session", json={"session_id": "definitely-not-valid-xyz"})
        assert r.status_code in (401, 502), f"got {r.status_code}: {r.text}"

    def test_auth_me_no_cookie(self, api_client):
        r = api_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_bookings_no_auth(self, api_client):
        r = api_client.get(f"{API}/me/bookings")
        assert r.status_code == 401

    def test_admin_bookings_no_auth(self, api_client):
        r = api_client.get(f"{API}/admin/bookings")
        assert r.status_code in (401, 403)


# -------- Legacy admin JWT --------
class TestLegacyAdminJWT:
    def test_admin_login_ok(self, api_client):
        r = api_client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["token"]

    def test_admin_login_bad(self, api_client):
        r = api_client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_admin_bookings_with_jwt(self, api_client):
        r = api_client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = r.json()["token"]
        r2 = api_client.get(f"{API}/admin/bookings", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)


# -------- Cookie session (simulated via Mongo) --------
class TestCookieSession:
    def test_admin_cookie_flow(self, api_client, mongo):
        # seed admin session
        uid, token = _seed_session(mongo, ADMIN_EMAIL, is_admin=True)
        try:
            # /auth/me via Cookie header
            r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["email"].lower() == ADMIN_EMAIL.lower()
            assert data["is_admin"] is True

            # /admin/bookings
            r2 = requests.get(f"{API}/admin/bookings", cookies={"session_token": token})
            assert r2.status_code == 200
            bookings = r2.json()
            assert isinstance(bookings, list)

            # create a booking to update
            payload = {
                "service": "TEST Admin update", "date": "2026-06-01", "time": "10:00",
                "name": "TEST Update", "email": "test.update@example.com",
                "phone": "0611111111", "location": "Rotterdam", "price": 100.0, "deposit": 25.0,
            }
            cr = requests.post(f"{API}/bookings", json=payload)
            bid = cr.json()["id"]

            # PATCH via cookie
            pr = requests.patch(f"{API}/admin/bookings/{bid}",
                                json={"booking_status": "confirmed", "payment_status": "paid"},
                                cookies={"session_token": token})
            assert pr.status_code == 200, pr.text
            updated = pr.json()
            assert updated["booking_status"] == "confirmed"
            assert updated["payment_status"] == "paid"

            # cleanup
            requests.delete(f"{API}/admin/bookings/{bid}", cookies={"session_token": token})
        finally:
            mongo.user_sessions.delete_one({"session_token": token})
            mongo.users.delete_one({"user_id": uid})

    def test_non_admin_cookie_flow(self, api_client, mongo):
        # seed non-admin session
        non_admin_email = f"TEST_nonadmin_{uuid.uuid4().hex[:6]}@example.com"
        uid, token = _seed_session(mongo, non_admin_email, is_admin=False)
        try:
            # /auth/me works but is_admin=False
            r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
            assert r.status_code == 200
            assert r.json()["is_admin"] is False

            # /admin/bookings forbidden
            r2 = requests.get(f"{API}/admin/bookings", cookies={"session_token": token})
            assert r2.status_code == 403

            # Create booking while authed -> user_id should be set
            payload = {
                "service": "TEST User booking", "date": "2026-07-01", "time": "12:00",
                "name": "TEST User", "email": non_admin_email,
                "phone": "0622222222", "location": "Utrecht", "price": 150.0, "deposit": 37.5,
            }
            cr = requests.post(f"{API}/bookings", json=payload, cookies={"session_token": token})
            assert cr.status_code == 200
            assert cr.json().get("user_id") == uid
            bid = cr.json()["id"]

            # /me/bookings returns own booking
            mr = requests.get(f"{API}/me/bookings", cookies={"session_token": token})
            assert mr.status_code == 200
            ids = [b["id"] for b in mr.json()]
            assert bid in ids
            # All bookings returned are the user's own
            assert all(b.get("user_id") == uid for b in mr.json())
        finally:
            mongo.bookings.delete_many({"user_id": uid})
            mongo.user_sessions.delete_one({"session_token": token})
            mongo.users.delete_one({"user_id": uid})

    def test_logout_deletes_session(self, api_client, mongo):
        uid, token = _seed_session(mongo, f"TEST_logout_{uuid.uuid4().hex[:6]}@example.com")
        try:
            r = requests.post(f"{API}/auth/logout", cookies={"session_token": token})
            assert r.status_code == 200
            # Session doc should be removed
            assert mongo.user_sessions.find_one({"session_token": token}) is None
            # /auth/me should now 401
            r2 = requests.get(f"{API}/auth/me", cookies={"session_token": token})
            assert r2.status_code == 401
        finally:
            mongo.users.delete_one({"user_id": uid})
