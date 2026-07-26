import { ComingSoon } from '@/components/ui/coming-soon';

export default async function CompanyEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Company events"
      description="Every event this organizer has run."
      backHref="/dashboard/companies"
      backLabel="Companies"
      detail={`Company #${id}`}
    />
  );
}
