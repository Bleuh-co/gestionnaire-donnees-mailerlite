import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gestion des snapshots (créer / lancer / exporter / supprimer) = Gestionnaire+.
 * `consulter` a un accès LECTURE SEULE (contrat recette). Miroir CLIENT de
 * `requireGestionnaire` côté serveur — l'API reste l'autorité ; ceci masque
 * les actions interdites pour ne jamais exposer « Nouvelle copie » à un lecteur.
 */
export function canManageSnapshots(role: Role | null | undefined): boolean {
  return role === "gestionnaire" || role === "admin" || role === "superadmin";
}

export function allowedDomains(): string[] {
  return (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains().includes(domain);
}
