# Plan Architectural — 🚀 Gestionnaire données MailerLite

## 1. Résumé

Application interne permettant aux équipes marketing du Groupe Chanv de **consulter** les bases d'abonnés MailerLite et d'en réaliser des **copies horodatées (snapshots)** stockées dans Firestore. Elle résout le besoin de figer/archiver l'état d'une base à un instant T, de l'exporter (CSV/JSON) et d'explorer les abonnés sans passer par l'interface MailerLite. L'app gère plusieurs comptes MailerLite via leurs clés API.

---

## 2. Pages (détaillé)

### `/` — Tableau de bord
- **Rôle** : vue d'ensemble.
- **Composants** : `StatCards` (nb comptes, nb snapshots, total abonnés copiés), `RecentSnapshotsList`, `AccountsSummary`.
- **Interactions** : clic sur un snapshot → `/snapshots/[id]`; bouton « Nouvelle copie » → `/snapshots/new`.
- **États** : *loading* (skeletons sur cartes), *vide* (message « Aucun compte connecté — ajoutez-en un »), *erreur* (bannière).

### `/accounts` — Gestion des comptes
- **Rôle** : lister/supprimer les comptes ML.
- **Composants** : `AccountCard` (label, clé masquée, dernier sync, nb abonnés), bouton « Ajouter ».
- **Interactions** : suppression avec confirmation (modal), clic « Explorer » → `/explore/[accountId]`.
- **États** : *vide* (CTA ajout), *loading*, *erreur*.

### `/accounts/new` — Ajout de compte
- **Rôle** : enregistrer une clé API ML.
- **Composants** : `AccountForm` (champ label, champ clé API).
- **Interactions** : soumission → POST `/api/accounts` qui valide la clé contre l'endpoint ML `/api/me`. Affiche le nb d'abonnés détectés en cas de succès, redirige vers `/accounts`.
- **États** : *submitting* (bouton disabled + spinner), *erreur de validation* (clé invalide → message inline), *succès*.

### `/snapshots` — Liste des copies
- **Rôle** : historique des snapshots.
- **Composants** : `SnapshotTable` (label, compte, scope, statut badge, nb abonnés, date, actions).
- **Interactions** : filtrer par compte/statut; clic ligne → détail; supprimer.
- **États** : *loading*, *vide*, *erreur*. Les snapshots `running` affichent une barre de progression auto-rafraîchie (polling 3 s).

### `/snapshots/new` — Création d'un snapshot
- **Rôle** : lancer une copie.
- **Composants** : `SnapshotForm` (select compte, select scope `all`/`group`, select groupe conditionnel, champ label optionnel).
- **Interactions** : au choix du compte → charge les groupes via `/api/accounts/[id]/groups`. Soumission → POST `/api/snapshots`, redirige vers `/snapshots/[id]`.
- **États** : *loading groupes*, *submitting*, *erreur*.

