// apps/backend/src/lib/env.ts
// Validation des variables d'environnement au démarrage (fail-fast).

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  WEB_ORIGIN: z.string().url().optional(),
  COOKIE_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Variables d\'environnement invalides:', parsed.error.flatten());
    process.exit(1);
  }
  return parsed.data;
}
