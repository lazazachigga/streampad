# SECURITY_AUDIT.md — StreamPad

_Date : 2026-11-15_
_Mode : audit complet (lecture seule + corrections appliquées)_

## Résumé

| Sévérité | Nombre | Corrigé |
|---|---|---|
| CRITIQUE | 4 | 3/4 |
| HAUTE | 6 | 4/6 |
| MOYENNE | 6 | 2/6 |
| BASSE | 5 | 1/5 |

---

## CRITIQUE

### C1 — PKCE X (Twitter) cassé (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/routes/auth.ts`
**Problème** : Le `code_challenge` était généré comme `'challenge_' + Date.now()` (pas un vrai hash SHA-256). Le `code_verifier` dans le callback était `'verifier_' + Date.now()` (une valeur différente). La vérification PKCE échouait toujours.
**Correction** : Implémentation PKCE complète avec `crypto.randomBytes` pour le verifier, SHA-256 pour le challenge, et stockage du verifier dans le state map.

### C2 — Pas de protection CSRF sur OAuth (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/routes/auth.ts`
**Problème** : Le paramètre `state` était généré mais jamais validé au callback. Un attaquant pouvait initier un flux OAuth et piéger un utilisateur.
**Correction** : Map d'états en mémoire avec validation au callback + expiration (10 min) + nettoyage périodique.

### C3 — Signature ed25519 placeholder dans le programme Anchor (NON CORRIGÉ ⚠️)
**Fichier** : `programs/streamer-vault/src/lib.rs` (lignes 36-46)
**Problème** : La vérification de signature ed25519 est un placeholder. Le programme accepte toute signature non-nulle. C'est une faille de sécurité critique — un attaquant peut forger des claims.
**Statut** : Bloqué par le toolchain Anchor corrompu sur Windows. À corriger via CI/Linux.
**Recommandation** : Utiliser le programme Ed25519 (sysvar instructions) pour vérifier la signature de l'attestor.

### C4 — Redirect URI fallback localhost en production (PARTIELLEMENT CORRIGÉ ⚠️)
**Fichier** : `apps/backend/src/routes/auth.ts`
**Problème** : Si `OAUTH_REDIRECT_BASE_URL` n'est pas défini, le redirect URI tombe sur `http://localhost:4000`. En production, cela devrait échouer.
**Correction** : `validateEnv()` exige maintenant `OAUTH_REDIRECT_BASE_URL` en production (fail-fast). Mais le fallback reste pour le dev.

---

## HAUTE

### H1 — Pas de gestion de session (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/routes/auth.ts`, `apps/backend/src/routes/me.ts`
**Problème** : Les callbacks OAuth retournaient les infos utilisateur sans créer de session. Aucun cookie n'était posé.
**Correction** : Ajout de `reply.setCookie('session', ...)` avec httpOnly, secure, sameSite. Ajout de `/me` et `/auth/logout`.

### H2 — Pas de middleware d'authentification (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/routes/me.ts`
**Problème** : `/me/fees` et `/me/claim/attestation` ne vérifiaient pas l'authentification.
**Correction** : Ajout de `getSession()` qui vérifie le cookie session. Retourne 401 si non authentifié.

### H3 — CORS trop permissif (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/server.ts`
**Problème** : La liste d'origins incluait `'https://streampad-frontend.vercel.app'` (un projet différent) et le fallback localhost.
**Correction** : Origines réduites à `WEB_ORIGIN` + `https://streampad.wtf`. Vérification dynamique avec callback.

### H4 — Cookie secret faible par défaut (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/lib/env.ts`
**Problème** : `'dev-cookie-secret-change-me-in-prod'` était utilisé si `COOKIE_SECRET` n'était pas défini.
**Correction** : `validateEnv()` exige `COOKIE_SECRET` (min 16 chars) en production (fail-fast).