### `/snapshots/[id]` — Détail d'un snapshot
- **Rôle** : explorer une copie figée.
- **Composants** : `SnapshotHeader` (stats + statut + progression), `SubscriberTable` (paginée, recherche, filtre statut/groupe), `ExportPanel` (choix format + colonnes).
- **Interactions** : recherche (debounce 300 ms) → `/api/snapshots/[id]/subscribers`; pagination; export → ouvre `/api/snapshots/[id]/export?format=csv` (téléchargement).
- **États** : *running* (polling progression), *completed* (table active), *failed* (message d'erreur), *vide*.

### `/explore/[accountId]` — Consultation live
- **Rôle** : consulter en direct sans copier.
- **Composants** : `SubscriberTable` alimentée par l'API live ML proxy.
- **Interactions** : recherche, pagination via `/api/accounts/[id]/subscribers`. Bouton « Créer une copie » → `/snapshots/new?account=[id]`.
- **États** : *loading*, *rate-limit* (message « API MailerLite limitée, réessayez »), *vide*.

---

## 3. Composants métier

### `StatCards.tsx`
- **Props** : `{ accounts: number; snapshots: number; subscribers: number; loading?: boolean }`
- **Comportement** : 3 cartes `.card` avec valeur + label. Skeleton si loading.

### `AccountCard.tsx`
- **Props** : `{ account: MailerLiteAccount; onDelete: (id: string) => void }`
- **Comportement** : `.section-card`, affiche label, `apiKeyMasked` (•••• 1234), `lastSyncAt` relatif, `badge-accent` nb abonnés. Boutons `.btn-secondary` Explorer / `.btn-ghost` Supprimer.

### `AccountForm.tsx`
- **Props** : `{ onSuccess: (a: MailerLiteAccount) => void }`
- **Comportement** : inputs `.input` + `.label`, validation côté client (champs requis), `.btn-primary` submit. Affiche erreur API inline.

### `SnapshotTable.tsx`
- **Props** : `{ snapshots: Snapshot[]; onDelete: (id: string) => void; loading?: boolean }`
- **Comportement** : table responsive dans `.card`. `StatusBadge` par ligne. Lignes `running` montrent `fetchedSubscribers/totalSubscribers`.

### `StatusBadge.tsx`
- **Props** : `{ status: SnapshotStatus }`
- **Comportement** : mappe `completed`→`badge-accent`, `running`/`pending`→`badge-warning`, `failed`→`badge-neutral` (rouge via texte), `pending`→`badge-neutral`.

### `SnapshotForm.tsx`
- **Props** : `{ accounts: MailerLiteAccount[]; defaultAccountId?: string; onSubmit: (payload) => void }`
- **Comportement** : selects `.input`. Charge groupes dynamiquement. Affiche estimation du nb d'abonnés selon scope.

### `SnapshotHeader.tsx`
- **Props** : `{ snapshot: Snapshot }`
- **Comportement** : `.section-card` avec stats, barre de progression (div Tailwind), statut.

### `SubscriberTable.tsx`
- **Props** : `{ rows: MLSubscriber[]; total: number; page: number; limit: number; onPageChange: (p: number) => void; onSearch: (q: string) => void; onFilter: (f: { status?: SubscriberStatus; groupId?: string }) => void; loading?: boolean; groups?: MLGroup[] }`
- **Comportement** : barre de recherche `.input` (debounce), selects filtres, table colonnes email/statut/groupes/champs clés, pagination. Skeleton loading. Empty state.

### `ExportPanel.tsx`
- **Props** : `{ snapshotId: string; fields: MLField[] }`
- **Comportement** : `.card`, radio format CSV/JSON, checkboxes colonnes, filtre statut, `.btn-primary` « Exporter » → `window.location` vers l'endpoint export.

### `ConfirmDialog.tsx`
- **Props** : `{ open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }`
- **Comportement** : modal overlay, `.btn-primary` confirmer / `.btn-ghost` annuler.

---

## 4. Routes API (détaillé)

> Toutes les routes lisent la clé API ML depuis Firestore (jamais exposée au client). En l'absence de clé valide ou si `MAILERLITE_MOCK=true`, fallback sur `mock-data.ts`.

### `GET /api/accounts`
- **Output** : `MailerLiteAccount[]` (clés masquées).
- **Firestore** : collection `ml_accounts`, ordonnée par `createdAt desc`.

### `POST /api/accounts`
- **Input** : `{ label: string; apiKey: string }`
- **Logique** : appel `GET https://connect.mailerlite.com/api/account` avec `Authorization: Bearer <apiKey>` pour valider + récupérer `subscriberCount`. Stocke `apiKey` chiffrée (ou champ `apiKey` brut dans Firestore — accès serveur uniquement), `apiKeyMasked` = `•••• + 4 derniers`.
- **Output** : `MailerLiteAccount` créé.
- **Erreurs** : 400 (champs manquants), 401 (clé invalide ML), 409 (label déjà existant).

### `DELETE /api/accounts/[id]`
- **Logique** : supprime le doc. Snapshots conservés (référencent `accountLabel`).
- **Output** : `{ success: true }`. Erreur 404 si introuvable.

### `GET /api/accounts/[id]/groups`
- **Logique** : proxy `GET https://connect.mailerlite.com/api/groups`.
- **Output** : `MLGroup[]`. Erreur 401/429 propagée.

### `GET /api/accounts/[id]/subscribers`
- **Query** : `search?`, `status?`, `groupId?`, `cursor?`, `limit?` (défaut 25, max 100).
- **Logique** : proxy `GET /api/subscribers` (curseur ML). Mapping vers `MLSubscriber`.
- **Output** : `PaginatedResult<MLSubscriber>` (avec cursor next).

### `GET /api/snapshots`
- **Query** : `accountId?`, `status?`.
- **Output** : `Snapshot[]`. **Firestore** : collection `snapshots` ordonnée `createdAt desc`.

### `POST /api/snapshots`
- **Input** : `{ accountId: string; scope: 'all'|'group'; groupId?: string; label?: string }`
- **Logique** :
  1. Crée doc `snapshots` statut `pending`.
  2. Récupère les champs (`/api/fields`) → `fields`.
  3. Pagine tous les abonnés via curseur ML (boucle, batch 100), statut `running`, met à jour `fetchedSubscribers` périodiquement.
  4. Écrit chaque abonné dans sous-collection `snapshots/{id}/subscribers` (batch writes ≤ 500).
  5. Statut `completed` + `completedAt` + `totalSubscribers`.
  - En cas d'erreur ML → statut `failed` + `errorMessage`.
- **Output** : `Snapshot` (statut initial). Le travail continue en arrière-plan (voir Notes techniques).
- **Erreurs** : 400 (scope group sans groupId), 404 (compte inconnu).

### `GET /api/snapshots/[id]`
- **Output** : `Snapshot` (incluant progression). **Firestore** : doc lecture.
- **Erreur** : 404.

### `DELETE /api/snapshots/[id]`
- **Logique** : supprime sous-collection `subscribers` (batch) puis le doc.
- **Output** : `{ success: true }`.

### `GET /api/snapshots/[id]/subscribers`
- **Query** : `search?`, `status?`, `groupId?`, `page?` (défaut 1), `limit?` (défaut 25).
- **Logique** : query sous-collection avec filtres `status`/`groups array-contains`. Recherche email via `>=`/`<=` prefix (champ `email` indexé). Pagination par offset (cursor doc).
- **Output** : `PaginatedResult<MLSubscriber>`.

### `GET /api/snapshots/[id]/export`
- **Query** : `format=csv|json`, `fields?` (csv list), `status?` (csv list).
- **Logique** : lit tous les abonnés filtrés du snapshot, génère le contenu. CSV : header dynamique selon `fields` + colonnes fixes (email, status, groups). Échappement des virgules/guillemets.
- **Output** : `Response` avec `Content-Type` adapté et `Content-Disposition: attachment; filename="snapshot-<label>-<date>.csv"`.
- **Erreur** : 404 si snapshot inconnu, 409 si snapshot non `completed`.

---

## 5. Structure de données

### Collection `ml_accounts`
```
{
  id: string (doc id),
  label: string,
  apiKey: string,          // serveur uniquement, jamais renvoyé tel quel
  apiKeyMasked: string,
  createdAt: Timestamp,
  lastSyncAt?: Timestamp,
  subscriberCount?: number
}
```

### Collection `snapshots`
```
{
  id, accountId, accountLabel, label,
  status: SnapshotStatus,
  scope, groupId?, groupName?,
  totalSubscribers, fetchedSubscribers,
  fields: MLField[],
  errorMessage?,
  createdAt: Timestamp, completedAt?: Timestamp,
  createdByEmail: string
}
```

### Sous-collection `snapshots/{snapshotId}/subscribers`
```
{
  id, email (lowercase indexé), status,
  source?, fields: map, groups: string[],
  subscribedAt?, createdAt?, updatedAt?
}
```

### Relations
- `snapshots.accountId` → `ml_accounts.id` (souple : `accountLabel` dénormalisé pour survie après suppression du compte).
- Abonnés isolés par snapshot (immuables, données figées).

### Indexes Firestore
- `snapshots` : composite `(accountId ASC, createdAt DESC)`, `(status ASC, createdAt DESC)`.
- `subscribers` (collection group ou sous-collection) : `(status ASC, email ASC)`, `(groups ARRAY, email ASC)`, simple sur `email`.

---

## 6. Dépendances npm

Aucune dépendance additionnelle.
- **API MailerLite** : `fetch` natif (endpoints `connect.mailerlite.com/api`).
- **Export CSV/JSON** : génération manuelle via `Response` natif (pas de lib CSV).
- **Firestore** : Firebase Admin SDK (déjà fourni).

---

## 7. Notes techniques

- **Sécurité des clés API** : la clé ML ne doit jamais transiter vers le client. Toutes les requêtes ML passent par les routes API serveur. Stocker idéalement chiffrée (AES via une clé d'env `ENCRYPTION_KEY`) ; à défaut, restreindre l'accès Firestore au service account uniquement.
- **Snapshots longs (background)** : Cloud Run n'a pas de workers persistants par défaut. Pour de grosses bases, traiter le snapshot par **chunks** : POST initial crée le doc `pending` et lance la première page; un mécanisme de relance (route `POST /api/snapshots/[id]/process?cursor=...` appelée en boucle côté client pendant le polling, OU une Cloud Task) poursuit la pagination. Pour le MVP, traiter de façon séquentielle dans la requête POST avec timeout généreux (Cloud Run max 60 min) et bornes raisonnables.
- **Rate limiting MailerLite** : ~120 req/min. Respecter `Retry-After` sur 429, backoff exponentiel. Utiliser `limit=100` pour minimiser les appels.
- **Pagination ML** : API ML utilise des **curseurs** (`cursor`), pas d'offset. Le proxy live expose un curseur; les snapshots Firestore utilisent offset/page.
- **Recherche email** : Firestore ne fait pas de full-text. Implémenter recherche par préfixe sur `email` lowercase (`>= q` et `<= q + '\uf8ff'`). Pour recherche avancée, stocker un champ `searchTokens`.
- **Export volumineux** : streamer la réponse si > 10 000 lignes (ReadableStream) pour éviter de tout charger en mémoire.
- **Polling progression** : page snapshot interroge `/api/snapshots/[id]` toutes les 3 s tant que `status === 'running'`, arrêt sur `completed`/`failed`.
- **Accessibilité** : tables avec `<th scope>`, modals piégeant le focus, boutons avec labels explicites, badges de statut avec texte (pas couleur seule).
- **Mock mode** : `MAILERLITE_MOCK=true` permet de développer sans clé réelle, utile en local et démo.
- **Audit** : `createdByEmail` rempli depuis la session auth serveur pour tracer qui a créé chaque snapshot.