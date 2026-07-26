import { ComingSoon } from '@/components/ui/coming-soon';

export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Transaction details"
      description="Buyer, ticket, channel and settlement status."
      backHref="/dashboard/finance"
      backLabel="Finance"
      detail={`Transaction #${id}`}
    />
  );
}
