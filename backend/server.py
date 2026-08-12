import os
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

import json
import httpx
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
OWNER_EMAIL = os.environ["OWNER_EMAIL"]
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", OWNER_EMAIL)
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
PUBLIC_SITE_URL = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
LLM_MODEL = "gpt-5.4"

# Constants (never read from env — survives deployment)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 7
SESSION_LIFETIME_DAYS = 7

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- DB ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="KeldersVisuals API")
api = APIRouter(prefix="/api")


# --- Models ---
class BookingCreate(BaseModel):
    service: str
    date: str
    time: str
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = ""
    location: str
    message: Optional[str] = ""
    price: float = 0.0
    deposit: float = 0.0


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service: str
    date: str
    time: str
    name: str
    email: str
    phone: str
    company: str = ""
    location: str
    message: str = ""
    price: float = 0.0
    deposit: float = 0.0
    payment_status: str = "pending"
    booking_status: str = "new"
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    company: Optional[str] = ""
    shoot_type: Optional[str] = ""
    preferred_date: Optional[str] = ""
    message: str


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str = ""
    company: str = ""
    shoot_type: str = ""
    preferred_date: str = ""
    message: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class BookingStatusUpdate(BaseModel):
    booking_status: Optional[str] = None
    payment_status: Optional[str] = None


class ReviewCreate(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    name: str
    text: str


class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: Optional[str] = None
    name: str
    service: str = ""
    rating: int = 5
    text: str
    approved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReviewAdminUpdate(BaseModel):
    approved: bool


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: str = ""
    is_admin: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SessionExchange(BaseModel):
    session_id: str


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []
    session_id: Optional[str] = None


class ParseBookingRequest(BaseModel):
    text: str


class QuoteRequest(BaseModel):
    service: str
    client_name: Optional[str] = ""
    wishes: str
    budget: Optional[str] = ""


class CaptionRequest(BaseModel):
    image_url: Optional[str] = ""
    context: str  # what's in the photo / vibe


# --- AI helpers ---
KV_SERVICES_CONTEXT = """
Diensten en richtprijzen KeldersVisuals:
- Fotografie (vanaf €350)
- Videografie (vanaf €650)
- Dronefotografie & FPV (vanaf €495)
- Automotive (vanaf €425)
- Portretfotografie (vanaf €275)
- Bedrijfsfotografie (vanaf €550)
- Social Media Content (vanaf €395)
- Maatwerk (prijs op aanvraag)

Contact: info@keldersvisuals.nl · 06-15133571 · WhatsApp beschikbaar.
Werkgebied: Nederland (op locatie of studio).
Slogan: Jouw moment, onze passie.
"""

CHAT_SYSTEM_PROMPT = f"""Je bent de digitale assistent van KeldersVisuals — een high-end fotografie- en videografiebedrijf.
Antwoord altijd in het Nederlands, warm en professioneel, kort en to-the-point (max 3-4 zinnen tenzij nodig).
Verwijs bij interesse altijd naar de boekingsmodule (/boeken), portfolio (/portfolio), of contact (WhatsApp/e-mail).
Verzin GEEN prijzen of details buiten deze feiten:
{KV_SERVICES_CONTEXT}
Als je iets niet zeker weet: zeg eerlijk dat de klant beter even direct contact kan opnemen via WhatsApp 06-15133571.
Gebruik geen emoji's."""


def build_llm(system_prompt: str, session_id: Optional[str] = None) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id or f"kv_{uuid.uuid4().hex[:12]}",
        system_message=system_prompt,
    ).with_model("openai", LLM_MODEL)


async def llm_oneshot(system_prompt: str, user_text: str) -> str:
    chat = build_llm(system_prompt)
    parts: List[str] = []
    async for ev in chat.stream_message(UserMessage(text=user_text)):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(parts).strip()


# --- Email helper ---
async def send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        return False


