# PROMPT MASTER : StreamPad (SP), launchpad Solana pour streamers Twitch/Kick

## 0. AMORÇAGE (fais ceci en premier, avant tout le reste)
1. Enregistre l'INTÉGRALITÉ de ce prompt, tel quel, dans `PROMPT.md` à la racine du repo (`git init` si besoin).
2. Crée `PROGRESS.md` (phase en cours, tâches faites/restantes, décisions, preuves, prochaine action exacte).
3. Après chaque compaction de contexte et au démarrage de chaque session : relis `PROMPT.md` puis `PROGRESS.md` avant d'agir.
4. Exécute ensuite tout le projet de la phase 0 à la phase 5 en mode autonome (§2), sans attendre de confirmation.

## 1. MISSION ET MARQUE
Construire de bout en bout **StreamPad** : un launchpad où un streamer se connecte avec Twitch ou Kick (OAuth), reçoit automatiquement un wallet Solana, voit son token lancé sur **pump.fun**, et claim ses creator fees en un clic. Les fees sont réparties par le fee sharing pump.fun : **75 % streamer / 25 % protocole**, définitif au lancement. Les 25 % alimentent des buybacks du token de la plateforme (**$SP**, lancé aussi sur pump.fun) et l'infra. Un site vitrine pro et degen (reels + métriques live) accompagne le produit.

Marque : nom **StreamPad**, wordmark `STREAMPAD`, monogramme et ticker **SP**, accroche « Ton stream. Ton token. Tes fees. ». **Pas encore de lien X** (ni Discord/Telegram). Crée `src/config/brand.config.ts` :

~~~ts
export const brand = {
  name: "StreamPad", wordmark: "STREAMPAD", monogram: "SP", ticker: "SP",
  tagline: "Ton stream. Ton token. Tes fees.",
  description: "Le launchpad des streamers Twitch et Kick : wallet créé automatiquement, 75 % des fees pour toi, claim en un clic.",
  domain: "",
  links: { x: "", discord: "", telegram: "", docs: "", pumpfun: "" }, // une valeur vide n'est jamais affichée
} as const;
export const activeLinks = Object.entries(brand.links).filter(([, u]) => u.trim() !== "");
~~~

Aucune occurrence du nom ou des liens en dur ailleurs. Un lien vide n'est jamais rendu (pas de `#`, pas de lien mort) ; un test doit échouer si un `<a href>` vide ou `#` est rendu.

Priorité absolue du produit : **seul le vrai propriétaire du compte Twitch/Kick peut recevoir la part streamer.** Les fees s'accumulent même si le streamer ne s'est pas encore connecté.

## 2. RÈGLES DE TRAVAIL ET MODE AUTONOME
Tu es un ingénieur senior full-stack Solana (Anchor/Rust + TypeScript) et un auditeur sceptique de ton propre travail.

**Autonomie.** Enchaîne les phases sans confirmation. Tu ne t'arrêtes et ne me poses une question QUE si : (1) il manque un secret ou un compte que seul un humain peut créer (clés Twitch/Kick/Privy/Helius, wallet financé) ; (2) une action dépasserait 0,5 SOL de fonds réels cumulés ; (3) T3 est NO-GO ET tous les plans B de §5 échouent. Dans le cas (1) ne bloque pas : implémente un adaptateur **mock** derrière l'interface (WalletProvider, OAuth, RPC) avec tests de contrat, écris l'adaptateur réel prêt à brancher, et liste précisément ce qu'il me faut dans `HUMAN_TODO.md` (étapes, liens de création des apps). N'invente jamais une clé.

**Preuve avant affirmation.** Tu ne déclares jamais qu'une chose est faisable, correcte ou terminée sans l'avoir exécutée. Preuve = sortie de test, log, signature de transaction. Sinon : **NON TESTÉ**. Tu ne modifies jamais un critère de réussite pour qu'un test passe. Un échec est rapporté tel quel, avec l'erreur exacte.

