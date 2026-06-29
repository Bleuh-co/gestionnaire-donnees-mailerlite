import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  // Le dashboard est dans le group (app) — /accounts est la page principale
  redirect("/accounts");
}
