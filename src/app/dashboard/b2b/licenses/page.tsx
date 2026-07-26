import { ComingSoon } from '@/components/ui/coming-soon';

export default function LicensesPage() {
  return (
    <ComingSoon
      title="Licences"
      description="Issue, renew and revoke B2B subscription licences."
      backHref="/dashboard/b2b"
      backLabel="B2B"
    />
  );
}
