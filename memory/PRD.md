# KeldersVisuals — PRD

## Problem Statement
Build a luxury, professional website for KeldersVisuals — a photography & videography business. Slogan: "Jouw moment, onze passie." Dark cinematic design (black/anthracite/gold), photography-first, with services, portfolio, booking wizard, contact form, admin dashboard. Ready for GitHub → Netlify deployment.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async). JWT admin auth (bcrypt not needed — single admin via env). Emergent-managed Resend for email.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner for toasts + framer-motion available.
- **Email**: Managed Resend via https://integrations.emergentagent.com (EMERGENT_EMAIL_KEY).
- **Payment**: SumUp placeholder — structure ready (payment_status enum), real integration deferred.

## User Personas
1. **Visitor / Prospect** — browses portfolio, learns about services, submits contact or booking.
2. **Business Client** — books zakelijke shoots.
3. **Owner / Admin** — logs into /admin to review bookings, update statuses, read contact messages.

## Core Requirements (Static)
- Dutch-language site
- Sticky glassmorphic navigation + mobile hamburger
- 5-step booking wizard: service → datetime → details → overview → payment
- Portfolio with category filters + lightbox
- Contact form + WhatsApp floating button + tel/mailto CTAs
- Admin dashboard with JWT-protected endpoints
- Email confirmation to customer + notification to info@keldersvisuals.nl

## Implemented (2026-02)
- ✅ Full backend: /api/bookings, /api/contact, /api/admin/* (login, list bookings/contacts, update, delete)
- ✅ Homepage: hero, USP pillars, services preview, portfolio preview, "voor bedrijven", 4-step werkwijze, final CTA
- ✅ Services page (8 diensten cards)
- ✅ Portfolio page (12 items, filters, lightbox)
- ✅ About page
- ✅ Booking wizard (5 steps, prefill via ?dienst=)
- ✅ Booking confirmation page
- ✅ Contact page (form + side contact cards)
- ✅ Admin login + dashboard (stats, bookings table with inline status edit, contacts tab, logout)
- ✅ Emails: customer confirmation + owner notification (HTML branded)
- ✅ Floating WhatsApp, tel: + mailto: links, social icons in footer
- ✅ SEO meta tags, OG tags, Dutch locale

## Backlog (P0 → P2)
- **P1** — Real SumUp integration (checkout links + webhooks for payment_status updates)
- **P1** — Netlify/Vercel deploy config + connect to keldersvisuals.nl domain
- **P2** — Replace Unsplash placeholders with real KeldersVisuals photography
- **P2** — Rich admin: revenue chart per month, filters, CSV export
- **P2** — Calendly / iCal integration for real availability
- **P2** — Blog / journal section for SEO
- **P2** — Privacy + Terms content (currently placeholders)

## Credentials
See `/app/memory/test_credentials.md`.
