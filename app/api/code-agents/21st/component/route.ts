import { getComponentCached } from "@/lib/integrations/twentyfirst/cache";

import { guard21st, IdSchema, NextRequest, NextResponse, twentyFirstErrorResponse } from "../_helpers";

/**
 * Code source d'un composant 21st.dev.
 * Reponse mise en cache Firestore : une meme recuperation ne reconsomme
 * jamais le quota quotidien de l'API.
 */
export async function POST(request: NextRequest) {
  const guard = await guard21st(request, "component", 20);
  if ("response" in guard) return guard.response;

  try {
    const parsed = IdSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifiant de composant invalide" }, { status: 400 });
    }
    const { payload, cached } = await getComponentCached(parsed.data.id);
    return NextResponse.json({ component: payload, cached });
  } catch (error) {
    return twentyFirstErrorResponse(error);
  }
}
