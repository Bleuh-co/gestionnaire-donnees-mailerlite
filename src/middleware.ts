import type { NextRequest } from "next/server";
import { gandalfMiddleware } from "@bleuh-co/gandalf-sdk-next/middleware";

/**
 * Contrat d'embarquement Gandalf (modèle xero_photo_achat / champs-numerique) :
 *  - lit ?gandalf_embed / ?lang / ?theme transmis par le hub,
 *  - les persiste en cookies légers (gandalf_embed / gandalf_lang / gandalf_theme),
 *  - les expose aux Server Components via les headers x-gandalf-*,
 *  - pose CSP frame-ancestors pour autoriser l'iframe du hub.
 *
 * L'app n'avait pas de middleware existant — on délègue directement au SDK.
 * Les routes /api sont exclues (pas de contrat d'embed à y appliquer, et le
 * flux SSE /api/snapshots/stream ne doit pas être touché).
 */
export function middleware(req: NextRequest) {
  return gandalfMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|api|favicon|sw.js|manifest.webmanifest).*)"],
};
