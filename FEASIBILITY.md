# FEASIBILITY.md — Matrice de faisabilité (Phase 0)

_Date d'ouverture : 2026-11-12_

Colonnes imposées par SPEC.md §3 : ID | hypothèse | test exécuté | résultat | statut (GO / NO-GO / PARTIEL / NON TESTÉ) | preuve (signature, log) | décision.
La colonne « niveau » note la stratégie d'environnement utilisée (AGENTS.md) : **U** = unitaire/validator local, **F** = fork mainnet local, **M** = mainnet wallet dédié (plafond 0,5 SOL), **H** = nécessite un humain (secret/compte), **—** = non exécuté.

| ID | hypothèse | test exécuté | résultat | statut | preuve | décision |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Lancement pump.fun par programme via `@pump-fun/pump-sdk` | `pnpm spike:T1` (spikes/t01-launch.ts, fork local) | `createV2AndBuyInstructions` + envoi réel OK : mint `GBcFN4KrhbVLsp3ckCuhWqxkT6xKaivZP5RfNb9j3tff`, bonding curve `HCLypxZvHLwmvdHfRDMWYxv6U4csusH5c46nExDZ4syU`, coût 0.012371 SOL | **GO** (niveau **F**) | sig `4eE1SRUaK6iAmPwEAX2ui6aeJJ3ae2YicGsuwUDpk85MD6gYS6aPqzzo1p87ZyNxxrWw139GAZ2o2RKf3WZHWsYv` (financement `5v4AJFED…`), état `spikes/.state/t01.json` | Fix : les 24 fee recipients (FEE_RECIPIENTS.md) doivent être clonés dans le fork — sans eux `InsufficientFundsForRent` (échec #1, 3 runs diagnostiqués `_t01-debug3/4/5.ts`) |
| T2 | `create_fee_sharing_config` + `update_fee_shares_v2` enchaînés (7500/2500 définitif) | spikes/t02-*.ts | — | NON TESTÉ | — | — |
| T3 | PDA `StreamerVault` de notre programme bénéficiaire du fee sharing | spikes/t03-*.ts | — | NON TESTÉ | — | — |
| T4 | Split exact 75/25 ± 1 lamport sur ≥ 5 distributions | spikes/t04-*.ts | — | NON TESTÉ | — | — |
| T5 | Coût `distribute_creator_fees_v2` < 1 % du montant distribué | spikes/t05-*.ts | — | NON TESTÉ | — | — |
| T6 | Tokens gradués : `transfer_creator_fees_to_pump_v2` + `distribute_creator_fees_v2` | spikes/t06-*.ts | — | NON TESTÉ | — | — |
| T7 | Récupération d'un lancement interrompu < 60 s (machine d'états) | spikes/t07-*.ts | — | NON TESTÉ | — | — |
| T8 | OAuth Twitch PKCE, ID numérique stable | spikes/t08-*.ts | — | NON TESTÉ | — | — |
| T9 | OAuth Kick PKCE, ID Kick stable, tokens chiffrés | spikes/t09-*.ts | — | NON TESTÉ | — | — |
| T10 | Wallet auto (Privy ET Turnkey), cas (a)→(e) | spikes/t10-*.ts | — | NON TESTÉ | — | — |
| T11 | Claim programme maison : happy path + 7 rejets | tests Anchor du programme | — | NON TESTÉ | — | — |
| T12 | Indexeur : détection distributions/claims, reprise crash sans doublon | spikes/t12-*.ts | — | NON TESTÉ | — | — |
| T13 | Buyback réel du token launchpad (slippage respecté) | spikes/t13-*.ts | — | NON TESTÉ | — | — |
| T14 | Sécurité : forge attestation, rejeu OAuth, usurpation, rate limits | spikes/t14-*.ts + tests | — | NON TESTÉ | — | — |

## Verdict global de phase
À remplir en fin de phase 0 : **GO / GO avec réserves / NO-GO**, réserves, recommandation d'architecture (SPEC §4).

## Notes de niveau d'environnement par test
(à compléter au fil des exécutions)
