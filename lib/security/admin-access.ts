import "server-only";

import type { NextRequest } from "next/server";
import { requireUser, type AuthenticatedUser } from "./authenticated-request";

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (user.claims?.admin !== true) {
    throw new Error("Administrator access required.");
  }
  return user;
}
