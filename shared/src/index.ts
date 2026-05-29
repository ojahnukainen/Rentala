import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────
// Defined as const objects so they work in both backend and frontend without a
// Prisma dependency. Values match the Prisma-generated enums exactly.

export const Role = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const GearStatus = {
  AVAILABLE: "AVAILABLE",
  RENTED: "RENTED",
  MAINTENANCE: "MAINTENANCE",
  LOST: "LOST",
} as const;
export type GearStatus = (typeof GearStatus)[keyof typeof GearStatus];

export const ItemStatus = {
  RESERVED: "RESERVED",
  ACTIVE: "ACTIVE",
  RETURNED: "RETURNED",
  OVERDUE: "OVERDUE",
  LOST: "LOST",
} as const;
export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

// ── Gear schemas ──────────────────────────────────────────────────────────────

export const CreateGearSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  category: z.string().min(1),
});

export type CreateGearInput = z.infer<typeof CreateGearSchema>;

// ── User schemas ──────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum([Role.MEMBER, Role.ADMIN]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ── Loan schemas ──────────────────────────────────────────────────────────────

export const CreateLoanSchema = z.object({
  gearIds: z.array(z.string().min(1)).min(1, "At least one gear item is required"),
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
});

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;

export const ProcessReturnSchema = z.object({
  loanItemIds: z.array(z.string().min(1)).min(1, "At least one loan item ID is required"),
});

export type ProcessReturnInput = z.infer<typeof ProcessReturnSchema>;
