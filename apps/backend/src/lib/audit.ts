// apps/backend/src/lib/audit.ts
// Helper d'audit log (SPEC §8) : chaque claim, provision de wallet et lancement
// est tracé.

export interface AuditEntry {
  action: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

export type AuditSink = (entry: AuditEntry) => Promise<void>;

export async function audit(sink: AuditSink, entry: AuditEntry): Promise<void> {
  try {
    await sink(entry);
  } catch {
    // L'audit ne doit jamais bloquer le flux principal.
  }
}
