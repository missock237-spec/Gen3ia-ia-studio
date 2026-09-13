import { NextRequest } from "next/server";

import {
  verifyFirebaseToken,
} from "@/lib/firebase/auth-server";

import {
  validateRequest,
} from "./request-security";

export interface AuthenticatedUser {
  uid: string;

  email?: string;

  name?: string;

  claims?: Record<
    string,
    unknown
  >;
}

export async function requireUser(
  request: NextRequest,
): Promise<AuthenticatedUser> {
  validateRequest(request);

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (!authorization) {
    throw new Error(
      "Missing Authorization header",
    );
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    throw new Error(
      "Invalid Authorization scheme",
    );
  }

  const token =
    await verifyFirebaseToken(
      authorization,
    );

  if (!token) {
    throw new Error(
      "Authentication failed",
    );
  }

  return {
    uid:
      token.uid,

    email:
      token.email,

    name:
      token.name,

    claims:
      token as unknown as Record<
        string,
        unknown
      >,
  };
} 
