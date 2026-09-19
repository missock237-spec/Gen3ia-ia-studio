import Link from "next/link";

/**
 * Vitrine SaaS de Gen3ia — page d'accueil publique.
 *
 * Structure : navigation verre dépoli, héros animé (halos + grille),
 * présentation des 3 produits, capacités, fonctionnement, sécurité,
 * appel à l'action final et pied de page. Animations : entrées en
 * cascade au chargement, révélation au scroll (ScrollReveal), halos
 * pulsants, texte en dégradé animé — désactivées si
 * prefers-reduced-motion.
 */

const PRODUCT_LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/live", label: "Agent Live" },
  { href: "/marketplace", label: "Marketplace" },
];

const STATS = [
  { value: "3 espaces", label: "Studio, Live & Marketplace intégrés" },
  { value: "24/7", label: "Agents autonomes planifiables" },
  { value: "100%", label: "Actions sensibles validées par un humain" },
  { value: "XAF/EUR", label: "Facturation à l'usage, wallet intégré" },
];

const PRODUCTS = [
  {
    href: "/studio",
    eyebrow: "Gen3ia Studio",
    title: "Studio d’agents IA",
    description:
      "Créez, équipez et déployez des agents autonomes en quelques minutes. Objectifs en langage naturel, orchestration automatique des compétences, mémoire permanente et environnement contrôlé.",
    points: ["Orchestration multi-compétences", "Mémoire persistante par agent", "Terminal sandboxé réservé aux agents"],
    cta: "Ouvrir le Studio",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    accent: "from-violet-500/25 to-violet-500/[.04] border-violet-400/25",
    chip: "text-violet-300 border-violet-400/25 bg-violet-400/10",
  },
  {
    href: "/live",
    eyebrow: "Gen3ia Live",
    title: "Agent Live sur votre PC",
    description:
      "Un agent qui observe votre écran et pilote clavier/souris pour exécuter vos tâches réelles, avec permissions granulaires, double validation humaine et journal d'audit complet.",
    points: ["Observation d'écran en direct", "Contrôle clavier & souris validé", "Réservé aux ordinateurs (Windows, Linux, macOS)"],
    cta: "Découvrir Agent Live",
    badge: "PC",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="m10 9-2 2 2 2M14 9l2 2-2 2" />
      </svg>
    ),
    accent: "from-amber-500/25 to-amber-500/[.04] border-amber-400/25",
    chip: "text-amber-300 border-amber-400/25 bg-amber-400/10",
  },
  {
    href: "/marketplace",
    eyebrow: "Gen3ia Marketplace",
    title: "Marketplace d’extensions",
    description:
      "Étendez vos agents avec des tools, skills et workflows créés par la communauté. Chaque extension est versionnée, notée, sandboxée et contrôlée par des permissions explicites.",
    points: ["Installation en un clic", "Permissions vérifiables avant achat", "Revenus développeur intégrés"],
    cta: "Parcourir la Marketplace",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    accent: "from-emerald-500/25 to-emerald-500/[.04] border-emerald-400/25",
    chip: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Créez votre compte",
    text: "Inscription en une minute : prénom, nom, email. Votre wallet de démonstration est crédité automatiquement pour tester la plateforme.",
  },
  {
    number: "02",
    title: "Décrivez votre objectif",
    text: "En langage naturel, depuis le Studio. L'orchestrateur sélectionne les outils, compétences et extensions nécessaires, puis exécute dans un environnement contrôlé.",
  },
  {
    number: "03",
    title: "Validez et laissez tourner",
    text: "Les actions sensibles attendent votre validation. Vos agents planifiés continuent de travailler pour vous, 24h/24, dans le cadre que vous avez défini.",
  },
];

