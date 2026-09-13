import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  requireUser,
} from "@/lib/security/authenticated-request";

import {
  research,
} from "@/lib/research/v2/service";

const Schema = z.object({
  query: z
    .string()
    .min(3)
    .max(20_000),
});

export async function POST(
  request: NextRequest,
) {
  try {
    await requireUser(request);

    const body =
      await request.json();

    const parsed =
      Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await research(
        parsed.data.query,
      );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Research error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Research failed",
      },
      {
        status: 500,
      },
    );
  }
}
