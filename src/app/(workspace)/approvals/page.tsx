import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function ApprovalsPage({ searchParams }: { searchParams?: Promise<{ record?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="approvals" selectedId={params?.record} />;
}
