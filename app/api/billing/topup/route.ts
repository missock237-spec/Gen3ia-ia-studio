import { verifyFirebaseToken } from "@/lib/auth/firebase";

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request);
    if (!token.email?.trim()) {
      throw new Error("Your Firebase account must have an email address for Chariow checkout.");
    }

    const url = process.env.CHARIOW_TOPUP_STORE_URL?.trim();
    if (!url) throw new Error("CHARIOW_TOPUP_STORE_URL is not configured.");

    return Response.json({
      success: true,
      checkoutUrl: url,
      customerEmail: token.email.trim().toLowerCase(),
      paymentMode: "pay_what_you_want",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create top-up checkout";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
