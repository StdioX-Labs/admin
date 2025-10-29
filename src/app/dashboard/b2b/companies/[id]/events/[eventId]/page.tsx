export default function CompanyEventDetailsPage({ params }: { params: { id: string; eventId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Event Details</h1>
      <p className="text-muted-foreground">Company: {params.id}</p>
      <p className="text-muted-foreground">Event: {params.eventId}</p>
    </div>
  );
}

