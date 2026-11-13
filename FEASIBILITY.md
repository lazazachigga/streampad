# FEASIBILITY.md — Matrice de faisabilité (Phase 0)

_Date d'ouverture : 2026-11-12_

Colonnes imposées par SPEC.md §3 : ID | hypothèse | test exécuté | résultat | statut (GO / NO-GO / PARTIEL / NON TESTÉ) | preuve (signature, log) | décision.
La colonne « niveau » note la stratégie d'environnement utilisée (AGENTS.md) : **U** = unitaire/validator local, **F** = fork mainnet local, **M** = mainnet wallet dédié (plafond 0,5 SOL), **H** = nécessite un humain (secret/compte), **—** = non exécuté.

| ID | hypothèse | test exécuté | résultat | statut | preuve | décision |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Lancement pump.fun par programme via `@pump-fun/pump-sdk` | `pnpm spike:T1` (spikes/t01-launch.ts, fork local) | `createV2AndBuyInstructions` + envoi réel OK : mint `GBcFN4KrhbVLsp3ckCuhWqxkT6xKaivZP5RfNb9j3tff`, bonding curve `HCLypxZvHLwmvdHfRDMWYxv6U4csusH5c46nExDZ4syU`, coût 0.012371 SOL | **GO** (niveau **F**) | sig `4eE1SRUaK6iAmPwEAX2ui6aeJJ3ae2YicGsuwUDpk85MD6gYS6aPqzzo1p87ZyNxxrWw139GAZ2o2RKf3WZHWsYv` (financement `5v4AJFED…`), état `spikes/.state/t01.json` | Fix : les 24 fee recipients (FEE_RECIPIENTS.md) doivent être clonés dans le fork — sans eux `InsufficientFundsForRent` (échec #1, 3 runs diagnostiqués `_t01-debug3/4/5.ts`) |
| T2 | `create_fee_sharing_config` + `update_fee_shares_v2` enchaînés (7500/2500 définitif) | `pnpm spike:T2` (spikes/t02-fee-sharing.ts, fork local) | 2 ixs dans 1 tx OK : sharing_config `Fbz1TuZUoV5ZCbwYuJTFhFab7V6ns5PfUDULv9QFcUin`, shareholders `launcher=7500 + platform=2500`, `adminRevoked=true`, 2e update refusé (`0x1779`) | **GO** (niveau **F**) | sig fee sharing `5peWmNhECJGEAyfVk1v1vHzFApWiB1fMThm1r9uN1u9WoP6MQYKH1L7tWvJHVY6f2dLVYvVW6NoQk4PrPG8T8cB5` (lancement `3tj1HeTJ…`), état `spikes/.state/t02.json` | L'opt-in + liste définitive fonctionnent ; l'admin est bien révoqué (une seule mise à jour possible) |
| T3 | PDA `StreamerVault` de notre programme bénéficiaire du fee sharing | spikes/t03-*.ts | — | NON TESTÉ | — | — |
| T4 | Split exact 75/25 ± 1 lamport sur ≥ 5 distributions | `pnpm spike:T4` (spikes/t04-split.ts, fork local) | 5/5 distributions de 5 880 000 lamports chacune : 75 %→4 410 000 (attendu 4 410 000), 25 %→1 470 000 (attendu 1 470 000), **dérive 0/0 lamport** sur les 5 cycles | **GO** (niveau **F**) | mint `7tqYz4LpTQbHY8BeRUNMdHmieWtwUK4JVjtoG4BRg1oX`, sigs cycle 1→5 `5XRZ1Jet…` `5tyevzDq…` `2m4PMMr2…` `4bV6Z81X…` `2RHdUgGh…`, état `spikes/.state/t04.json` | Piège constaté (2 échecs, `_t04-debug*.ts`) : le programme réussit **sans verser** si le vault ≤ plancher de rent (890 880) — il ne donne son seuil (4 454 400) que sous le plancher → boucler sur la balance réelle du vault, seuil retenu après la 1re observation |
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
