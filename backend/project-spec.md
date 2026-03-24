# Project Specification: Camera Club Gear Loaning System

## 1. Project Overview
We are building a production-grade backend for a camera club gear rental and loaning system. The system allows club members to borrow multiple pieces of photography equipment in a single transaction, tracks the status of each item, and handles partial returns (e.g., returning a camera body but keeping a lens longer). It is important that user cannot create loans to past. Also it is important that same gear items can not be booked for multiple at same time perdiod. 

## 2. Tech Stack
* **Runtime:** Node.js 24
* **Language:** TypeScript (Strict mode enabled)
* **Framework:** Express.js (or similar lightweight router)
* **Database:** PostgreSQL 18
* **ORM:** Prisma 7.0
* **Validation:** Zod (for validating API request bodies)
* **Testing** Vitetest, Supertest

## 3. Architecture & Coding Standards
When generating code for this project, strictly adhere to the following standards:
* **Layered Architecture:** Do not put business logic inside route handlers. Separate code into `Routes` -> `Controllers` -> `Services`. All database calls must happen in the Service layer.
* **Strict Typing:** Do not use `any`. Use Prisma's generated types (e.g., `Prisma.LoanGetPayload`) for database results.
* **Centralized Error Handling:** Implement a global error-handling middleware. Services should throw custom application errors (e.g., `NotFoundError`, `ValidationError`), which the middleware catches and formats into standardized JSON responses.
* **Transactions:** Any operation that modifies multiple tables (like creating a loan and updating gear status) MUST use Prisma's `$transaction` API.
* **API Documentation:** Use swagger-ui-express and @asteasolutions/zod-to-openapi. Every API route must be documented. The OpenAPI schema must be generated dynamically from the Zod validation schemas to ensure a single source of truth. The Swagger UI should be served at the /api-docs endpoint
* **TDD Style Development:** For all new features create first testcases and show test cases before creating any test code. Also after the tests are done show the created cases before writing code. 

## 4. Database Schema
Below is the Prisma schema to be used. It uses a "Header-Line Item" pattern to allow multiple gear items per loan.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  MEMBER
  ADMIN
}

enum GearStatus {
  AVAILABLE
  RENTED
  MAINTENANCE
  LOST
}

enum ItemStatus {
  ACTIVE
  RETURNED
  OVERDUE
  LOST
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(MEMBER)
  loans     Loan[]   
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Gear {
  id           String     @id @default(uuid())
  name         String
  serialNumber String     @unique
  category     String
  status       GearStatus @default(AVAILABLE)
  loanItems    LoanItem[] 
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([category])
}

model Loan {
  id         String     @id @default(uuid())
  userId     String
  borrowedAt DateTime   @default(now())
  dueDate    DateTime
  user       User       @relation(fields: [userId], references: [id])
  items      LoanItem[] 
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@index([userId])
}

model LoanItem {
  id         String     @id @default(uuid())
  loanId     String
  gearId     String
  returnedAt DateTime?  
  status     ItemStatus @default(ACTIVE)
  loan       Loan       @relation(fields: [loanId], references: [id])
  gear       Gear       @relation(fields: [gearId], references: [id])

  @@index([loanId])
  @@index([gearId])
  @@index([status])
}
```
## 5. Core Business Logic Requirements
When implementing the services, pay special attention to these critical flows:

### 5.1. Checkout / Creating a Loan:
* Verify that all requested gearIds currently have a status of AVAILABLE.
* Check for date overlaps to prevent double-booking.
* Create the Loan record.
* Create a LoanItem record for each piece of gear.
* Update the status of all checked-out Gear to RENTED.
* Constraint: This entire flow must be wrapped in a single Prisma $transaction.

### 2.Handling Returns (Partial or Full):
* A return payload will include specific LoanItem IDs, not just the overarching Loan ID.
* Update the returnedAt timestamp and set the ItemStatus to RETURNED for the specific LoanItem.
* Update the underlying Gear status back to AVAILABLE.
* If all LoanItems for a Loan are returned, the overarching Loan can be considered complete.

## 6. Changelog Maintenance
* **Automated Logging:** You must maintain a `changelog.md` file in the root directory.
* **Format:** Follow the standard "Keep a Changelog" format (grouping changes under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`).
* **Trigger:** Every time you successfully complete a prompt that adds a new feature, database model, API route, or major architectural change, you must automatically append the change to `changelog.md` under an `## [Unreleased]` heading before considering the task complete.

## 7. Tool Usage Policy (Prisma MCP)
- **Primary verification tool:** You have access to the **Prisma MCP**.
- **Schema Checks:** Before writing any complex query, use the Prisma MCP to inspect the current model definitions (e.g., to check exact field names like `userId` vs `user_id`).
- **Data Verification:**
  - **Do NOT** write throwaway scripts (e.g., `check_db.js`) to verify data creation.
  - **DO** use the Prisma MCP tool to query the database directly after running a mutation.
  - *Example:* "Create the booking via API, then ask Prisma MCP to find that booking ID to confirm it saved correctly."