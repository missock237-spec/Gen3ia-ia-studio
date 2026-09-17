import nextConfig from "eslint-config-next";

/**
 * ESLint 9 flat config for Gen3ia (Next.js 16 + TypeScript).
 * Uses the official eslint-config-next presets (flat, native ESM).
 */
const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "desktop/**",
      "sandbox/**",
      "live-agent/**",
      "functions/**",
      "public/sw.js",
    ],
  },
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  {
    rules: {
      // Les tests vitest utilisent des expressions regulieres longues et
      // des caracteres d'echappement legittimes (bornes de fenetres horaires).
      "no-useless-escape": "off",
    },
  },
];

export default config;
