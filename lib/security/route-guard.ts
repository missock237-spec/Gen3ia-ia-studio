import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
} from "./authenticated-request";

import {
  securityHeaders,
} from "./request-security";

export interface RouteContext {
  userId: string;

  email?: string;

  claims?: Record<
    string,
    unknown
  >;
}

export async function protectRoute(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      context: RouteContext;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  try {
    const user =
      await requireUser(
        request,
      );

    return {
      ok: true,

      context: {
        userId: user.uid,

        email: user.email,

        claims: user.claims,
      },
    };
  } catch (error) {
    const response =
      NextResponse.json(
        {
          success: false,

          error:
            error instanceof Error
              ? error.message
              : "Unauthorized",
        },
        {
          status: 401,
        },
      );

    securityHeaders(
      response.headers,
    );

    return {
      ok: false,
      response,
    };
  }
      }
