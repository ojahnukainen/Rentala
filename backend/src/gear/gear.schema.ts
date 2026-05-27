export { CreateGearSchema, CreateGearInput } from "@rentala_project/shared";

import { z } from "zod";

export const ListGearQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export type ListGearQuery = z.infer<typeof ListGearQuerySchema>;
