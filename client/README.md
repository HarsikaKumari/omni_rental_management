# RentRoom Manager

Multi-tenant SaaS for landlords to track rooms, renters, meter readings, electricity bills, rent, and payments — and send bills via WhatsApp click-to-chat.

## Stack
- **Frontend:** React + TypeScript + Vite + Tailwind + React Router + TanStack Query + RHF + zod + axios
- **Backend:** Node + Express + TypeScript + Prisma + zod + bcrypt + JWT (httpOnly cookie) + helmet + cors + rate-limit + multer + Cloudinary
- **DB:** PostgreSQL (Neon)

## Roles
- **ADMIN** — created only via `npm run seed:admin`. Manages landlords.
- **LANDLORD** — created by admin. Manages own rooms/tenants/readings/bills.
- **RENTERS** — non-login records; receive bills via WhatsApp.
