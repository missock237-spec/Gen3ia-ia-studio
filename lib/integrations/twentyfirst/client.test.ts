import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TwentyFirstError,
  getComponent,
  getUsage,
  searchCatalog,
} from "./client";

const SEARCH_FIXTURE = `8 result(s) across 21st.dev (metadata only).

### [component] Animated Menu Bar  [id: 3184]
by itsankitverma
A modern, responsive menu bar React component featuring animated icon expansion.
preview: https://cdn.21st.dev/test/preview.webp
install: npx shadcn@latest add "https://21st.dev/r/x/y"
→ get the code: get_component({ id: 3184 })

### [theme] Midnight Violet  [id: 9205]
by lavikatiyar
A dark violet theme.
page: https://21st.dev/r/lavikatiyar/bento-grid
`;

const COMPONENT_FIXTURE = `# Animated Menu Bar — Default
A modern, responsive menu bar.

install: npx shadcn@latest add "https://21st.dev/r/x/y"

## Component
\`\`\`tsx
export function MenuBar() {
  return <nav data-active="true" />;
}
\`\`\`

## Demo
\`\`\`tsx
<MenuBar initial="dashboard" />
\`\`\`
`;

function jsonResponse(text: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }] } }),
    text: async () => text,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("21st.dev client", () => {
  it("refuse d'appeler l'API sans cle configuree", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "");
    await expect(searchCatalog("hero")).rejects.toThrow(TwentyFirstError);
  });

  it("parse le catalogue de recherche", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(SEARCH_FIXTURE)));

    const results = await searchCatalog("menu bar", 5);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ kind: "component", id: "3184", name: "Animated Menu Bar", author: "itsankitverma" });
    expect(results[0].previewUrl).toBe("https://cdn.21st.dev/test/preview.webp");
    expect(results[1]).toMatchObject({ kind: "theme", id: "9205" });
  });

  it("parse le code d'un composant (bloc Component + Demo separes)", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(COMPONENT_FIXTURE)));

    const component = await getComponent("3184");
    expect(component.name).toBe("Animated Menu Bar");
    expect(component.code).toContain("export function MenuBar");
    expect(component.demo).toContain('<MenuBar initial="dashboard" />');
    expect(component.installCommand).toContain("shadcn");
  });

  it("rejette un identifiant non numerique", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    await expect(getComponent("abc")).rejects.toThrow(/invalide/i);
  });

  it("parse le texte de quota get_usage", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          "Tier: free\nFree component-code retrievals: 2/2 remaining today.\n21st AI generation: not enabled.",
        ),
      ),
    );

    const usage = await getUsage();
    expect(usage.tier).toBe("free");
    expect(usage.aiGenerationEnabled).toBe(false);
    expect(usage.freeRetrievalsRemaining).toBe(2);
    expect(usage.freeRetrievalsPerDay).toBe(2);
  });

  it("gere les reponses SSE (text/event-stream)", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"ok-sse"}]}}\n\n';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "text/event-stream" }),
          json: async () => ({}),
          text: async () => sseBody,
        }) as unknown as Response,
      ),
    );

    const results = await searchCatalog("test", 1);
    expect(results).toEqual([]);
  });

  it("transforme une erreur outil MCP en TwentyFirstError", async () => {
    vi.stubEnv("TWENTY_FIRST_API_KEY", "21st_sk_test_key_1234567890");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse("") /* vide -> fallback */,
      ),
    );
    // Simulation directe d'un result.isError via un deuxieme stub
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            jsonrpc: "2.0",
            id: 1,
            result: { isError: true, content: [{ type: "text", text: "Quota exceeded for today" }] },
          }),
          text: async () => "",
        }) as unknown as Response,
      ),
    );

    await expect(searchCatalog("hero")).rejects.toThrow(/Quota exceeded/);
  });
});
