import prisma from "../lib/prisma";
import { NotFoundError, ValidationError } from "../errors/AppError";
import { Role } from "../generated/prisma/client";

// Admin bootstrap. Nobody can sign up as ADMIN (role is input: false in
// auth.ts), so the first admin signs up normally and is promoted here:
//   npm run promote-admin -w backend -- someone@cameraclub.fi
// On Render, from the backend service shell after a build:
//   node dist/scripts/promoteAdmin.js someone@cameraclub.fi

export interface PromoteAdminResult {
  email: string;
  alreadyAdmin: boolean;
}

export async function promoteAdmin(rawEmail: string): Promise<PromoteAdminResult> {
  // better-auth stores emails lowercased
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    throw new ValidationError("An email address is required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new NotFoundError(`No user with email ${email} — they must sign up first`);
  }

  if (user.role === Role.ADMIN) {
    return { email, alreadyAdmin: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: Role.ADMIN },
  });
  return { email, alreadyAdmin: false };
}

if (require.main === module) {
  promoteAdmin(process.argv[2] ?? "")
    .then(({ email, alreadyAdmin }) => {
      console.log(alreadyAdmin ? `${email} is already an admin.` : `Promoted ${email} to ADMIN.`);
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
