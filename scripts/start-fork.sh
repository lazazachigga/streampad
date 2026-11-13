#!/usr/bin/env bash
# Fork local de mainnet pour tester pump.fun sans fonds réels (AGENTS.md §environnement, niveau F).
# Clone les programmes pump (Pump, Pump Fees, Pump AMM, Mayhem, Token-2022) et les comptes
# globaux nécessaires depuis un RPC mainnet, puis démarre solana-test-validator.
#
# Usage :
#   bash scripts/start-fork.sh                 # fork depuis le RPC public mainnet
#   SOLANA_RPC_URL=https://... bash scripts/start-fork.sh
#   FORGE_PROGRAM=1 bash scripts/start-fork.sh # ajoute notre programme maison (.so) au fork
#
# Windows : "C:\Program Files\Git\bin\bash.exe" scripts\start-fork.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# publicnode par défaut : api.mainnet-beta.solana.com renvoie HTTP 429 (rate-limit) sur les
# --clone (constaté le 2026-11-12). Override possible avec SOLANA_RPC_URL.
RPC_URL="${SOLANA_RPC_URL:-https://solana-rpc.publicnode.com}"
LEDGER="${FORK_LEDGER:-.fork-ledger}"
SOLANA_BIN="${SOLANA_BIN:-$HOME/.local/share/solana/solana-release/bin}"
export PATH="$SOLANA_BIN:$PATH"

if ! command -v solana-test-validator >/dev/null 2>&1; then
  echo "ERREUR : solana-test-validator introuvable (SOLANA_BIN=$SOLANA_BIN)" >&2
  exit 1
fi

CLONE_ARGS="$(node --import tsx scripts/fork-args.ts "$RPC_URL")"
echo "[fork] RPC source : $RPC_URL"
echo "[fork] arguments  : $CLONE_ARGS"

EXTRA_ARGS=()
if [[ "${FORGE_PROGRAM:-0}" == "1" ]]; then
  SO_FILE="target/deploy/launchpad.so"
  PROGRAM_ID="$(node -e "const fs=require('fs');const k=JSON.parse(fs.readFileSync('target/deploy/launchpad-keypair.json','utf8'));const {PublicKey}=require('@solana/web3.js');console.log(new PublicKey(k).toBase58())")"
  if [[ ! -f "$SO_FILE" ]]; then
    echo "ERREUR : $SO_FILE absent (lancez 'anchor build' d'abord)" >&2
    exit 1
  fi
  echo "[fork] programme maison : $PROGRAM_ID <- $SO_FILE"
  EXTRA_ARGS+=(--bpf-program "$PROGRAM_ID" "$SO_FILE")
fi

# shellcheck disable=SC2086
# --log évite la création d'un symlink de log (solana-test-validator.rs:130), qui exige
# SeCreateSymbolicLinkPrivilege sur Windows et panique sinon (erreur 1314).
exec solana-test-validator \
  --reset \
  --log \
  --ledger "$LEDGER" \
  $CLONE_ARGS \
  "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
