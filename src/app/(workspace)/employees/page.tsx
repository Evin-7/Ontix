import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function EmployeesPage({ searchParams }: { searchParams?: Promise<{ record?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="employees" selectedId={params?.record} />;
}
