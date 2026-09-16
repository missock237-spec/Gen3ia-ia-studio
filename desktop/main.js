/**
 * Gen3ia AI Studio — application PC (Windows / Linux / macOS).
 *
 * Coquille Electron securisee autour de l'application web gen3ia.online.
 * - contextIsolation + sandbox : le rendu n'a aucun acces Node.
 * - User-Agent suffixe `Gen3iaDesktop/<version>` : reconnu par le systeme de
 *   detection d'appareils cote serveur (lib/device/detect.ts) -> l'agent Live
 *   devient disponible, tout en restant bloque sur mobile/tablette.
 * - Les liens externes s'ouvrent dans le navigateur systeme.
 */
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("node:path");

const APP_URL = process.env.GEN3IA_APP_URL || "https://gen3ia.online";
const APP_NAME = "Gen3ia AI Studio";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#070a12",
    autoHideMenuBar: true,
    title: APP_NAME,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: true,
    },
  });

  // Marqueur de detection : le site reconnait l'app PC via l'User-Agent.
  const userAgent = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(`${userAgent} Gen3iaDesktop/${app.getVersion()}`);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Liens externes / popups -> navigateur systeme (jamais de nouvelle fenetre web).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (typeof url === "string" && url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Navigation interne : toujours l'app URL autorisee, sinon bloque.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = new URL(APP_URL);
    const target = new URL(url);
    if (target.origin !== allowed.origin) {
      event.preventDefault();
      if (target.protocol === "https:") shell.openExternal(url);
    }
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Vue",
      submenu: [
        { role: "reload", label: "Recharger" },
        { role: "forceReload", label: "Recharger (forcer)" },
        { type: "separator" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { role: "resetZoom", label: "Zoom normal" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
        { role: "toggleDevTools", label: "Outils de développement" },
      ],
    },
    {
      label: "Fenêtre",
      submenu: [{ role: "minimize", label: "Réduire" }, { role: "close", label: "Fermer" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setName(APP_NAME);

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
