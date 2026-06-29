import { requireSession } from "@/lib/auth-server";

export default async function NewAccountPage() {
  await requireSession();
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">🔑 Ajouter un compte MailerLite</h1>
      <div className="card p-8 text-center text-gray-400">
        <p>🚧 Page en construction</p>
        <p className="text-sm mt-2">
          Formulaire d&apos;ajout d&apos;un compte ML — voir Antigravity.md
        </p>
      </div>
    </main>
  );
}
