import { ComingSoon } from '@/components/ui/coming-soon';

export default async function CompanyEventDetailsPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id, eventId } = await params;
  return (
    <ComingSoon
      title="Event details"
      description="Per-event breakdown within a partner account."
      backHref="/dashboard/events"
      backLabel="Events"
      detail={`Company #${id} · Event #${eventId}`}
    />
  );
}
