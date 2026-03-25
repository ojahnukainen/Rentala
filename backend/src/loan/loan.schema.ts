import { z } from "zod";

export const CreateLoanSchema = z.object({
  userId: z.string().min(1),
  gearIds: z.array(z.string().min(1)).min(1, "At least one gear item is required"),
  dueDate: z.coerce.date(),
});

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;

export const ProcessReturnSchema = z.object({
  loanItemIds: z.array(z.string().min(1)).min(1, "At least one loan item ID is required"),
});

export type ProcessReturnInput = z.infer<typeof ProcessReturnSchema>;
