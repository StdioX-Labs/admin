import { ComingSoon } from '@/components/ui/coming-soon';

export default async function B2BDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      title="B2B account"
      description="Partner overview, licences and billing history."
      backHref="/dashboard/b2b"
      backLabel="B2B"
      detail={`Account #${id}`}
    />
  );
}
