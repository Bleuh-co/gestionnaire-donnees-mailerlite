import "server-only";

/**
 * Client unifié MailerLite — abstrait l'API Classic v2 (MDH/Bleuh)
 * et l'API Connect v2 (Chanv) derrière une interface commune.
 *
 * Les clés API sont lues depuis les variables d'environnement (Secret Manager).
 * Jamais exposées au client.
 */

import type {
  MailerLiteAccount,
  MLSubscriber,
  MLGroup,
  MLField,
  SubscriberStatus,
} from "./types";

// ─── Types internes ────────────────────────────────────────────

interface FetchSubscribersResult {
  data: MLSubscriber[];
  total: number;
  nextCursor: string | null;
}

interface AccountInfo {
  name: string;
  email: string;
  subscriberCount: number;
}

// ─── Abstraction ───────────────────────────────────────────────

interface IMailerLiteClient {
  readonly id: string;
  readonly label: string;
  readonly apiType: "classic" | "connect";
  getAccountInfo(): Promise<AccountInfo>;
  getSubscribers(opts: {
    cursor?: string | null;
    limit?: number;
    search?: string;
    status?: SubscriberStatus;
  }): Promise<FetchSubscribersResult>;
  getGroups(): Promise<MLGroup[]>;
  getFields(): Promise<MLField[]>;
}

// ─── Helpers ───────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
      const wait = Math.min(retryAfter * 1000, 30_000) * (attempt + 1);
      console.warn(
        `[ML] Rate limited, waiting ${wait}ms (attempt ${attempt + 1}/${retries})`
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error("MailerLite rate limit exceeded after retries");
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return "••••" + key.slice(-4);
}

// ─── API Classic v2 (api.mailerlite.com) ───────────────────────
// Utilisé par MDH/Bleuh

class ClassicV2Client implements IMailerLiteClient {
  readonly id: string;
  readonly label: string;
  readonly apiType = "classic" as const;
  private apiKey: string;
  private baseUrl = "https://api.mailerlite.com/api/v2";

  constructor(id: string, label: string, apiKey: string) {
    this.id = id;
    this.label = label;
    this.apiKey = apiKey;
  }

