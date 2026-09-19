import { searchLogos } from "@/lib/integrations/twentyfirst/client";

import { guard21st, NextRequest, NextResponse, twentyFirstErrorResponse } from "../_helpers";

/** Recherche de logos SVG (svgl.app via 21st.dev — gratuit et illimite). */
export async function POST(request: NextRequest) {
  const guard = await guard21st(request, "logos", 40);
  if ("response" in guard) return guard.response;

  try {
    const body = (await request.json()) as { query?: unknown };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (query.length < 2 || query.length > 80) {
      return NextResponse.json({ error: "Requete de logo invalide (2 a 80 caracteres)" }, { status: 400 });
    }
    const logos = await searchLogos(query);
    return NextResponse.json({ logos });
  } catch (error) {
    return twentyFirstErrorResponse(error);
  }
}
