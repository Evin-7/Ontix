import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function TeamsPage({ searchParams }: { searchParams?: Promise<{ record?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="teams" selectedId={params?.record} />;
}
