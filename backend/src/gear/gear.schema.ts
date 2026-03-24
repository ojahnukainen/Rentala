import { z } from "zod";

export const CreateGearSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  category: z.string().min(1),
});

export type CreateGearInput = z.infer<typeof CreateGearSchema>;
