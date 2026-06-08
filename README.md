# ParkEasy SaaS: Multi-Tenant Car Parking Management System

ParkEasy SaaS is a premium, responsive, and secure **Multi-Tenant Car Parking SaaS Management System** built with **Next.js 16 (App Router)**, **Prisma ORM**, and **SQLite**. 

The system enables parking companies (tenants) to register their workspace, design custom multi-floor slot layouts, onboard attendants, manage active sessions, configure dynamic tariff pricing models, and monitor live daily, monthly, and yearly financial dashboards.

---

## 🧰 Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** (App Router, Server Actions) |
| UI Runtime | **React 19** |
| Language | **TypeScript 5** |
| ORM / Database | **Prisma 5** + **SQLite** |
| Styling | **Tailwind CSS v4**, `tw-animate-css` |
| Components | **shadcn** / **Base UI**, **lucide-react** icons |
| Auth & Crypto | Node `crypto` — salted **scrypt** password hashing, **AES-256-GCM** session tokens |

---

## 🌟 Architectural Features
* **Tenant Isolation**: Secure partitioning of resources (`User`, `ParkingLot`, `PricingRule`, `Ticket`, `Reservation`) by `tenantId`.
* **Dynamic Routing**: Automatic context resolution using dynamic sub-routes: `/tenant/[tenantSlug]/...`.
* **Stateful Flow Verification**: Pure server-side session management using cookie tokens to safely authorize attendant, customer, and admin workspaces.
* **Smart Allocation Engine**: Automatically assigns vehicles to the closest available matching parking slots (Small, Medium, Large, and EV) on gate check-in.
* **Financial Reporting Suite**: Real-time svg charts, printable receipt layouts via custom CSS print sheets, and spreadsheet-friendly CSV exports.

---

## 🏗️ Application Architecture (Three-Tier Layer)

The project implements a clean three-tier architecture to decouple layout/presentation logic, business validations, and direct database querying operations:

```mermaid
graph TD
    UI["UI / Presentation Layer<br>(Pages, Server Actions, Layouts)"] -->|invokes| Services["Business Service Layer<br>(src/lib/services/*)"]
    Services -->|delegates to| DataAccess["Data Access Layer<br>(src/lib/data-access/*)"]
    DataAccess -->|queries / mutations| DB[("SQLite Database<br>(Prisma Client)")]
```

1. **Presentation / UI Layer (`src/app/`, `src/lib/actions.ts`)**: Decoupled server page controllers, layout templates, and client-facing Server Actions. They orchestrate views and process interactions by calling service methods. They have no direct Prisma client imports.
2. **Business Service Layer (`src/lib/services/`)**: Encapsulates business validation rules, sanitization, default definitions, fallback lookup heuristics (such as matching vehicle sizes to slot capabilities), and orchestrates multi-step processes.
3. **Data Access Layer (`src/lib/data-access/`)**: Contains raw Prisma database reads, writes, updates, and database-level transactional operations. Function names employ descriptive domain verbs (`findTenantBySlug`, `checkInTicketTransaction`, `updatePricingRule`) and keep queries highly decoupled from service-level business choices.

---

## 📊 Database Design (Visual ERD)

Below is the complete database model representation. Since the database layer is implemented using SQLite (which does not natively support enum types), data constraints are enforced at the application layer via Prisma schema validations and server-side forms.

```mermaid
erDiagram
    Tenant {
        string id PK
        string name
        string slug UK
        datetime createdAt
        datetime updatedAt
    }

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        string role "ADMIN | ATTENDANT | CUSTOMER"
        string tenantId FK
        datetime createdAt
        datetime updatedAt
    }

    ParkingLot {
        string id PK
        string name
        string location
        string tenantId FK
        datetime createdAt
        datetime updatedAt
    }

    ParkingFloor {
        string id PK
        int floorNumber
        string parkingLotId FK
        datetime createdAt
        datetime updatedAt
    }

    ParkingSlot {
        string id PK
        string slotNumber
        string slotType "SMALL | MEDIUM | LARGE | EV"
        string status "AVAILABLE | OCCUPIED | RESERVED | MAINTENANCE"
        string floorId FK
        datetime createdAt
        datetime updatedAt
    }

    PricingRule {
        string id PK
        string vehicleType "SMALL | MEDIUM | LARGE | EV"
        float baseRate
        float hourlyRate
        float peakMultiplier
        string tenantId FK
        datetime createdAt
        datetime updatedAt
    }

    Ticket {
        string id PK
        string ticketNumber UK
        string vehicleNumber
        string vehicleType "SMALL | MEDIUM | LARGE | EV"
        datetime entryTime
        datetime exitTime
        string status "ACTIVE | PAID | CANCELLED"
        float totalFee
        string paymentStatus "PENDING | PAID"
        string paymentMethod "CASH | CARD | WALLET"
        string tenantId FK
        string slotId FK
        string attendantId FK "Entry Attendant"
        string exitAttendantId FK "Exit Attendant"
        string customerId FK "Associated Customer"
        datetime createdAt
        datetime updatedAt
    }

    Reservation {
        string id PK
        string customerId FK
        string slotId FK
        datetime startTime
        datetime endTime
        string status "PENDING | CONFIRMED | COMPLETED | CANCELLED"
        datetime createdAt
        datetime updatedAt
    }

    Tenant ||--o{ User : "houses"
    Tenant ||--o{ ParkingLot : "owns"
    Tenant ||--o{ PricingRule : "defines"
    Tenant ||--o{ Ticket : "records"

    ParkingLot ||--|{ ParkingFloor : "has"
    ParkingFloor ||--o{ ParkingSlot : "contains"

    User ||--o{ Ticket : "checkins"
    User ||--o{ Ticket : "checkouts"
    User ||--o{ Ticket : "drives"
    User ||--o{ Reservation : "creates"

    ParkingSlot ||--o{ Ticket : "allocates"
    ParkingSlot ||--o{ Reservation : "holds"
```

