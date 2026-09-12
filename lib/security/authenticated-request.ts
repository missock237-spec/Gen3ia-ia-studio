import { NextRequest } from "next/server";

import {
  verifyFirebaseToken
} from "@/lib/firebase/auth-server";

export async function requireUser(
  request: NextRequest
) {
  const token =
    await verifyFirebaseToken(
      request.headers.get("authorization")
    );

  return token;
}