  private headers(): HeadersInit {
    return {
      "X-MailerLite-ApiKey": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getAccountInfo(): Promise<AccountInfo> {
    // Classic API: /me for name/email, /stats for subscriber count
    const [meRes, statsRes] = await Promise.all([
      fetchWithRetry(`${this.baseUrl}/me`, { headers: this.headers() }),
      fetchWithRetry(`${this.baseUrl}/stats`, { headers: this.headers() }),
    ]);
    if (!meRes.ok) throw new Error(`ML Classic /me: ${meRes.status}`);
    const meData = await meRes.json();
    const account = meData.account || meData;

    let subscriberCount = 0;
    if (statsRes.ok) {
      const stats = await statsRes.json();
      subscriberCount = stats.subscribed || 0;
    }

    return {
      name: account.name || this.label,
      email: account.email || account.from || "",
      subscriberCount,
    };
  }

  async getSubscribers(opts: {
    cursor?: string | null;
    limit?: number;
    search?: string;
    status?: SubscriberStatus;
  }): Promise<FetchSubscribersResult> {
    const limit = Math.min(opts.limit || 100, 100);
    const offset = opts.cursor ? parseInt(opts.cursor, 10) : 0;

    let url: string;
    if (opts.search) {
      // Classic API search endpoint
      url = `${this.baseUrl}/subscribers/search?query=${encodeURIComponent(opts.search)}&limit=${limit}&offset=${offset}`;
    } else {
      // Classic API: /subscribers with optional type query param
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (opts.status) params.set("type", opts.status);
      url = `${this.baseUrl}/subscribers?${params.toString()}`;
    }

    const res = await fetchWithRetry(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`ML Classic subscribers: ${res.status}`);
    const raw = await res.json();

    const subscribers: MLSubscriber[] = (Array.isArray(raw) ? raw : []).map(
      (s: any) => this.mapSubscriber(s)
    );

    const hasMore = subscribers.length === limit;
    return {
      data: subscribers,
      total: hasMore ? offset + limit + 1 : offset + subscribers.length,
      nextCursor: hasMore ? String(offset + limit) : null,
    };
  }

  async getGroups(): Promise<MLGroup[]> {
    const res = await fetchWithRetry(`${this.baseUrl}/groups?limit=100`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`ML Classic groups: ${res.status}`);
    const raw = await res.json();
    return (Array.isArray(raw) ? raw : []).map((g: any) => ({
      id: String(g.id),
      name: g.name || "",
      activeCount: g.active || 0,
      total: g.total || 0,
    }));
  }

  async getFields(): Promise<MLField[]> {
    const res = await fetchWithRetry(`${this.baseUrl}/fields`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`ML Classic fields: ${res.status}`);
    const raw = await res.json();
    return (Array.isArray(raw) ? raw : []).map((f: any) => ({
      id: String(f.id),
      key: f.key || "",
      name: f.title || f.key || "",
      type: f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text",
    }));
  }

  private mapSubscriber(s: any): MLSubscriber {
    const fields: Record<string, string | number | null> = {};
    if (Array.isArray(s.fields)) {
      for (const f of s.fields) {
        fields[f.key] = f.value;
      }
    }
    const groups: string[] = [];
    if (Array.isArray(s.groups)) {
      for (const g of s.groups) {
        groups.push(String(g.id || g.name || g));
      }
    }
    return {
      id: String(s.id),
      email: (s.email || "").toLowerCase(),
      status: (s.type || "active") as SubscriberStatus,
      source: s.signup_source || undefined,
      fields,
      groups,
      subscribedAt: s.date_subscribe || undefined,
      createdAt: s.date_created || undefined,
      updatedAt: s.date_updated || undefined,
    };
  }

  getMaskedKey(): string {
    return maskKey(this.apiKey);
  }
}

// ─── API Connect v2 (connect.mailerlite.com) ───────────────────
// Utilisé par Chanv

class ConnectV2Client implements IMailerLiteClient {
  readonly id: string;
  readonly label: string;
  readonly apiType = "connect" as const;
  private apiKey: string;
  private baseUrl = "https://connect.mailerlite.com/api";

  constructor(id: string, label: string, apiKey: string) {
    this.id = id;
    this.label = label;
    this.apiKey = apiKey;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const res = await fetchWithRetry(`${this.baseUrl}/account`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`ML Connect /account: ${res.status}`);
    const json = await res.json();
    const account = json.data || json;
    return {
      name: account.name || this.label,
      email: account.email || "",
      subscriberCount: account.subscriber_count || 0,
    };
  }

  async getSubscribers(opts: {
    cursor?: string | null;
    limit?: number;
    search?: string;
    status?: SubscriberStatus;
  }): Promise<FetchSubscribersResult> {
    const limit = Math.min(opts.limit || 100, 100);
    const params = new URLSearchParams({ limit: String(limit) });

    if (opts.cursor) params.set("cursor", opts.cursor);
    if (opts.search) params.set("filter[email]", opts.search);
    if (opts.status) params.set("filter[status]", opts.status);

    const res = await fetchWithRetry(
      `${this.baseUrl}/subscribers?${params.toString()}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`ML Connect subscribers: ${res.status}`);
    const json = await res.json();

    const subscribers: MLSubscriber[] = (json.data || []).map((s: any) =>
      this.mapSubscriber(s)
    );

    const meta = json.meta || {};
    const nextCursor =
      json.links?.next
        ? new URL(json.links.next).searchParams.get("cursor")
        : null;

    return {
      data: subscribers,
      total: meta.total || subscribers.length,
      nextCursor,
    };
  }

  async getGroups(): Promise<MLGroup[]> {
    const allGroups: MLGroup[] = [];
    let cursor: string | null = null;

    do {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetchWithRetry(
        `${this.baseUrl}/groups?${params.toString()}`,
        { headers: this.headers() }
      );
      if (!res.ok) throw new Error(`ML Connect groups: ${res.status}`);
      const json = await res.json();

      for (const g of json.data || []) {
        allGroups.push({
          id: String(g.id),
          name: g.name || "",
          activeCount: g.active_count || 0,
          total: g.subscribers_count || g.active_count || 0,
        });
      }

      cursor = json.links?.next
        ? new URL(json.links.next).searchParams.get("cursor")
        : null;
    } while (cursor);

    return allGroups;
  }

  async getFields(): Promise<MLField[]> {
    const res = await fetchWithRetry(`${this.baseUrl}/fields?limit=50`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`ML Connect fields: ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((f: any) => ({
      id: String(f.id),
      key: f.key || "",
      name: f.name || f.key || "",
      type:
        f.type === "number"
          ? "number"
          : f.type === "date"
            ? "date"
            : "text",
    }));
  }

  private mapSubscriber(s: any): MLSubscriber {
    const fields: Record<string, string | number | null> = {};
    if (s.fields && typeof s.fields === "object") {
      for (const [key, val] of Object.entries(s.fields)) {
        fields[key] = val as string | number | null;
      }
    }
    const groups: string[] = [];
    if (Array.isArray(s.groups)) {
      for (const g of s.groups) {
        groups.push(String(g.id || g));
      }
    }
    return {
      id: String(s.id),
      email: (s.email || "").toLowerCase(),
      status: (s.status || "active") as SubscriberStatus,
      source: s.source || undefined,
      fields,
      groups,
      subscribedAt: s.subscribed_at || s.opted_in_at || undefined,
      createdAt: s.created_at || undefined,
      updatedAt: s.updated_at || undefined,
    };
  }

  getMaskedKey(): string {
    return maskKey(this.apiKey);
  }
}

// ─── Factory ───────────────────────────────────────────────────

export type { IMailerLiteClient, FetchSubscribersResult, AccountInfo };

/**
 * Retourne tous les clients MailerLite configurés.
 * Lit les clés API depuis les variables d'environnement.
 */
export function getConfiguredClients(): IMailerLiteClient[] {
  const clients: IMailerLiteClient[] = [];

  const mdhKey = process.env.MAILERLITE_API_KEY;
  if (mdhKey) {
    clients.push(new ClassicV2Client("mdh", "Maison d'Herbes", mdhKey));
  }

  const bleuhKey = process.env.MAILERLITE_BLEUH_API_KEY;
  if (bleuhKey) {
    clients.push(new ClassicV2Client("bleuh", "Bleuh", bleuhKey));
  }

  const chanvKey = process.env.MAILERLITE_CHANV_API_KEY;
  if (chanvKey) {
    clients.push(new ConnectV2Client("chanv", "Chanv", chanvKey));
  }

  return clients;
}

/**
 * Retourne un client par ID.
 */
export function getClientById(id: string): IMailerLiteClient | null {
  return getConfiguredClients().find((c) => c.id === id) || null;
}

/**
 * Retourne les comptes sous forme de MailerLiteAccount (pour l'API publique).
 * Les clés sont masquées.
 */
export async function getAccountsList(): Promise<MailerLiteAccount[]> {
  const clients = getConfiguredClients();
  const accounts: MailerLiteAccount[] = [];

  for (const client of clients) {
    try {
      const info = await client.getAccountInfo();
      const masked =
        client instanceof ClassicV2Client
          ? (client as ClassicV2Client).getMaskedKey()
          : client instanceof ConnectV2Client
            ? (client as ConnectV2Client).getMaskedKey()
            : "••••";

      accounts.push({
        id: client.id,
        label: client.label,
        apiKeyMasked: masked,
        createdAt: new Date().toISOString(),
        subscriberCount: info.subscriberCount,
      });
    } catch (e) {
      console.error(`[ML] Error fetching account info for ${client.id}:`, e);
      accounts.push({
        id: client.id,
        label: client.label,
        apiKeyMasked: "••••",
        createdAt: new Date().toISOString(),
        subscriberCount: 0,
      });
    }
  }

  return accounts;
}