def booking_email_html(b: Booking, payment_note: str = "") -> str:
    deposit_line = ""
    if b.deposit > 0:
        deposit_line = f"<tr><td style='padding:8px 0;color:#71717A;'>Aanbetaling</td><td style='padding:8px 0;color:#F4F4F6;text-align:right;'>€{b.deposit:.2f}</td></tr>"
    return f"""
    <table width="100%" style="background:#0A0A0C;padding:40px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" style="background:#121216;border:1px solid rgba(212,175,55,0.15);padding:40px;">
          <tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid rgba(212,175,55,0.2);">
            <div style="font-family:Georgia,serif;font-size:28px;color:#D4AF37;letter-spacing:4px;">KELDERSVISUALS</div>
            <div style="color:#A1A1AA;font-size:12px;letter-spacing:3px;margin-top:6px;">JOUW MOMENT, ONZE PASSIE</div>
          </td></tr>
          <tr><td style="padding-top:32px;">
            <h1 style="color:#F4F4F6;font-family:Georgia,serif;font-weight:300;font-size:24px;margin:0 0 16px;">Bedankt voor je boeking!</h1>
            <p style="color:#A1A1AA;line-height:1.7;font-size:14px;">Hallo {b.name}, we hebben je boekingsaanvraag ontvangen. Hieronder vind je een overzicht. We nemen zo spoedig mogelijk contact met je op om alles te bevestigen.</p>
          </td></tr>
          <tr><td style="padding-top:24px;">
            <table width="100%" style="border-top:1px solid rgba(212,175,55,0.15);border-bottom:1px solid rgba(212,175,55,0.15);padding:16px 0;">
              <tr><td style="padding:8px 0;color:#71717A;font-size:13px;">Dienst</td><td style="padding:8px 0;color:#F4F4F6;text-align:right;font-size:14px;">{b.service}</td></tr>
              <tr><td style="padding:8px 0;color:#71717A;font-size:13px;">Datum</td><td style="padding:8px 0;color:#F4F4F6;text-align:right;font-size:14px;">{b.date}</td></tr>
              <tr><td style="padding:8px 0;color:#71717A;font-size:13px;">Tijd</td><td style="padding:8px 0;color:#F4F4F6;text-align:right;font-size:14px;">{b.time}</td></tr>
              <tr><td style="padding:8px 0;color:#71717A;font-size:13px;">Locatie</td><td style="padding:8px 0;color:#F4F4F6;text-align:right;font-size:14px;">{b.location}</td></tr>
              {deposit_line}
              <tr><td style="padding:12px 0 4px;color:#D4AF37;font-size:14px;font-weight:600;">Totaal</td><td style="padding:12px 0 4px;color:#D4AF37;text-align:right;font-size:16px;font-weight:600;">€{b.price:.2f}</td></tr>
              <tr><td style="padding:8px 0;color:#71717A;font-size:13px;">Betalingsstatus</td><td style="padding:8px 0;color:#F4F4F6;text-align:right;font-size:14px;text-transform:capitalize;">{b.payment_status}</td></tr>
            </table>
            {f'<p style="color:#A1A1AA;font-size:13px;margin-top:16px;">{payment_note}</p>' if payment_note else ''}
          </td></tr>
          <tr><td style="padding-top:32px;text-align:center;">
            <a href="https://wa.me/31615133571" style="display:inline-block;background:#D4AF37;color:#0A0A0C;padding:12px 28px;text-decoration:none;font-weight:600;letter-spacing:1px;font-size:13px;">WHATSAPP CONTACT</a>
          </td></tr>
          <tr><td style="padding-top:32px;border-top:1px solid rgba(212,175,55,0.1);margin-top:32px;text-align:center;">
            <p style="color:#71717A;font-size:12px;margin:16px 0 4px;">info@keldersvisuals.nl · 06-15133571</p>
            <p style="color:#71717A;font-size:11px;">© KeldersVisuals</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


def owner_booking_html(b: Booking) -> str:
    return f"""
    <table width="100%" style="background:#0A0A0C;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" style="background:#121216;border:1px solid rgba(212,175,55,0.2);padding:32px;">
          <tr><td>
            <h2 style="color:#D4AF37;font-family:Georgia,serif;font-weight:300;margin:0 0 20px;">Nieuwe Boeking</h2>
            <table width="100%">
              <tr><td style="color:#71717A;padding:6px 0;">Naam</td><td style="color:#F4F4F6;text-align:right;">{b.name}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Email</td><td style="color:#F4F4F6;text-align:right;">{b.email}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Telefoon</td><td style="color:#F4F4F6;text-align:right;">{b.phone}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Bedrijf</td><td style="color:#F4F4F6;text-align:right;">{b.company or '-'}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Dienst</td><td style="color:#F4F4F6;text-align:right;">{b.service}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Datum / Tijd</td><td style="color:#F4F4F6;text-align:right;">{b.date} — {b.time}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Locatie</td><td style="color:#F4F4F6;text-align:right;">{b.location}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Prijs</td><td style="color:#D4AF37;text-align:right;">€{b.price:.2f}</td></tr>
            </table>
            <p style="color:#A1A1AA;margin-top:20px;padding-top:16px;border-top:1px solid rgba(212,175,55,0.15);">Bericht:<br/>{b.message or '-'}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


