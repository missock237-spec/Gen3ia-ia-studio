import { getThemeCached } from "@/lib/integrations/twentyfirst/cache";

import { guard21st, IdSchema, NextRequest, NextResponse, twentyFirstErrorResponse } from "../_helpers";

/** Tokens CSS d'un theme 21st.dev (cache Firestore, ne reconsomme pas le quota). */
export async function POST(request: NextRequest) {
  const guard = await guard21st(request, "theme", 20);
  if ("response" in guard) return guard.response;

  try {
    const parsed = IdSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifiant de theme invalide" }, { status: 400 });
    }
    const { payload, cached } = await getThemeCached(parsed.data.id);
    return NextResponse.json({ theme: payload, cached });
  } catch (error) {
    return twentyFirstErrorResponse(error);
  }
}