const SECURITY_POINTS = [
  "Aucun accès direct utilisateur au shell d'exécution — terminal réservé aux agents en sandbox",
  "Caméra et fichiers : uniquement après autorisation explicite de l'utilisateur",
  "Dépenses publicitaires et actions externes soumises à confirmation humaine",
  "Jetons OAuth stockés chiffrés côté serveur, sessions signées et expirables",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#070a12] text-white">
      {/* ---------- Navigation ---------- */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Gen3ia — accueil">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black shadow-lg shadow-violet-600/30">
              G3
            </span>
            <span className="text-sm font-bold tracking-tight">
              Gen3ia <span className="font-medium text-white/40">AI Studio</span>
            </span>
          </Link>
          <nav aria-label="Navigation vitrine" className="hidden items-center gap-1 md:flex">
            <a href="#produits" className="rounded-xl px-3.5 py-2 text-sm text-white/60 transition hover:bg-white/[.06] hover:text-white">Produits</a>
            <a href="#fonctionnement" className="rounded-xl px-3.5 py-2 text-sm text-white/60 transition hover:bg-white/[.06] hover:text-white">Fonctionnement</a>
            <a href="#securite" className="rounded-xl px-3.5 py-2 text-sm text-white/60 transition hover:bg-white/[.06] hover:text-white">Sécurité</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[.06] hover:text-white">
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-500"
            >
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Héros ---------- */}
        <section className="relative overflow-hidden">
          <div className="aurora" aria-hidden="true" />
          <div className="grid-bg absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/[.08] px-4 py-1.5 text-xs font-semibold text-violet-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                Agents autonomes · extensions · agent Live sur PC
              </p>
              <h1 className="anim-fade-up anim-delay-1 mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">
                Créez des agents IA qui{" "}
                <span className="gradient-text">travaillent vraiment</span>{" "}
                pour vous.
              </h1>
              <p className="anim-fade-up anim-delay-2 mx-auto mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
                Gen3ia réunit le Studio d’agents, l’Agent Live sur votre
                ordinateur et une Marketplace d’extensions dans une seule
                plateforme sécurisée. Décrivez le résultat : l’orchestrateur
                s’occupe du reste, sous votre contrôle.
              </p>
              <div className="anim-fade-up anim-delay-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 text-sm font-bold shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-500 sm:w-auto"
                >
                  Créer mon compte gratuitement
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a
                  href="#produits"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[.04] px-7 py-3.5 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:bg-white/[.08] hover:text-white sm:w-auto"
                >
                  Découvrir la plateforme
                </a>
              </div>
              <p className="anim-fade-up anim-delay-4 mt-5 text-xs text-white/35">
                Web (Android &amp; iOS — installable depuis le navigateur) · Desktop Windows &amp; Linux
              </p>
            </div>

            {/* Aperçu produit stylisé */}
            <div className="anim-fade-up anim-delay-5 relative mx-auto mt-16 max-w-4xl">
              <div className="anim-pulse-glow absolute -inset-8 rounded-[40px] bg-gradient-to-r from-violet-600/20 via-transparent to-cyan-500/20 blur-2xl" aria-hidden="true" />
              <div className="relative rounded-3xl border border-white/10 bg-[#0d1220]/90 p-3 shadow-2xl shadow-black/50 backdrop-blur">
                <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 rounded-lg bg-white/[.05] px-3 py-1 text-[10px] text-white/35">gen3ia.online/dashboard</span>
                </div>
                <div className="grid gap-3 rounded-2xl bg-black/30 p-4 sm:grid-cols-3">
                  {[
                    { title: "Studio d’agents IA", text: "Créer, tester et déployer des agents autonomes.", tone: "text-violet-300" },
                    { title: "Agent Live", text: "Pilotage d'écran et clavier/souris validé, sur PC.", tone: "text-amber-300" },
                    { title: "Marketplace", text: "Tools, skills et workflows de la communauté.", tone: "text-emerald-300" },
                  ].map((card, index) => (
                    <div
                      key={card.title}
                      className="anim-float rounded-2xl border border-white/10 bg-[#10162a] p-4"
                      style={{ animationDelay: `${index * 1.2}s` }}
                    >
                      <p className={`text-sm font-bold ${card.tone}`}>{card.title}</p>
                      <p className="mt-2 text-xs leading-5 text-white/45">{card.text}</p>
                      <div className="mt-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-violet-400/60 to-cyan-400/60" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistiques */}
            <dl className="anim-fade-up anim-delay-6 mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center">
                  <dd className="order-1 text-lg font-black text-white">{stat.value}</dd>
                  <dt className="order-2 mt-1.5 text-[11px] leading-4 text-white/45">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- Produits ---------- */}
        <section id="produits" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.3em] text-violet-300">Trois espaces, une plateforme</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Tout ce qu’il faut pour mettre les agents au travail
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">
              Chaque espace est accessible en un clic depuis votre tableau de
              bord — et vos agents, extensions et sessions restent synchronisés
              à votre compte.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PRODUCTS.map((product, index) => (
              <article
                key={product.href}
                className="card-glow reveal flex flex-col rounded-3xl border border-white/10 bg-[#0d1220] p-7"
                style={{ ["--reveal-delay" as string]: `${index * 0.12}s` }}
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br ${product.accent}`}>
                  <span className={product.chip.split(" ")[0]}>{product.icon}</span>
                </div>
                <p className={`mt-5 text-[11px] font-bold uppercase tracking-[.25em] ${product.chip.split(" ")[0]}`}>
                  {product.eyebrow}
                  {product.badge && (
                    <span className={`ml-2 rounded-md border px-1.5 py-0.5 text-[9px] ${product.chip}`}>{product.badge}</span>
                  )}
                </p>
                <h3 className="mt-2.5 text-xl font-bold">{product.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-white/55">{product.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {product.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-white/70">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-400">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={product.href}
                  className={`group mt-7 inline-flex w-fit items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 ${product.chip}`}
                >
                  {product.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>

          {/* Capacités — grille bento */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Memoire permanente — grande tuile */}
            <article className="card-glow reveal relative flex flex-col overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.14] via-[#0d1220] to-[#0d1220] p-7 sm:col-span-2">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold">Mémoire permanente</h3>
                  <p className="mt-1.5 max-w-sm text-sm leading-6 text-white/55">
                    Vos agents se souviennent du contexte utile de vos projets, avec protection des secrets et contrôle propriétaire.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-2" aria-hidden="true">
                <div className="anim-fade-in max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[.05] px-4 py-2.5 text-xs text-white/60">Retiens la charte graphique du projet Nebula.</div>
                <div className="anim-fade-in ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-violet-400/25 bg-violet-500/15 px-4 py-2.5 text-xs text-violet-100/80" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>Mémorisé — 3 souvenirs liés à ce projet.</div>
              </div>
            </article>

            {/* Securite */}
            <article className="card-glow reveal flex gap-4 rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[.1] to-transparent p-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-bold">Sécurité par conception</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/50">Sandbox isolée, permissions granulaires, garde-fous anti-dépenses et validation humaine.</p>
              </div>
            </article>

            {/* Atelier 21st.dev — tuile vedette */}
            <article className="card-glow reveal relative flex flex-col overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/[.12] via-[#0d1220] to-[#0d1220] p-6">
              <span className="absolute right-4 top-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">Nouveau</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
                </svg>
              </span>
              <h3 className="mt-4 text-sm font-bold">Atelier d&apos;Interfaces 21st.dev</h3>
              <p className="mt-1.5 text-xs leading-5 text-white/50">Composants et thèmes professionnels récupérés et adaptés par vos agents de code.</p>
              <pre className="g3-code mt-4 !max-h-24 !p-3 !text-[10px]" aria-hidden="true">{`<Hero variant="aurora" />\n<StatsGrid cols={4} />\n<BentoFeature />`}</pre>
            </article>

            {/* Facturation */}
            <article className="card-glow reveal flex gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[.08] text-violet-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-bold">Facturation à l&apos;usage</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/50">Wallet intégré, rechargement Mobile Money ou carte. Vous ne payez que ce que vos agents exécutent.</p>
              </div>
            </article>

            {/* Planification */}
            <article className="card-glow reveal flex gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[.08] text-violet-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-bold">Planification automatique</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/50">Fenêtres horaires d&apos;activation : le serveur applique le planning même application fermée.</p>
              </div>
            </article>

            {/* Multi-appareils — grande tuile */}
            <article className="card-glow reveal relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.05] to-transparent p-7 sm:col-span-2">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[.08] text-cyan-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h20v14H2zM8 21h8M12 17v4" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold">Multi-appareils</h3>
                  <p className="mt-1.5 max-w-sm text-sm leading-6 text-white/55">
                    Web app installable sur Android et iOS, application Desktop pour Windows et Linux. Vos données vous suivent partout.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
                {["Android", "iOS", "Windows", "Linux", "Web PWA"].map((device) => (
                  <span key={device} className="rounded-full border border-white/12 bg-white/[.04] px-3.5 py-1.5 text-xs font-semibold text-white/65">{device}</span>
                ))}
              </div>
            </article>

            {/* Espace developpeur */}
            <article className="card-glow reveal flex gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[.08] text-violet-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-bold">Espace développeur</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/50">Créez vos extensions avec le SDK Gen3ia, publiez-les et suivez vos revenus.</p>
              </div>
            </article>
          </div>
        </section>

        {/* ---------- Fonctionnement ---------- */}
        <section id="fonctionnement" className="relative scroll-mt-24 border-y border-white/[.06] bg-white/[.015] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.3em] text-cyan-300">Fonctionnement</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Opérationnel en trois étapes</h2>
              <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">
                Pas de configuration complexe : un compte, un objectif, une
                validation — puis vos agents travaillent pour vous.
              </p>
            </div>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.number}
                  className="card-glow reveal relative rounded-3xl border border-white/10 bg-[#0d1220] p-7"
                  style={{ ["--reveal-delay" as string]: `${index * 0.12}s` }}
                >
                  <span className="gradient-text text-4xl font-black">{step.number}</span>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-white/55">{step.text}</p>
                  {index < STEPS.length - 1 && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute -right-3.5 top-1/2 hidden -translate-y-1/2 text-white/20 md:block">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Sécurité ---------- */}
        <section id="securite" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="reveal">
              <p className="text-xs font-bold uppercase tracking-[.3em] text-emerald-300">Sécurité &amp; contrôle</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Des agents puissants, jamais incontrôlés
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">
                Chaque capacité dangereuse est encadrée : permissions
                explicites, sandbox isolée, double validation humaine et
                journalisation. Vous gardez le contrôle permanent sur ce que
                vos agents peuvent faire — et de ce qu’ils peuvent dépenser.
              </p>
              <ul className="mt-8 space-y-3.5">
                {SECURITY_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-6 text-white/70">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-emerald-400">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal card-glow rounded-3xl border border-white/10 bg-[#0d1220] p-7" style={{ ["--reveal-delay" as string]: "0.15s" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Journal d’activité (extrait)</p>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase text-emerald-300">Contrôle actif</span>
              </div>
              <div className="mt-5 space-y-3 font-mono text-xs">
                {[
                  { tone: "text-violet-300", label: "agent.recherche", text: "Analyse concurrents — 12 sources" },
                  { tone: "text-amber-300", label: "permission.demandee", text: "Écriture fichier /rapports/q3.xlsx" },
                  { tone: "text-emerald-300", label: "humain.valide", text: "Publication campagne — approuvée" },
                  { tone: "text-cyan-300", label: "wallet.execution", text: "Coût exécution : 12,50 XAF" },
                ].map((row, index) => (
                  <div
                    key={row.label}
                    className="anim-fade-in flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/30 px-4 py-3"
                    style={{ animationDelay: `${0.4 + index * 0.25}s`, animationFillMode: "both" }}
                  >
                    <span className={`shrink-0 font-bold ${row.tone}`}>{row.label}</span>
                    <span className="truncate text-white/50">{row.text}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-white/35">
                Toutes les opérations sensibles sont traçables, révocables et
                jamais silencieuses.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- CTA final ---------- */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="reveal relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-violet-400/20 bg-gradient-to-br from-violet-600/20 via-[#0d1220] to-cyan-500/10 p-10 text-center sm:p-14">
            <div className="anim-pulse-glow pointer-events-none absolute -top-24 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" aria-hidden="true" />
            <h2 className="relative text-3xl font-black tracking-tight sm:text-4xl">
              Prêt à mettre vos agents au travail ?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
              Créez votre compte en une minute, recevez votre solde de
              démonstration et ouvrez votre premier agent dès aujourd’hui.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-3.5 text-sm font-bold shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                Commencer gratuitement
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-2xl border border-white/12 bg-white/[.04] px-8 py-3.5 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:bg-white/[.08] hover:text-white"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Pied de page ---------- */}
      <footer className="mt-auto border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">G3</span>
                <span className="text-sm font-bold">Gen3ia AI Studio</span>
              </Link>
              <p className="mt-4 max-w-xs text-xs leading-5 text-white/40">
                La plateforme d’agents IA autonomes : Studio, Agent Live et
                Marketplace, avec la sécurité et le contrôle humain au centre.
              </p>
            </div>
            <nav aria-label="Produits">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-white/35">Produits</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/60 transition hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Espaces">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-white/35">Votre espace</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/dashboard" className="text-white/60 transition hover:text-white">Tableau de bord</Link></li>
                <li><Link href="/billing" className="text-white/60 transition hover:text-white">Facturation</Link></li>
                <li><Link href="/storage" className="text-white/60 transition hover:text-white">Stockage permanent</Link></li>
                <li><Link href="/developer" className="text-white/60 transition hover:text-white">Espace développeur</Link></li>
              </ul>
            </nav>
            <nav aria-label="Compte">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-white/35">Compte</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/signup" className="text-white/60 transition hover:text-white">Créer un compte</Link></li>
                <li><Link href="/login" className="text-white/60 transition hover:text-white">Se connecter</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[.07] pt-6 text-xs text-white/35 sm:flex-row">
            <p>© {new Date().getFullYear()} Gen3ia AI Studio. Tous droits réservés.</p>
            <p>Conçu pour Android, iOS, Windows et Linux.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