def contact_email_html(c: ContactMessage) -> str:
    return f"""
    <table width="100%" style="background:#0A0A0C;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" style="background:#121216;border:1px solid rgba(212,175,55,0.2);padding:32px;">
          <tr><td>
            <h2 style="color:#D4AF37;font-family:Georgia,serif;font-weight:300;margin:0 0 20px;">Nieuw Contactbericht</h2>
            <table width="100%">
              <tr><td style="color:#71717A;padding:6px 0;">Naam</td><td style="color:#F4F4F6;text-align:right;">{c.name}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Email</td><td style="color:#F4F4F6;text-align:right;">{c.email}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Telefoon</td><td style="color:#F4F4F6;text-align:right;">{c.phone or '-'}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Bedrijf</td><td style="color:#F4F4F6;text-align:right;">{c.company or '-'}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Type shoot</td><td style="color:#F4F4F6;text-align:right;">{c.shoot_type or '-'}</td></tr>
              <tr><td style="color:#71717A;padding:6px 0;">Gewenste datum</td><td style="color:#F4F4F6;text-align:right;">{c.preferred_date or '-'}</td></tr>
            </table>
            <p style="color:#A1A1AA;margin-top:20px;padding-top:16px;border-top:1px solid rgba(212,175,55,0.15);">{c.message}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


def review_request_email_html(b: Booking, review_url: str) -> str:
    return f"""
    <table width="100%" style="background:#0A0A0C;padding:40px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" style="background:#121216;border:1px solid rgba(212,175,55,0.15);padding:40px;">
          <tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid rgba(212,175,55,0.2);">
            <div style="font-family:Georgia,serif;font-size:28px;color:#D4AF37;letter-spacing:4px;">KELDERSVISUALS</div>
            <div style="color:#A1A1AA;font-size:12px;letter-spacing:3px;margin-top:6px;">JOUW MOMENT, ONZE PASSIE</div>
          </td></tr>
          <tr><td style="padding-top:32px;">
            <h1 style="color:#F4F4F6;font-family:Georgia,serif;font-weight:300;font-size:24px;margin:0 0 16px;">Hoe was jouw ervaring?</h1>
            <p style="color:#A1A1AA;line-height:1.7;font-size:14px;">Hallo {b.name},</p>
            <p style="color:#A1A1AA;line-height:1.7;font-size:14px;">We hopen dat je jouw {b.service.lower()} van {b.date} met plezier hebt beleefd. Zou je één minuut willen nemen om een korte review achter te laten? Het helpt ons enorm — en het helpt toekomstige klanten om ons te vinden.</p>
          </td></tr>
          <tr><td style="padding-top:24px;text-align:center;">
            <div style="color:#D4AF37;font-size:24px;letter-spacing:6px;margin-bottom:24px;">★ ★ ★ ★ ★</div>
            <a href="{review_url}" style="display:inline-block;background:#D4AF37;color:#0A0A0C;padding:14px 32px;text-decoration:none;font-weight:600;letter-spacing:2px;font-size:12px;text-transform:uppercase;">Deel je ervaring</a>
          </td></tr>
          <tr><td style="padding-top:32px;border-top:1px solid rgba(212,175,55,0.1);margin-top:32px;text-align:center;">
            <p style="color:#71717A;font-size:12px;margin:16px 0 4px;">info@keldersvisuals.nl · 06-15133571</p>
            <p style="color:#71717A;font-size:11px;">© KeldersVisuals</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


