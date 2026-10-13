"use server";

import { assignFoundryCase, resolveFoundryCase, updateFoundryProjectStatus } from "@/server/providers/foundry/workflows";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function resolveFoundryCaseAction(formData: FormData) {
  const result = await resolveFoundryCase({ caseId: formData.get("caseId") });
  revalidatePath("/");
  redirect(`/?foundry=${result.ok ? "action-saved" : "action-failed"}`);
}

export async function assignFoundryCaseAction(formData: FormData) {
  const result = await assignFoundryCase({ caseId: formData.get("caseId"), employeeId: formData.get("employeeId") });
  revalidatePath("/");
  redirect(`/?foundry=${result.ok ? "action-saved" : "action-failed"}`);
}

export async function updateFoundryProjectStatusAction(formData: FormData) {
  const result = await updateFoundryProjectStatus({ projectId: formData.get("projectId"), status: formData.get("status") });
  revalidatePath("/");
  redirect(`/?foundry=${result.ok ? "action-saved" : "action-failed"}`);
}