**La doc prime sur ta mémoire.** Avant d'utiliser pump.fun (dépôt `pump-fun/pump-public-docs`, `@pump-fun/pump-sdk`, `@pump-fun/pump-swap-sdk`), Kick, Twitch, Privy/Turnkey, Helius : lis la doc actuelle, note les versions dans `DECISIONS.md`. Si la doc contredit ce prompt, la doc gagne : note-le et adapte.

**Méthode.** Utilise l'outil de todo, petites tâches vérifiables, parallélise l'indépendant. Un commit git par tâche terminée, jamais un état rouge. Décisions ambiguës : option la plus simple et sûre, notée dans `DECISIONS.md` (contexte, options, choix, raison).

**Échecs.** Un test qui échoue : 3 tentatives de correction maximum, puis note dans `KNOWN_ISSUES.md` (erreur exacte) et applique le plan B. Ne boucle jamais indéfiniment.

**Boucle de vérification à chaque fin de phase.** Lint, typecheck, build, `anchor build`, tous les tests : corrige jusqu'au vert, mets à jour `PROGRESS.md`, passe à la phase suivante.

**Standards.** Code complet, pas de pseudo-code, pas de TODO ni de placeholder dans le code livré. Rust : pas de `unwrap()`/`expect()` hors tests, checked math, validation stricte des comptes. TypeScript strict, pas de `any`, validation Zod aux frontières. Identifiants de code en anglais, interface et README en français.

**Secrets.** Ne jamais afficher, logger ni committer une valeur secrète. `.env*` dans `.gitignore`, `.env.example` complet et commenté. Aucune clé privée en clair dans le code, la base ou les logs.

