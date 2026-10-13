import { redirect } from "next/navigation";
import { OntixApp } from "@/client/ui/OntixApp";
import { getCurrentActor } from "@/lib/auth/dal";
import { loadWorkspace } from "@/lib/services/workspace";

export default async function NeonHome() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const initialData = await loadWorkspace();
  return (
    <OntixApp
      initialData={initialData}
      viewer={{ employeeId: actor.employeeId, name: actor.name, email: actor.email, role: actor.role }}
    />
  );
}
