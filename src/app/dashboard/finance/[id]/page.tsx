import { ComingSoon } from '@/components/ui/coming-soon';

export default async function FinanceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Finance record"
      description="Single ledger entry with its full audit trail."
      backHref="/dashboard/finance"
      backLabel="Finance"
      detail={`Record #${id}`}
    />
  );
}
