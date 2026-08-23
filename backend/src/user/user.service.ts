import prisma from "../lib/prisma";
import { User } from "../generated/prisma/client";
import { NotFoundError } from "../errors/AppError";

export const UserService = {
  async listUsers(): Promise<User[]> {
    return prisma.user.findMany();
  },

  // Members may read only their own record. A foreign id throws NotFoundError
  // rather than a 403 so the response does not confirm whether that user
  // exists. Checked before the query so no lookup happens for foreign ids.
  async getUserById(id: string, requestingUserId: string): Promise<User> {
    if (id !== requestingUserId) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  },
};
