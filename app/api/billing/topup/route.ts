import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/auth/firebase";
import { createChariowTopupCheckout } from "@/lib/billing/chariow";

const BodySchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phoneNumber: z.string().trim().min(6).max(32),
  countryCode: z.string().trim().min(2).max(10),
});

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request);
    const body = BodySchema.parse(await request.json());
    const email = token.email?.trim();
    if (!email) throw new Error("Your Firebase account must have an email address for Chariow checkout.");

    const origin = new URL(request.url).origin;
    const result = await createChariowTopupCheckout({
      email,
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber,
      countryCode: body.countryCode,
      redirectUrl: `${origin}/billing?payment=completed`,
      customerIp: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });

    const checkoutUrl = result?.data?.payment?.checkout_url;
    if (!checkoutUrl) throw new Error("Chariow did not return a payment checkout URL.");
    return Response.json({ success: true, checkoutUrl, saleId: result?.data?.purchase?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create top-up checkout";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