def owner_review_html(r: Review) -> str:
    stars = "★" * r.rating + "☆" * (5 - r.rating)
    return f"""
    <table width="100%" style="background:#0A0A0C;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" style="background:#121216;border:1px solid rgba(212,175,55,0.2);padding:32px;">
          <tr><td>
            <h2 style="color:#D4AF37;font-family:Georgia,serif;font-weight:300;margin:0 0 12px;">Nieuwe Review</h2>
            <p style="color:#D4AF37;font-size:22px;letter-spacing:4px;margin:0 0 20px;">{stars}</p>
            <p style="color:#F4F4F6;font-size:14px;"><strong>{r.name}</strong> — {r.service}</p>
            <p style="color:#A1A1AA;margin-top:16px;padding-top:16px;border-top:1px solid rgba(212,175,55,0.15);line-height:1.7;">"{r.text}"</p>
            <p style="color:#71717A;font-size:12px;margin-top:20px;">Log in op /admin om te modereren en publiceren.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


# --- Auth helpers ---
def make_jwt(email: str) -> str:
    return jwt.encode(
        {"sub": email, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGO,
    )


async def get_current_user(request: Request) -> Optional[User]:
    """Read session_token from cookie or Authorization header; return User or None."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        return None
    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    return User(**user_doc)


async def require_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_admin(request: Request) -> User:
    """Admin = valid session AND email == ADMIN_EMAIL. Also allow legacy JWT (Bearer) as fallback."""
    user = await get_current_user(request)
    if user and user.email.lower() == ADMIN_EMAIL.lower():
        return user
    # Fallback: legacy JWT admin token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            data = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
            if data.get("sub", "").lower() == ADMIN_EMAIL.lower():
                return User(user_id="legacy-admin", email=ADMIN_EMAIL, name="Admin", is_admin=True)
        except jwt.PyJWTError:
            pass
    raise HTTPException(status_code=403, detail="Admin access required")


# --- Public routes ---
@api.get("/")
async def root():
    return {"service": "KeldersVisuals API", "status": "ok"}


@api.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, request: Request):
    b = Booking(**payload.model_dump())
    # Associate with current logged-in user if any
    user = await get_current_user(request)
    if user:
        b.user_id = user.user_id
    await db.bookings.insert_one(b.model_dump())
    payment_note = "Je ontvangt binnenkort een aparte betaallink (SumUp) van ons ter bevestiging." if b.price > 0 else ""
    asyncio.create_task(send_email(b.email, "Bevestiging boeking — KeldersVisuals", booking_email_html(b, payment_note), reply_to=CONTACT_EMAIL))
    asyncio.create_task(send_email(OWNER_EMAIL, f"Nieuwe boeking — {b.name}", owner_booking_html(b), reply_to=b.email))
    return b


@api.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return Booking(**doc)


@api.post("/contact")
async def create_contact(payload: ContactCreate):
    c = ContactMessage(**payload.model_dump())
    await db.contacts.insert_one(c.model_dump())
    asyncio.create_task(send_email(OWNER_EMAIL, f"Nieuw contactbericht — {c.name}", contact_email_html(c), reply_to=c.email))
    return {"status": "ok", "id": c.id}


