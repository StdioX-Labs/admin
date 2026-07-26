import { ComingSoon } from '@/components/ui/coming-soon';

export default async function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Report details"
      description="A generated statement and its line items."
      backHref="/dashboard/finance/reports"
      backLabel="Reports"
      detail={`Report #${id}`}
    />
  );
}