## 3. FAITS pump.fun (issus de la doc officielle, à reconfirmer à ta lecture)
F1. Cycle du fee sharing : `create_fee_sharing_config` (programme Pump Fees) → `update_fee_shares_v2` → `transfer_creator_fees_to_pump_v2` (Pump AMM, tokens gradués seulement) → `distribute_creator_fees_v2` (programme Pump).
F2. `create_fee_sharing_config` est appelable par le créateur du token (ou l'admin global pump.fun). Liste initiale = `[(creator, 10 000 bps)]`.
F3. `update_fee_shares_v2` : appelable par `sharing_config.admin`, liste non vide, **10 bénéficiaires max**, pas de doublon, chaque `share_bps > 0`, somme = 10 000, **appelable une seule fois** (admin révoqué ensuite : le split est DÉFINITIF). Elle distribue d'abord les fees en attente à la liste ACTUELLE.
F4. `distribute_creator_fees_v2` et `transfer_creator_fees_to_pump_v2` sont **sans permission**.
F5. Pour un token apparié en **SOL (WSOL)**, la distribution transfère les lamports directement aux adresses des bénéficiaires, sans ATA, en laissant le vault rent-exempt. Un token peut aussi être apparié en USDC : **hors MVP**, `POST /tokens/launch` impose le quote mint SOL et refuse le reste.
F6. Les fees d'un token gradué s'accumulent côté PumpAMM et doivent être rapatriées (étape 3 de F1) avant distribution.
F7. L'admin global pump.fun conserve des pouvoirs sur les sharing configs (événements `reset`, `transfer authority` dans les IDL) : à documenter comme risque de plateforme.
F8. Le taux de creator fee pump.fun dépend du market cap (modèle « Project Ascend ») : ne jamais écrire un taux en dur, le lire dans la config on-chain ou la doc à la date du test.
Conséquence : entre `create_fee_sharing_config` et `update_fee_shares_v2` le wallet launcher est seul bénéficiaire. Les deux appels doivent donc être enchaînés immédiatement (même transaction si possible), avec un job de récupération si la 2e étape échoue (§7).

## 4. PHASE 0 : MATRICE DE FAISABILITÉ (tout tester avant de dire que c'est faisable)
**Environnement de test, dans cet ordre :**
1. Tests unitaires et `anchor test` sur validator local pour le programme maison.
2. **Fork local de mainnet** pour pump.fun sans fonds réels : `solana-test-validator` qui clone les programmes pump (Pump, Pump AMM, Pump Fees) et les comptes globaux nécessaires depuis un RPC mainnet. Program IDs pris dans les IDL du dépôt `pump-fun/pump-public-docs`, jamais de ta mémoire. Script reproductible `scripts/start-fork.sh`.
3. Seulement si le fork échoue : mainnet avec un wallet de test dédié (`.env.test`), plafond 0,5 SOL cumulé, jamais mon wallet principal.

Livrable : `FEASIBILITY.md` (ID | hypothèse | test | résultat | statut GO/NO-GO/PARTIEL/NON TESTÉ | preuve | niveau d'environnement utilisé | décision), un script reproductible par test dans `/spikes` (`pnpm spike:T3`, etc.). Puis passe à la phase 1 en appliquant l'arbre de décision de §5.

- **T1** Lancement pump.fun par programme d'un token SOL-apparié via le SDK (nom, symbole, image, metadata) ; mesure le coût total.
- **T2** Fee sharing 75/25 : `create_fee_sharing_config` + `update_fee_shares_v2` enchaînés ; réussite = config décodée avec 2 bénéficiaires 7500/2500 et admin révoqué ; un 2e `update_fee_shares_v2` doit échouer. Documente si le tout tient dans une seule transaction (taille, compute units).
- **T3 (critique)** Une PDA de NOTRE programme (initialisée, rent-exempt) est bénéficiaire et reçoit sa part via `distribute_creator_fees_v2`. Teste aussi PDA non initialisée comme bénéficiaire (la tx échoue-t-elle ? lamports bloqués ?) et PDA avec données vs compte vide.
- **T4** Exactitude du split sur ≥ 5 distributions de montants variés : 75 % ± 1 lamport / 25 % ± 1 lamport ; documente arrondi et poussière.
- **T5** Coût (frais + priority fee) d'une distribution, d'où un seuil minimal `MIN_DISTRIBUTE_LAMPORTS` tel que le coût reste < 1 % du montant distribué.
- **T6** Tokens gradués : `transfer_creator_fees_to_pump_v2` puis `distribute_creator_fees_v2`. Preuve sur un token réellement gradué si possible, sinon `simulateTransaction` et statut PARTIEL/NON TESTÉ explicite ; le MVP gère la graduation par un job qui exécute les deux étapes dans l'ordre.
- **T7** Lancement récupérable : simule l'échec entre création du token et `update_fee_shares_v2` ; la machine d'états (§7) corrige en < 60 s sans perte de fees.
- **T8** OAuth Twitch : Authorization Code + PKCE, scope minimal, ID utilisateur numérique stable (pas le login) ; test avec changement de pseudo.
- **T9** OAuth Kick (à confirmer dans la doc actuelle) : `https://id.kick.com/oauth/authorize`, `https://id.kick.com/oauth/token`, PKCE obligatoire, scope `user:read`, lecture de l'utilisateur via `api.kick.com/public/v1/users`. ID stable, tokens chiffrés au repos, refresh et révocation testés.
- **T10** Wallet automatique : teste Privy ET Turnkey derrière `WalletProvider` : (a) création après login Twitch, (b) après login Kick (auth custom/JWT, Kick n'étant probablement pas un provider natif), (c) wallet pré-généré pour un streamer jamais connecté, (d) export de clé par le streamer, (e) signature d'une tx de claim.
- **T11** Claim bout en bout : valide OK ; rejeu KO ; expiré KO ; mauvaise signature KO ; mauvais `user_id_hash` KO ; mauvais `program_id`/cluster KO ; mauvais `destination_wallet` KO ; programme en pause KO.
- **T12** Indexation : détecte distributions et claims, rattache au bon streamer/token, reprend après crash sans doublon ni trou (curseur de slot).
- **T13** Buyback : achat réel de petite taille du token de la plateforme depuis le treasury avec slippage max respecté, signature loguée.
- **T14** Sécurité : forge d'attestation, rejeu de `state` OAuth, claim avec le compte d'un autre streamer, dépassement des rate limits : tout doit échouer proprement.

## 5. ARCHITECTURE DE LA PART STREAMER ET ARBRE DE DÉCISION
- **A1 (défaut) PDA `StreamerVault` + attestation.** Seeds `["streamer", platform_u8, sha256(platform_user_id)]` (0 = Twitch, 1 = Kick). Créée via `init_streamer_vault` AVANT le lancement du token (elle doit exister et être rent-exempt pour recevoir). Bénéficiaire à 7500 bps dans le fee sharing.
- **A2 (plan B si T3 NO-GO) :** wallet pré-généré lié à l'identité par le provider de wallets, que le streamer prend en main à la connexion. Documente dépendance au provider et preuve d'identité à la prise de contrôle.
- **A3 (plan C) :** escrow maison (wallet multisig du protocole qui comptabilise par streamer), avec avertissement visible dans l'UI et le README.
- **Règle :** A1 si T3 et T11 sont GO ; sinon A2 si T10-c est GO ; sinon A3. Provider de wallet : celui qui passe le plus de cas de T10 (égalité : Privy). Explique le choix dans `DECISIONS.md`.

## 6. PROGRAMME ANCHOR (si A1)
Comptes : `Config{admin, attestation_authority, treasury, streamer_bps (7500), protocol_bps (2500), paused, bump}` avec `require!(streamer_bps + protocol_bps == 10_000)` ; `StreamerVault{platform, user_id_hash, total_claimed, bump}` ; `ClaimNonce` = PDA `["nonce", vault, nonce]` créée par `init` (un rejeu échoue on-chain).
Instructions : `initialize_config`, `init_streamer_vault(platform, user_id_hash)`, `claim_creator_fees(attestation, nonce)`, `set_attestation_authority`, `set_split` (n'affecte QUE les futurs lancements, le split de chaque token existant étant définitif côté pump.fun), `pause`, `unpause` (admin seulement).
Attestation : message signé ed25519 par `attestation_authority` contenant `domain_tag, program_id, cluster, platform, user_id_hash, destination_wallet, nonce, expiry (≤ 5 min)`. Vérification via l'instruction ed25519 précédente (sysvar instructions) : clé publique, message exact, signature. Puis : expiry, création du `ClaimNonce`, correspondance PDA/user_id_hash, transfert vers `destination_wallet` en conservant le minimum rent-exempt, mise à jour de `total_claimed`, event `FeesClaimed`. Events : `VaultInitialized`, `FeesClaimed`. IDL généré.
Tests Anchor : cas de T11 + montant nul, vault sous le rent, double claim dans la même tx, réception de SOL avant toute connexion.

## 7. BACKEND (Node.js + TypeScript + Fastify, PostgreSQL + Prisma, Redis)
- **Auth** : Twitch et Kick en Authorization Code + PKCE, `state` vérifié, session en cookie httpOnly + SameSite=Lax + Secure, tokens OAuth chiffrés AES-256-GCM, identité = ID numérique de la plateforme (jamais le pseudo).
- **Interfaces** : `WalletProvider` (`createWallet(identity)`, `getAddress`, `signTransaction`, `exportKey` si supporté ; adaptateurs Privy et/ou Turnkey selon T10, plus mock) ; `LaunchVenue` (`launch`, `setupFeeRecipient`, `getAccruedFees`, `distribute` ; `PumpFunVenue` pour le MVP, `NativeVenue` en stub).
- **Endpoints (Zod partout)** : `GET /auth/{twitch|kick}/login` et `/callback` ; `POST /wallet/provision` (idempotent) ; `POST /wallet/link` (challenge signé) ; `POST /tokens/launch` (streamer vérifié, quote mint SOL imposé) ; `GET /tokens`, `GET /tokens/:mint` ; `GET /me/fees` (total claimable + détail par token) ; `POST /me/claim/attestation` (auth + rate limit + audit) ; `GET /stats`, `GET /activity`, flux SSE `GET /stats/stream` ; `GET /reels` ; `POST /waitlist` (email, validation Zod, honeypot, rate limit, consentement RGPD explicite non pré-coché).
- **Machine d'états d'un lancement** (idempotente, reprenable) : `PENDING_VAULT → VAULT_READY → TOKEN_CREATED → SHARING_CREATED → SHARES_FINALIZED → ACTIVE`, plus `FAILED_RECOVERABLE` et `NEEDS_MANUAL`. Un job de réconciliation relit la chaîne toutes les 30 s et pousse chaque token à l'état suivant ; alerte si un token reste > 2 min entre `TOKEN_CREATED` et `SHARES_FINALIZED` (fees potentiellement captées par le launcher).
- **Workers** : `feeDistributor` (pour chaque token ACTIF, si le solde dépasse `MIN_DISTRIBUTE_LAMPORTS` : `transfer_creator_fees_to_pump_v2` si gradué, puis `distribute_creator_fees_v2` ; idempotent, retries avec backoff, plafond de priority fee) ; `treasuryManager` (buybacks de $SP : seuil de SOL, slippage max, plafond par tx, `BuybackLog`) ; `indexer` (événements du programme + transferts vers les vaults, Helius webhooks ou `logsSubscribe`, curseur de slot, reprise sur crash).
- **Prisma** : `User, OAuthIdentity, Wallet(type EMBEDDED|EXTERNAL), Token(status, streamerBps, protocolBps, quoteMint), FeeDistribution, FeeClaim, AttestationNonce, BuybackLog, AuditLog, IndexerCursor, WaitlistEmail, Reel`. Le split de chaque `Token` est stocké et immuable.

## 8. APPLICATION (Next.js 14 App Router + Tailwind + wallet-adapter)
`/` landing (§9), `/explore` (liste des tokens : trending, nouveaux, market cap), `/token/[mint]` (infos, streamer, mention du split 75/25 définitif, trading), `/streamer/login` (Twitch / Kick), `/dashboard` (adresse du wallet, solde, fees claimables par token, bouton **Claim**, historique, « Lier mon wallet », export de clé si supporté), `/launch` (nom, symbole, image, description, aperçu du split), `/transparency` (25 % reçus par le protocole, buybacks), `/legal` (CGU, risques). Toasts de tx avec lien Solscan, états de chargement/erreur/réseau lent.

## 9. LANDING ET DIRECTION ARTISTIQUE : « pro et degen », pas vibe codé
**Concept.** Salle de marché × culture stream/streetwear : un écran de trading designé comme un drop de marque. Structure rigide (grille visible, repères en croix, labels mono) pour le pro, ton et contenu bruts pour le degen. Les chiffres et les clips sont le décor : jamais d'illustration de stock.

**Tokens visuels** (variables CSS + config Tailwind) : fond `#0A0A0B`, surface `#121214`, surface haute `#1A1A1D`, lignes 1 px `#26262B`, texte `#ECE9E1` (jamais de blanc pur), secondaire `#8C8C93`. **Accent unique volt `#E8FF3A`** ; hausse `#2EE59D`, baisse `#FF4D6D`. Couleurs de plateformes (Twitch `#9146FF`, Kick `#53FC18`) uniquement en petits badges. Typo via `next/font` auto-hébergée : titres **Big Shoulders Display** 800/900 en capitales, texte **Geist**, chiffres et labels **Geist Mono** (`tabular-nums`) ; aucune autre police. Rayons 0 à 2 px (pilules seulement pour les badges plateforme), bordures 1 px plutôt qu'ombres, pas de glow. Grain SVG fixe (opacity ≤ 0.06), repères « + » aux coins des blocs principaux, labels de section numérotés `01 / 06` en mono capitales. Grille 12 colonnes, gouttière 24 px, espacements sur 8 px, asymétrie assumée.

**Logo** : wordmark `STREAMPAD` en capitales condensées + monogramme carré (fond volt, « SP » noir). Génère `public/logo.svg`, `public/favicon.svg`, `public/apple-touch-icon.png`, avec les lettres **converties en tracés** (opentype.js ou fonttools), jamais de texte live dans le SVG.

**Checklist anti « vibe code » (bloquante).** Interdits : texte en dégradé, dégradés violet/bleu, glassmorphism en série, emojis comme icônes (icônes SVG sur mesure ou lucide stroke 1.5), trois cartes identiques icône + titre + paragraphe, hero centré avec bouton arrondi, lorem ipsum, mots creux (« révolutionnaire », « futur du web3 », « seamless »), ombres partout, animations gratuites, stock photos, mockups de téléphone génériques. Obligatoire : hiérarchie typographique marquée (titre hero ≥ 9 vw sur desktop), au moins un élément qui casse volontairement la grille par section, micro-copie écrite à la main, états hover/focus/active soignés partout, focus visible.

**Sections (dans cet ordre).**
- **00 Ticker** (barre fixe 32 px) : défilement d'événements réels (`@streamer a claim 12,4 SOL`, `$TICKER +184 % 24h`, `nouveau token : …`) séparés par `/`, pause au survol, statique si `prefers-reduced-motion`.
- **01 Hero** : titre massif « TON STREAM. TON TOKEN. TES FEES. », sous-titre « 75 % des fees pour toi, gravé on-chain. Connexion Twitch ou Kick, wallet créé tout seul, claim en un clic. » ; à droite (desktop) / dessous (mobile) un mini-feed de reels vertical en lecture auto, cadre à angles droits, scanlines légères, overlay de chiffres live ; bandeau de 4 compteurs en grands chiffres mono ; CTA « Lancer mon token » (volt, texte noir, angles droits) et « Voir les clips ».
- **02 Reels** : défilement vertical `scroll-snap`, un clip par écran sur mobile, rangée de 4 colonnes 9:16 avec clip actif agrandi sur desktop. Chaque clip : vidéo `muted playsInline loop`, poster, overlay (handle, badge plateforme, `$TICKER`, market cap, variation 24 h colorée, fees gagnées), boutons « Trader » (→ `/token/[mint]`) et « Partager ». Lecture/pause via `IntersectionObserver` (un seul clip joue), `preload="none"` sauf le premier, tap = son on/off. Source `public/reels/reels.json` (`id, videoUrl, posterUrl, handle, platform, mint, ticker, caption`), mp4 H.264 + webm, 9:16, 6 à 15 s, ≤ 2 Mo. Tant qu'il n'y a pas de vrais clips : `scripts/make-placeholder-reels.sh` (ffmpeg) génère des boucles aux couleurs de la marque marquées « PLACEHOLDER » ; liste dans `HUMAN_TODO.md` de les remplacer par de vrais clips de streamers, avec leur accord.
- **03 Métriques** : composants `StatCounter` (odomètre), `Sparkline` (SVG pur, sans librairie de graphiques), `Leaderboard` (top streamers par fees sur 7 j), `FeeSplitBar` (barre 75/25 animée, légende « définitif, vérifiable on-chain »), `ActivityFeed` (derniers claims et lancements). Chiffres : total des fees versées aux streamers (SOL), tokens lancés, streamers actifs, volume 24 h, nombre de claims, avec lien « vérifier » vers Solscan quand possible.
- **04 Mur des streamers** : grille de « cartes joueur » (avatar, handle, badge plateforme, token, market cap, 24 h, fees gagnées, mini-sparkline), hover = décalage de bordure en volt, tri trending / nouveaux / plus gros gains.
- **05 Comment ça marche** : flux horizontal en 3 étapes (Connexion → Wallet → Claim) avec de vraies captures de composants du dashboard, reliées par une ligne en pointillés ; bloc « Ce qui est vérifiable » (adresse du programme, lien Solscan, split définitif).
- **06 Footer** : CTA final plein largeur, liens **uniquement `activeLinks`**. Tant qu'aucun réseau n'est actif, remplace « Rejoindre » par un bloc « Accès anticipé » (formulaire email → `POST /waitlist`). Mention : « Les tokens sont volatils. Tu peux perdre tout ce que tu investis. Ceci n'est pas un conseil financier. »
- **Token SP** : avant son lancement réel (mint renseigné dans la config), le bloc affiche « Token SP : bientôt », sans prix ni graphique.

**Données et intégrité (règle stricte).** Hooks `useStats`, `useActivity`, `useReels` (SWR, SSE avec repli polling 15 s). Si l'API est absente en dev, un générateur déterministe fournit des données de démonstration avec un badge visible **« DEMO »** sur chaque bloc concerné. Interdit d'afficher des chiffres inventés comme réels ou de gonfler des métriques. En production, donnée indisponible = `--`, jamais une valeur fictive. Aucune promesse de rendement ; les fees sont décrites comme des fees de création, pas un revenu garanti.

**Copy.** Tout dans `src/content/copy.fr.ts` (i18n-ready), français direct, anglicismes crypto naturels, phrases courtes, chiffres concrets, pas d'emojis ni de points d'exclamation en série. Exemples : « Zéro Phantom requis. », « 75 % pour toi. Pas négociable, pas modifiable. », « Claim en 1 clic. », « Tes fees t'attendent même si t'es pas encore là. »

**Motion.** Entrées au scroll : fondu + translation 12 px, 240 ms, `cubic-bezier(.2,.8,.2,1)`, une seule fois. Compteurs : roll 600 ms au premier affichage. Ticker en marquee CSS pur. Aucune lib d'animation lourde (si besoin une seule, importée en dynamique). `prefers-reduced-motion` respecté, rien qui clignote.

**Performance, accessibilité, SEO.** Mobile : LCP < 2,5 s, CLS < 0,05, JS initial < 180 Ko gz. Lighthouse mobile : Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95. Contraste AA, navigation clavier complète, contrôle du son sur les vidéos. Titre d'onglet « StreamPad : le launchpad des streamers », métadonnées complètes, image Open Graph dynamique (`next/og`) avec les chiffres du moment, `sitemap`, `robots`, `metadataBase` dérivé de `brand.domain` (vide : `http://localhost:3000` en dev et **échec du build de production**).

## 10. SÉCURITÉ ET CONFORMITÉ
- **Anti-usurpation** : un token au nom d'un streamer n'est lancé que par lui après OAuth vérifié. Tout pré-lancement admin affiche « non affilié tant que non claim » et n'est jamais présenté comme officiel.
- Rate limiting Redis (auth, attestation, claim, waitlist), CORS strict, helmet, CSRF, Zod partout, logs d'audit sur chaque claim, provision de wallet et lancement.
- Clé `attestation_authority` : en production KMS/HSM ou signer distant, jamais en clair sur le serveur. Multisig Squads pour l'admin du programme et le treasury.
- Politique des fees non claim : elles restent dans la PDA sans limite de temps par défaut (option « retour au treasury après N mois » documentée, non implémentée).
- Risques à documenter dans le README : pump.fun peut modifier ses programmes ou ses pouvoirs admin (F7) ; dépendance au provider de wallets ; bug du programme maison (**audit externe obligatoire avant mainnet**) ; ticker « SP » non unique sur pump.fun (l'adresse du mint doit être mise en évidence partout).
- Conformité : le lancement de tokens liés à des personnes réelles et les buybacks peuvent avoir des implications légales (en France : AMF, régime PSAN/MiCA). Aucune promesse de rendement ; les buybacks sont décrits comme de la transparence sur l'usage des fees. Validation juridique à faire avant tout lancement public. RGPD pour la waitlist.

## 11. TOKEN $SP ET TREASURY
`scripts/launch-platform-token.ts` (exécuté manuellement, une seule fois : nom StreamPad, symbole SP, image, wallet launcher) ; décide dans `DECISIONS.md` s'il applique le même fee sharing. `PROTOCOL_TREASURY` (multisig) reçoit les 25 %, répartition configurable entre buyback et opérations (`OPS_SHARE_BPS` : RPC, Privy/Turnkey, serveurs). Chaque buyback est loggé (signature, montant, prix moyen) et visible sur `/transparency`.

## 12. ENV, QUALITÉ, OBSERVABILITÉ
`.env.example` complet et commenté : `DATABASE_URL, REDIS_URL, SOLANA_RPC_URL, HELIUS_API_KEY, PROGRAM_ID, CLUSTER, ATTESTATION_AUTHORITY_SECRET (ou KMS_KEY_ID), LAUNCHER_WALLET_SECRET, PROTOCOL_TREASURY, STREAMER_SHARE_BPS=7500, PROTOCOL_SHARE_BPS=2500, MIN_DISTRIBUTE_LAMPORTS, OPS_SHARE_BPS, TWITCH_CLIENT_ID/SECRET, KICK_CLIENT_ID/SECRET, OAUTH_REDIRECT_BASE_URL, PRIVY_APP_ID/SECRET (ou TURNKEY_*), SESSION_SECRET, ENCRYPTION_KEY`.
Monorepo pnpm : `/programs /backend /frontend /shared /spikes /scripts`. `docker-compose` (Postgres, Redis), seed de données, `pnpm dev` qui lance tout. Tests unitaires, intégration (validator local ou fork), e2e Playwright du parcours login → wallet → claim. CI : lint, typecheck, tests, `anchor build`, audit des dépendances. Logs structurés, métriques (fees distribuées, claims, tokens par état, échecs), alertes (token bloqué, solde launcher anormal, échec d'indexation).

## 13. ORDRE DE LIVRAISON (sans arrêt manuel)
- **Phase 0** : spikes T1 à T14, `FEASIBILITY.md`, décision d'architecture (§5).
- **Phase 1** : monorepo, docker-compose, CI, `.env.example`, `brand.config.ts`, design tokens.
- **Phase 2** : programme Anchor (si A1) et tests complets.
- **Phase 3** : backend (OAuth Twitch puis Kick, wallet provider, lancement avec machine d'états, feeDistributor, indexer, endpoints stats/reels/waitlist).
- **Phase 4** : application (auth, dashboard, claim, token, launch) puis landing complète (§9).
- **Phase 5** : treasuryManager, `/transparency`, script du token SP, README complet et scripts de déploiement.
- **Phase 6 (NE PAS DÉMARRER sans mon accord)** : tokens natifs avec bonding curve maison, pour offrir des creator fees plus élevés que pump.fun ; avant de coder, compare les taux pump.fun actuels (F8) dans un tableau chiffré à plusieurs market caps et évalue bonding curve maison vs SDK existant (ex. Meteora Dynamic Bonding Curve). Audit externe obligatoire.

## 14. VÉRIFICATION VISUELLE, AUDIT FINAL, CRITÈRES D'ACCEPTATION
**Vérification visuelle** : captures Playwright à 390, 768 et 1440 px de chaque section dans `docs/screenshots/` ; auto-revue de chaque capture contre la checklist anti « vibe code », corrige jusqu'à zéro écart ; Lighthouse CI mobile et desktop dans `docs/lighthouse/` ; test des reels (un seul clip joue, pause hors écran, aucune requête vidéo avant d'approcher du viewport). Résultat dans `DESIGN_REPORT.md`.
**Audit final** : associe à chaque critère ci-dessous une preuve ; revois la sécurité (forge d'attestation, rejeu, CSRF/state OAuth, rate limits, fuite de secrets, droits admin) ; écris `FINAL_REPORT.md` (ce qui marche avec preuves, ce qui est NON TESTÉ, risques restants, étapes humaines, commande pour tout relancer from scratch).
**Critères d'acceptation :**
1. `FEASIBILITY.md` complet, chaque ligne avec une preuve ou la mention NON TESTÉ.
2. Un streamer de test se connecte via Twitch et via Kick et obtient un wallet automatiquement.
3. Un token lancé sur pump.fun a un sharing config 7500/2500 définitif (preuve : 2e `update_fee_shares_v2` refusé).
4. Après trades de test et distribution, la part streamer arrive dans son compte (PDA ou wallet pré-généré), même avant sa première connexion, et le claim réussit.
5. Claims rejoués, expirés, falsifiés, avec un autre `program_id` ou un autre destinataire : tous échouent.
6. Une panne simulée entre création du token et finalisation du split est rattrapée automatiquement.
7. Landing : 6 sections responsives, aucun élément interdit, reels conformes, métriques réelles ou clairement marquées DEMO, aucun lien social vide rendu, scores Lighthouse atteints.
8. Aucune clé privée ni secret en clair dans le code, les logs ou la base.
9. `pnpm test` passe ; le README permet de tout relancer from scratch en moins de 15 minutes.

COMMENCE PAR LE §0 (sauvegarde de ce prompt dans `PROMPT.md`), puis lance la phase 0.