# AGENTS.md : règles permanentes du projet

## Mission
Construire le StreamPad décrit dans SPEC.md, de bout en bout, en une seule exécution autonome. En cas de conflit entre ce fichier et SPEC.md, **AGENTS.md prime** (notamment : les « STOP / attente de go » de SPEC.md sont supprimés, voir « Mode autonome »).

## Mode autonome
- Enchaîne les phases 0 à 5 de SPEC.md sans demander de confirmation entre elles.
- Tu ne t'arrêtes et ne me poses une question QUE dans ces cas : (1) il manque un secret ou un compte que seul un humain peut créer (clés Twitch/Kick/Privy/Helius, wallet financé) ; (2) une action dépasserait le plafond de fonds réels de 0,5 SOL ; (3) T3 est NO-GO ET tous les plans B de SPEC.md §4 échouent.
- Dans le cas (1), ne bloque pas : implémente un adaptateur **mock** derrière l'interface (`WalletProvider`, OAuth, RPC), avec tests de contrat, écris l'adaptateur réel prêt à brancher, et liste précisément ce qu'il me faut fournir dans `HUMAN_TODO.md` (étape par étape, avec les liens de création des apps). N'invente jamais une clé.
- Utilise l'outil de todo, travaille par petites tâches vérifiables, et lance en parallèle ce qui est indépendant.

## Mémoire de travail (anti-perte de contexte)
- Maintiens `PROGRESS.md` : phase en cours, tâches faites/restantes, décisions, preuves (signatures de tx, sorties de tests), prochaine action exacte.
- Relis `AGENTS.md`, `SPEC.md` et `PROGRESS.md` au démarrage et après chaque compaction de contexte.
- Un commit git par tâche terminée, message clair. Branche `main` protégée par les tests : ne commit jamais un état rouge.

## Preuve avant affirmation
- Tu ne déclares jamais qu'une chose est faisable, correcte ou terminée sans l'avoir exécutée. Preuve = sortie de test, log, signature de transaction. Sinon : **NON TESTÉ**.
- Si la doc contredit SPEC.md, la doc gagne : note-le dans DECISIONS.md et adapte.
- Ne modifie jamais un critère de réussite pour qu'un test passe.

## Stratégie d'environnement de test (dans cet ordre)
1. Tests unitaires et `anchor test` sur validator local pour le programme maison (claim, nonce, attestation).
2. **Fork local de mainnet** pour tester pump.fun sans fonds réels : lance `solana-test-validator` en clonant les programmes pump (Pump, Pump AMM, Pump Fees) et les comptes globaux nécessaires depuis un RPC mainnet. Récupère les program IDs dans les IDL du dépôt `pump-fun/pump-public-docs`, pas de ta mémoire. Écris un script `scripts/start-fork.sh` reproductible.
3. Seulement si le fork échoue : mainnet avec un wallet de test dédié (`.env.test`), plafond 0,5 SOL cumulé, jamais le wallet principal.
Note dans FEASIBILITY.md quel niveau a servi pour chaque test (T1 à T14).

## Arbre de décision automatique (pas besoin de me demander)
- T3 GO et T11 GO : architecture A1 (PDA + attestation).
- Sinon, T10-c GO : A2 (wallet pré-généré). Sinon A3 (escrow), avec avertissement visible dans l'UI et le README.
- Provider de wallet : celui qui passe le plus de cas de T10 ; en cas d'égalité, Privy.
- Un test qui échoue : 3 tentatives de correction maximum, puis note l'échec dans `KNOWN_ISSUES.md` avec l'erreur exacte et applique le plan B. Ne boucle jamais indéfiniment.

## Boucle de vérification (à chaque fin de phase)
Lance : lint, typecheck, build, `anchor build`, tous les tests. Corrige jusqu'au vert. Mets à jour PROGRESS.md, puis passe directement à la phase suivante.

## Standards de code
- Code complet, pas de pseudo-code, pas de TODO ni de placeholder dans le code livré.
- Rust : pas de `unwrap()`/`expect()` hors tests, checked math, validation stricte des comptes. TypeScript : strict, pas de `any`, validation Zod aux frontières.
- Tout identifiant de code en anglais, textes d'interface et README en français.

## Secrets
Ne jamais afficher, logger ni committer une valeur secrète. `.env*` dans `.gitignore`, `.env.example` commenté et complet. Aucune clé privée en clair dans la base ni dans les logs.

## Audit final (obligatoire avant de conclure)
1. Reprends chaque critère d'acceptation de SPEC.md §14 et associe-lui une preuve.
2. Passe en revue la sécurité : forge d'attestation, rejeu, CSRF/state OAuth, rate limits, fuite de secrets, droits admin.
3. Écris `FINAL_REPORT.md` : ce qui marche (avec preuves), ce qui est NON TESTÉ, risques restants, étapes humaines (`HUMAN_TODO.md`), commande pour tout relancer from scratch.
4. Vérifie que le README permet de tout relancer en moins de 15 minutes sur machine vierge.

## Conformité
Aucune promesse de rendement dans l'UI ou les textes. Les buybacks sont décrits comme de la transparence sur l'usage des fees. Rappelle dans le README la validation juridique à faire avant la mainnet.
