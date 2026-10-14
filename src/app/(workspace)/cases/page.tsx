import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function CasesPage({ searchParams }: { searchParams?: Promise<{ record?: string; status?: string; priority?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="cases" selectedId={params?.record} initialFilters={{ status: params?.status, priority: params?.priority }} />;
}
