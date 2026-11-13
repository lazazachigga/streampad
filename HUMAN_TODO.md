# HUMAN_TODO.md — Ce qu'il me faut de toi (étape par étape)

_Régi par AGENTS.md §Mode autonome (1) : secrets/comptes que seul un humain peut créer.
Je n'invente jamais de clé : en attendant, les adaptateurs mock tournent avec des tests de contrat._

Chaque bloc ci-dessous : quoi, pourquoi, où le créer (lien), quoi me donner (nom de variable .env), et ce que je fais moi-même en attendant.

## 1. Wallet de test mainnet (T13, et options F3 du test fork)
- **Pourquoi** : tester un vrai buyback + éventuellement un lancement réel, plafond 0,5 SOL, jamais ton wallet principal.
- **Créer** : un nouveau wallet Solana dédié (ex. via Phantom « create new wallet » ou `solana-keygen new --no-bip39-passphrase`).
- **Me donner** : la **adresse publique** uniquement dans le chat, puis averse **≤ 0,5 SOL** sur cette adresse. La clé privée reste chez toi : je la lirai dans `.env.test` que TU écriras localement (jamais dans le repo).
- **Variables** : `LAUNCHER_WALLET_SECRET`, `TEST_WALLET_SECRET`, `PROTOCOL_TREASURY` (peut être une adresse que tu crées).

## 2. App OAuth Twitch (T8 + backend Phase 3)
- **Pourquoi** : flux Authorization Code + PKCE réel, `GET /auth/twitch/login`.
- **Créer sur** : https://dev.twitch.tv/console/apps → « Register Your Application »
  - Name : `Launchpad Dev`
  - OAuth Redirect URLs : `http://localhost:3000/auth/twitch/callback` (+ URL de prod plus tard)
  - Category : Application Integration
- **Me donner** (dans `.env`, jamais dans le chat si possible) : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.
- **En attendant** : adaptateur `TwitchOAuthMock` derrière l'interface `OAuthProvider` + tests de contrat.

## 3. App OAuth Kick (T9 + backend Phase 3)
- **Pourquoi** : idem pour Kick (PKCE obligatoire, scope `user:read`).
- **Créer sur** : https://dev.kick.com/ → « Create New Application »
  - Redirect URI : `http://localhost:3000/auth/kick/callback`
- **Me donner** : `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`.
- **En attendant** : `KickOAuthMock` + tests de contrat.

## 4. Compte Privy (T10, wallet provider)
- **Pourquoi** : wallets Solana embedded (cas T10-a/b/d/e).
- **Créer sur** : https://dashboard.privy.io → « Create app » (plan gratuit).
- **Me donner** : `PRIVY_APP_ID`, `PRIVY_APP_SECRET`.
- **En attendant** : `WalletProviderMock` (clés locales chiffrées) + tests de contrat ; l'adaptateur Privy réel est écrit prêt à brancher.

## 5. Clé API Helius (T12, indexer)
- **Pourquoi** : webhooks / RPC indexer (option recommandée) — sinon `logsSubscribe` sur RPC public suffit pour le MVP.
- **Créer sur** : https://dev.helius.xyz → nouvelle API key (plan gratuit).
- **Me donner** : `HELIUS_API_KEY`.
- **En attendant** : indexer testé en fork local via `logsSubscribe`/polling.

## 6. RPC mainnet (fork des programmes pump)
- **Par défaut** : j'utilise le RPC public `https://api.mainnet-beta.solana.com` (rate limit strict) pour cloner les comptes du fork.
- **Si ça rate-limit** : me donner `SOLANA_RPC_URL` avec un RPC payant/free (Helius, Triton, QuickNode).

## 7. Audits / juriste (avant mise en ligne — Phase 5)
- Audit externe du programme Anchor (obligatoire avant mainnet).
- Validation juridique (AMF / PSAN / MiCA, France) des tokens liés à des streamers et des buybacks.
