/**
 * Pont securise entre l'app PC et le site Gen3ia.
 * Expose uniquement des donnees d'identification lecture seule — aucun acces
 * Node, aucune API privilegiee n'est exposee au rendu web.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("gen3iaDesktop", {
  isGen3iaDesktop: true,
  version: process.env.GEN3IA_DESKTOP_VERSION || "1.0.0",
  platform: process.platform, // win32 | linux | darwin
});
