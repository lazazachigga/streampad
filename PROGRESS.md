# PROGRESS.md

_Dernière mise a jour : 2026-11-13 — **T1 + T2 + T4 GO** (commits 3f822c9, 1d14f89)_

## Phase en cours
**Phase 0 — Matrice de faisabilité (T1 à T14)**

## Outils / environnement (constaté le 2026-11-12)
- Node v26.13.0, npm 11.20.0, git 2.56.0, Python 3.12.10 : OK
- pnpm 12 (global) — **toujours appeler `pnpm.cmd`** (policy PowerShell bloque les `.ps1`)
- rustc/cargo 1.99.1 (gnu = default, pas de MSVC) ; mingw 16.2.0 requis pour `cargo install`
- Solana CLI : **4.3.2 cassé** (voir D5) + **Agave 2.3.0** fonctionnel dans
  `%USERPROFILE%\.local\share\solana\agave-v2.3.0\solana-release\bin` → variable `SOLANA_BIN`
- Anchor CLI 0.31.2 (`%USERPROFILE%\.cargo\bin\anchor.exe`)
- **Mode développeur Windows activé** (D6) → symlinks non-admin OK (prouvé `rustc` + `SYMLINK OK`)
- Docker : ABSENT (pas d'admin) → Postgres/Redis Phase 3 à traiter plus tard
- WSL : ABSENT → outillage 100 % Windows natif
- Docs pump.fun : clone `vendor/pump-public-docs` (idl/ + docs/)

## Fait
- [x] Création dossier projet `launchpad/` + `git init`
- [x] `AGENTS.md`, `SPEC.md` écrits (copie fidèle des règles projet)
- [x] Choix outillage Windows natif + outils installés et vérifiés
- [x] Clone `pump-fun/pump-public-docs` ; IDL lus → DECISIONS.md (D4, faits F1–F8)
- [x] Monorepo pnpm + `tsconfig` strict + `pnpm typecheck` EXIT=0
- [x] `FEASIBILITY.md` (colonnes imposées) + `HUMAN_TODO.md` + `PROGRESS.md`
- [x] **D5** : cause racine du validator 4.3.2 identifiée (`File::open(dir)` = os 5) → Agave **2.3.0**
- [x] **D6** : Mode développeur activé (clic UAC accepté) → symlinks OK, preuve `SYMLINK OK`
- [x] **D7** (amendé) : les deux RPC publicnode et `api.mainnet-beta` sont utilisables (429/403
  alternent) — fork relancé avec `api.mainnet-beta` après 403 publicnode ×2
- [x] **T1 GO** (tentative 2/3) : lancement pump OK, coût 0.012371 SOL, fix = 24 fee recipients clonés
- [x] **T2 GO** (tentative 1/3) : fee sharing 7500/2500 + `adminRevoked=true` + 2e update refusé
- [x] **T4 GO** (tentative 3/3) : 5/5 distributions, split exact Δ0/Δ0 (fix = boucler sur la
  balance réelle du vault, seuil retenu — le programme tait son seuil au plancher de rent)
- [x] **D8** : `PUMP_FEE_EVENT_AUTHORITY_PDA` prouvé absent de mainnet → `--maybe-clone`
- [x] `scripts/fork-args.ts` + `scripts/start-fork.sh` corrigés et rejoués
- [x] **D9** : `requestAirdrop` cassé (OS 10049) → helper `spikes/helpers/fund.ts` (transfert
  depuis `faucet-keypair.json` du ledger) — 100 SOL transférés avec succès
- [x] `spikes/t01-launch.ts` branché sur `fund()` + `assert` en assertion TS (`asserts condition`)
  → `pnpm typecheck` EXIT=0

## Reste (ordre exact)
1. T1 ✓ GO + T2 ✓ GO + T4 ✓ GO → **T5/T6/T7** sur le fork (coût distribute < 1 %, gradués,
   reprise < 60 s)
2. T11/T14 (programme maison `StreamerVault`, validator local) → **T3** (PDA bénéficiaire du
   fee sharing, dépend de T11) → verdict T3, puis T12, T8/T9/T10
   avec mocks + `HUMAN_TODO.md` (aucun secret inventé) ; T13 → HUMAN_TODO
3. Verdict Phase 0 dans FEASIBILITY.md + recommandation d'architecture (SPEC §4)
4. Puis Phase 1..5 selon AGENTS.md (mode autonome)

## Preuves accumulées
- Agave 4.3.2 : `File::open(DIR)` → `Access is denied. (os error 5)` (test Rust minimal)
- Agave 2.3.0 : `solana-test-validator 2.3.0 (src:a2e21dda …)` puis `rpc bound to 0.0.0.0:8899`
- Sans privilège : `failed to symlink snapshot hard link dir … os error 1314` au slot 100 → RPC meurt
- Mode développeur : `AllowDevelopmentWithoutDevLicense = 1` + `SYMLINK OK` (rustc, non-admin)
- RPC : `429 Too many requests` (mainnet-beta) / `200` (publicnode)
- Comptes mainnet : 8/9 existent, `PUMP_FEE_EVENT_AUTHORITY_PDA` = `value: null`
- Fork : `Error: clone_accounts failed: Failed to fetch D6QxXD…` (429) — corrigé D7+D8
- `requestAirdrop` → `request_airdrop_transaction failed: IoError(Os { code: 10049 })` (D9)
- `fund()` : 100 SOL depuis `faucet-keypair.json` → OK (premier essai T1 est passé l'étape financement)
- T1 essai #1 : `Transaction simulation failed: … insufficient funds for rent` /
  `{"InsufficientFundsForRent":{"account_index":5}}` (3 instructions, comptes 0=feePayer launcher,
  1=mint signataire)
- **Cause racine T1 identifiée** (debug3/4/5, 2026-11-13) : toutes les instructions réussissent
  (logs pump = `success` partout) ; l'erreur est post-exécution. Le compte faillant est un des
  **fee recipients pump** : les 3 adresses observées (`A7hAgCz…`, `9M4giFF…`, `3BpXnfJa…`) sont
  exactement les buyback #7/#1/#3 de `vendor/pump-public-docs/docs/FEE_RECIPIENTS.md` (owner
  `pfee`, 208 B, ~0.9 SOL sur mainnet, absent du fork). Le SDK en choisit un au hasard par tx →
  jamais cloné → rent non couvert. Fix : les 24 fee recipients ajoutés à `fork-args.ts`.
- Relance fork 2026-11-13 : **403 Forbidden** publicnode sur le clone massif (34 comptes, ×2) →
  le test `getMultipleAccounts` de 24 fee recipients échoue aussi en 403 (publicnode) alors que
  `api.mainnet-beta.solana.com` répond **200 + 24/24 comptes** → relance du fork avec
  `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` (D7 amendé : les deux RPC sont utilisables,
  le 429/403 alterne)

## Prochaine action exacte
1. Vérifier `/health` du fork, puis écrire et lancer `spikes/t05-*.ts` (coût d'une
   `distribute_creator_fees_v2` < 1 % du montant distribué) — mêmes helpers que T4.
2. Ensuite T6 (gradués AMM), T7 (reprise < 60 s), puis T11/T14 (programme maison) → T3.

## Preuves T4 (2026-11-13)
- Échec #1 : `total=0` — log `Insufficient fees for distribution. Minimum vault balance needed:
  4454400 lamports` + **success** (le programme ne verse pas mais n'échoue pas)
- Échec #2 : cycle 1 parfait (5 880 000, Δ0/Δ0) mais cycle 2 `total=0` — debug2 a montré que le
  vault retombait au plancher de rent (890 880) : à partir de là le programme réussit **en
  silence** (plus de log de seuil → `pendingMinimum` rendait 0 à tort, aucun buy)
- Fix : seuil retenu après la 1re observation + boucle sur la balance réelle du vault
- GO : 5 cycles × (1 buy → sweep+distribute) = 5 × 5 880 000 lamports, 4 410 000/1 470 000
  (Δ0/Δ0 partout), mint `7tqYz4LpTQbHY8BeRUNMdHmieWtwUK4JVjtoG4BRg1oX`, état `spikes/.state/t04.json`
