import os
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

import httpx
import jwt
import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
OWNER_EMAIL = os.environ["OWNER_EMAIL"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
JWT_SECRET = os.environ["JWT_SECRET"]

# Constant (never read from env — survives deployment)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 7

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- DB ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="KeldersVisuals API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# --- Models ---
class BookingCreate(BaseModel):
    service: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
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
    payment_status: str = "pending"  # pending | paid | failed | cancelled
    booking_status: str = "new"  # new | confirmed | completed | cancelled
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


# --- Email helper ---
async def send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    payload = {
        "to": [to],
        "subject": subject,
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
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
    total = b.price
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
              <tr><td style="padding:12px 0 4px;color:#D4AF37;font-size:14px;font-weight:600;">Totaal</td><td style="padding:12px 0 4px;color:#D4AF37;text-align:right;font-size:16px;font-weight:600;">€{total:.2f}</td></tr>
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


# --- Auth ---
def make_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def require_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        if data.get("sub") != ADMIN_EMAIL:
            raise HTTPException(status_code=403, detail="Forbidden")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return data["sub"]


# --- Routes ---
@api.get("/")
async def root():
    return {"service": "KeldersVisuals API", "status": "ok"}


@api.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    b = Booking(**payload.model_dump())
    await db.bookings.insert_one(b.model_dump())

    # Send emails async (non-blocking for response speed)
    payment_note = "Je ontvangt binnenkort een aparte betaallink (SumUp) van ons ter bevestiging." if b.price > 0 else ""
    asyncio.create_task(send_email(b.email, "Bevestiging boeking — KeldersVisuals", booking_email_html(b, payment_note), reply_to=OWNER_EMAIL))
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


# --- Admin ---
@api.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.email.lower() != ADMIN_EMAIL.lower() or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldige gegevens")
    return {"token": make_token(ADMIN_EMAIL), "email": ADMIN_EMAIL}


@api.get("/admin/bookings", response_model=List[Booking])
async def list_bookings(_: str = Depends(require_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Booking(**d) for d in docs]


@api.get("/admin/contacts", response_model=List[ContactMessage])
async def list_contacts(_: str = Depends(require_admin)):
    docs = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ContactMessage(**d) for d in docs]


@api.patch("/admin/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, payload: BookingStatusUpdate, _: str = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    res = await db.bookings.find_one_and_update(
        {"id": booking_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    return Booking(**res)


@api.delete("/admin/bookings/{booking_id}")
async def delete_booking(booking_id: str, _: str = Depends(require_admin)):
    r = await db.bookings.delete_one({"id": booking_id})
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
