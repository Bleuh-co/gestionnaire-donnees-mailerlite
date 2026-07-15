"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGandalf } from "@bleuh-co/gandalf-sdk-next/client";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "https://gandalf.chanv.com";

export function NavBar() {
  const { embedded } = useGandalf();
  const { session } = useAuth();
  const pathname = usePathname();
  const t = useT();

  // Vrai framing (window.self !== window.top) : le flag `embedded` du SDK vient
  // du cookie gandalf_embed collant → chrome d'embed sans burger en standalone.
  const [framed, setFramed] = useState(embedded);
  useEffect(() => {
    setFramed(window.self !== window.top);
  }, []);

  if (!session) return null;

  // « masqué ≠ perdu » : la même liste de liens sert le header autonome ET la
  // nav interne d'embed — aucun écran n'est perdu quand le hub masque le chrome.
  const links: { href: string; label: string; icon: string }[] = [
    { href: "/accounts", label: t("nav.accounts"), icon: "📊" },
    { href: "/snapshots", label: t("nav.snapshots"), icon: "📦" },
    { href: "/explore", label: t("nav.explore"), icon: "🔍" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  if (framed) {
    // Contrat d'embed — nav interne, modèle xero_photo_achat / Gestion-Parc-It :
    // barre claire sticky sur fond parchemin, pastilles blanches arrondies,
    // pastille active or. Le hub fournit logo/titre/profil.
    return (
      <nav id="gandalf-embed-nav" className="sticky top-0 z-40 flex flex-wrap items-center gap-1.5 bg-[#F4EFE3] px-4 pb-1 pt-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-colors",
              isActive(l.href)
                ? "border-[#A8863F] bg-[#A8863F] font-bold text-white"
                : "border-black/10 bg-white text-black/60 hover:border-[#A8863F]/40 hover:text-[#282828]",
            )}
          >
            <span className="text-sm leading-none">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <header className="chanv-header">
      <div className="mx-auto max-w-5xl flex items-center gap-6 flex-nowrap relative flex-col md:flex-row text-center md:text-left">
        <a
          href={HUB_URL}
          className="chanv-logo-wrapper flex items-center"
          title={t("nav.backToHub")}
        >
          <Image
            src="/logo-groupe-chanv.svg"
            alt="Chanv"
            width={130}
            height={44}
            priority
            className="h-10 w-auto"
          />
        </a>
        <div>
          <h1 className="text-xl font-bold m-0 leading-tight">Gestionnaire données MailerLite</h1>
          <p className="text-[10px] md:text-[11px] uppercase tracking-[3px] opacity-70 mt-1 m-0">
            {t("nav.subtitle")}
          </p>
        </div>

        {/* Nav links — desktop only (mobile uses sidebar) */}
        <nav className="hidden md:flex items-center gap-4 md:ml-auto">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors",
                isActive(l.href) ? "text-white" : "text-white/80 hover:text-white",
              )}
            >
              <span className="text-base">{l.icon}</span>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 absolute top-0 right-0 md:relative md:top-auto md:right-auto">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white whitespace-nowrap">
              {session.displayName || session.email}
            </div>
            <div className="text-[11px] text-white/60 uppercase tracking-wider whitespace-nowrap">
              {t(`role.${session.role}`)}
            </div>
          </div>
          <Sidebar />
        </div>
      </div>
    </header>
  );
}