---

## 🔒 Multi-Tenant Database Isolation

Tenant data integrity is enforced by routing all entities through a root `Tenant` mapping. Database queries always partition operations using the tenant identifier parsed from the route context or session cookie.

```
                  ┌──────────────────────────────────────────────┐
                  │          Root Tenant (e.g. Metro Park)       │
                  └──────┬────────────────────┬────────────┬─────┘
                         │                    │            │
         ┌───────────────▼──────┐      ┌──────▼──────┐     │
         │      Users List      │      │ Parking Lot │     │
         │ (Admin & Attendants) │      └──────┬──────┘     │
         └──────────────────────┘             │            │
                                       ┌──────▼──────┐     │
                                       │    Floors   │     │
                                       └──────┬──────┘     │
                                              │            │
                                       ┌──────▼──────┐     │
                                       │ Parking Slot│     │
                                       └──────┬──────┘     │
                                              │            │
                                 ┌────────────▼────────────▼───────────┐
                                 │ Tickets & Reservations Scoped Context│
                                 └─────────────────────────────────────┘
```

---

## 🔐 Security Model

Authentication and session handling rely entirely on Node's built-in `crypto` module — no third-party auth dependency.

* **Password hashing** — Passwords are hashed with **salted scrypt** (`hashPassword` in [`src/lib/utils.ts`](src/lib/utils.ts)). Each credential gets a unique 16-byte random salt and a 64-byte derived key, stored as `scrypt$<salt>$<key>`. Verification (`verifyPassword`) recomputes the key from the stored salt and compares it in constant time with `crypto.timingSafeEqual`, so equal passwords never produce equal hashes and timing leaks are avoided.
* **Login flow** — `loginUser` resolves the tenant by slug, fetches the user by `email + tenantId`, then verifies the supplied password against the stored hash. Failed and successful attempts are logged via the structured logger.
* **Session tokens** — On login the session payload is sealed with **AES-256-GCM** authenticated encryption ([`src/lib/session.ts`](src/lib/session.ts)) and stored in an `httpOnly` cookie (`secure` in production, 1-day expiry). Any tampering fails the GCM auth-tag check and the session is rejected.
* **Tenant isolation** — Every authorization decision is scoped by the `tenantId` carried in the encrypted session, preventing cross-tenant access.

> ⚠️ **Production note:** Set a strong `SESSION_SECRET` (32+ characters) in your environment. A development fallback secret is used when it is unset — never rely on it in production.

---

## 📋 Schema Details & Fields Reference

### 1. `Tenant`
Stores registration workspace info.
* `id` (String, PK): UUID.
* `name` (String): Business workspace name (e.g., "Metropolis Plaza Parking").
* `slug` (String, Unique Index): URL path segment (e.g., `metro-park`).

### 2. `User`
Accounts registered to a specific tenant workspace.
* `role`: Allowed string values are `"ADMIN"`, `"ATTENDANT"`, and `"CUSTOMER"`.
* `tenantId` (String, FK): Direct link to parent `Tenant`. Cascades on deletion.

### 3. `ParkingLot`
The physical parking facility structure.
* `tenantId` (String, FK): Scopes the lot to the tenant owner.

### 4. `ParkingFloor`
Floors nested under parking lots.
* Unique Constraint: `[parkingLotId, floorNumber]` ensures no duplicate floor indices exist within the same lot.

