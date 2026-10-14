import { FoundryRecordsPage } from "@/components/foundry/foundry-records-page";

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<{ record?: string }> }) {
  const params = await searchParams;
  return <FoundryRecordsPage module="customers" selectedId={params?.record} />;
}
