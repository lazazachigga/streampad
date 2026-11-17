// apps/backend/src/lib/env.ts
// Validation des variables d'environnement au démarrage (fail-fast).

import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

const EnvSchema = z.object({
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  WEB_ORIGIN: z.string().url().optional(),
  COOKIE_SECRET: z.string().min(16).optional(),
  OAUTH_REDIRECT_BASE_URL: z.string().url().optional(),
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  KICK_CLIENT_ID: z.string().optional(),
  KICK_CLIENT_SECRET: z.string().optional(),
  PRIVY_APP_ID: z.string().optional(),
  STREAMER_VAULT_PROGRAM_ID: z.string().optional(),
  LAUNCHER_WALLET_SECRET: z.string().optional(),
  PROTOCOL_TREASURY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Variables d\'environnement invalides:', parsed.error.flatten());
    process.exit(1);
  }
  // En production, COOKIE_SECRET est obligatoire
  if (isProd && !parsed.data.COOKIE_SECRET) {
    console.error('COOKIE_SECRET est obligatoire en production');
    process.exit(1);
  }
  // En production, OAUTH_REDIRECT_BASE_URL est obligatoire
  if (isProd && !parsed.data.OAUTH_REDIRECT_BASE_URL) {
    console.error('OAUTH_REDIRECT_BASE_URL est obligatoire en production');
    process.exit(1);
  }
  return parsed.data;
}
