# DECISIONS.md

## D1 — Environnement de build : Windows natif (2026-11-12)
- Contexte : machine sans admin, sans WSL, sans Docker. Il faut compiler un programme Anchor en sBPF et faire tourner `solana-test-validator`.
- Options : (a) WSL2, (b) Docker, (c) binaires Windows Agave + platform-tools Windows.
- Choix : **(c)**. Preuve : `https://release.anza.xyz/stable/solana-release-x86_64-pc-windows-msvc.tar.bz2` → HTTP 200 ; `anza-xyz/platform-tools` release `v1.58` contient `platform-tools-windows-x86_64.tar.bz2`.
- Raison : aucune option système possible sans droits admin ; tout reste natif Windows.

## D2 — Emplacement du projet
- Choix : dossier dédié `Documents/Default Project/StreamPad/`, git init dedans (le dossier parent n'est pas un repo et contient d'autres projets).

## D3 — Versions outils (constaté le 2026-11-12)
- Node v26.13.0, pnpm 11.x (global, appeler `pnpm.cmd`), git 2.56.0
- rustc/cargo 1.99.1 (toolchains msvc ET gnu installées ; **gnu = default** car pas de MSVC/Windows SDK sur la machine)
  - Piège : sans MSVC, la cible msvc ne lie pas (`link.exe` absent) ; la cible gnu a besoin de `dlltool.exe` qui se trouve dans `%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained` → à préfixer au PATH pour tout `cargo install`.
- Solana CLI + solana-test-validator **4.3.2** (Agave stable, release `x86_64-pc-windows-msvc` dans `%USERPROFILE%\.local\share\solana\solana-release\bin`), cargo-build-sbf 4.4.0 / platform-tools v1.57
- Anchor CLI : `cargo install anchor-cli --version 0.31.2 --locked` (le paquet npm `@coral-xyz/anchor-cli` ne fournit que le binaire Linux → inutilisable ici)
- TS : `@coral-xyz/anchor` ^0.31.1 (imposé par pump-sdk : `peerDependencies @coral-xyz/anchor ^0.31.1`), `@solana/web3.js ^1.98.2` (v1, PAS v2/v3), `@solana/spl-token ^0.4.13`

## D4 — Faits pump.fun confirmés depuis `vendor/pump-public-docs` (2026-11-12)
Program IDs (lus dans les IDL, pas de mémoire) :
- Pump : `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
- Pump AMM : `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`
- Pump Fees : `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ`

Versions SDK npm (registry, 2026-11-12) : `@pump-fun/pump-sdk@4.3.1`, `@pump-fun/pump-swap-sdk@2.2.0`.

Confirmation F1–F8 par `docs/instructions/CREATOR_FEE_SHARING.md` :
- F1 ✓ cycle create → update_v2 → transfer_v2 (AMM, gradués) → distribute_v2.
- F2 ✓ liste initiale `[(creator, 10_000 bps)]`, appelable par l'admin global OU le créateur, seeds `["sharing-config", mint]` (Pump Fees).
- F3 ✓ ≤ 10 bénéficiaires, pas de doublons, `share_bps > 0`, somme 10 000, `admin_revoked = true` après appel (une seule fois) ; balaie d'abord les fees en attente vers l'ancienne liste.
- F4 ✓ `distribute_creator_fees_v2` et `transfer_creator_fees_to_pump_v2` permissionless.
- F5 ✓ WSOL → lamports directs aux bénéficiaires (pas d'ATA), vault laissé rent-exempt.
- F6 ✓ AMM-side fees d'abord `transfer_creator_fees_to_pump_v2` puis distribution.
- F7 ✓ pouvoirs admin présents dans l'IDL Pump Fees : `admin_cto_sharing_config`, `revoke_fee_sharing_authority`, `transfer_fee_sharing_authority` → risque plateforme réel à documenter.
- F8 ✓ config fee via `update_fee_config` / `initialize_fee_config` (Pump Fees) et `update_creator_fee_config` → à lire on-chain, jamais en dur.
- **Nuance doc vs SPEC** : les instructions fee sharing ne s'appliquent qu'aux coins AYANT un `sharing_config` ; sans sharing config, le créateur doit utiliser `collect_creator_fee_v2` (flux simple bénéficiaire unique). Impact : sans `create_fee_sharing_config`, pas de split 75/25 → notre MVP doit bien passer par les 2 instructions de configuration.
- SDK TS documenté : `PUMP_SDK.createFeeSharingConfig / updateFeeSharesV2 / transferCreatorFeesToPumpV2 / distributeCreatorFeesV2`, PDA `feeSharingConfigPda(mint)`, `PUMP_SDK.decodeSharingConfig`.

## D5 — Validator : Agave **2.3.0** au lieu de 4.3.2 (2026-11-12)
- Constat : `solana-test-validator` **4.3.2** ne démarre jamais sur cette machine. Erreur finale
  `Error checking to unpack genesis archive`, toujours en échec de création du ledger.
- Cause racine (prouvée, pas supposée) : Agave ≥ 3.0, `hardened_unpack::sanitize_path_and_open_dir`
  appelle `File::open(parent_dir)` sur un **dossier** → sur Windows `os error 5` (access denied).
  Test Rust minimal écrit et exécuté : `File::open(DIR) = ERR Access is denied. (os error 5)`.
- Matrice de tags (source `accounts-db/src/hardened_unpack.rs` vs `snapshots/src/...`) :
  `v2.1.0` / `v2.2.0` / `v2.3.0` = code dans `accounts-db/` **sans** ce `File::open` ;
  `v3.0.0` / `v4.0.0` / `v4.4.1` / `master` = code dans `snapshots/src/` **avec** le bug.
- Choix : **v2.3.0** (dernier tag sain). Release Windows téléchargée depuis
  `https://release.anza.xyz/v2.3.0/solana-release-x86_64-pc-windows-msvc.tar.bz2` (HTTP 206/OK, 57 978 691 o)
  extraite dans `%USERPROFILE%\.local\share\solana\agave-v2.3.0\` — **sans écraser** la 4.3.2.
- Prérequis : `SOLANA_BIN=%USERPROFILE%\.local\share\solana\agave-v2.3.0\solana-release\bin`.

## D6 — Mode développeur Windows activé pour les symlinks (2026-11-12)
- Constat : en non-admin, `New-Item -ItemType SymbolicLink` échoue (« Administrator privilege required »)
  et `FilterAdministratorToken=1` (token filtré). Compte `azane` = membre de `Administrators`,
  `ConsentPromptBehaviorAdmin=5` → UAC = simple clic « Oui », sans mot de passe.
- Conséquence bloquante : au **slot 100**, le packaging de snapshot échoue
  (`failed to symlink snapshot hard link dir … os error 1314`) et **tue le RPC** (~2 min de vie utile).
  `full_snapshot_archive_interval_slots: 100` est **codé en dur** dans `test-validator/src/lib.rs` :
  aucun flag CLI ne permet de désactiver les snapshots (help complet vérifié, 118 lignes).
- Impossible de revenir en arrière : `accounts_hardlinks` (le symlink de dossier) existe déjà en v1.16 ;
  absent ≤ v1.14, trop ancien pour pump.fun.
- Choix : **activer le Mode développeur** (une fois, clic UAC accepté par l'utilisateur) :
  `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock\AllowDevelopmentWithoutDevLicense = 1`
  (+ `AllowAllTrustedApps = 1`).
- Pourquoi ça suffit : la crate `symlink` 0.1.0 utilisée par Agave délègue à
  `std::os::windows::fs::symlink_dir`, et Rust std passe
  `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE` (source `library/std/src/sys/fs/windows.rs`).
- **Preuve d'effet** : petit programme Rust compilé au clou (`rustc`) en non-admin →
  `SYMLINK OK -> C:\Users\azane\AppData\Local\Temp\slk_rust\link` puis `read_dir` OK.
- `--log` reste dans `start-fork.sh` (inoffensif, et il stream le log du validator).

## D7 — RPC de fork : `solana-rpc.publicnode.com` (2026-11-12)
- `https://api.mainnet-beta.solana.com` renvoie **HTTP 429** `Too many requests for a specific RPC call`
  sur les appels de clone → `Error: clone_accounts failed` au démarrage du fork.
