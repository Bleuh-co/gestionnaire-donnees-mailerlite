import { requireSession } from "@/lib/auth-server";

export default async function NewSnapshotPage() {
  await requireSession();
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">📦 Nouveau snapshot</h1>
      <div className="card p-8 text-center text-gray-400">
        <p>🚧 Page en construction</p>
        <p className="text-sm mt-2">
          Création d&apos;un nouveau snapshot (choix compte + scope) — voir Antigravity.md
        </p>
      </div>
    </main>
  );
}
