import { ComingSoon } from '@/components/ui/coming-soon';

export default async function B2BCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Company details"
      description="Partner profile, events and revenue share."
      backHref="/dashboard/companies"
      backLabel="Companies"
      detail={`Company #${id}`}
    />
  );
}
