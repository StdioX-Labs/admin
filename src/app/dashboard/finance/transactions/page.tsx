import { ComingSoon } from '@/components/ui/coming-soon';

export default function TransactionsPage() {
  return (
    <ComingSoon
      title="Transactions"
      description="The full ledger. A filtered view is already on the Finance screen."
      backHref="/dashboard/finance"
      backLabel="Finance"
    />
  );
}
