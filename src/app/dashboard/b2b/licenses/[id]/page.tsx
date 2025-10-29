export default function LicenseDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">License Details</h1>
      <p className="text-muted-foreground">License ID: {params.id}</p>
    </div>
  );
}

