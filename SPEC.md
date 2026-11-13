# PROMPT MASTER : Launchpad Solana pour streamers Kick/Twitch
# (wallet auto, claim des fees via OAuth, tokens lancés sur pump.fun)

---------------------------------------------------------------------
## 0. RÈGLES DE TRAVAIL (non négociables)
---------------------------------------------------------------------
Tu es un ingénieur senior full-stack Solana (Anchor/Rust + TypeScript) et un auditeur sceptique de ton propre travail.

R1. **Aucune affirmation sans preuve.** Tu ne dis JAMAIS « c'est faisable », « ça marche » ou « c'est terminé » sans l'avoir exécuté. Chaque affirmation de faisabilité est accompagnée d'une preuve : signature de transaction (Solscan), sortie de test, log ou capture. Ce que tu n'as pas pu tester est marqué **NON TESTÉ**, jamais déduit.
R2. **La doc prime sur ta mémoire.** Avant d'utiliser pump.fun, Kick, Twitch, Privy/Turnkey, Helius : lis la doc actuelle (pump.fun : dépôt `pump-fun/pump-public-docs`, SDK `@pump-fun/pump-sdk` et `@pump-fun/pump-swap-sdk`). Note les versions utilisées dans DECISIONS.md. Si la doc contredit ce prompt, la doc gagne : signale la contradiction avant de continuer.
R3. **Phase 0 d'abord.** Tu ne construis rien d'autre avant d'avoir livré FEASIBILITY.md (voir §3) et reçu ma confirmation.
R4. **Portes d'arrêt.** À la fin de chaque phase, tu t'arrêtes, tu résumes (fait / prouvé / non testé / risques) et tu attends mon « go ».
R5. **Sécurité des fonds de test.** Devnet quand c'est possible. Sinon mainnet avec un wallet de test dédié, plafonné à 0,5 SOL au total, jamais mon wallet principal. Aucune clé privée dans le repo, les logs, les commits ni les prompts.
R6. **Code complet, pas de pseudo-code.** Fichier par fichier, avec les commandes pour lancer et tester. Pas de `unwrap()` en Rust, pas de `any` en TypeScript, pas de TODO laissé dans le code livré.
R7. **Décisions ambiguës** : choisis l'option la plus simple et la plus sûre, note-la dans DECISIONS.md (contexte, options, choix, raison).
R8. **Honnêteté sur les échecs.** Si un test échoue, tu le dis tel quel, avec l'erreur exacte, et tu proposes le plan B prévu. Tu ne contournes pas un échec en changeant silencieusement le critère de réussite.

---------------------------------------------------------------------
## 1. PRODUIT
---------------------------------------------------------------------
Un launchpad pour streamers. Flux nominal :
1. Le streamer se connecte avec **Twitch ou Kick** (OAuth).
2. Un **wallet Solana est créé automatiquement** pour lui (embedded, non-custodial côté plateforme), ou il lie son propre wallet.
3. Son token est **lancé sur pump.fun**. Les creator fees sont répartis par le **fee sharing pump.fun** : **75 % streamer, 25 % protocole**, réglé définitivement au lancement.
4. La part du streamer arrive dans un compte lié à son **identité Twitch/Kick** (voir §4, deux architectures à tester). Il la **claim** en un clic depuis le dashboard.
5. Les 25 % du protocole arrivent dans le `PROTOCOL_TREASURY`, qui finance les buybacks du **token du launchpad** (lui aussi lancé sur pump.fun) et l'infra.
6. **Phase 2 seulement** : tokens natifs avec bonding curve maison, créés uniquement pour offrir des creator fees plus élevés que pump.fun (voir §13).

Priorité absolue : **seul le vrai propriétaire du compte Twitch/Kick peut recevoir la part streamer.** Les fees s'accumulent même si le streamer ne s'est pas encore connecté.

