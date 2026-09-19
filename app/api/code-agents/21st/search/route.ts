import { searchCatalog } from "@/lib/integrations/twentyfirst/client";

import { guard21st, NextRequest, NextResponse, SearchSchema, twentyFirstErrorResponse } from "../_helpers";

/** Recherche du catalogue 21st.dev (composants, themes, templates) — metadata. */
export async function POST(request: NextRequest) {
  const guard = await guard21st(request, "search", 40);
  if ("response" in guard) return guard.response;

  try {
    const parsed = SearchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requete de recherche invalide (2 a 200 caracteres)" }, { status: 400 });
    }
    const results = await searchCatalog(parsed.data.query, parsed.data.limit);
    return NextResponse.json({ results });
  } catch (error) {
    return twentyFirstErrorResponse(error);
  }
}
