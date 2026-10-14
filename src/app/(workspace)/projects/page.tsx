import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ record?: string; status?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="projects" selectedId={params?.record} initialFilters={{ status: params?.status }} />;
}
