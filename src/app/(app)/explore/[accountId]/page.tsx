import { requireSession } from "@/lib/auth-server";

export default async function ExploreAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await requireSession();
  const { accountId } = await params;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">🔍 Explorer — {accountId}</h1>
      <div className="card p-8 text-center text-gray-400">
        <p>🚧 Page en construction</p>
        <p className="text-sm mt-2">
          Consultation en direct des abonnés d&apos;un compte (live API) — voir Antigravity.md
        </p>
      </div>
    </main>
  );
}
