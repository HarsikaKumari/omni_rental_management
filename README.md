# 🏠 RentRoom Manager

A multi-landlord web app for managing rented rooms and apartments: renters, meter readings, electricity billing and rent, with one-tap bill sharing on WhatsApp.

> **Status:** 🚧 In development. The project structure and dependencies are set up; features are being built phase by phase.

## Why this project?

Landlords with a few rooms usually track renters, meter readings and dues in notebooks or WhatsApp chats. That leads to forgotten readings, billing disputes, and no clean record of past tenants. RentRoom Manager replaces that with one simple, mobile-first tool.

## Roles

| Role | Access |
|---|---|
| **Admin** | Creates, edits, suspends and deletes landlord accounts; views platform stats |
| **Landlord** | Manages only their own rooms, renters, readings, bills, payments and settings |

Renters are **not users**. They are records inside a landlord's account and receive bills on WhatsApp.

## Planned Features

**Landlord**
- Add rooms (room number unique per landlord)
- Add renters with name, WhatsApp number, ID details, individual rent, room allotment, starting meter reading and an optional photo
- Change a renter's room, or mark them as moved out, while keeping them in a "Previous renters" list with full history
- Enter meter readings and generate electricity bills: `(current reading − paid-till reading) × rate per unit`
- Per-landlord global rate per unit; the rate is saved with each bill so old bills never change
- "Paid till X units" tracking, with unpaid units carried forward into the next bill
- Two bill types: **rent + electricity** or **electricity only**
- Record payments and see outstanding dues
- **Send the bill on WhatsApp** via a click-to-chat link (no API, no cost)
- Dashboard with occupied/vacant rooms and total dues

**Admin**
- Landlord management (create, edit, suspend, delete)
- Platform stats

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Axios |
| Backend | Node.js, Express, TypeScript, Zod, JWT (httpOnly cookie), bcrypt, helmet, express-rate-limit, multer |
| Database | PostgreSQL ([Neon](https://neon.tech)) with Prisma ORM |
| Images | Cloudinary (optional renter photos) |
| Deployment | Vercel (client), Render or Railway (server), Neon (database) |

## Project Structure

```
rentroom-manager/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/            # axios instance and API functions
│       ├── components/     # ui, layout, rooms, tenants, bills
│       ├── context/        # AuthContext
│       ├── hooks/
│       ├── pages/          # auth, admin, landlord
│       ├── routes/
│       ├── types/
│       └── utils/          # whatsapp, money, format
└── server/                 # Express + Prisma backend
    ├── prisma/             # schema and migrations
    └── src/
        ├── config/
        ├── controllers/
        ├── middleware/
        ├── routes/
        ├── services/       # billing, occupancy, image logic
        ├── validators/     # zod schemas
        ├── utils/
        └── scripts/        # seedAdmin
```

## Key Design Decisions

- **Tenant vs. stay:** a `Tenant` is a person; an `Occupancy` is one stay in one room. This makes room changes and history simple.
- **Money is stored in paise** (integers) to avoid floating-point errors.
- **Data isolation:** `landlordId` always comes from the verified JWT, never from the request. Every query is scoped by it.
- **Transactions:** shifting rooms, moving out and generating bills run inside database transactions.
- **Bills are never deleted** when a renter leaves, so history stays intact.

## Getting Started

### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) PostgreSQL database
- A free [Cloudinary](https://cloudinary.com) account (optional, for renter photos)

### 1. Clone and install
```bash
git clone https://github.com/<your-username>/rentroom-manager.git
cd rentroom-manager

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Fill in `server/.env` (database URL, JWT secret, Cloudinary keys, admin credentials).

### 3. Set up the database
```bash
cd server
npx prisma migrate dev --name init
npm run seed:admin
```

### 4. Run the app
```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```
Client: http://localhost:5173 · API: http://localhost:5000

## Environment Variables

**server/.env**
| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Long random secret for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `CLIENT_URL` | Frontend origin (for CORS) |
| `CLOUDINARY_*` | Cloud name, API key and secret |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by the admin seed script |

**client/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL |

## Roadmap

- [x] Project scaffolding and dependencies
- [ ] Phase 1: Prisma schema, migration, admin seed script
- [ ] Phase 2: Authentication and role guards
- [ ] Phase 3: Admin landlord management
- [ ] Phase 4: Rooms and settings
- [ ] Phase 5: Renters, occupancy, shifting rooms, move-out
- [ ] Phase 6: Meter readings, billing, paid-till tracking, payments
- [ ] Phase 7: WhatsApp share button and dashboard
- [ ] Phase 8: Deployment

## Security Notes

- Passwords are hashed with bcrypt; sessions use httpOnly cookies
- ID numbers are masked in the UI and never logged
- Renter photos are stored as private (authenticated) Cloudinary assets
- Suspended landlords cannot log in