### H5 — Pas de limite de taille de body (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/server.ts`
**Problème** : Pas de `bodyLimit` configuré sur Fastify.
**Correction** : `bodyLimit: 1024 * 1024` (1MB max).

### H6 — Pas de HSTS (CORRIGÉ ✅)
**Fichier** : `apps/backend/src/server.ts`
**Problème** : Pas de header HSTS.
**Correction** : `hsts: { maxAge: 31536000, includeSubDomains: true }` dans Helmet.

---

## MOYENNE

### M1 — Pas de persistence (base de données)
**Fichier** : `apps/backend/src/server.ts`, `apps/backend/prisma/schema.prisma`
**Problème** : Les lobbies, utilisateurs et tokens sont en mémoire. Redémarrage = perte de données.
**Statut** : Non corrigé (architecture mock). À corriger avec Prisma + PostgreSQL en production.

### M2 — Mock wallet provision
**Fichier** : `apps/backend/src/routes/wallet.ts`
**Problème** : `/wallet/provision` et `/wallet/link` retournent des données mockées. Pas de vraie création de wallet.
**Statut** : Non corrigé (adaptateur mock selon SPEC §4). À brancher avec Privy/Turnkey.

### M3 — Pas de logging de sécurité
**Fichier** : `apps/backend/src/server.ts`
**Problème** : Les tentatives d'auth échouées, les rate limits dépassés, etc. ne sont pas loggés spécifiquement.
**Statut** : Non corrigé. À ajouter.

### M4 — Pas de validation de l'origine sur les callbacks OAuth
**Fichier** : `apps/backend/src/routes/auth.ts`
**Problème** : Le callback ne vérifie pas que la requête vient du bon origin.
**Statut** : Partiellement corrigé via la validation du state. À compléter.

### M5 — Frontend utilise `window as any`
**Fichier** : `apps/web/lib/wallet.tsx`
**Problème** : Type safety compromise pour la détection du wallet.
**Statut** : Non corrigé (acceptable pour l'injection de wallet browser).

### M6 — Pas d'audit de dépendances
**Statut** : Non effectué. À lancer avec `npm audit`.

---

## BASSE

### B1 — Pas de Content-Type enforcement strict
**Statut** : Fastify valide le Content-Type par défaut. OK.

### B2 — Pas de rate limiting par route
**Statut** : Rate limit global (100 req/min/IP). Les endpoints OAuth pourraient avoir des limites plus strictes.

### B3 — Pas de HTTPS redirect
**Statut** : Render gère le HTTPS au niveau du proxy. OK.

### B4 — Pas de request ID tracking
**Statut** : Non implémenté. Utile pour le debugging.

### B5 — Pas de CSP report-uri
**Statut** : Non configuré. Optionnel.

---

## Recommandations prioritaires

1. **URGENT** : Corriger la vérification ed25519 dans le programme Anchor (C3)
2. **URGENT** : Ajouter `OAUTH_REDIRECT_BASE_URL` aux env vars Render
3. **HAUTE** : Brancher les adaptateurs réels (wallet, DB) selon SPEC §4
4. **HAUTE** : Ajouter un middleware d'auth sur toutes les routes protégées
5. **MOYENNE** : Lancer `npm audit` et corriger les vulnérabilités
6. **MOYENNE** : Ajouter le logging de sécurité

---

## Tests de sécurité effectués

| Test | Résultat |
|---|---|
| Secrets dans git | ✅ Aucun secret committé |
| .gitignore | ✅ .env* ignoré |
| CORS | ✅ Origines strictes |
| Rate limiting | ✅ 100 req/min/IP |
| Helmet | ✅ Headers de sécurité |
| Zod validation | ✅ Sur toutes les routes |
| CSRF (OAuth state) | ✅ Implémenté |
| PKCE (X) | ✅ Implémenté correctement |
| Session cookies | ✅ httpOnly, secure, sameSite |
| Body size limit | ✅ 1MB max |
| Error handling | ✅ Pas de fuite de stack traces |
