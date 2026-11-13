# StreamPad — Streamer token StreamPad (Solana)

StreamPad de tokens pump.fun pour streamers Twitch/Kick avec fee sharing 75/25 (streamer/protocole), wallet automatique, claim on-chain via programme Anchor.

## Relance from scratch (< 15 min)

### Prérequis
- Node.js 18+ (testé v26), pnpm 12, git.
- Pour le programme Anchor : Rust + Solana CLI (Agave) + Anchor CLI 0.31.2 (optionnel, voir KNOWN_ISSUES.md).
- Fork local de mainnet pour tester pump.fun sans fonds réels.

### Installation
```bash
cd StreamPad
pnpm install
cp .env.example .env   # puis remplir (voir HUMAN_TODO.md)
```

### Fork local
```bash
$env:SOLANA_BIN = "$env:USERPROFILE\.local\share\solana\agave-v2.3.0\solana-release\bin"
$env:SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'
& "C:\Program Files\Git\bin\bash.exe" scripts\start-fork.sh
# health : http://127.0.0.1:8899/health -> ok
```

### Spikes (Phase 0)
```bash
pnpm spike:T1   # lancement pump.fun
pnpm spike:T2   # fee sharing 7500/2500
pnpm spike:T4   # split 75/25 exact
pnpm spike:T5   # coût distribute
pnpm spike:T7   # reprise < 60s
pnpm test       # 14 tests de contrat
pnpm typecheck  # EXIT=0
```

### Backend (Phase 1+)
```bash
cd apps/backend
pnpm dev   # http://localhost:4000
```

### Frontend (Phase 1+)
```bash
cd apps/web
pnpm dev   # http://localhost:3000
```

## Conformité
Aucune promesse de rendement dans l'UI. Les buybacks sont de la transparence sur l'usage des fees. Validation juridique (AMF/PSAN/MiCA) à faire avant tout lancement public.

## Décisions clés
Voir `DECISIONS.md` (D1–D9) et `FEASIBILITY.md` (T1–T14).
