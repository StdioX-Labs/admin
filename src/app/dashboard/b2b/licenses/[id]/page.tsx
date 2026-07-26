import { ComingSoon } from '@/components/ui/coming-soon';

export default async function LicenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      title="Licence details"
      description="Term, seats and renewal status."
      backHref="/dashboard/b2b/licenses"
      backLabel="Licences"
      detail={`Licence #${id}`}
    />
  );
}
