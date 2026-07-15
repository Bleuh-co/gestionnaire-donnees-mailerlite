"use client";

/**
 * Mini-système i18n trilingue (FR/EN/ES), piloté par le hub Gandalf.
 *
 * - La langue vient de useGandalf().lang (headers au SSR, postMessage en live).
 * - Clés à plat `section.element` ; repli : fr, puis la clé elle-même.
 * - Interpolation optionnelle : t("table.count", { n: 3 }) → "3 abonnés".
 *
 * Modèle xero_photo_achat (src/lib/i18n.ts), condensé en un fichier.
 * NOTE : les DONNÉES (labels de comptes, noms de segments/groupes, emails)
 * ne sont JAMAIS traduites — uniquement la chrome UI.
 */

import { useCallback } from "react";
import { useGandalf } from "@bleuh-co/gandalf-sdk-next/client";

export type Lang = "fr" | "en" | "es";

/** Locale de formatage (dates, nombres) par langue. */
export const LANG_LOCALES: Record<Lang, string> = {
  fr: "fr-CA",
  en: "en-CA",
  es: "es",
};

export const MESSAGES: Record<Lang, Record<string, string>> = {
  fr: {
    // Navigation
    "nav.accounts": "Comptes",
    "nav.snapshots": "Copies",
    "nav.explore": "Explorer",
    "nav.dashboard": "Tableau de bord",
    "nav.subtitle": "Groupe Chanv",
    "nav.backToHub": "Retour au Hub",
    "nav.menu": "Menu",

    // Rôles
    "role.superadmin": "Super Administrateur",
    "role.admin": "Administrateur",
    "role.gestionnaire": "Gestionnaire",
    "role.consulter": "Consulter",
    "role.blocked": "Bloqué",

    // Connexion
    "login.domains": "Connexion réservée aux domaines",
    "login.ssoChecking": "Connexion SSO en cours...",
    "login.loading": "Chargement...",
    "login.signIn": "Se connecter avec Google",
    "login.sessionInfo": "Une session s'ouvrira pour 5 jours.",

    // Auth (toasts)
    "auth.domainRefused": "Domaine non autorisé. Domaines acceptés: {domains}",
    "auth.sessionRefused": "Session refusée ({status})",
    "auth.signInFailed": "Échec de la connexion",
    "blocked.title": "Accès non autorisé",
    "blocked.message": "Ce compte n'a pas accès à Importation MailerLite. Contactez un administrateur pour obtenir un rôle, ou essayez un autre compte.",
    "blocked.retry": "Essayer un autre compte",
    "forbidden.gestionnaireTitle": "Accès Gestionnaire requis",
    "forbidden.gestionnaireMessage": "Votre accès est en lecture seule. Seuls les Gestionnaires peuvent lancer une nouvelle copie.",
    "forbidden.backToSnapshots": "Retour aux copies",

    // Comptes
    "accounts.title": "📊 Comptes MailerLite",
    "accounts.subtitle": "Comptes configurés via les variables d'environnement",
    "accounts.empty": "Aucun compte configuré",
    "accounts.emptyHint": "Ajoutez les variables {v1} et/ou {v2} aux env vars.",
    "accounts.keyLabel": "Clé: {key}",
    "accounts.subscribers": "Abonnés",
    "accounts.explore": "🔍 Explorer",
    "accounts.createSnapshot": "📦 Créer une copie",

    // Explorer
    "explore.title": "🔍 Explorer en direct",
    "explore.subtitle": "Consulter les abonnés en direct sur MailerLite (pas de copie)",
    "explore.subscribersCount": "{n} abonnés",
    "explore.loading": "Chargement…",
    "explore.notFound": "Compte introuvable",
    "explore.back": "← Retour",
    "explore.liveData": "Données en direct",
    "explore.groups": "Groupes",
    "explore.liveSubscribers": "👥 Abonnés (en direct)",

    // Copies / snapshots — liste
    "snapshots.title": "📦 Copies / Snapshots",
    "snapshots.subtitle": "Copies horodatées des bases d'abonnés MailerLite",
    "snapshots.new": "+ Nouvelle copie",
    "snapshots.loading": "Chargement…",
    "snapshots.empty": "Aucun snapshot",
    "snapshots.emptyHint": "Créez votre première copie pour sauvegarder la base d'abonnés.",
    "snapshots.colLabel": "Label",
    "snapshots.colAccount": "Compte",
    "snapshots.colStatus": "Statut",
    "snapshots.colSubscribers": "Abonnés",
    "snapshots.colDate": "Date",
    "snapshots.view": "Voir",
    "snapshots.deleteTitle": "Supprimer ce snapshot ?",
    "snapshots.deleteMessage": "La copie « {label} » et tous ses abonnés seront supprimés définitivement.",
    "snapshots.deleteConfirm": "Supprimer",

    // Statuts de snapshot
    "status.completed": "Terminé",
    "status.running": "En cours…",
    "status.pending": "En attente",
    "status.failed": "Échoué",

    // Nouvelle copie (synchro MailerLite)
    "newSnapshot.title": "📦 Nouvelle copie",
    "newSnapshot.subtitle": "Sauvegarder la base d'abonnés MailerLite dans le cloud",
    "newSnapshot.account": "Compte MailerLite",
    "newSnapshot.select": "— Sélectionner —",
    "newSnapshot.accountOption": "{label} ({n} abonnés)",
    "newSnapshot.scope": "Portée",
    "newSnapshot.scopeAll": "Tous les abonnés",
    "newSnapshot.scopeGroup": "Un groupe spécifique",
    "newSnapshot.group": "Groupe",
    "newSnapshot.groupLoading": "Chargement…",
    "newSnapshot.groupOption": "{name} ({n} actifs)",
    "newSnapshot.label": "Label (optionnel)",
    "newSnapshot.labelPlaceholder": "Ex : Copie complète Chanv — Juin 2026",
    "newSnapshot.starting": "Démarrage…",
    "newSnapshot.progress": "{fetched} / {total} abonnés",
    "newSnapshot.elapsed": "⏱ Écoulé : {t}",
    "newSnapshot.remaining": "⏳ Restant : ~{t}",
    "newSnapshot.completed": "✅ Copie terminée — {n} abonnés sauvegardés",
    "newSnapshot.viewCopy": "Voir la copie →",
    "newSnapshot.submitting": "⏳ Copie en cours…",
    "newSnapshot.submit": "🚀 Lancer la copie",
    "newSnapshot.backBtn": "Retour",
    "newSnapshot.cancel": "Annuler",
    "newSnapshot.unknownError": "Erreur inconnue",
    "newSnapshot.httpError": "Erreur {status}",

    // Détail d'une copie
    "snapshotDetail.loading": "Chargement…",
    "snapshotDetail.notFound": "Snapshot introuvable",
    "snapshotDetail.back": "← Retour aux snapshots",
    "snapshotDetail.copied": "Abonnés copiés",
    "snapshotDetail.totalEstimated": "Total estimé",
    "snapshotDetail.scope": "Portée",
    "snapshotDetail.scopeAll": "Tous",
    "snapshotDetail.scopeGroup": "Groupe",
    "snapshotDetail.by": "Par",
    "snapshotDetail.pending": "En attente…",
    "snapshotDetail.copying": "Copie en cours…",
    "snapshotDetail.progressDetail": "{fetched} abonnés copiés sur ~{total}",
    "snapshotDetail.errorLabel": "Erreur :",
    "snapshotDetail.exportCsv": "📥 Exporter CSV",
    "snapshotDetail.exportJson": "📥 Exporter JSON",
    "snapshotDetail.subscribers": "👥 Abonnés ({n})",

    // Table des abonnés
    "table.searchPlaceholder": "🔍 Rechercher par email…",
    "table.allStatuses": "Tous les statuts",
    "table.colEmail": "Email",
    "table.colStatus": "Statut",
    "table.colGroups": "Groupes",
    "table.colFields": "Champs",
    "table.empty": "Aucun abonné trouvé",
    "table.count": "{n} abonné",
    "table.countPlural": "{n} abonnés",
    "table.prev": "← Précédent",
    "table.next": "Suivant →",
    "table.loadMore": "Charger plus →",

    // Statuts d'abonné MailerLite
    "subStatus.active": "Actif",
    "subStatus.unsubscribed": "Désabonné",
    "subStatus.unconfirmed": "Non confirmé",
    "subStatus.bounced": "Bounced",
    "subStatus.junk": "Junk",

    // Dialog de confirmation
    "dialog.cancel": "Annuler",
    "dialog.confirm": "Confirmer",
  },

  en: {
    "nav.accounts": "Accounts",
    "nav.snapshots": "Snapshots",
    "nav.explore": "Explore",
    "nav.dashboard": "Dashboard",
    "nav.subtitle": "Groupe Chanv",
    "nav.backToHub": "Back to Hub",
    "nav.menu": "Menu",

    "role.superadmin": "Super Administrator",
    "role.admin": "Administrator",
    "role.gestionnaire": "Manager",
    "role.consulter": "Viewer",
    "role.blocked": "Blocked",

    "login.domains": "Sign-in restricted to domains",
    "login.ssoChecking": "SSO sign-in in progress...",
    "login.loading": "Loading...",
    "login.signIn": "Sign in with Google",
    "login.sessionInfo": "A session will remain open for 5 days.",

    "auth.domainRefused": "Domain not allowed. Accepted domains: {domains}",
    "auth.sessionRefused": "Session refused ({status})",
    "auth.signInFailed": "Sign-in failed",
    "blocked.title": "Access denied",
    "blocked.message": "This account does not have access to Importation MailerLite. Contact an administrator to be granted a role, or try another account.",
    "blocked.retry": "Try another account",
    "forbidden.gestionnaireTitle": "Manager access required",
    "forbidden.gestionnaireMessage": "Your access is read-only. Only Managers can start a new copy.",
    "forbidden.backToSnapshots": "Back to copies",

    "accounts.title": "📊 MailerLite Accounts",
    "accounts.subtitle": "Accounts configured via environment variables",
    "accounts.empty": "No account configured",
    "accounts.emptyHint": "Add the {v1} and/or {v2} environment variables.",
    "accounts.keyLabel": "Key: {key}",
    "accounts.subscribers": "Subscribers",
    "accounts.explore": "🔍 Explore",
    "accounts.createSnapshot": "📦 Create a snapshot",

    "explore.title": "🔍 Live explore",
    "explore.subtitle": "Browse subscribers live on MailerLite (no copy)",
    "explore.subscribersCount": "{n} subscribers",
    "explore.loading": "Loading…",
    "explore.notFound": "Account not found",
    "explore.back": "← Back",
    "explore.liveData": "Live data",
    "explore.groups": "Groups",
    "explore.liveSubscribers": "👥 Subscribers (live)",

    "snapshots.title": "📦 Snapshots",
    "snapshots.subtitle": "Timestamped copies of MailerLite subscriber databases",
    "snapshots.new": "+ New snapshot",
    "snapshots.loading": "Loading…",
    "snapshots.empty": "No snapshot",
    "snapshots.emptyHint": "Create your first snapshot to back up the subscriber database.",
    "snapshots.colLabel": "Label",
    "snapshots.colAccount": "Account",
    "snapshots.colStatus": "Status",
    "snapshots.colSubscribers": "Subscribers",
    "snapshots.colDate": "Date",
    "snapshots.view": "View",
    "snapshots.deleteTitle": "Delete this snapshot?",
    "snapshots.deleteMessage": "The snapshot “{label}” and all its subscribers will be permanently deleted.",
    "snapshots.deleteConfirm": "Delete",

    "status.completed": "Completed",
    "status.running": "Running…",
    "status.pending": "Pending",
    "status.failed": "Failed",

    "newSnapshot.title": "📦 New snapshot",
    "newSnapshot.subtitle": "Back up the MailerLite subscriber database to the cloud",
    "newSnapshot.account": "MailerLite account",
    "newSnapshot.select": "— Select —",
    "newSnapshot.accountOption": "{label} ({n} subscribers)",
    "newSnapshot.scope": "Scope",
    "newSnapshot.scopeAll": "All subscribers",
    "newSnapshot.scopeGroup": "A specific group",
    "newSnapshot.group": "Group",
    "newSnapshot.groupLoading": "Loading…",
    "newSnapshot.groupOption": "{name} ({n} active)",
    "newSnapshot.label": "Label (optional)",
    "newSnapshot.labelPlaceholder": "E.g.: Full Chanv copy — June 2026",
    "newSnapshot.starting": "Starting…",
    "newSnapshot.progress": "{fetched} / {total} subscribers",
    "newSnapshot.elapsed": "⏱ Elapsed: {t}",
    "newSnapshot.remaining": "⏳ Remaining: ~{t}",
    "newSnapshot.completed": "✅ Snapshot completed — {n} subscribers saved",
    "newSnapshot.viewCopy": "View snapshot →",
    "newSnapshot.submitting": "⏳ Copy in progress…",
    "newSnapshot.submit": "🚀 Start the copy",
    "newSnapshot.backBtn": "Back",
    "newSnapshot.cancel": "Cancel",
    "newSnapshot.unknownError": "Unknown error",
    "newSnapshot.httpError": "Error {status}",

    "snapshotDetail.loading": "Loading…",
    "snapshotDetail.notFound": "Snapshot not found",
    "snapshotDetail.back": "← Back to snapshots",
    "snapshotDetail.copied": "Subscribers copied",
    "snapshotDetail.totalEstimated": "Estimated total",
    "snapshotDetail.scope": "Scope",
    "snapshotDetail.scopeAll": "All",
    "snapshotDetail.scopeGroup": "Group",
    "snapshotDetail.by": "By",
    "snapshotDetail.pending": "Pending…",
    "snapshotDetail.copying": "Copy in progress…",
    "snapshotDetail.progressDetail": "{fetched} subscribers copied out of ~{total}",
    "snapshotDetail.errorLabel": "Error:",
    "snapshotDetail.exportCsv": "📥 Export CSV",
    "snapshotDetail.exportJson": "📥 Export JSON",
    "snapshotDetail.subscribers": "👥 Subscribers ({n})",

    "table.searchPlaceholder": "🔍 Search by email…",
    "table.allStatuses": "All statuses",
    "table.colEmail": "Email",
    "table.colStatus": "Status",
    "table.colGroups": "Groups",
    "table.colFields": "Fields",
    "table.empty": "No subscriber found",
    "table.count": "{n} subscriber",
    "table.countPlural": "{n} subscribers",
    "table.prev": "← Previous",
    "table.next": "Next →",
    "table.loadMore": "Load more →",

    "subStatus.active": "Active",
    "subStatus.unsubscribed": "Unsubscribed",
    "subStatus.unconfirmed": "Unconfirmed",
    "subStatus.bounced": "Bounced",
    "subStatus.junk": "Junk",

    "dialog.cancel": "Cancel",
    "dialog.confirm": "Confirm",
  },

  es: {
    "nav.accounts": "Cuentas",
    "nav.snapshots": "Copias",
    "nav.explore": "Explorar",
    "nav.dashboard": "Panel",
    "nav.subtitle": "Groupe Chanv",
    "nav.backToHub": "Volver al Hub",
    "nav.menu": "Menú",

    "role.superadmin": "Superadministrador",
    "role.admin": "Administrador",
    "role.gestionnaire": "Gestor",
    "role.consulter": "Consulta",
    "role.blocked": "Bloqueado",

    "login.domains": "Acceso reservado a los dominios",
    "login.ssoChecking": "Conexión SSO en curso...",
    "login.loading": "Cargando...",
    "login.signIn": "Iniciar sesión con Google",
    "login.sessionInfo": "La sesión permanecerá abierta durante 5 días.",

    "auth.domainRefused": "Dominio no autorizado. Dominios aceptados: {domains}",
    "auth.sessionRefused": "Sesión rechazada ({status})",
    "auth.signInFailed": "Error al iniciar sesión",
    "blocked.title": "Acceso no autorizado",
    "blocked.message": "Esta cuenta no tiene acceso a Importación MailerLite. Contacta a un administrador para obtener un rol, o prueba con otra cuenta.",
    "blocked.retry": "Probar con otra cuenta",
    "forbidden.gestionnaireTitle": "Acceso de Gestor requerido",
    "forbidden.gestionnaireMessage": "Tu acceso es de solo lectura. Solo los Gestores pueden iniciar una nueva copia.",
    "forbidden.backToSnapshots": "Volver a las copias",

    "accounts.title": "📊 Cuentas MailerLite",
    "accounts.subtitle": "Cuentas configuradas mediante variables de entorno",
    "accounts.empty": "Ninguna cuenta configurada",
    "accounts.emptyHint": "Añade las variables {v1} y/o {v2} a las variables de entorno.",
    "accounts.keyLabel": "Clave: {key}",
    "accounts.subscribers": "Suscriptores",
    "accounts.explore": "🔍 Explorar",
    "accounts.createSnapshot": "📦 Crear una copia",

    "explore.title": "🔍 Explorar en directo",
    "explore.subtitle": "Consultar los suscriptores en directo en MailerLite (sin copia)",
    "explore.subscribersCount": "{n} suscriptores",
    "explore.loading": "Cargando…",
    "explore.notFound": "Cuenta no encontrada",
    "explore.back": "← Volver",
    "explore.liveData": "Datos en directo",
    "explore.groups": "Grupos",
    "explore.liveSubscribers": "👥 Suscriptores (en directo)",

    "snapshots.title": "📦 Copias / Snapshots",
    "snapshots.subtitle": "Copias con fecha de las bases de suscriptores MailerLite",
    "snapshots.new": "+ Nueva copia",
    "snapshots.loading": "Cargando…",
    "snapshots.empty": "Ninguna copia",
    "snapshots.emptyHint": "Crea tu primera copia para respaldar la base de suscriptores.",
    "snapshots.colLabel": "Etiqueta",
    "snapshots.colAccount": "Cuenta",
    "snapshots.colStatus": "Estado",
    "snapshots.colSubscribers": "Suscriptores",
    "snapshots.colDate": "Fecha",
    "snapshots.view": "Ver",
    "snapshots.deleteTitle": "¿Eliminar esta copia?",
    "snapshots.deleteMessage": "La copia «{label}» y todos sus suscriptores se eliminarán definitivamente.",
    "snapshots.deleteConfirm": "Eliminar",

    "status.completed": "Completado",
    "status.running": "En curso…",
    "status.pending": "En espera",
    "status.failed": "Fallido",

    "newSnapshot.title": "📦 Nueva copia",
    "newSnapshot.subtitle": "Respaldar la base de suscriptores MailerLite en la nube",
    "newSnapshot.account": "Cuenta MailerLite",
    "newSnapshot.select": "— Seleccionar —",
    "newSnapshot.accountOption": "{label} ({n} suscriptores)",
    "newSnapshot.scope": "Alcance",
    "newSnapshot.scopeAll": "Todos los suscriptores",
    "newSnapshot.scopeGroup": "Un grupo específico",
    "newSnapshot.group": "Grupo",
    "newSnapshot.groupLoading": "Cargando…",
    "newSnapshot.groupOption": "{name} ({n} activos)",
    "newSnapshot.label": "Etiqueta (opcional)",
    "newSnapshot.labelPlaceholder": "Ej.: Copia completa Chanv — Junio 2026",
    "newSnapshot.starting": "Iniciando…",
    "newSnapshot.progress": "{fetched} / {total} suscriptores",
    "newSnapshot.elapsed": "⏱ Transcurrido: {t}",
    "newSnapshot.remaining": "⏳ Restante: ~{t}",
    "newSnapshot.completed": "✅ Copia completada — {n} suscriptores guardados",
    "newSnapshot.viewCopy": "Ver la copia →",
    "newSnapshot.submitting": "⏳ Copia en curso…",
    "newSnapshot.submit": "🚀 Iniciar la copia",
    "newSnapshot.backBtn": "Volver",
    "newSnapshot.cancel": "Cancelar",
    "newSnapshot.unknownError": "Error desconocido",
    "newSnapshot.httpError": "Error {status}",

    "snapshotDetail.loading": "Cargando…",
    "snapshotDetail.notFound": "Copia no encontrada",
    "snapshotDetail.back": "← Volver a las copias",
    "snapshotDetail.copied": "Suscriptores copiados",
    "snapshotDetail.totalEstimated": "Total estimado",
    "snapshotDetail.scope": "Alcance",
    "snapshotDetail.scopeAll": "Todos",
    "snapshotDetail.scopeGroup": "Grupo",
    "snapshotDetail.by": "Por",
    "snapshotDetail.pending": "En espera…",
    "snapshotDetail.copying": "Copia en curso…",
    "snapshotDetail.progressDetail": "{fetched} suscriptores copiados de ~{total}",
    "snapshotDetail.errorLabel": "Error:",
    "snapshotDetail.exportCsv": "📥 Exportar CSV",
    "snapshotDetail.exportJson": "📥 Exportar JSON",
    "snapshotDetail.subscribers": "👥 Suscriptores ({n})",

    "table.searchPlaceholder": "🔍 Buscar por email…",
    "table.allStatuses": "Todos los estados",
    "table.colEmail": "Email",
    "table.colStatus": "Estado",
    "table.colGroups": "Grupos",
    "table.colFields": "Campos",
    "table.empty": "Ningún suscriptor encontrado",
    "table.count": "{n} suscriptor",
    "table.countPlural": "{n} suscriptores",
    "table.prev": "← Anterior",
    "table.next": "Siguiente →",
    "table.loadMore": "Cargar más →",

    "subStatus.active": "Activo",
    "subStatus.unsubscribed": "Dado de baja",
    "subStatus.unconfirmed": "Sin confirmar",
    "subStatus.bounced": "Rebotado",
    "subStatus.junk": "Spam",

    "dialog.cancel": "Cancelar",
    "dialog.confirm": "Confirmar",
  },
};

function interpolate(msg: string, vars?: Record<string, string | number>): string {
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * Hook de traduction : t("clé", { vars }) — repli fr puis clé brute.
 */
export function useT() {
  const { lang } = useGandalf();
  return useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const msg = MESSAGES[lang as Lang]?.[key] ?? MESSAGES.fr[key] ?? key;
      return interpolate(msg, vars);
    },
    [lang]
  );
}

/** Locale de formatage courante (dates/nombres), dérivée de la langue hub. */
export function useLocale(): string {
  const { lang } = useGandalf();
  return LANG_LOCALES[lang as Lang] || "fr-CA";
}
