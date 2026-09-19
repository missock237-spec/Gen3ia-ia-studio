import { z } from "zod";

import type { ToolDefinition } from "@/lib/tools/types";

import { getComponent, searchCatalog } from "./client";

const InputSchema = z.object({
  action: z.enum(["search", "get"]),
  query: z.string().trim().min(2).max(200).optional(),
  limit: z.number().int().min(1).max(10).default(5),
  componentId: z.string().trim().regex(/^\d{1,10}$/).optional(),
});

interface Output {
  action: "search" | "get";
  results?: Array<{ id: string; name: string; author: string; description: string; previewUrl: string | null }>;
  component?: { id: string; name: string; code: string | null; demo: string | null; installCommand: string | null };
}

/**
 * Outil EXCLUSIF aux agents de code : catalogue de composants pro 21st.dev.
 * Le filtrage par type d'agent se fait dans policyForAgent (seul le niveau
 * "power" des agents de type "code" obtient ui.components dans sa whitelist).
 */
export const twentyFirstUiTool: ToolDefinition<z.infer<typeof InputSchema>, Output> = {
  id: "ui.components",
  name: "UI Components (21st.dev)",
  description:
    "Recherche et recupere des composants d'interface professionnels (React + Tailwind) " +
    "dans le catalogue 21st.dev. action=search avec query pour lister, action=get avec " +
    "componentId pour obtenir le code source complet.",
  category: "mcp",
  risk: "low",
  inputSchema: InputSchema,
  async execute(input): Promise<Output> {
    if (input.action === "search") {
      if (!input.query) throw new Error("action=search requiert query");
      const results = await searchCatalog(input.query, input.limit);
      return {
        action: "search",
        results: results.map((r) => ({
          id: r.id,
          name: r.name,
          author: r.author,
          description: r.description,
          previewUrl: r.previewUrl,
        })),
      };
    }
    if (!input.componentId) throw new Error("action=get requiert componentId");
    const component = await getComponent(input.componentId);
    return {
      action: "get",
      component: {
        id: component.id,
        name: component.name,
        code: component.code,
        demo: component.demo,
        installCommand: component.installCommand,
      },
    };
  },
};