---------------------------------------------------------------------
## 2. FAITS pump.fun À RECONFIRMER (issus de la doc officielle, à vérifier à ta lecture)
---------------------------------------------------------------------
F1. Cycle du fee sharing : (1) `create_fee_sharing_config` (programme Pump Fees) ; (2) `update_fee_shares_v2` ; (3) `transfer_creator_fees_to_pump_v2` (Pump AMM, tokens gradués uniquement) ; (4) `distribute_creator_fees_v2` (programme Pump).
F2. `create_fee_sharing_config` est appelable par le créateur du token (ou l'admin global pump.fun). Liste initiale = `[(creator, 10 000 bps)]`. Le créateur du bonding curve pointe alors vers la PDA `sharing_config` (seeds `["sharing-config", mint]`).
F3. `update_fee_shares_v2` : appelable par `sharing_config.admin` ; liste non vide, **10 bénéficiaires max**, pas de doublons, chaque `share_bps > 0`, somme = 10 000 ; **appelable une seule fois** (admin révoqué ensuite). Elle distribue d'abord les fees en attente à la liste ACTUELLE.
F4. `distribute_creator_fees_v2` et `transfer_creator_fees_to_pump_v2` sont **sans permission** (n'importe quel payer).
F5. Pour un token apparié en **SOL (WSOL)**, la distribution transfère les lamports directement aux adresses des bénéficiaires, sans ATA, en laissant le vault rent-exempt. Un token peut aussi être apparié en USDC (hors MVP).
F6. Les fees d'un token gradué s'accumulent côté PumpAMM et doivent être rapatriées (F1 étape 3) avant distribution.
F7. L'admin global pump.fun conserve des pouvoirs sur les sharing configs (événements `reset` / `transfer authority` dans les IDL). À documenter comme risque de plateforme.
F8. Le taux de creator fee de pump.fun dépend du market cap (modèle « Project Ascend »). Ne jamais écrire un taux en dur : le lire dans la config on-chain ou la doc à la date du test.

---------------------------------------------------------------------
## 3. PHASE 0 : MATRICE DE FAISABILITÉ (tout tester avant de dire que c'est faisable)
---------------------------------------------------------------------
Livrable : `FEASIBILITY.md` avec un tableau : ID | hypothèse | test exécuté | résultat | statut (GO / NO-GO / PARTIEL / NON TESTÉ) | preuve (signature, log) | décision. Puis STOP et attente de mon go.

Crée un dossier `/spikes` avec un script reproductible par test (`pnpm spike:T3`, etc.).

**T1. Lancement pump.fun par programme.**
Hypothèse : on peut créer un token SOL-apparié via `@pump-fun/pump-sdk` depuis un wallet launcher, avec nom/symbole/image/metadata.
Réussite : mint créé, visible sur pump.fun et Solscan. Mesure aussi le coût total (rent, frais).

**T2. Fee sharing 75/25 fixé au lancement.**
Hypothèse : `create_fee_sharing_config` + `update_fee_shares_v2` peuvent être enchaînés immédiatement après (idéalement dans la même transaction que le launch, sinon en séquence).
Réussite : `sharing_config` décodée avec 2 bénéficiaires 7500/2500 et `admin_revoked = true`. Teste aussi : un 2e appel à `update_fee_shares_v2` échoue (preuve que le split est définitif). Documente si le tout tient dans une seule tx (taille, compute units) ou non.

**T3. Une PDA de NOTRE programme reçoit sa part (test critique).**
Hypothèse : une PDA `StreamerVault` (programme Anchor minimal déployé), initialisée et rent-exempt, peut être bénéficiaire du fee sharing et reçoit les lamports via `distribute_creator_fees_v2`.
Réussite : après du volume de trading de test, `distribute_creator_fees_v2` réussit et le solde de la PDA augmente de la part attendue. Teste aussi : (a) PDA non initialisée comme bénéficiaire (la tx échoue-t-elle ? les lamports sont-ils bloqués ?), (b) PDA avec données vs compte vide. Si NO-GO, applique le plan B de §4.

**T4. Exactitude du split.**
Réussite : sur ≥ 5 distributions de montants variés, la part PDA = 75 % ± 1 lamport et la part treasury = 25 % ± 1 lamport. Documente l'arrondi et la poussière.

**T5. Rentabilité de la distribution.**
Mesure le coût (frais + priority fee) d'un appel `distribute_creator_fees_v2` et déduis un seuil minimal de SOL accumulé en dessous duquel on ne distribue pas (le coût doit rester < 1 % du montant distribué).

**T6. Tokens gradués.**
Hypothèse : `transfer_creator_fees_to_pump_v2` puis `distribute_creator_fees_v2` fonctionnent pour un token gradué.
Réussite idéale : preuve sur un token réellement gradué. Sinon : `simulateTransaction` sur un token gradué existant, statut PARTIEL ou NON TESTÉ explicitement, et le MVP gère la graduation par un job qui exécute ces deux étapes dans l'ordre.

**T7. Lancement atomique ou récupérable.**
Simule l'échec entre la création du token et `update_fee_shares_v2` (rpc coupé, tx refusée). Réussite : la machine d'états (§6) retrouve et corrige le token en < 60 s sans perte de fees, et le wallet launcher n'accumule jamais de fees durablement.

**T8. OAuth Twitch.**
Authorization Code + PKCE, scope minimal, récupération de l'ID utilisateur numérique stable (pas le login). Réussite : flux complet + test avec un compte dont on change le pseudo (l'identité reste la même).

**T9. OAuth Kick.**
Endpoints à confirmer dans la doc actuelle : `https://id.kick.com/oauth/authorize`, `https://id.kick.com/oauth/token` (PKCE obligatoire), scope `user:read`, lecture de l'utilisateur via l'API publique `api.kick.com/public/v1/users`. Réussite : flux complet, ID Kick stable récupéré, tokens chiffrés au repos, refresh et révocation testés.

**T10. Wallet automatique.**
Teste Privy (embedded Solana wallets) ET Turnkey derrière l'interface `WalletProvider`. Questions à trancher par test : (a) création après login Twitch, (b) création après login Kick (Kick n'est probablement pas un provider natif : tester l'auth custom/JWT), (c) wallet pré-généré pour un streamer qui ne s'est pas encore connecté (utile pour l'option A2 de §4), (d) export de la clé par le streamer (sortie non-custodiale), (e) signature d'une tx de claim. Retiens le provider qui passe le plus de ces cas, documente les coûts.

**T11. Claim bout en bout (programme maison).**
Réussite : claim valide OK ; rejeu du même nonce KO ; attestation expirée KO ; mauvaise signature KO ; mauvais `user_id_hash` KO ; mauvais `program_id` ou cluster KO ; mauvais `destination_wallet` KO ; programme en pause KO.

**T12. Indexation.**
Réussite : l'indexer détecte distributions et claims, rattache chaque montant au bon streamer/token, et reprend après un crash sans doublon ni trou (curseur de slot).

**T13. Buyback du token du launchpad.**
Réussite : achat réel de petite taille du token du launchpad depuis le treasury avec slippage max respecté, signature loguée.

**T14. Sécurité.**
Tentative de forger une attestation, de rejouer un state OAuth, de claim avec le compte d'un autre streamer, de dépasser les rate limits. Tout doit échouer proprement.

Fin de phase 0 : verdict global GO / GO avec réserves / NO-GO, liste des réserves, et recommandation d'architecture (§4). STOP.

---------------------------------------------------------------------
## 4. ARCHITECTURE DE LA PART STREAMER (choisir selon les résultats de la phase 0)
---------------------------------------------------------------------
**Option A1 (par défaut) : PDA `StreamerVault` + attestation.**
- Seeds : `["streamer", platform_u8, sha256(platform_user_id)]` (0 = Twitch, 1 = Kick). Créée via `init_streamer_vault` AVANT le lancement du token (le vault doit exister et être rent-exempt pour recevoir des fees).
- Elle est bénéficiaire à 7500 bps dans le fee sharing. Les fees s'y accumulent même si le streamer est inconnu de la plateforme.
- Claim : voir §5.

**Option A2 (plan B si T3 NO-GO) : wallet pré-généré lié à l'identité.**
- Le provider de wallets (T10-c) génère à l'avance un wallet pour l'identité Twitch/Kick du streamer, ce wallet devient bénéficiaire. Quand le streamer se connecte, il en prend le contrôle.
- Risques à documenter : dépendance au provider, récupération de compte, preuve d'identité à la prise de contrôle.

**Option A3 (plan C) : escrow maison.** Le bénéficiaire est un wallet du protocole (multisig) qui comptabilise les fees par streamer. Moins décentralisé : à n'utiliser qu'en dernier recours, avec avertissement clair dans l'UI et le README.

Règle de décision : A1 si T3 + T11 GO ; sinon A2 si T10-c GO ; sinon A3. Explique le choix dans DECISIONS.md.

---------------------------------------------------------------------
## 5. PROGRAMME ANCHOR (si A1)
---------------------------------------------------------------------
Compte `Config` : `admin, attestation_authority, treasury, streamer_bps (7500), protocol_bps (2500), paused, bump`. `require!(streamer_bps + protocol_bps == 10_000)`.
Compte `StreamerVault` (PDA ci-dessus) : `platform, user_id_hash, total_claimed, bump`.
Compte `ClaimNonce` : PDA `["nonce", vault, nonce]` créé par `init` : un rejeu échoue on-chain.

Instructions :
- `initialize_config(admin, attestation_authority, treasury, streamer_bps, protocol_bps)`
- `init_streamer_vault(platform, user_id_hash)` : crée et finance le minimum rent-exempt
- `claim_creator_fees(attestation, nonce)` : voir ci-dessous
- `set_attestation_authority`, `set_split` (n'affecte QUE les futurs lancements : le split de chaque token existant est définitif côté pump.fun), `pause`, `unpause` (admin uniquement)

Attestation : message signé ed25519 par `attestation_authority`, contenant `domain_tag, program_id, cluster, platform, user_id_hash, destination_wallet, nonce, expiry (≤ 5 min)`. Vérification via l'instruction ed25519 précédente (sysvar instructions) : comparer la clé publique, le message exact et la signature. Puis : expiry non dépassée, `ClaimNonce` créé, correspondance PDA/user_id_hash, transfert vers `destination_wallet` en conservant le minimum rent-exempt, mise à jour de `total_claimed`, event `FeesClaimed`.

Exigences : checked math, validation stricte des comptes (owner, seeds, signers), pas de `unwrap()`, events `VaultInitialized` et `FeesClaimed`, IDL généré, tests Anchor couvrant T11 et les cas limites (montant nul, vault sous le rent, double claim dans la même tx).

---------------------------------------------------------------------
## 6. BACKEND (Node.js + TypeScript + Fastify, PostgreSQL + Prisma, Redis)
---------------------------------------------------------------------
**Auth** : Twitch et Kick en Authorization Code + PKCE ; `state` vérifié ; session en cookie httpOnly + SameSite=Lax + Secure ; tokens OAuth chiffrés AES-256-GCM au repos ; identité = ID numérique de la plateforme, jamais le pseudo.

**Interface `WalletProvider`** : `createWallet(identity)`, `getAddress`, `signTransaction`, `exportKey` (si supporté). Implémentations Privy et/ou Turnkey selon T10.

**Interface `LaunchVenue`** : `launch`, `setupFeeRecipient`, `getAccruedFees`, `distribute`. Implémentation `PumpFunVenue` (MVP). `NativeVenue` reste un stub (phase 2).

**Endpoints** (validation Zod partout) :
- `GET /auth/{twitch|kick}/login` et `/callback`
- `POST /wallet/provision` (idempotent), `POST /wallet/link` (challenge signé)
- `POST /tokens/launch` (streamer vérifié uniquement ; quote mint SOL imposé)
- `GET /tokens`, `GET /tokens/:mint`
- `GET /me/fees` (total claimable et détail par token)
- `POST /me/claim/attestation` (auth + rate limit + audit)
- `GET /transparency` (public : fees du protocole reçues, buybacks)

**Machine d'états d'un lancement** (idempotente, reprenable) :
`PENDING_VAULT → VAULT_READY → TOKEN_CREATED → SHARING_CREATED → SHARES_FINALIZED → ACTIVE`, plus `FAILED_RECOVERABLE` et `NEEDS_MANUAL`. Un job de réconciliation relit la chaîne toutes les 30 s et pousse chaque token vers l'état suivant. Alerte si un token reste > 2 min entre `TOKEN_CREATED` et `SHARES_FINALIZED` (fees potentiellement captées par le launcher).

**Workers** :
- `feeDistributor` : pour chaque token ACTIF, si le solde du creator vault dépasse le seuil de T5, exécute `transfer_creator_fees_to_pump_v2` (si gradué) puis `distribute_creator_fees_v2`. Idempotent, retries avec backoff, plafond de priority fee.
- `treasuryManager` : buybacks du token du launchpad (seuil de SOL, slippage max, plafond par tx, logs `BuybackLog`).
- `indexer` : événements du programme + transferts vers les vaults (Helius webhooks ou `logsSubscribe`), curseur de slot, reprise sur crash.

**Modèle Prisma** : `User`, `OAuthIdentity`, `Wallet(type EMBEDDED|EXTERNAL)`, `Token(status, streamerBps, protocolBps, quoteMint)`, `FeeDistribution`, `FeeClaim`, `AttestationNonce`, `BuybackLog`, `AuditLog`, `IndexerCursor`. Le split de chaque `Token` est stocké et immuable.

---------------------------------------------------------------------
## 7. FRONTEND (Next.js 14 App Router + Tailwind + wallet-adapter)
---------------------------------------------------------------------
- `/` : tokens (trending, nouveaux, market cap)
- `/token/[mint]` : infos du token, streamer (avatar, lien Twitch/Kick), mention claire du split 75/25 et du fait qu'il est définitif
- `/streamer/login` : Twitch / Kick
- `/dashboard` : adresse du wallet, solde, fees claimables par token, bouton Claim, historique, « Lier mon wallet », export de clé si supporté
- `/launch` : formulaire (nom, symbole, image, description), aperçu du split
- `/transparency` : 25 % reçus par le protocole et leur usage
UI sombre, responsive, états de chargement, d'erreur et de réseau lent, toasts de tx avec lien Solscan, textes sans promesse de rendement.

---------------------------------------------------------------------
## 8. SÉCURITÉ ET CONFORMITÉ
---------------------------------------------------------------------
- **Anti-usurpation** : un token au nom d'un streamer n'est lancé que par lui après OAuth. Tout pré-lancement par un admin affiche « non affilié tant que non claim » et n'est jamais présenté comme officiel.
- Rate limiting Redis (auth, attestation, claim), CORS strict, helmet, CSRF, secrets uniquement en variables d'environnement, logs d'audit sur chaque claim, provision de wallet et lancement.
- Clé `attestation_authority` : en production, KMS/HSM ou signer distant, jamais en clair sur le serveur. Multisig Squads pour l'admin du programme et le treasury.
- Risques à documenter dans le README : pump.fun peut modifier ses programmes ou ses pouvoirs admin (F7) ; dépendance au provider de wallets ; bug du programme maison (audit externe obligatoire avant mainnet).
- Politique des fees non claim : elles restent dans la PDA sans limite de temps par défaut (option « retour au treasury après N mois » documentée mais non implémentée).
- Conformité : le lancement de tokens liés à des personnes réelles et les buybacks peuvent avoir des implications légales (en France : AMF, régime PSAN/MiCA). Aucune communication ne présente les buybacks comme un rendement pour les holders. À faire valider par un juriste avant tout lancement public.

---------------------------------------------------------------------
## 9. TOKEN DU LAUNCHPAD ET TREASURY
---------------------------------------------------------------------
- `scripts/launch-platform-token.ts` : exécuté manuellement une seule fois (nom, symbole, image, wallet launcher). Applique le même mécanisme de fee sharing si pertinent, à décider dans DECISIONS.md.
- `PROTOCOL_TREASURY` (multisig) reçoit les 25 %. Répartition configurable : part buyback, part opérations (`OPS_SHARE_BPS`) pour RPC, Privy/Turnkey, serveurs.
- Chaque buyback est loggé (signature, montant, prix moyen) et visible sur `/transparency`.

---------------------------------------------------------------------
## 10. VARIABLES D'ENVIRONNEMENT (.env.example complet et commenté)
---------------------------------------------------------------------
`DATABASE_URL, REDIS_URL, SOLANA_RPC_URL, HELIUS_API_KEY, PROGRAM_ID, CLUSTER, ATTESTATION_AUTHORITY_SECRET (ou KMS_KEY_ID), LAUNCHER_WALLET_SECRET, PROTOCOL_TREASURY, STREAMER_SHARE_BPS=7500, PROTOCOL_SHARE_BPS=2500, MIN_DISTRIBUTE_LAMPORTS, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, KICK_CLIENT_ID, KICK_CLIENT_SECRET, OAUTH_REDIRECT_BASE_URL, PRIVY_APP_ID, PRIVY_APP_SECRET (ou TURNKEY_*), SESSION_SECRET, ENCRYPTION_KEY`

---------------------------------------------------------------------
## 11. QUALITÉ, TESTS, OBSERVABILITÉ
---------------------------------------------------------------------
- Tests unitaires (backend, programme), tests d'intégration sur validator local ou devnet, test e2e Playwright du parcours login → wallet → claim.
- CI : lint, typecheck, tests, `anchor build`, audit des dépendances.
- Logs structurés, métriques (fees distribuées, claims, tokens par état, échecs de distribution), alertes (token bloqué, solde launcher > 0 anormal, échec d'indexation).
- `docker-compose` (Postgres, Redis), seed de données, `pnpm dev` qui lance tout.

---------------------------------------------------------------------
## 12. ORDRE DE LIVRAISON (portes d'arrêt)
---------------------------------------------------------------------
- Phase 0 : spikes T1 à T14, FEASIBILITY.md, recommandation d'architecture. STOP.
- Phase 1 : monorepo pnpm (`/programs /backend /frontend /shared /spikes`), docker-compose, CI, `.env.example`. STOP.
- Phase 2 : programme Anchor (si A1) + tests complets. STOP.
- Phase 3 : backend (OAuth Twitch, puis Kick, wallet provider, lancement avec machine d'états, feeDistributor, indexer). STOP.
- Phase 4 : frontend (auth, dashboard, claim, puis pages token et lancement). STOP.
- Phase 5 : treasuryManager, `/transparency`, token du launchpad, README complet, scripts de déploiement. STOP.
- Phase 6 (sur demande) : tokens natifs (§13).

À la fin de chaque phase, tu livres : ce qui a été fait, ce qui est PROUVÉ (avec preuves), ce qui est NON TESTÉ, les risques ouverts, et la commande pour tout vérifier.

---------------------------------------------------------------------
## 13. PHASE 2 : TOKENS NATIFS (ne pas commencer sans mon accord)
---------------------------------------------------------------------
Objectif : offrir au streamer des creator fees plus élevés que pump.fun. Avant de coder : compare les taux pump.fun actuels (F8) et propose un taux creator/protocole/trader dans DECISIONS.md, avec un tableau chiffré à plusieurs market caps. Évalue deux voies : bonding curve Anchor maison, ou SDK existant (ex. Meteora Dynamic Bonding Curve). Le même `StreamerVault` et le même claim sont réutilisés. Audit externe obligatoire.

---------------------------------------------------------------------
## 14. CRITÈRES D'ACCEPTATION GLOBAUX
---------------------------------------------------------------------
1. FEASIBILITY.md complet, chaque ligne avec une preuve ou la mention NON TESTÉ.
2. Un streamer de test se connecte via Twitch et via Kick et obtient un wallet automatiquement.
3. Un token lancé sur pump.fun a un sharing config 7500/2500 définitif, et ne peut plus être modifié (preuve : 2e `update_fee_shares_v2` refusé).
4. Après trades de test et distribution, la part streamer arrive dans son compte (PDA ou wallet pré-généré), même avant sa première connexion, et le claim réussit.
5. Claims rejoués, expirés, falsifiés, avec un autre `program_id` ou un autre destinataire échouent.
6. Une panne simulée entre création du token et finalisation du split est rattrapée automatiquement.
7. Aucune clé privée ni secret en clair dans le code, les logs ou la base.
8. `pnpm test` passe ; le README permet de tout relancer from scratch en moins de 15 minutes.