# --- Auth routes (Emergent managed Google) ---
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api.post("/auth/session")
async def exchange_session(payload: SessionExchange, response: Response):
    """Exchange session_id (from OAuth redirect fragment) for a persistent session cookie."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": payload.session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Ongeldige sessie")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session exchange failed: {e}")
        raise HTTPException(status_code=502, detail="Auth service niet bereikbaar")

    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Geen e-mail in sessie")

    # Upsert user
    existing = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name", "")),
                       "picture": data.get("picture", existing.get("picture", ""))}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email.lower(),
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "is_admin": email.lower() == ADMIN_EMAIL.lower(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data.get("session_token") or uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_LIFETIME_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=SESSION_LIFETIME_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    is_admin = email.lower() == ADMIN_EMAIL.lower()
    return {
        "user_id": user_id,
        "email": email,
        "name": data.get("name", ""),
        "picture": data.get("picture", ""),
        "is_admin": is_admin,
    }


@api.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "is_admin": user.email.lower() == ADMIN_EMAIL.lower(),
    }


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"status": "ok"}


# --- User routes (require login) ---
@api.get("/me/bookings", response_model=List[Booking])
async def my_bookings(user: User = Depends(require_user)):
    docs = await db.bookings.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Booking(**d) for d in docs]


# --- Admin routes ---
@api.post("/admin/login")
async def admin_login_legacy(payload: AdminLogin):
    if payload.email.lower() != ADMIN_EMAIL.lower() or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldige gegevens")
    return {"token": make_jwt(ADMIN_EMAIL), "email": ADMIN_EMAIL}


@api.get("/admin/bookings", response_model=List[Booking])
async def list_bookings(_: User = Depends(require_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Booking(**d) for d in docs]


@api.get("/admin/contacts", response_model=List[ContactMessage])
async def list_contacts(_: User = Depends(require_admin)):
    docs = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ContactMessage(**d) for d in docs]


@api.patch("/admin/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, payload: BookingStatusUpdate, _: User = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # Look up current state to detect status transitions
    current = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Not found")
    res = await db.bookings.find_one_and_update(
        {"id": booking_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    booking = Booking(**res)
    # Trigger review request email on transition to "completed"
    if update.get("booking_status") == "completed" and current.get("booking_status") != "completed":
        if not current.get("review_requested_at"):
            base = PUBLIC_SITE_URL or ""
            review_url = f"{base}/review/{booking.id}"
            asyncio.create_task(send_email(
                booking.email,
                "Hoe was jouw ervaring? — KeldersVisuals",
                review_request_email_html(booking, review_url),
                reply_to=CONTACT_EMAIL,
            ))
            await db.bookings.update_one(
                {"id": booking_id},
                {"$set": {"review_requested_at": datetime.now(timezone.utc).isoformat()}},
            )
    return booking


@api.delete("/admin/bookings/{booking_id}")
async def delete_booking(booking_id: str, _: User = Depends(require_admin)):
    r = await db.bookings.delete_one({"id": booking_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "deleted"}


# --- AI routes ---
@api.post("/ai/chat")
async def ai_chat(payload: ChatRequest):
    """Streaming SSE chat with the KeldersVisuals concierge."""
    # Build compact context from recent history
    history_text = ""
    for turn in payload.history[-6:]:
        prefix = "Bezoeker" if turn.role == "user" else "Assistent"
        history_text += f"{prefix}: {turn.text}\n"
    prompt = payload.message if not history_text else f"Voorgaand gesprek:\n{history_text}\nNieuwe vraag van bezoeker: {payload.message}"

    async def event_gen():
        try:
            chat = build_llm(CHAT_SYSTEM_PROMPT, session_id=payload.session_id)
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield "data: [DONE]\n\n"
                    return
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"AI chat error: {e}")
            yield f"data: {json.dumps({'error': 'AI tijdelijk niet beschikbaar'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api.post("/ai/parse-booking")
async def ai_parse_booking(payload: ParseBookingRequest):
    """Extract structured booking fields from freeform Dutch text."""
    system = """Je bent een booking-parser voor KeldersVisuals. Lees de vrije tekst van een klant en geef een schoon JSON-object terug met deze velden:
{
  "service_slug": één van: fotografie | videografie | drone-fpv | automotive | portret | bedrijf | social-media | maatwerk,
  "location": kort adres/stad of "",
  "date_hint": suggestie datum in vrije tekst of "",
  "message": samenvatting van bijzondere wensen (max 200 tekens)
}
Antwoord ALLEEN met valid JSON. Geen uitleg, geen backticks."""
    try:
        raw = await llm_oneshot(system, payload.text)
        # Strip markdown fences if any
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(cleaned)
        return {
            "service_slug": data.get("service_slug", ""),
            "location": data.get("location", ""),
            "date_hint": data.get("date_hint", ""),
            "message": data.get("message", ""),
        }
    except Exception as e:
        logger.error(f"parse-booking error: {e}")
        raise HTTPException(status_code=500, detail="AI kon dit niet interpreteren")


@api.post("/admin/ai/quote")
async def ai_generate_quote(payload: QuoteRequest, _: User = Depends(require_admin)):
    """Generate a personalized quote text for a client (admin only)."""
    system = """Je bent een offerte-schrijver voor KeldersVisuals (high-end fotografie & videografie in Nederland).
