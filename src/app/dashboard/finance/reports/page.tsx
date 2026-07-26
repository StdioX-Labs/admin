import { ComingSoon } from '@/components/ui/coming-soon';

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Financial reports"
      description="Scheduled statements and downloadable reconciliations. Live figures are on Analytics."
      backHref="/dashboard/finance"
      backLabel="Finance"
    />
  );
}
