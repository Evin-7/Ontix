import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function CasesPage({ searchParams }: { searchParams?: Promise<{ record?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="cases" selectedId={params?.record} />;
}
