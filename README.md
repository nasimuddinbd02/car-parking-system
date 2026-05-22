# ParkEasy SaaS: Multi-Tenant Car Parking Management System

ParkEasy SaaS is a premium, responsive, and secure **Multi-Tenant Car Parking SaaS Management System** built with **Next.js 16 (App Router)**, **Prisma ORM**, and **SQLite**. 

The system enables parking companies (tenants) to register their workspace, design custom multi-floor slot layouts, onboard attendants, manage active sessions, configure dynamic tariff pricing models, and monitor live daily, monthly, and yearly financial dashboards.

---

## 🌟 Architectural Features
* **Tenant Isolation**: Secure partitioning of resources (`User`, `ParkingLot`, `PricingRule`, `Ticket`, `Reservation`) by `tenantId`.
* **Dynamic Routing**: Automatic context resolution using dynamic sub-routes: `/tenant/[tenantSlug]/...`.
* **Stateful Flow Verification**: Pure server-side session management using cookie tokens to safely authorize attendant, customer, and admin workspaces.
* **Smart Allocation Engine**: Automatically assigns vehicles to the closest available matching parking slots (Small, Medium, Large, and EV) on gate check-in.
* **Financial Reporting Suite**: Real-time svg charts, printable receipt layouts via custom CSS print sheets, and spreadsheet-friendly CSV exports.

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
* **Node.js**: v18.x or above (v20+ recommended).
* **SQLite**: Embedded database (no external installation required).

### Installation

1. Install project package dependencies:
   ```bash
   npm install
   ```

2. Initialize and migrate the local SQLite database:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Seed the database with default tenants, users, layouts, and pricing:
   ```bash
   npx prisma db seed
   ```

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

To verify the dynamic multi-tenant routes and E2E gates, you can use the archived verification scripts inside the brain's scratch folder:

* **Basic Page Integrity Checks**:
  ```bash
  npx tsx C:\Users\User\.gemini\antigravity\brain\22719528-cdaf-4bda-a033-ad012a72a745\scratch\test-pages.ts
  ```

* **Full Gate Check-In & Check-Out E2E Simulation**:
  ```bash
  npx tsx C:\Users\User\.gemini\antigravity\brain\22719528-cdaf-4bda-a033-ad012a72a745\scratch\test-e2e-flow.ts
  ```
