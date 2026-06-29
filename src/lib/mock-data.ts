// Données mock / seed — Gestionnaire données MailerLite
// Utilisé en fallback si MAILERLITE_MOCK=true ou si aucune clé valide.
// TODO: brancher sur l'API MailerLite réelle — voir Antigravity.md

import type {
  MailerLiteAccount,
  Snapshot,
  MLSubscriber,
  MLGroup,
  MLField,
  SubscriberStatus,
} from "./types";

export const mockAccounts: MailerLiteAccount[] = [
  {
    id: "acc_prod",
    label: "MailerLite Prod",
    apiKeyMasked: "••••a1b2",
    createdAt: "2024-01-15T10:00:00.000Z",
    lastSyncAt: "2024-06-01T08:30:00.000Z",
    subscriberCount: 1240,
  },
  {
    id: "acc_news",
    label: "MailerLite Newsletter",
    apiKeyMasked: "••••c3d4",
    createdAt: "2024-03-20T14:00:00.000Z",
    lastSyncAt: "2024-06-02T09:15:00.000Z",
    subscriberCount: 530,
  },
];

export const mockGroups: MLGroup[] = [
  { id: "grp_news", name: "Newsletter", activeCount: 480, total: 530 },
  { id: "grp_clients", name: "Clients", activeCount: 320, total: 350 },
  { id: "grp_prospects", name: "Prospects", activeCount: 210, total: 360 },
];

export const mockFields: MLField[] = [
  { id: "f_name", key: "name", name: "Prénom", type: "text" },
  { id: "f_lastname", key: "last_name", name: "Nom", type: "text" },
  { id: "f_city", key: "city", name: "Ville", type: "text" },
  { id: "f_signup", key: "signup_date", name: "Date d'inscription", type: "date" },
];

const STATUSES: SubscriberStatus[] = [
  "active",
  "active",
  "active",
  "unsubscribed",
  "unconfirmed",
  "bounced",
  "junk",
];
const CITIES = ["Montréal", "Québec", "Laval", "Gatineau", "Sherbrooke", "Trois-Rivières"];
const GROUPS = ["grp_news", "grp_clients", "grp_prospects"];

function makeSubscriber(i: number): MLSubscriber {
  const status = STATUSES[i % STATUSES.length];
  const groups = [GROUPS[i % GROUPS.length]];
  if (i % 3 === 0) groups.push(GROUPS[(i + 1) % GROUPS.length]);
  return {
    id: `sub_${i}`,
    email: `abonne${i}@example.com`,
    status,
    source: i % 2 === 0 ? "formulaire" : "import",
    fields: {
      name: `Prénom${i}`,
      last_name: `Nom${i}`,
      city: CITIES[i % CITIES.length],
      signup_date: new Date(2024, i % 12, (i % 27) + 1).toISOString().slice(0, 10),
    },
    groups,
    subscribedAt: new Date(2024, i % 12, (i % 27) + 1).toISOString(),
    createdAt: new Date(2024, i % 12, (i % 27) + 1).toISOString(),
    updatedAt: new Date(2024, (i + 1) % 12, (i % 27) + 1).toISOString(),
  };
}

export const mockSubscribers: MLSubscriber[] = Array.from({ length: 50 }, (_, i) =>
  makeSubscriber(i + 1)
);

export const mockSnapshots: Snapshot[] = [
  {
    id: "snap_001",
    accountId: "acc_news",
    accountLabel: "MailerLite Newsletter",
    label: "Copie complète Newsletter — Juin 2024",
    status: "completed",
    scope: "all",
    totalSubscribers: 50,
    fetchedSubscribers: 50,
    fields: mockFields,
    createdAt: "2024-06-02T09:00:00.000Z",
    completedAt: "2024-06-02T09:05:00.000Z",
    createdByEmail: "admin@chanv.ca",
  },
];

export function isMockEnabled(): boolean {
  return process.env.MAILERLITE_MOCK === "true";
}
