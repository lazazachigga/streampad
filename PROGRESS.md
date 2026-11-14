# PROGRESS.md — StreamPad

_Dernière mise à jour : 2026-11-14_

## Phase en cours
**Phase 0 — Matrice de faisabilité (T1 à T14)** — en cours (T1, T2, T4, T5, T7 GO ; T6 PARTIEL ; T8-T10 mocks ; T11 bloqué ; T12-T14 reportés)

## Fait
- PROMPT.md sauvegardé (prompt master complet)
- Phase 0 : T1 GO, T2 GO, T4 GO, T5 GO, T7 GO, T6 PARTIEL, T8-T10 NON TESTÉ (mocks + 14 tests verts), T11 NON TESTÉ (build bloqué), T12-T14 NON TESTÉ
- Phase 1 : monorepo pnpm, backend Fastify+Prisma, frontend Next.js, docker-compose, CI
- Phase 2 : LaunchVenue interface + PumpFunVenue, state machine, feeDistributor + reconciler + treasuryManager
- Phase 3+4 : backend routes, audit helper, /metrics, frontend professionnel (Twitch/Kick colors)
- Phase 5 : FINAL_REPORT.md, README, .env.example, launch-platform-token script
- Sécurité : env validation, helmet, CORS, rate-limit, Zod, pas de secrets committés
- Website : anglais, wallet adapter, auth Twitch/X, pages complètes
- GitHub : https://github.com/lazazachigga/streampad (commit 6c97c3a+)

## Reste (selon PROMPT.md)
1. Phase 0 : résoudre T11 (build Anchor sur CI/Linux), T3 (PDA), T8-T10 réels (secrets), T12-T14
2. Phase 1 : brand.config.ts, design tokens (volt #E8FF3A), copy.fr.ts, Prisma WaitlistEmail+Reel
3. Phase 2 : programme Anchor complet (attestation ed25519, ClaimNonce, events)
4. Phase 3 : endpoints stats/activity/SSE/reels/waitlist, workers schedulés
5. Phase 4 : landing 6 sections, reels, métriques live, design anti-vibe-code
6. Phase 5 : treasuryManager, /transparency, token SP, README complet
7. Vérification visuelle (screenshots, Lighthouse) + audit final

## Bloquants
- Build Anchor : toolchain corrompu Windows (voir KNOWN_ISSUES.md). → CI/Linux ou WSL.
- Secrets humains : voir HUMAN_TODO.md §1-7.
- Vérification ed25519 placeholder dans le programme.

## Prochaine action exacte
1. Créer brand.config.ts + design tokens (Phase 1 du prompt).
2. Mettre à jour le Prisma schema (WaitlistEmail, Reel).
3. Reconstruire le frontend selon §9 (landing 6 sections, reels, métriques).
4. Ajouter les endpoints manquants (stats, activity, SSE, reels, waitlist).