Schrijf een korte, persoonlijke, professionele offerte-tekst in het Nederlands.
- Toon: warm, zelfverzekerd, luxe.
- Structuur: aanhef, korte introductie op de dienst, wat we leveren, richtprijs (indien opgegeven, anders 'op aanvraag'), afsluiting met call-to-action naar WhatsApp/e-mail.
- Geen emoji's, geen markdown, gewoon vloeiende tekst met alinea-scheidingen (\\n\\n).
- Maximaal ~180 woorden."""
    user = f"Klant: {payload.client_name or 'onbekend'}\nDienst: {payload.service}\nWensen: {payload.wishes}\nBudget: {payload.budget or 'niet opgegeven'}"
    text = await llm_oneshot(system, user)
    return {"text": text}


@api.post("/admin/ai/caption")
async def ai_generate_caption(payload: CaptionRequest, _: User = Depends(require_admin)):
    """Generate 3 caption variations for social media / portfolio."""
    system = """Je bent een social-media copywriter voor KeldersVisuals.
Genereer PRECIES 3 varianten van een korte caption in het Nederlands voor een foto/video.
- Variant 1: kort & poëtisch (max 12 woorden)
- Variant 2: professioneel voor Instagram (~25 woorden, met natuurlijke hashtags aan het eind)
- Variant 3: story-style, persoonlijk (~30 woorden, geen hashtags)
Antwoord ALLEEN als valid JSON: {"captions": [{"style": "...", "text": "..."}, ...]}
Geen backticks, geen uitleg buiten JSON."""
    try:
        raw = await llm_oneshot(system, payload.context)
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(cleaned)
        return data
    except Exception as e:
        logger.error(f"caption error: {e}")
        raise HTTPException(status_code=500, detail="AI kon geen captions genereren")


# --- Reviews ---
@api.get("/reviews/booking/{booking_id}")
async def get_review_booking_context(booking_id: str):
    """Public: fetch minimal booking info so the review form can render (name/service). No sensitive data."""
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    existing = await db.reviews.find_one({"booking_id": booking_id}, {"_id": 0})
    return {
        "booking_id": booking_id,
        "name": doc.get("name", ""),
        "service": doc.get("service", ""),
        "date": doc.get("date", ""),
        "has_review": bool(existing),
    }


@api.post("/reviews", response_model=Review)
async def create_review(payload: ReviewCreate):
    booking_doc = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    existing = await db.reviews.find_one({"booking_id": payload.booking_id})
    if existing:
        raise HTTPException(status_code=409, detail="Er is al een review voor deze boeking")
    r = Review(
        booking_id=payload.booking_id,
        user_id=booking_doc.get("user_id"),
        name=payload.name.strip() or booking_doc.get("name", ""),
        service=booking_doc.get("service", ""),
        rating=payload.rating,
        text=payload.text.strip(),
        approved=False,
    )
    await db.reviews.insert_one(r.model_dump())
    asyncio.create_task(send_email(OWNER_EMAIL, f"Nieuwe review — {r.rating}★ van {r.name}", owner_review_html(r)))
    return r


@api.get("/reviews/public", response_model=List[Review])
async def public_reviews():
    docs = await db.reviews.find({"approved": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Review(**d) for d in docs]


@api.get("/admin/reviews", response_model=List[Review])
async def list_all_reviews(_: User = Depends(require_admin)):
    docs = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Review(**d) for d in docs]


@api.patch("/admin/reviews/{review_id}", response_model=Review)
async def moderate_review(review_id: str, payload: ReviewAdminUpdate, _: User = Depends(require_admin)):
    res = await db.reviews.find_one_and_update(
        {"id": review_id}, {"$set": {"approved": payload.approved}},
        return_document=True, projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    return Review(**res)


@api.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, _: User = Depends(require_admin)):
    r = await db.reviews.delete_one({"id": review_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "deleted"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