### 5. `ParkingSlot`
The atomic parking spaces.
* `slotType`: `"SMALL"` (Motorcycles), `"MEDIUM"` (Cars), `"LARGE"` (Vans/Trucks), or `"EV"` (Charging stalls).
* `status`: `"AVAILABLE"`, `"OCCUPIED"`, `"RESERVED"`, or `"MAINTENANCE"`.
* Unique Constraint: `[floorId, slotNumber]` prevents duplicate slot labels on a single floor.

### 6. `PricingRule`
Configurable dynamic pricing rates.
* `baseRate` (Float): Initial fee for entry / first hour.
* `hourlyRate` (Float): Hourly fee rate accrued post-initial hour.
* Unique Constraint: `[tenantId, vehicleType]` defines exactly one pricing config per vehicle class per tenant.

### 7. `Ticket`
Active or paid parking session tracking logs.
* `ticketNumber` (String, Unique Index): User-readable identifier prefix (e.g., `PK-2026-XXXXXX`).
* `status`: `"ACTIVE"`, `"PAID"`, or `"CANCELLED"`.
* `paymentStatus`: `"PENDING"` or `"PAID"`.
* `paymentMethod`: `"CASH"`, `"CARD"`, or `"WALLET"` (nullable).

### 8. `Reservation`
Advanced parking reservations created by customers.
* `status`: `"PENDING"`, `"CONFIRMED"`, `"COMPLETED"`, or `"CANCELLED"`.

---

## 🛠️ Getting Started & Local Setup

### Prerequisites
* **Node.js**: v20.9 or above (required by Next.js 16).
* **SQLite**: Embedded database (no external installation required).

### Environment Variables

The SQLite connection string is defined directly in `prisma/schema.prisma` (`file:./dev.db`), so no `.env` is required to get started. For anything beyond local development, set:

| Variable | Required | Description |
| --- | --- | --- |
| `SESSION_SECRET` | Production | Secret (32+ chars) used to derive the AES-256-GCM session key. Falls back to an insecure development default if unset. |

### Installation

1. Install project package dependencies:
   ```bash
   npm install
   ```

2. Apply the database migrations to create the local SQLite schema:
   ```bash
   npx prisma migrate dev
   ```

3. Seed the database with default tenants, users, layouts, and pricing:
   ```bash
   npx prisma db seed
   ```
   > `prisma migrate dev` runs the seed automatically on a fresh database; run this step manually whenever you want to reset the demo data.

### Demo Accounts

The seed script provisions two tenant workspaces. Sign in at `/tenant/<slug>/login` (the login page also offers one-click "Demo Account Simulation" buttons).

| Tenant (slug) | Role | Email | Password |
| --- | --- | --- | --- |
| Metropolis Plaza Parking (`metro-park`) | Admin | `admin@metro.com` | `admin123` |
| Metropolis Plaza Parking (`metro-park`) | Attendant | `att1@metro.com` | `att123` |
| Metropolis Plaza Parking (`metro-park`) | Customer | `driver@metro.com` | `driver123` |
| Apex Mall Parking (`apex-park`) | Admin | `admin@apex.com` | `admin123` |
| Apex Mall Parking (`apex-park`) | Attendant | `att1@apex.com` | `att123` |

---

## 🎨 Redesigned Premium Dashboard UI

The tenant-specific dashboard boards under `/tenant/[tenantSlug]` feature a premium, cohesive glassmorphic design theme:

* **Admin Cockpit (`/admin`)**: Interactive slot layout mapping statuses with visual toggles for administrative maintenance, custom tooltips, EV slot `BatteryCharging` icon support, and live occupancy rates.
* **Financial Reports (`/admin/reports`)**: Real-time auditing panel with date interval filters, circular or horizontal progress bar metrics for vehicle and payment distributions, printable invoice sheets, and clean CSV export capabilities.
* **Gate Attendant Board (`/attendant`)**: Terminal entry/exit check-in dashboards complete with a virtual ticket checkout stub receipt, punch holes, active time calculations, barcodes, and current parked car ledgers.
* **Driver Customer Portal (`/customer`)**: Interactive visual slot maps with real-time availability filters, datetime booking overlay modals, reservation trackers, and ticket history logs.

---

## 🚀 Running the App

### Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the SaaS landing page.

### Production Build & Deploy
```bash
npm run build
npm start
```

---

## 🧪 Testing and Verification

To verify the routes, authorization states, and E2E gate flow simulation checks, run the local scripts:

* **Basic Page Integrity Checks**:
  ```bash
  npx tsx scratch/test-pages.ts
  ```

* **Full Gate Check-In & Check-Out E2E Simulation**:
  ```bash
  npx tsx scratch/test-e2e-flow.ts
  ```