- Test de 6 endpoints (batch `getAccountInfo`) : publicnode **200**, mainnet-beta 429,
  drpc 400 (payant), ankr 403, onfinality 429, helius 401 (clé requise).
- Choix : **`https://solana-rpc.publicnode.com`** par défaut dans `scripts/start-fork.sh`
  (surcharge `SOLANA_RPC_URL` conservée). La clé Helius reste en `HUMAN_TODO.md` si le quota publicnode sature.

## D8 — `--maybe-clone` pour l'event authority des fees (2026-11-12)
- Prouvé par `getMultipleAccounts` sur publicnode : **8 des 9 comptes** listés par `fork-args.ts`
  existent sur mainnet ; `PUMP_FEE_EVENT_AUTHORITY_PDA` = `D6QxXDt6hhcCpto4HiZKkN2YQ2iZRF5R7S3caCHpUsML`
  renvoie **`value: null`** → compte absent.
- Dérivation revérifiée à la main (script `scripts/_evauth.ts`) :
  `findProgramAddressSync([Buffer.from("__event_authority")], pfeeUx…)` = `D6QxXD…` **MATCH** ;
  `pump + __event_authority` = `Ce6TQq…` (existe), `amm + __event_authority` = `GS4CU5…`.
  La graine est donc juste (lue aussi dans `idl/pump.json` §`pump_fees_event_authority`, octets ASCII
  `95 95 101 118 …` = `__event_authority`) : le compte est simplement **créé paresseusement**.
- Choix : `--maybe-clone` **uniquement** pour ce compte, `--clone` (dur) pour les 8 autres et pour les
  programmes. Ne change aucun critère de réussite : c'est le spike qui dira s'il est réellement requis.

## D9 — `requestAirdrop` cassé sur Windows : financement par transfert depuis le ledger (2026-11-12)
- Constat (erreur exacte, côté client) : `requestAirdrop → airdrop … failed: Internal error`,
  et côté RPC du validator :
  `request_airdrop_transaction failed: IoError(Os { code: 10049, kind: AddrNotAvailable })`.
- Cause : le RPC du validator se connecte à `0.0.0.0:9900` (pas `127.0.0.1`) et échoue à
  s'auto-connecter (10049 = address not available for that socket). Double vérifié : le message
  vient du processus `solana-test-validator`, pas du client TS.
- Options testées : `--rpc-bind-address`, `--rpc-port`, `--faucet-port` → aucune ne corrige.
- Choix : **`spikes/helpers/fund.ts`** — transfert `SystemProgram.transfer` signé avec le keypair
  du faucet que le validator génère dans le ledger (`<ledger>/faucet-keypair.json`).
  Le fichier est lu, jamais affiché ni committé (ledger = gitignoré).
- Preuve : 100 SOL transférés avec succès depuis le faucet vers un wallet neuf (T1).
