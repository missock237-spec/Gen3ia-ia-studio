import { getUsage } from "@/lib/integrations/twentyfirst/client";

import { guard21st, NextRequest, NextResponse, twentyFirstErrorResponse } from "../_helpers";

/** Quota et options du compte 21st.dev (affichage dans l'Atelier d'Interfaces). */
export async function GET(request: NextRequest) {
  const guard = await guard21st(request, "usage", 10);
  if ("response" in guard) return guard.response;

  try {
    const usage = await getUsage();
    return NextResponse.json({ usage });
  } catch (error) {
    return twentyFirstErrorResponse(error);
  }
}
