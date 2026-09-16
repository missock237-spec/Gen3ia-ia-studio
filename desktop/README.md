# Gen3ia AI Studio — Application PC (Windows / Linux)

Coquille **Electron** securisee autour de https://gen3ia.online. L'app PC
debloque l'**Agent Live** (capture d'ecran + controle clavier/souris) via le
marqueur `Gen3iaDesktop/` ajoute a l'User-Agent, reconnu par la detection
d'appareils du site (`lib/device/detect.ts`).

## Developpement

```bash
cd desktop
npm install

# Site de production (gen3ia.online)
npm start

# Site local (next dev lance a cote)
npm run start:local
```

## Construire les installateurs

| Cible   | Commande         | Sorties                                |
| ------- | ---------------- | -------------------------------------- |
| Windows | `npm run dist:win`   | `dist/*.exe` (installeur NSIS + portable) |
| Linux   | `npm run dist:linux` | `dist/*.AppImage`, `dist/*.deb`           |
| macOS   | `npm run dist:mac`   | `dist/*.dmg` (bonus, non demande)         |

Les builds CI (Windows + Linux) sont automatises via
`.github/workflows/desktop-build.yml` :

- declenchement manuel (`workflow_dispatch`) ou push d'un tag `desktop-v*`
  (ex. `git tag desktop-v1.0.0 && git push origin desktop-v1.0.0`) ;
- les installateurs sont publies automatiquement dans les **Releases** GitHub
  — c'est le lien utilise par l'ecran « PC uniquement » du site.

## Configuration

| Variable          | Defaut                 | Role                                |
| ----------------- | ---------------------- | ----------------------------------- |
| `GEN3IA_APP_URL`  | `https://gen3ia.online` | URL chargee par la fenetre          |

## Securite

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Le preload n'expose que `window.gen3iaDesktop` (lecture seule : version,
  plateforme) utilise par `lib/device/use-device.ts`.
- Navigation restreinte a l'origine de `GEN3IA_APP_URL` ; liens externes
  ouverts dans le navigateur systeme.

## Agent Live — rappel

L'app PC ne capture pas elle-meme l'ecran : elle donne acces a la page
`/live` du site (bloquee sur mobile/tablette) qui cree les sessions. Le
client qui capture l'ecran reste le module Node `live-agent/`
(`screenshot-desktop` + `nut-js`), a lancer sur le PC a piloter avec les
variables `GEN3IA_LIVE_*` affichees par le tableau de bord.
