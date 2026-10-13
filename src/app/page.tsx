import { redirect } from "next/navigation";
import { OntixApp } from "@/client/ui/OntixApp";
import { getCurrentActor } from "@/lib/auth/dal";
import { loadWorkspace } from "@/lib/services/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const initialData = await loadWorkspace();
  return (
    <OntixApp
      initialData={initialData}
      viewer={{ name: actor.name, email: actor.email, role: actor.role }}
    />
  );
}
