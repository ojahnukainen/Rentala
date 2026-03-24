import { z } from "zod";
import { Role } from "../generated/prisma/client";

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum([Role.MEMBER, Role.ADMIN]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
