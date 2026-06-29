import { requireSession } from "@/lib/auth-server";

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">📦 Snapshot {id}</h1>
      <div className="card p-8 text-center text-gray-400">
        <p>🚧 Page en construction</p>
        <p className="text-sm mt-2">
          Détail du snapshot : stats + table des abonnés + export — voir Antigravity.md
        </p>
      </div>
    </main>
  );
}
