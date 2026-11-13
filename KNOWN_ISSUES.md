# KNOWN_ISSUES.md

## T11 — Build Anchor bloqué sur Windows
- **Erreur** : `cargo-build-sbf` → `The Solana toolchain is corrupted. Please, run cargo-build-sbf with the --force-tools-install argument to fix it.` ; puis `--force-tools-install` a désinstallé le toolchain sans le réinstaller.
- **Cause** : Application Control policy (os error 4551) bloque l'exécutable `cargo-build-sbf.exe` dans certaines invocations ; le `--force-tools-install` n'a pas pu réinstaller proprement.
- **Impact** : le programme `StreamerVault` (`programs/streamer-vault/src/lib.rs`) est écrit mais non compilé/testé sur cette machine.
- **Mitigation** : valider le build sur CI/Linux ou WSL (recommandé) ; le source est committé. T11 reste NON TESTÉ.

## T11 — Vérification ed25519 placeholder
- **Fichier** : `programs/streamer-vault/src/lib.rs`, instruction `claim`.
- **Problème** : la vérification de signature se résume à `signature != [0u8; 64]`. Ce n'est PAS une vérification cryptographique — un attaquant peut forger une signature non-nulle.
- **À faire** : brancher `ed25519_dalek` (ou le programme précompilé Ed25519 + sysvar instructions) pour vérifier que `signature` est valide pour `message` sous la clé `vault.attestor`. Bloquant pour la mise en production.
- **Impact sécurité** : critique (T14).

## T6 — Migration bloquée par la clé `withdraw_authority`
- **Erreur** : `migrateV2Instruction` → `custom program error: 0x1770` / `AnchorError … NotAuthorized`.
- **Cause** : `withdraw_authority` doit être `global.authority` (clé pump), indisponible sur le fork.
- **Impact** : graduation prouvée, mais le chemin AMM-side (`transfer_creator_fees_to_pump_v2` + `distribute`) n'est pas exercé.
- **Mitigation** : job de graduation qui appelle `migrate_v2` (côté serveurs pump, permissionless en théorie mais nécessite la clé) puis transfer + distribute dans l'ordre. À re-valider sur mainnet via `simulateTransaction` avant prod.

## T8/T9/T10 — Secrets humains non fournis
- **Statut** : adaptateurs réels écrits (`TwitchOAuthProvider`, `KickOAuthProvider`, `PrivyWalletProvider`, `TurnkeyWalletProvider`) mais lèvent tant que les secrets manquent. Mocks + 14 tests de contrat verts.
- **Mitigation** : voir `HUMAN_TODO.md` §2, §3, §4.

## T13 — Buyback non testé
- **Statut** : nécessite un wallet de test financé (≤ 0,5 SOL) et le token StreamPad déployé.
- **Mitigation** : voir `HUMAN_TODO.md` §1.
