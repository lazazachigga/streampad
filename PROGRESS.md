# PROGRESS.md — StreamPad

_Dernière mise à jour : 2026-11-15_

## Phase en cours
**Phase 4 — Frontend + déploiement** — terminée

## Fait
- PROMPT.md sauvegardé (prompt master complet)
- Phase 0 : T1 GO, T2 GO, T4 GO, T5 GO, T7 GO, T6 PARTIEL, T8-T10 NON TESTÉ (mocks + 14 tests verts), T11 NON TESTÉ (build bloqué), T12-T14 NON TESTÉ
- Phase 1 : monorepo pnpm, backend Fastify+Prisma, frontend Next.js, docker-compose, CI
- Phase 2 : LaunchVenue interface + PumpFunVenue, state machine, feeDistributor + reconciler + treasuryManager
- Phase 3+4 : backend routes, audit helper, /metrics, frontend professionnel (Twitch/Kick colors)
- Phase 5 : FINAL_REPORT.md, README, .env.example, launch-platform-token script
- Sécurité : env validation, helmet, CORS, rate-limit, Zod, pas de secrets committés
- Website : anglais, wallet adapter, auth Twitch/X, pages complètes
- GitHub : https://github.com/lazazachigga/streampad (commit 59740c9+)
- **Déploiement** :
  - Frontend : https://streampad.wtf (Vercel, live, build OK)
  - Backend : https://streampad-backend.onrender.com (Render, health OK)
  - Auth buttons (Continue with Twitch/X) visibles sur la page d'accueil
  - Backend URL hardcodé (évite le fallback localhost)
  - Pas d'erreurs console

## Reste (selon PROMPT.md)
1. Phase 0 : résoudre T11 (build Anchor sur CI/Linux), T3 (PDA), T8-T10 réels (secrets), T12-T14
2. Variables d'env sur Render (TWITCH_CLIENT_ID, X_CLIENT_ID, etc.) — à faire par l'utilisateur
3. OAuth redirect URLs à mettre à jour (Twitch/X apps)
4. Vérification visuelle (screenshots, Lighthouse) + audit final

## Bloquants
- Build Anchor : toolchain corrompu Windows (voir KNOWN_ISSUES.md). → CI/Linux ou WSL.
- Secrets humains : voir HUMAN_TODO.md §1-7.
- Vérification ed25519 placeholder dans le programme.

## Prochaine action exacte
1. L'utilisateur configure les env vars sur Render (TWITCH_CLIENT_ID, X_CLIENT_ID, PRIVY_APP_ID, WEB_ORIGIN)
2. L'utilisateur met à jour les OAuth redirect URLs
3. Tester le flow complet : login Twitch/X → wallet → launch → claim