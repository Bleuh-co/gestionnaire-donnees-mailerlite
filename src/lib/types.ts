// Rôle interne Gestionnaire données MailerLite (mappé depuis le rôle standardisé Chanv)
// - superadmin : accès total
// - admin      : gestion + voir toutes les tâches
// - membre     : voir ses propres tâches (rôle Consulter)
// - blocked    : pas d'accès
export type Role = "superadmin" | "admin" | "membre" | "blocked";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Administrateur",
  admin: "Administrateur",
  membre: "Membre",
  blocked: "Bloqué",
};

// ───────────────────────────────────────────────────────────
// Types métier — Gestionnaire données MailerLite
// ───────────────────────────────────────────────────────────

export interface MailerLiteAccount {
  id: string;
  label: string;          // nom interne du compte
  apiKeyMasked: string;   // 4 derniers caractères seulement
  createdAt: string;      // ISO
  lastSyncAt?: string;    // ISO
  subscriberCount?: number;
}

export type SubscriberStatus = 'active' | 'unsubscribed' | 'unconfirmed' | 'bounced' | 'junk';

export interface MLSubscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  source?: string;
  fields: Record<string, string | number | null>;
  groups: string[];        // ids des groupes
  subscribedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MLGroup {
  id: string;
  name: string;
  activeCount: number;
  total: number;
}

export interface MLField {
  id: string;
  key: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export type SnapshotStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Snapshot {
  id: string;
  accountId: string;
  accountLabel: string;
  label: string;
  status: SnapshotStatus;
  scope: 'all' | 'group';
  groupId?: string;
  groupName?: string;
  totalSubscribers: number;
  fetchedSubscribers: number;
  fields: MLField[];
  errorMessage?: string;
  gcsPath?: string;       // chemin du fichier JSON dans GCS
  createdAt: string;       // ISO
  completedAt?: string;    // ISO
  createdByEmail: string;
}

export type ExportFormat = 'csv' | 'json';

export interface ExportRequest {
  snapshotId: string;
  format: ExportFormat;
  fields?: string[];       // colonnes à inclure (défaut: toutes)
  statusFilter?: SubscriberStatus[];
}

export interface SubscriberQuery {
  search?: string;
  status?: SubscriberStatus;
  groupId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
